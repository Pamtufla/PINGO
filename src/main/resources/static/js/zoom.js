/* Mobile zoom: keep layout at scale 1; only zoom in; reset anytime. */
(function(g){
 const KEY='pingo-zoom-scale';
 let scale=1,base=null,startScale=1;
 function clamp(v){return Math.min(2.6,Math.max(1,v));}
 function apply(){
  document.documentElement.style.setProperty('--pingo-zoom',String(scale));
  // Prefer CSS zoom (Chromium/WebView): keeps position:fixed working.
  const ua=navigator.userAgent||'';
  const useCssZoom=/Android|PingoAndroid|Chrome|CriOS/.test(ua);
  if(useCssZoom){
   document.documentElement.style.zoom=String(scale);
   document.body.style.transform='';
   document.body.classList.remove('zoomed');
  }else{
   document.documentElement.style.zoom='';
   document.body.style.transform=scale>1.01?('scale('+scale+')'):'';
   document.body.classList.toggle('zoomed',scale>1.01);
  }
  try{localStorage.setItem(KEY,String(scale));}catch(e){}
  const label=document.getElementById('zoomLevel');
  if(label)label.textContent=Math.round(scale*100)+'%';
 }
 function set(v){scale=clamp(v);apply();}
 function reset(){set(1);if(window.scrollTo)window.scrollTo(0,0);}
 function bump(d){set(scale+d);}
 function dist(a,b){const dx=a.clientX-b.clientX,dy=a.clientY-b.clientY;return Math.hypot(dx,dy);}
 document.addEventListener('touchstart',e=>{
  if(e.touches.length===2){base=dist(e.touches[0],e.touches[1]);startScale=scale;}
 },{passive:true});
 document.addEventListener('touchmove',e=>{
  if(e.touches.length===2&&base){
   const ratio=dist(e.touches[0],e.touches[1])/base;
   // Only allow zoom-in from current start; never below 1.
   set(Math.max(1,startScale*ratio));
  }
 },{passive:true});
 document.addEventListener('touchend',()=>{base=null;},{passive:true});
 try{const saved=parseFloat(localStorage.getItem(KEY));if(saved>=1)scale=clamp(saved);}catch(e){}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
 g.PingoZoom={get:()=>scale,set,reset,bump,apply};
})(window);
