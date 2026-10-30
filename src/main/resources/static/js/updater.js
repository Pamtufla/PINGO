/* Actualización fuera de Play Store (APK / WebIntoApp)
   1) Edita /update.json al publicar (version + apkUrl del APK en GitHub Releases u otro host)
   2) Sube el APK y pega su URL https en apkUrl
   3) La app compara y ofrece descargar / instalar
*/
(function (global) {
  const SKIP_KEY = 'pingo-skip-update';
  const APK_KEY = 'pingo-apk-version';

  function cfg() {
    return global.PINGO_CONFIG || {};
  }
  function about() {
    return global.PINGO_ABOUT || {};
  }

  function parseVer(v) {
    return String(v || '0.0.0').replace(/^v/i, '').split(/[.+-]/).map(x => parseInt(x, 10) || 0);
  }
  function cmpVer(a, b) {
    const pa = parseVer(a), pb = parseVer(b);
    const n = Math.max(pa.length, pb.length);
    for (let i = 0; i < n; i++) {
      const x = pa[i] || 0, y = pb[i] || 0;
      if (x !== y) return x - y;
    }
    return 0;
  }

  function localAppVersion() {
    return about().appVersion || '1.0.0';
  }
  function localApkVersion() {
    try {
      const s = localStorage.getItem(APK_KEY);
      if (s) return s;
    } catch (e) {}
    return about().apkVersion || localAppVersion();
  }
  function markApkInstalled(ver) {
    try { localStorage.setItem(APK_KEY, ver); } catch (e) {}
  }
  function wasSkipped(ver) {
    try { return localStorage.getItem(SKIP_KEY) === String(ver); } catch (e) { return false; }
  }
  function skip(ver) {
    try { localStorage.setItem(SKIP_KEY, String(ver)); } catch (e) {}
  }

  async function fetchManifest() {
    const base = (cfg().UPDATE_URL || '/update.json').replace(/\?.*$/, '');
    const url = base + (base.includes('?') ? '&' : '?') + 't=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo revisar actualizaciones');
    return res.json();
  }

  /**
   * @returns {null|{ remote, needApk, needWeb, force }}
   */
  async function check() {
    if (cfg().DISABLE_UPDATE_CHECK) return null;
    const remote = await fetchManifest();
    const appLocal = localAppVersion();
    const apkLocal = localApkVersion();
    const remoteVer = remote.version || remote.apkVersion || '0.0.0';
    const remoteApk = remote.apkVersion || remote.version || '0.0.0';

    const needWeb = cmpVer(remote.version || '0.0.0', appLocal) > 0;
    const needApk = !!remote.apkUrl && cmpVer(remoteApk, apkLocal) > 0;
    if (!needWeb && !needApk) return null;

    if (!remote.force && wasSkipped(remoteVer) && !needApk) return null;

    return {
      remote,
      needApk,
      needWeb,
      force: !!remote.force,
      remoteVer,
      remoteApk
    };
  }

  function startApkDownload(apkUrl) {
    if (!apkUrl) return false;
    // Descarga en el mismo WebView / navegador del APK
    const a = document.createElement('a');
    a.href = apkUrl;
    a.download = 'pingo-halloween.apk';
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
    // Fallback: también abrir en la misma ventana ayuda a algunos WebView
    try {
      const w = window.open(apkUrl, '_blank');
      if (!w) window.location.href = apkUrl;
    } catch (e) {
      window.location.href = apkUrl;
    }
    return true;
  }

  global.PingoUpdater = {
    check,
    startApkDownload,
    skip,
    markApkInstalled,
    localAppVersion,
    localApkVersion,
    cmpVer
  };
})(window);
