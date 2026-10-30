/* Avatar SVG catalog — stylized faces (m/f). */
(function(g){
 function svg(body){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">'+body+'</svg>';}
 const skin=['#f5c6a0','#e0a878','#c68642','#8d5524','#ffe0bd'];
 const hair=['#1a1a1a','#3b2f2f','#6b3a2a','#c4a35a','#d4d4d4','#7a1fd1','#a31515'];
 function face(s,h,extra){
  return svg(
   '<circle cx="32" cy="32" r="30" fill="#111"/><circle cx="32" cy="34" r="22" fill="'+s+'"/>'+
   '<ellipse cx="32" cy="18" rx="20" ry="10" fill="'+h+'"/>'+
   '<circle cx="24" cy="34" r="2.2" fill="#222"/><circle cx="40" cy="34" r="2.2" fill="#222"/>'+
   '<path d="M26 44 Q32 48 38 44" fill="none" stroke="#8a4a3a" stroke-width="1.6" stroke-linecap="round"/>'+
   (extra||'')
  );
 }
 const male=[],female=[];
 for(let i=0;i<24;i++){
  const s=skin[i%skin.length],h=hair[i%hair.length];
  male.push({id:'m'+i,gender:'m',svg:face(s,h,
   (i%3===0?'<path d="M24 40 Q32 46 40 40" fill="none" stroke="#5a3a2a" stroke-width="2"/>':'')+
   (i%4===0?'<rect x="20" y="30" width="8" height="3" rx="1" fill="#222"/><rect x="36" y="30" width="8" height="3" rx="1" fill="#222"/>':'')+
   (i%5===0?'<path d="M18 22 L22 12 L28 20" fill="'+h+'"/>':'')
  )});
  female.push({id:'f'+i,gender:'f',svg:face(s,h,
   '<path d="M12 28 Q8 40 16 48 Q20 36 14 28" fill="'+h+'"/><path d="M52 28 Q56 40 48 48 Q44 36 50 28" fill="'+h+'"/>'+
   (i%3===0?'<circle cx="32" cy="14" r="3" fill="#ffe14a"/>':'')+
   (i%4===0?'<path d="M22 40 Q32 46 42 40" fill="none" stroke="#c45" stroke-width="1.4"/>':'')+
   (i%5===0?'<circle cx="20" cy="38" r="1.6" fill="#e85"/><circle cx="44" cy="38" r="1.6" fill="#e85"/>':'')
  )});
 }
 // Themed extras
 male.push({id:'m-pumpkin',gender:'m',svg:svg('<circle cx="32" cy="34" r="24" fill="#e67a1a"/><ellipse cx="32" cy="18" rx="6" ry="4" fill="#2e9e3a"/><polygon points="22,30 26,38 18,38" fill="#111"/><polygon points="42,30 46,38 38,38" fill="#111"/><path d="M22 46 Q32 52 42 46" stroke="#111" fill="none" stroke-width="2"/>')});
 female.push({id:'f-witch',gender:'f',svg:svg('<circle cx="32" cy="36" r="20" fill="#e0a878"/><path d="M18 28 L32 8 L46 28 Z" fill="#3b2f2f"/><circle cx="32" cy="10" r="3" fill="#7a1fd1"/><circle cx="24" cy="36" r="2" fill="#222"/><circle cx="40" cy="36" r="2" fill="#222"/><path d="M26 44 Q32 48 38 44" stroke="#8a4a3a" fill="none"/>')});
 const all=[...male,...female];
 const byId=Object.fromEntries(all.map(a=>[a.id,a]));
 function get(id){return byId[id]||male[0];}
 function pick(){try{return localStorage.getItem('pingo-avatar')||'m0';}catch(e){return 'm0';}}
 function set(id){if(!byId[id])return;try{localStorage.setItem('pingo-avatar',id);}catch(e){} }
 function renderPicker(root,onPick){
  if(!root)return;root.replaceChildren();
  [['Hombre',male],['Mujer',female]].forEach(([label,list])=>{
   const h=document.createElement('p');h.className='tiny';h.textContent=label;root.append(h);
   const grid=document.createElement('div');grid.className='avatar-grid';
   list.forEach(a=>{
    const b=document.createElement('button');b.type='button';b.className='avatar-opt'+(pick()===a.id?' on':'');b.innerHTML=a.svg;b.title=a.id;
    b.onclick=()=>{set(a.id);[...root.querySelectorAll('.avatar-opt')].forEach(x=>x.classList.remove('on'));b.classList.add('on');if(onPick)onPick(a.id);};
    grid.append(b);
   });
   root.append(grid);
  });
 }
 g.PingoAvatars={all,male,female,get,pick,set,renderPicker};
})(window);
