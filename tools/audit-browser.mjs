import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env['PLAYWRIGHT_MODULE_PATH'] || 'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.env['AUDIT_BASE_URL'] || 'http://localhost:4200';
const output=process.env['AUDIT_OUTPUT'] || path.join(root,'.cache/browser-audit');
const localContent=process.argv.includes('--local-content');
fs.mkdirSync(output,{recursive:true});
const report={mode:localContent?'UI with workspace JSON supplied by test; NOT an asset-delivery verification':'Full HTTP delivery',nativeAssets:[],checks:[],errors:[]};
for(const p of ['/assets/data/idioms/idioms.json','/assets/game-data/word-games/word-bank.json']){
 const response=await fetch(base+p);report.nativeAssets.push({path:p,status:response.status});
}
const browser=await chromium.launch({channel:process.env['AUDIT_BROWSER_CHANNEL'] || 'chrome',headless:true});
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'src/assets',p),'utf8'));
const words=read('game-data/word-games/word-bank.json').words;
const bank=new Map(words.map(w=>[w.id,w]));
const finder=read('game-data/word-games/word-finder/puzzles.json').puzzles;
const guess=read('game-data/word-games/word-guess/rounds.json').rounds;
const definitions=read('game-data/word-games/definition-guess/rounds.json').rounds;
const idioms=read('data/idioms/idioms.json').idioms;
const exercises=read('data/idioms/exercises.json').exercises;
async function context(options={}){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',...options});
 if(localContent)await context.route('**/assets/**',async route=>{
  const relative=decodeURIComponent(new URL(route.request().url()).pathname.slice('/assets/'.length));
  const file=path.resolve(root,'src/assets',relative);
  if(!file.startsWith(path.resolve(root,'src/assets')+path.sep)||!fs.existsSync(file)||!file.endsWith('.json')||relative.startsWith('game-data/word-gap-duel/'))return route.continue();
  await route.fulfill({status:200,contentType:'application/json',body:fs.readFileSync(file)});
 });
 return context;
}
async function scenario(name,work,options){
 if(process.env['AUDIT_FILTER'] && !name.includes(process.env['AUDIT_FILTER']))return;
 const c=await context(options),page=await c.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{await work(page,c);assert.deepEqual(errors,[]);report.checks.push({name,status:'pass'});console.log('PASS',name);}
 catch(e){report.checks.push({name,status:'fail',error:e.message});console.error('FAIL',name,e.message);await page.screenshot({path:path.join(output,name.replace(/[^a-z0-9]+/gi,'-')+'-failure.png')}).catch(()=>{});}
 finally{await c.close();}
}
async function go(page,route){await page.goto(base+route);await page.locator('ion-router-outlet .ion-page main').waitFor();}
async function level(page,game,n=1){await go(page,'/word-games/'+game);await page.getByRole('button',{name:new RegExp('^Poziom '+n+' ·')}).click();}
async function layout(page){
 const overflow=await page.evaluate(()=>[...document.querySelectorAll('main, main *')].filter(el=>el.checkVisibility()).filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)}).map(el=>el.tagName+'.'+el.className));
 assert.deepEqual(overflow,[],'horizontal overflow');
 const small=await page.evaluate(()=>[...document.querySelectorAll('button, a, select')].filter(el=>el.checkVisibility()).filter(el=>{const r=el.getBoundingClientRect();return r.width<43.5||r.height<43.5}).map(el=>({text:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));
 assert.deepEqual(small,[],'touch targets <44px');
}
try{
 await scenario('menu-navigation-and-back',async p=>{await go(p,'/activities');await p.getByRole('link',{name:/Gry słowne/}).click();await p.waitForURL('**/word-games');await p.locator('a[href="/word-games/word-finder"]').click();await p.waitForURL('**/word-finder');await p.getByRole('button',{name:/^Poziom 1 ·/}).waitFor();await p.getByRole('link',{name:'← Gry słowne',exact:true}).click();await p.waitForURL('**/word-games');await p.getByRole('heading',{name:'Gry słowne',exact:true}).waitFor();});
 for(const size of [{width:320,height:740},{width:360,height:800},{width:390,height:844},{width:430,height:932},{width:844,height:390}]){
  await scenario('mobile-layout-'+size.width+'x'+size.height,async p=>{
   for(const route of ['/activities','/topics','/cards','/character','/battle','/idioms','/word-games']){await go(p,route);await p.locator('main h1').waitFor();await layout(p);}
   for(const name of ['word-finder','word-guess','definition-guess']){await level(p,name);await layout(p);}
   if(size.width===390)await p.screenshot({path:path.join(output,'definition-390.png')});
  },{viewport:size});
 }
 await scenario('word-guess-validation-victory-persistence-and-loss',async p=>{
  await level(p,'word-guess');await p.keyboard.type('zz');assert.equal(await p.getByRole('button',{name:'Sprawdź',exact:true}).isDisabled(),true);await p.keyboard.type('zzz');await p.getByRole('button',{name:'Sprawdź',exact:true}).click();await p.getByText('Not a word',{exact:true}).waitFor();assert.equal(await p.locator('.guess-cell.absent').count(),0);
  for(let i=0;i<5;i++)await p.getByRole('button',{name:'⌫ Usuń',exact:true}).click();
  for(let i=0;i<3;i++){await p.getByRole('button',{name:/^Podpowiedź/}).click();await p.locator('.hint').nth(i).waitFor();}assert.equal(await p.locator('.hint').count(),3);
  await p.keyboard.type(bank.get(guess[0].targetWordId).word);await p.getByRole('button',{name:'Sprawdź',exact:true}).click();await p.getByRole('region',{name:'Wynik rundy'}).waitFor();assert.equal(await p.locator('.key:not(:disabled)').count(),0);
  await p.reload();await p.getByText(/Rozegrane: 1 · Wygrane: 1/).waitFor();await p.getByRole('button',{name:/^Poziom 2 ·/}).click();
  for(let i=0;i<5;i++){await p.keyboard.type('horse');await p.getByRole('button',{name:'Sprawdź',exact:true}).click();}
  await p.getByRole('region',{name:'Wynik rundy'}).waitFor();const value=await p.evaluate(()=>JSON.parse(localStorage.getItem('little-step.word-games.v1')));assert.deepEqual(value.guess,{currentStreak:0,bestStreak:1,played:2,won:1});
 });
 await scenario('definition-full-round-and-repeat',async p=>{
  await level(p,'definition-guess');
  for(let i=0;i<6;i++){const q=definitions[0].questions[i];if(i===0)await p.getByRole('button',{name:/^Podpowiedź/}).click();const id=i===0?q.optionWordIds.find(id=>id!==q.correctWordId):q.correctWordId;await p.getByRole('button',{name:bank.get(id).word,exact:true}).click();await p.getByText(bank.get(q.wordId).exampleEn,{exact:true}).waitFor();assert.equal(await p.locator('.option:not(:disabled)').count(),0);await p.getByRole('button',{name:i===5?'Zobacz wynik':'Następne pytanie',exact:true}).click();}
  await p.getByRole('heading',{name:'Twój wynik: 5 / 6'}).waitFor();await p.getByRole('heading',{name:'Warto powtórzyć'}).waitFor();await p.getByRole('button',{name:'Zagraj ponownie',exact:true}).click();await p.getByText('Pytanie 1 / 6 · Punkty: 0',{exact:true}).waitFor();
 });
 async function points(p,letters){await p.locator('.wheel').scrollIntoViewIfNeeded();const used=new Set(),points=[];for(const l of letters){const buttons=p.getByRole('button',{name:new RegExp('^Litera '+l.toUpperCase()+',')});for(let i=0;i<await buttons.count();i++){const b=buttons.nth(i),id=await b.getAttribute('data-tile');if(used.has(id))continue;used.add(id);const r=await b.boundingBox();points.push({x:r.x+r.width/2,y:r.y+r.height/2});break;}}return points;}
 async function mouseWord(p,word){const ps=await points(p,word);await p.mouse.move(ps[0].x,ps[0].y);await p.mouse.down();for(const point of ps.slice(1))await p.mouse.move(point.x,point.y,{steps:8});await p.mouse.up();}
 await scenario('finder-mouse-duplicate-hints-shuffle-completion',async p=>{
  await level(p,'word-finder');await mouseWord(p,'cat');await p.getByText('Dobrze! Słowo odkryte.',{exact:true}).waitFor();await mouseWord(p,'cat');await p.getByText('To słowo jest już znalezione.',{exact:true}).waitFor();
  await p.getByRole('button',{name:'Tłumaczenie',exact:true}).click();await p.getByRole('button',{name:'Odkryj literę',exact:true}).click();await p.getByRole('button',{name:'⇄ Pomieszaj',exact:true}).click();
  await mouseWord(p,'act');await mouseWord(p,'at');await p.getByRole('region',{name:'Wynik rundy'}).waitFor();
 });
 await scenario('finder-touch-cancel-and-tap-alternative',async(p,c)=>{
  await level(p,'word-finder');const ps=await points(p,'cat'),cdp=await c.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[ps[0]]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal((await p.locator('.current-word').innerText()).trim(),'…');
  // Space touch samples like a real drag; zero-duration CDP gestures can suppress the following compatibility click.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[ps[0]]});await p.waitForTimeout(80);for(const pos of ps.slice(1)){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pos]});await p.waitForTimeout(80);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.getByText('Dobrze! Słowo odkryte.',{exact:true}).waitFor();
  await p.getByRole('button',{name:'Tryb: gest',exact:true}).tap();await p.getByRole('button',{name:'Tryb: kafelki',exact:true}).waitFor();for(const word of ['act','at']){for(const l of word)await p.getByRole('button',{name:new RegExp('^Litera '+l.toUpperCase()+',')}).tap();await p.getByRole('button',{name:'Sprawdź',exact:true}).tap();}await p.getByRole('region',{name:'Wynik rundy'}).waitFor();
 },{hasTouch:true,isMobile:true});
 await scenario('idioms-source-flashcard-exercises-refresh',async p=>{
  await go(p,'/idioms');await p.getByRole('button',{name:'Rozpocznij naukę',exact:true}).click();await p.getByRole('button',{name:'Dodaj do fiszek',exact:true}).click();await p.getByRole('button',{name:'Informacje o źródłach',exact:true}).click();await p.getByRole('heading',{name:'Źródła idiomu',exact:true}).waitFor();await p.getByRole('button',{name:'Zamknij źródła',exact:true}).click();
  for(let i=0;i<idioms.filter(i=>i.active).length;i++)await p.getByRole('button',{name:'Nie znam',exact:true}).click();
  for(let i=0;i<exercises.length;i++){const e=exercises[i];await p.getByRole('button',{name:new RegExp(e.options[e.correctOptionIndex].replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();await p.getByRole('button',{name:i===exercises.length-1?'Zobacz podsumowanie':'Następne pytanie',exact:true}).click();}
  await p.getByRole('heading',{name:'Podsumowanie sesji'}).waitFor();await p.getByRole('link',{name:'Przejdź do fiszek'}).click();await p.getByText('ZAPISANE IDIOMY',{exact:true}).waitFor();await p.reload();await p.getByText('ZAPISANE IDIOMY',{exact:true}).waitFor();
 });
 await scenario('topic-round-cards-profile-and-refresh',async p=>{
  await go(p,'/topics');await p.getByRole('button',{name:/Podróże/}).click();await p.waitForURL('**/game/*');await p.locator('.answer').first().waitFor();await p.reload();
  for(const text of ['boarding pass','reservation','station']){await p.locator('.answer').filter({hasText:text}).click();await p.getByRole('button',{name:/Następne pytanie|Zobacz wynik/}).click();}
  await p.getByText('+30 XP',{exact:true}).waitFor();await go(p,'/cards');await p.getByRole('button',{name:'Pokaż znaczenie',exact:true}).click();await p.getByRole('button',{name:'Pamiętam',exact:true}).click();await go(p,'/character');await p.getByText('30 XP',{exact:true}).waitFor();
 });
 await scenario('battle-answer-refresh-and-return',async p=>{await go(p,'/battle');await p.getByRole('button',{name:'Ćwicz',exact:true}).click();await p.waitForURL('**/game/*');await p.locator('.answer').first().click();await p.getByRole('button',{name:'Następne pytanie',exact:true}).click();await p.reload();await p.locator('.answer').first().waitFor();await p.getByRole('button',{name:'Zakończ i wróć do aktywności'}).click();await p.waitForURL('**/activities');});
 await scenario('loading-error-retry-and-empty-category',async(p,c)=>{
  await p.route('**/assets/game-data/word-games/word-bank.json',route=>route.fulfill({status:503,body:'Unavailable'}));await go(p,'/word-games/word-guess');await p.getByRole('alert').waitFor();await p.unroute('**/assets/game-data/word-games/word-bank.json');await p.getByRole('button',{name:'Spróbuj ponownie',exact:true}).click();await p.getByRole('button',{name:/^Poziom 1 ·/}).waitFor();
  await go(p,'/idioms');await p.locator('#idiom-category').selectOption('sport');await p.getByText(/Nie ma jeszcze materiałów w tej kategorii/).waitFor();assert.equal(await p.getByRole('button',{name:'Rozpocznij naukę'}).isDisabled(),true);
 });
 await scenario('dark-theme-keyboard-focus-and-not-found',async p=>{await go(p,'/activities');await p.getByRole('button',{name:'Włącz ciemny motyw'}).click();assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');await p.reload();assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');await p.keyboard.press('Tab');assert.equal(await p.locator(':focus').count(),1);await go(p,'/not-a-real-route');await p.getByRole('heading',{name:'Nie ma takiej strony.'}).waitFor();await p.getByRole('link',{name:'Wróć do aktywności'}).click();await p.waitForURL('**/activities');});
}finally{await browser.close();fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(report,null,2));}
if(report.checks.some(c=>c.status==='fail'))process.exitCode=1;

