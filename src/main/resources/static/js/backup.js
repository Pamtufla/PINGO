/* Explicit recovery backup. Contains an installation credential: keep the file private. */
(function(){
 const keys=['pingo-identity-v2','pingo-crowns-v2','pingo-remote-crowns','pingo-history-v1','bingo-halloween-v1','pingo-client-id','pingo-avatar','pingo-zoom-scale'];
 function bindBackup(){
  const exp=document.getElementById('exportProgress');
  const imp=document.getElementById('importProgress');
  if(!exp||!imp||exp.dataset.bound)return;exp.dataset.bound='1';
  exp.onclick=()=>{
  try{PingoRules.identity();const data={format:'pingo-backup',version:1,values:Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]))};if(typeof st!=='undefined'&&st)data.values['bingo-halloween-v1']=JSON.stringify(st);const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='pingo-copia-privada.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){alert('No se pudo exportar: '+e.message)}
 };
  imp.onchange=async event=>{
  try{
   if(PingoMP.getRoom())throw new Error('Sal de la sala antes de restaurar');
   const file=event.target.files[0];if(!file)return;if(file.size>5e6)throw new Error('Copia demasiado grande');
   const backup=JSON.parse(await file.text());if(backup.format!=='pingo-backup'||backup.version!==1||!backup.values)throw new Error('Copia incompatible');
   const identity=JSON.parse(backup.values['pingo-identity-v2']);if(!/^v2-[0-9a-f-]{36}$/.test(identity.id)||typeof identity.secret!=='string'||identity.secret.length!==72)throw new Error('Identidad inválida');
   for(const key of keys){const value=backup.values[key];if(value!==null&&value!==undefined&&typeof value!=='string')throw new Error('Datos inválidos');}
   for(const key of ['pingo-crowns-v2','pingo-history-v1','bingo-halloween-v1']){
    if(backup.values[key]===null||backup.values[key]===undefined)continue;
    const value=JSON.parse(backup.values[key]);
    if(key==='pingo-history-v1'&&!Array.isArray(value))throw new Error('Historial inválido');
    if(key==='pingo-crowns-v2'&&(!value||typeof value!=='object'||Array.isArray(value)||Object.values(value).some(x=>typeof x!=='string')))throw new Error('Coronas inválidas');
    if(key==='bingo-halloween-v1'&&value!==null&&(!Array.isArray(value.cells)||!Array.isArray(value.marked)||value.cells.length!==value.marked.length))throw new Error('Cartilla inválida');
   }
   if(!confirm('Esta copia reemplazará el perfil y el historial local. ¿Restaurar?'))return;
   const original=Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]));
   try{for(const key of keys){const value=backup.values[key];if(value===null||value===undefined)localStorage.removeItem(key);else localStorage.setItem(key,value);}}
   catch(e){for(const key of keys){if(original[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,original[key]);}throw e;}
   location.reload();
  }catch(e){alert('No se pudo restaurar: '+e.message)}finally{event.target.value=''}
 };
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindBackup);else bindBackup();
})();
