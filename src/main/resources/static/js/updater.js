(function(g){
 const cfg=()=>g.PINGO_CONFIG||{},about=()=>g.PINGO_ABOUT||{};let checking=null,downloading=false;
 function parse(v){const m=String(v).match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/);if(!m)throw new Error('Versión inválida');const pre=m[4]?m[4].split('.'):[];if(pre.some(x=>/^\d+$/.test(x)&&x.length>1&&x[0]==='0'))throw new Error('Versión inválida');return {core:m.slice(1,4).map(BigInt),pre};}
 function cmpVer(a,b){const x=parse(a),y=parse(b);for(let i=0;i<3;i++)if(x.core[i]!==y.core[i])return x.core[i]>y.core[i]?1:-1;if(!x.pre.length||!y.pre.length)return x.pre.length?-1:y.pre.length?1:0;for(let i=0;i<Math.max(x.pre.length,y.pre.length);i++){const a=x.pre[i],b=y.pre[i];if(a===b)continue;if(a===undefined)return -1;if(b===undefined)return 1;const an=/^\d+$/.test(a),bn=/^\d+$/.test(b);if(an&&bn)return BigInt(a)>BigInt(b)?1:-1;if(an!==bn)return an?-1:1;return a>b?1:-1;}return 0;}
 function localAppVersion(){return about().appVersion;}
 function localApkVersion(){const m=navigator.userAgent.match(/PingoAndroid\/([\w.+-]+)/);return m?m[1]:null;}
 function ios(){return /iPad|iPhone|iPod|PingoIOS/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);}
 function apkUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hostname!=='github.com'||!/^\/Pamtufla\/PINGO\/releases\/download\/[^/]+\/[^/]+\.apk$/.test(u.pathname)||u.search||u.hash)throw new Error('Descarga fuera del repositorio oficial');return u.href;}
 async function fetchManifest(){const url=new URL(cfg().UPDATE_URL||'/update.json',location.href);if(url.origin!==location.origin)throw new Error('Fuente de actualización no autorizada');url.searchParams.set('t',Date.now());const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),10000);try{const response=await fetch(url,{cache:'no-store',signal:ctrl.signal});if(!response.ok)throw new Error('Servidor de actualizaciones no disponible');const m=await response.json();parse(m.version);if(m.apkVersion)parse(m.apkVersion);if(m.apkUrl)apkUrl(m.apkUrl);if(m.notes&&typeof m.notes!=='string')throw new Error('Manifiesto inválido');return m;}finally{clearTimeout(timeout);}}
 async function check(manual){if(checking)return checking;checking=(async()=>{if(cfg().DISABLE_UPDATE_CHECK)throw new Error('La comprobación de actualizaciones está desactivada');const remote=await fetchManifest(),local=localAppVersion();parse(local);const apk=localApkVersion(),needApk=!!apk&&cmpVer(remote.apkVersion||remote.version,apk)>0,needWeb=cmpVer(remote.version,local)>0;
 const iosNative=navigator.userAgent.match(/PingoIOS\/([\w.+-]+)/);const needStore=!!iosNative&&cmpVer(remote.iosVersion||remote.version,iosNative[1])>0;
 if(!apk&&/Android/.test(navigator.userAgent)&&/; wv\)/.test(navigator.userAgent))throw new Error('Este contenedor antiguo no comunica su versión instalada. No se pudo comprobar el APK.');
 if(!needApk&&!needWeb&&!needStore)return {status:'current'};
 const info={status:'available',remote,needApk:!ios()&&needApk,needWeb,needStore,force:!!remote.force,remoteVer:remote.version};
 if(!manual&&!info.force&&localStorage.getItem('pingo-skip-update')===remote.version)return {...info,status:'skipped'};return info;})();try{return await checking;}finally{checking=null;}}
 function skip(ver){localStorage.setItem('pingo-skip-update',ver);}
 function startApkDownload(remote){if(downloading)throw new Error('Ya hay una descarga en curso');if(!localApkVersion()||ios())throw new Error('La instalación APK solo está disponible en Android');const url=apkUrl(remote.apkUrl);if(!/^[a-f0-9]{64}$/i.test(remote.sha256||''))throw new Error('La publicación no incluye una suma SHA-256 válida');if(!g.PingoNative||!g.PingoNative.postMessage)throw new Error('Esta versión requiere instalar manualmente desde el repositorio oficial');downloading=true;g.PingoNative.postMessage(JSON.stringify({url,sha256:remote.sha256}));}
 function openStore(url){const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password)throw new Error('Enlace inválido');if(u.hostname!=='apps.apple.com'&&u.hostname!=='testflight.apple.com'&&u.hostname!=='github.com')throw new Error('Enlace iOS no autorizado');location.href=u.href;}
 function iosNativeVersion(){const m=navigator.userAgent.match(/PingoIOS\/([\w.+-]+)/);return m?m[1]:null;}
 function isIosSafari(){return ios()&&!iosNativeVersion()&&!window.navigator.standalone;}
 function iosInstallHint(remote){
  if(remote&&remote.testFlightUrl)return {kind:'testflight',url:remote.testFlightUrl,title:'TestFlight'};
  if(remote&&remote.appStoreUrl)return {kind:'store',url:remote.appStoreUrl,title:'App Store'};
  if(remote&&remote.iosIpaUrl)return {kind:'ipa',url:remote.iosIpaUrl,title:'Descargar IPA'};
  return {kind:'safari',url:null,title:'Añadir a pantalla de inicio'};
 }
 g.addEventListener('pingo-download',e=>{
  if(e.detail.status==='error'||e.detail.status==='ready')downloading=false;
  if(e.detail.status==='ready'){
   try{localStorage.setItem('pingo-pending-apk-reload','1');}catch(err){}
  }
 });
 // After an APK update, native shell bumps User-Agent; force a clean document load once.
 try{
  const apk=localApkVersion();
  const prev=localStorage.getItem('pingo-last-apk-ua');
  if(apk&&prev&&prev!==apk){localStorage.setItem('pingo-last-apk-ua',apk);localStorage.removeItem('pingo-pending-apk-reload');location.replace(location.pathname+'?fresh='+encodeURIComponent(apk)+'&t='+Date.now());}
  else if(apk) localStorage.setItem('pingo-last-apk-ua',apk);
 }catch(err){}
 g.PingoUpdater={check,skip,cmpVer,localAppVersion,localApkVersion,startApkDownload,openStore,ios,iosNativeVersion,isIosSafari,iosInstallHint};
})(window);
