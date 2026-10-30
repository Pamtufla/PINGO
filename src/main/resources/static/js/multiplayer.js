/* Multiplayer vía Supabase Realtime */
(function (global) {
  const CFG = () => global.PINGO_CONFIG || {};
  let sb = null;
  let channel = null;
  let room = null;
  let playerRow = null;
  let onPlayers = null;
  let onRoom = null;
  let syncTimer = null;

  function clientId() {
    const k = 'pingo-client-id';
    let id = localStorage.getItem(k);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || ('c' + Math.random().toString(16).slice(2) + Date.now().toString(16));
      localStorage.setItem(k, id);
    }
    return id;
  }

  function enabled() {
    const c = CFG();
    return !c.FORCE_SOLO && !!(c.SUPABASE_URL && c.SUPABASE_ANON_KEY && global.supabase);
  }

  function init() {
    if (!enabled()) return false;
    if (sb) return true;
    sb = global.supabase.createClient(CFG().SUPABASE_URL, CFG().SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 8 } }
    });
    return true;
  }

  function roomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 5; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    return s;
  }

  /**
   * opts: { title, isPrivate, password }
   */
  async function createRoom(size, name, cardCode, need, opts) {
    if (!init()) throw new Error('Supabase no configurado');
    opts = opts || {};
    const isPrivate = !!opts.isPrivate;
    const password = String(opts.password || '').trim();
    if (isPrivate && password.length < 3) throw new Error('La sala privada necesita contraseña (mín. 3)');

    const code = roomCode();
    const title = String(opts.title || ('Sala de ' + (name || 'invitado'))).trim().slice(0, 40) || 'Sala';
    const { data: r, error } = await sb.from('rooms').insert({
      code,
      size,
      status: 'lobby',
      host_client_id: clientId(),
      title,
      is_private: isPrivate,
      password: isPrivate ? password : null
    }).select().single();
    if (error) throw error;
    room = r;
    playerRow = await upsertPlayer(name, cardCode, need);
    await subscribe(r.id);
    return r;
  }

  async function joinRoom(code, name, cardCode, needOrFn, password) {
    if (!init()) throw new Error('Supabase no configurado');
    const clean = String(code || '').trim().toUpperCase();
    const { data: r, error } = await sb.from('rooms').select('*').eq('code', clean).maybeSingle();
    if (error) throw error;
    if (!r) throw new Error('Sala no encontrada');
    if (r.status === 'ended') throw new Error('Esta sala ya terminó');
    if (r.is_private) {
      const pass = String(password || '').trim();
      if (!pass) throw new Error('Esta sala es privada. Escribe la contraseña');
      if (pass !== String(r.password || '')) throw new Error('Contraseña incorrecta');
    }
    room = r;
    const need = typeof needOrFn === 'function' ? needOrFn(r.size) : needOrFn;
    playerRow = await upsertPlayer(name, cardCode, need);
    await subscribe(r.id);
    return r;
  }

  /** Lista pública+privadas sin devolver password (vista rooms_lobby) */
  async function listRooms() {
    if (!init()) return [];
    const { data, error } = await sb
      .from('rooms_lobby')
      .select('id,code,size,status,title,is_private,created_at,player_count')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }

  async function upsertPlayer(name, cardCode, need) {
    const payload = {
      room_id: room.id,
      client_id: clientId(),
      name: name || 'invitado',
      card_code: cardCode,
      need,
      found: 0,
      bingos: 0,
      retos_ok: 0,
      retos_paid: 0,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await sb.from('players').upsert(payload, { onConflict: 'room_id,client_id' }).select().single();
    if (error) throw error;
    return data;
  }

  async function fetchPlayers() {
    if (!room) return [];
    const { data, error } = await sb.from('players').select('*').eq('room_id', room.id);
    if (error) throw error;
    return data || [];
  }

  async function startRoom() {
    if (!room) return;
    const { data, error } = await sb.from('rooms').update({ status: 'live' }).eq('id', room.id).select().single();
    if (error) throw error;
    room = data;
    return data;
  }

  async function endRoom() {
    if (!room || !sb) return null;
    const { data, error } = await sb.from('rooms').update({ status: 'ended' }).eq('id', room.id).select().single();
    if (error) throw error;
    room = data;
    return data;
  }

  async function saveMatchResults(rows, meta) {
    if (!init() || !rows || !rows.length) return { ok: false, localOnly: true };
    const matchId = meta && meta.matchId;
    if (!matchId) throw new Error('Falta matchId');

    const { error: lockErr } = await sb.from('match_archives').insert({
      match_id: matchId,
      room_code: (meta && meta.roomCode) || null,
      mode: (meta && meta.mode) || 'solo',
      saved_by: clientId()
    });
    if (lockErr) {
      if (lockErr.code === '23505' || /duplicate|unique/i.test(lockErr.message || '')) {
        return { ok: false, duplicate: true };
      }
      throw lockErr;
    }

    const { error } = await sb.from('match_results').insert(rows);
    if (error) throw error;
    return { ok: true };
  }

  async function isMatchArchived(matchId) {
    if (!init() || !matchId) return false;
    const { data, error } = await sb.from('match_archives').select('match_id').eq('match_id', matchId).maybeSingle();
    if (error) return false;
    return !!data;
  }

  async function fetchLeaderboard(limit) {
    if (!init()) return [];
    const { data, error } = await sb
      .from('match_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit || 80);
    if (error) throw error;
    return data || [];
  }

  function getClient() { return sb; }

  function queueSync(stats) {
    if (!room || !playerRow) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncProgress(stats), 180);
  }

  async function syncProgress(stats) {
    if (!room || !playerRow || !sb) return;
    const patch = {
      found: stats.found,
      need: stats.need,
      bingos: stats.bingos,
      retos_ok: stats.retosOk,
      retos_paid: stats.retosPaid,
      last_event: stats.event || null,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await sb.from('players').update(patch).eq('id', playerRow.id).select().single();
    if (!error && data) playerRow = data;
  }

  async function subscribe(roomId) {
    await unsubscribe();
    channel = sb.channel('room:' + roomId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: 'room_id=eq.' + roomId }, async () => {
        const list = await fetchPlayers();
        if (onPlayers) onPlayers(list);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: 'id=eq.' + roomId }, (payload) => {
        room = payload.new;
        if (onRoom) onRoom(room);
      })
      .subscribe();
    const list = await fetchPlayers();
    if (onPlayers) onPlayers(list);
  }

  async function unsubscribe() {
    if (channel) {
      await sb.removeChannel(channel);
      channel = null;
    }
  }

  async function leave() {
    clearTimeout(syncTimer);
    if (sb && playerRow) {
      try { await sb.from('players').delete().eq('id', playerRow.id); } catch (e) {}
    }
    await unsubscribe();
    room = null;
    playerRow = null;
  }

  function isHost() {
    return !!(room && room.host_client_id === clientId());
  }

  function getRoom() { return room; }
  function getPlayer() { return playerRow; }
  function setHandlers(h) {
    onPlayers = h.onPlayers || null;
    onRoom = h.onRoom || null;
  }

  global.PingoMP = {
    enabled, init, clientId, createRoom, joinRoom, listRooms, fetchPlayers,
    startRoom, endRoom, saveMatchResults, isMatchArchived, fetchLeaderboard, getClient,
    queueSync, syncProgress, leave, isHost, getRoom, getPlayer, setHandlers
  };
})(window);
