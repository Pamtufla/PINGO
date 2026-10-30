const {chromium}=require('playwright');const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const exec=promisify(execFile),root=path.resolve('src/main/resources/static');
const pg=process.env.PINGO_TEST_DATABASE||'postgresql://postgres@127.0.0.1:55439/postgres';
const sql=async q=>(await exec('psql',[pg,'-At','-v','ON_ERROR_STOP=1','-c',q],{maxBuffer:5e6})).stdout.trim();
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const stub=`window.supabase={createClient:()=>({rpc:async(name,args)=>{try{const r=await fetch('/test-rpc',{method:'POST',body:JSON.stringify(args)});return await r.json()}catch(e){return {error:{message:e.message}}}},from:()=>({select:()=>({order:()=>({limit:async()=>({data:[]})}),eq:()=>({maybeSingle:async()=>({data:null})})})}),channel:()=>({on(){return this},subscribe(){return this},send(){return Promise.resolve()},track(){return Promise.resolve()},presenceState(){return {}}}),removeChannel:async()=>{}})};`;
const server=http.createServer(async(req,res)=>{try{
 if(req.url==='/test-rpc'){let body='';for await(const chunk of req)body+=chunk;const a=JSON.parse(body);try{const result=await sql(`select pingo_action(${quote(a.p_client)},${quote(a.p_secret)},${quote(a.p_action)},${a.p_room?quote(a.p_room)+'::uuid':'null'},${quote(JSON.stringify(a.p_data).replace(/[^\x00-\x7F]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')))}::jsonb);`);res.end(JSON.stringify({data:JSON.parse(result)}));}catch(e){res.end(JSON.stringify({error:{message:e.stderr}}));}return;}
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/js/config.js'){res.setHeader('Content-Type','text/javascript');res.end("window.PINGO_CONFIG={SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'test',DISABLE_UPDATE_CHECK:true};");return;}
 const file=path.join(root,url.pathname==='/'?'index.html':url.pathname);if(!file.startsWith(root))throw Error('Invalid path');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));
 }catch(e){res.statusCode=500;res.end(e.message);}});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
 try{
 const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844}}),browser.newContext({viewport:{width:390,height:844}})]);
 for(const c of contexts){await c.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:stub}));await c.route('https://fonts.**/**',r=>r.abort());}
 const [host,guest]=await Promise.all(contexts.map(c=>c.newPage()));for(const page of [host,guest]){page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message)});page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text())});}
 async function setup(page,name){await page.goto(base);await page.evaluate(()=>localStorage.setItem('pingo-tutorial-done','1'));await page.click('#goPlay');await page.fill('#nameIn',name);await page.selectOption('#ruleMinis','0');await page.selectOption('#ruleSwaps','0');}
 await setup(host,'Host');await host.click('#modeHost');await host.check('#rulePodium');await host.click('#startNamed');await host.waitForSelector('#lobby.on').catch(async e=>{console.error('HOST',await host.locator('#toast').textContent());throw e});const code=await host.locator('#lobbyCode').innerText();
 await setup(guest,'Guest');await guest.click('#modeJoin');await guest.fill('#roomIn',code);await guest.click('#startNamed');await guest.waitForSelector('#lobby.on');await host.click('#lobbyStart');await Promise.all([host.waitForSelector('#game.on'),guest.waitForSelector('#game.on')]);
 // Complete cards using the same awaited action used by UI buttons.
 await host.evaluate(async()=>{for(let i=0;i<st.cells.length;i++)if(st.cells[i]&&!st.marked[i])await setMark(i,true,st.cells[i].ch?'done':undefined)});
 await host.waitForFunction(()=>PingoMP.getPlayer().position===1);assert.equal(await host.evaluate(()=>PingoMP.getRoom().status),'live');
 await guest.evaluate(async()=>{for(let i=0;i<st.cells.length;i++)if(st.cells[i]&&!st.marked[i])await setMark(i,true,st.cells[i].ch?'done':undefined)});
 await Promise.all([host.waitForSelector('#results.on'),guest.waitForSelector('#results.on')]);
 assert.equal(await host.locator('#resultsList li').count(),2);assert.equal(await guest.evaluate(()=>PingoMP.getPlayer().position),2);
 await host.screenshot({path:'target/results-mobile.png',fullPage:true});const matchId=await host.evaluate(()=>pendingResults.matchId);await host.click('#resultsSave');await host.waitForFunction(()=>st===null);assert.equal(await sql(`select count(*) from match_results where match_id='${matchId}'`), '2');
 console.log('PASS browser: create/join/start, two-player podium, synchronized results, save, mobile layout');
 // Solo old-save and completion; no server writes.
 const solo=await contexts[0].newPage();solo.on('pageerror',e=>errors.push(e.message));await solo.goto(base);await solo.evaluate(()=>{localStorage.removeItem(CONFIG.STORAGE_KEY);st=null;goHome()});await solo.click('#goPlay');await solo.fill('#nameIn','Solo');await solo.selectOption('#ruleMinis','1');await solo.click('#startNamed');await solo.waitForSelector('#game.on');assert.equal(await solo.locator('.cell.minigame').count(),1);
 await solo.evaluate(()=>{const i=st.cells.findIndex(c=>c&&c.mini);toggle(i)});await solo.waitForSelector('#miniPanel:not([hidden])');
 await solo.evaluate(()=>{const buttons=[...document.querySelectorAll('#miniPanel button:not(.ghost)')],q=document.querySelector('#miniPanel p').textContent;const nums=q.match(/(\d+) \+ (\d+)/);const button=nums?buttons.find(b=>b.textContent===String(+nums[1]+ +nums[2])):buttons.find(b=>b.textContent==='◆');button.click()});
 await solo.waitForFunction(()=>st.cells.some((c,i)=>c&&c.mini&&st.marked[i]));await solo.reload();await solo.waitForSelector('#game.on');assert.equal(await solo.evaluate(()=>st.cells.some((c,i)=>c&&c.mini&&st.marked[i])),true);
 await solo.evaluate(async()=>{document.querySelector('#miniPanel').hidden=true;for(let i=0;i<st.cells.length;i++)if(st.cells[i]&&!st.marked[i])await setMark(i,true,st.cells[i].ch?'done':undefined)});assert.equal(await solo.evaluate(()=>PingoRules.crowns()),1);
 console.log('PASS browser: green tile, playable minigame, reopen card, solo crown');
 await solo.evaluate(()=>{const old={name:'Legacy',size:3,code:'ABCD',cells:Array.from({length:9},(_,i)=>i===4?null:{t:'Old '+i}),marked:[true,false,false,false,true,false,false,false,false],bingos:[]};localStorage.setItem(CONFIG.STORAGE_KEY,JSON.stringify(old));});
 await solo.reload();await solo.waitForSelector('#game.on');assert.equal(await solo.evaluate(()=>st.name),'Legacy');assert.equal(await solo.evaluate(()=>st.marked[0]),true);assert.equal(await solo.locator('.cell.minigame').count(),0);console.log('PASS browser: legacy v1 save retained without regenerating card');assert.deepEqual(errors,[]);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
