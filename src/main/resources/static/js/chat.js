/* Chat de texto + voz push-to-talk (WebRTC) por sala — señalización Supabase Realtime */
(function (global) {
  const ICE = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  let channel = null;
  let roomId = null;
  let myId = null;
  let myName = 'invitado';
  let localStream = null;
  let talking = false;
  const peers = new Map(); // peerId -> { pc, audio }
  let onChat = null;
  let onTalk = null;
  let ready = false;

  function client() {
    return global.PingoMP && PingoMP.getClient && PingoMP.getClient();
  }

  function emitChat(msg) {
    if (onChat) onChat(msg);
  }
  function emitTalk(who, on) {
    if (onTalk) onTalk(who, on);
  }

  async function ensureMic() {
    if (localStream) return localStream;
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });
    localStream.getAudioTracks().forEach(t => { t.enabled = false; });
    // Adjuntar pista a peers ya conectados
    peers.forEach(({ pc }) => {
      localStream.getTracks().forEach(track => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (sender) sender.replaceTrack(track);
        else pc.addTrack(track, localStream);
      });
    });
    return localStream;
  }

  function attachRemote(peerId, stream) {
    let entry = peers.get(peerId);
    if (!entry) return;
    let audio = entry.audio;
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      audio.setAttribute('playsinline', '');
      audio.style.display = 'none';
      document.body.appendChild(audio);
      entry.audio = audio;
    }
    audio.srcObject = stream;
    audio.play().catch(() => {});
  }

  async function createPeer(peerId, polite) {
    if (peers.has(peerId) || peerId === myId) return peers.get(peerId);
    const pc = new RTCPeerConnection(ICE);
    const entry = { pc, audio: null, makingOffer: false, ignoreOffer: false, polite };
    peers.set(peerId, entry);

    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    } else {
      // transceiver recvonly hasta que haya mic
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        sendSignal({ type: 'ice', to: peerId, from: myId, candidate: ev.candidate });
      }
    };
    pc.ontrack = (ev) => {
      const stream = ev.streams[0] || new MediaStream([ev.track]);
      attachRemote(peerId, stream);
    };
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription(await pc.createOffer());
        sendSignal({ type: 'sdp', to: peerId, from: myId, sdp: pc.localDescription });
      } catch (e) {
        console.warn('nego', e);
      } finally {
        entry.makingOffer = false;
      }
    };
    return entry;
  }

  function sendSignal(payload) {
    if (!channel || !ready) return;
    channel.send({
      type: 'broadcast',
      event: 'signal',
      payload
    });
  }

  async function handleSignal(payload) {
    if (!payload || payload.from === myId) return;
    if (payload.to && payload.to !== myId) return;

    if (payload.type === 'hello') {
      await createPeer(payload.from, true);
      // quien recibe hello inicia oferta si tiene id "menor" para evitar glare simple
      if (myId < payload.from) {
        const entry = peers.get(payload.from);
        if (entry && entry.pc.signalingState === 'stable') {
          try {
            entry.makingOffer = true;
            await entry.pc.setLocalDescription(await entry.pc.createOffer());
            sendSignal({ type: 'sdp', to: payload.from, from: myId, sdp: entry.pc.localDescription });
          } catch (e) {} finally { entry.makingOffer = false; }
        }
      }
      return;
    }

    if (payload.type === 'bye') {
      closePeer(payload.from);
      emitTalk(payload.from, false);
      return;
    }

    if (payload.type === 'talk') {
      emitTalk(payload.from, !!payload.on, payload.name);
      return;
    }

    let entry = peers.get(payload.from);
    if (!entry) entry = await createPeer(payload.from, myId > payload.from);
    const pc = entry.pc;

    if (payload.type === 'sdp') {
      const desc = payload.sdp;
      const offerCollision = desc.type === 'offer' && (entry.makingOffer || pc.signalingState !== 'stable');
      entry.ignoreOffer = !entry.polite && offerCollision;
      if (entry.ignoreOffer) return;
      await pc.setRemoteDescription(desc);
      if (desc.type === 'offer') {
        // asegurar sendrecv si ya hay mic
        if (localStream) {
          const senders = pc.getSenders();
          if (!senders.some(s => s.track && s.track.kind === 'audio')) {
            localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
          }
        }
        await pc.setLocalDescription(await pc.createAnswer());
        sendSignal({ type: 'sdp', to: payload.from, from: myId, sdp: pc.localDescription });
      }
      return;
    }

    if (payload.type === 'ice' && payload.candidate) {
      try {
        await pc.addIceCandidate(payload.candidate);
      } catch (e) {
        if (!entry.ignoreOffer) console.warn('ice', e);
      }
    }
  }

  function closePeer(peerId) {
    const entry = peers.get(peerId);
    if (!entry) return;
    try { entry.pc.close(); } catch (e) {}
    if (entry.audio) {
      entry.audio.srcObject = null;
      entry.audio.remove();
    }
    peers.delete(peerId);
  }

  async function join(roomIdIn, name) {
    await leave();
    const sb = client();
    if (!sb) throw new Error('Supabase no listo');
    roomId = roomIdIn;
    myId = PingoMP.clientId();
    myName = name || 'invitado';
    ready = false;
    channel = sb.channel('pingo-chat:' + roomId, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        if (!payload) return;
        emitChat(payload);
      })
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        handleSignal(payload).catch(e => console.warn(e));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          ready = true;
          sendSignal({ type: 'hello', from: myId, name: myName });
        }
      });
  }

  async function leave() {
    if (talking) await setTalking(false);
    sendSignal({ type: 'bye', from: myId });
    peers.forEach((_, id) => closePeer(id));
    peers.clear();
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    if (channel) {
      const sb = client();
      if (sb) await sb.removeChannel(channel);
      channel = null;
    }
    ready = false;
    roomId = null;
  }

  function sendText(text) {
    const t = String(text || '').trim().slice(0, 240);
    if (!t || !channel || !ready) return false;
    const payload = {
      id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
      from: myId,
      name: myName,
      text: t,
      at: Date.now()
    };
    channel.send({ type: 'broadcast', event: 'chat', payload });
    emitChat(payload); // eco local
    return true;
  }

  async function setTalking(on) {
    if (on) {
      try {
        await ensureMic();
      } catch (e) {
        throw new Error('No se pudo abrir el micrófono. Revisa permisos.');
      }
      localStream.getAudioTracks().forEach(t => { t.enabled = true; });
      talking = true;
      sendSignal({ type: 'talk', from: myId, name: myName, on: true });
      emitTalk(myId, true, myName);
    } else {
      if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = false; });
      talking = false;
      sendSignal({ type: 'talk', from: myId, name: myName, on: false });
      emitTalk(myId, false, myName);
    }
  }

  function isTalking() { return talking; }
  function setHandlers(h) {
    onChat = h && h.onChat || null;
    onTalk = h && h.onTalk || null;
  }

  global.PingoChat = { join, leave, sendText, setTalking, isTalking, setHandlers };
})(window);
