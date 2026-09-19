const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('@angular/compiler');
const {Injector,runInInjectionContext,signal}=require('@angular/core');
const {HttpClient}=require('@angular/common/http');
const {of,throwError}=require('rxjs');
const base='../.cache/audit-tests/';
const get=p=>require(base+p);
const {RequestState}=get('core/request-state.js');
const {ProgressDocument}=get('core/progress-document.js');
const {LearningApi}=get('core/learning-api.js');
const {BattleRecord}=get('game/battle-record.js');
const {GameService}=get('game/game.service.js');
const {CardsService}=get('cards/cards.service.js');
const {IdiomContentService}=get('idioms/idiom-content.service.js');
const {IdiomProgressService}=get('idioms/idiom-progress.service.js');
const {LocalIdiomProgressRepository}=get('idioms/idiom-storage.js');
const {LocalWordGameProgressRepository,emptyProgress}=get('word-games/word-game-storage.js');
const {WordGameContentRepository}=get('word-games/word-game-content.js');
const {WordGameProgressService}=get('word-games/word-game-progress.js');
const {FinderSession,GuessSession,DefinitionSession}=get('word-games/word-game-sessions.js');
const {validateWordGameContent}=get('word-games/word-game-validation.js');
const {validateIdiomContent}=get('idioms/idiom-validation.js');
const load=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'../src/assets',p),'utf8'));
const wordFiles=['word-bank.json','word-finder/puzzles.json','word-guess/rounds.json','definition-guess/rounds.json','word-guess/accepted-five-letter.json'];
const words=wordFiles.map(p=>load('game-data/word-games/'+p));
const idioms=['idioms.json','categories.json','exercises.json'].map(p=>load('data/idioms/'+p));
const make=(Type,providers)=>runInInjectionContext(Injector.create({providers}),()=>new Type());
const deferred=()=>{let resolve,reject;const promise=new Promise((res,rej)=>{resolve=res;reject=rej});return {promise,resolve,reject};};
const memory=()=>{const map=new Map();return {map,port:()=>({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)})};};

test('a stale failed request cannot clear loading or set the error of its replacement',async()=>{
 const request=new RequestState(),old=deferred(),next=deferred(); const a=request.run(()=>old.promise);
 request.reset(); const b=request.run(()=>next.promise); old.reject(Error('stale'));await a;
 assert.equal(request.busy(),true);assert.equal(request.error(),'');next.resolve();await b;assert.equal(request.busy(),false);
});
test('GameService ignores an answer response or error after navigating to another game',async()=>{
 const answer=deferred(),second=deferred();let calls=0;
 const first={id:'first',topic:'travel',question:{id:'q1'},answered:0,level:0,complete:false};
 const state=make(GameService,[{provide:LearningApi,useValue:{game:()=>++calls===1?Promise.resolve(first):second.promise,answer:()=>answer.promise}},{provide:BattleRecord,useValue:{reach(){}}}]);
 await state.load('first');const send=state.answer(1);const loadNew=state.load('second');answer.reject(Error('offline'));await send;
 assert.equal(state.request.busy(),true);assert.equal(state.request.error(),'');second.resolve({...first,id:'second'});await loadNew;assert.equal(state.game().id,'second');
});
for(const [name,Repository,key,initial] of [['idioms',LocalIdiomProgressRepository,'english-app-demo.idioms.progress.v1',{}],['word games',LocalWordGameProgressRepository,'english-app-demo.word-games.v1',emptyProgress()]]){
 test(`${name}: unreadable saved data is never overwritten`,()=>{const m=memory();m.map.set(key,'{broken');const repo=new Repository(m.port);assert.throws(()=>repo.load());assert.throws(()=>repo.save(initial));assert.equal(m.map.get(key),'{broken');});
 test(`${name}: another tab changing progress prevents stale replacement`,()=>{const m=memory(),a=new Repository(m.port),b=new Repository(m.port);a.load();b.load();a.save(initial);assert.throws(()=>b.save(initial));assert.deepEqual(new Repository(m.port).load(),initial);});
}
test('failed storage writes preserve the previous value and may be retried',()=>{
 let value=null,denied=false;const doc=new ProgressDocument(()=>({getItem:()=>value,setItem:(k,v)=>{if(denied)throw Error('quota');value=v;}}),'test');
 doc.load(()=>({}));doc.save({score:1});denied=true;assert.throws(()=>doc.save({score:2}));assert.equal(value,'{"score":1}');denied=false;doc.save({score:2});assert.equal(value,'{"score":2}');
});
test('Cards: failed next page does not skip cards or permit duplicate review',async()=>{
 let fail=true;const requested=[],reviews=[];
 const api={cards:async p=>{requested.push(p);if(p===1&&fail)throw Error('offline');return {items:[{id:'card'+p}],hasMore:p===0};},review:async id=>reviews.push(id)};
 const state=make(CardsService,[{provide:LearningApi,useValue:api},{provide:IdiomContentService,useValue:{}},{provide:IdiomProgressService,useValue:{progress:signal({})}}]);
 await state.load();state.flipped.set(true);await state.review(true);state.flipped.set(true);await state.review(true);
 assert.deepEqual(reviews,['card0']);fail=false;await state.retry();assert.deepEqual(requested,[0,1,1]);assert.equal(state.current().id,'card1');
});
test('valid idiom and word-game files pass runtime validation',()=>{validateWordGameContent(...words);validateIdiomContent(...idioms);});
for(const [name,mutate] of [
 ['duplicate word',d=>d[0].words.push(d[0].words[0])],
 ['broken intersection',d=>d[1].puzzles[0].board.cells[0][0]='Z'],
 ['duplicate required word',d=>d[1].puzzles[0].requiredWordIds.push(d[1].puzzles[0].requiredWordIds[0])],
 ['unknown definition',d=>d[3].rounds[0].questions[0].wordId='missing'],
 ['wrong definition key',d=>d[3].rounds[0].questions[0].correctWordId='word_dog'],
 ['duplicate options',d=>d[3].rounds[0].questions[0].optionWordIds[1]=d[3].rounds[0].questions[0].optionWordIds[0]],
 ['invalid maxAttempts',d=>d[2].rounds[0].maxAttempts=0],
 ['invalid hint',d=>d[1].puzzles[0].hints.types=['unknown']],
 ['missing translations',d=>d[0].words[0].translationsPl=null],
])test('content rejects '+name,()=>{const d=structuredClone(words);mutate(d);assert.throws(()=>validateWordGameContent(...d));});
for(const [name,mutate] of [
 ['duplicate exercise',d=>d[2].exercises.push(d[2].exercises[0])],
 ['duplicate answer',d=>d[2].exercises[0].options[1]=d[2].exercises[0].options[0]],
 ['unknown category',d=>d[0].idioms[0].category='missing'],
 ['missing source supports',d=>d[0].idioms[0].sources=[{name:'Fixture',type:'dictionary',verified:false,supports:null}]],
])test('idioms reject '+name,()=>{const d=structuredClone(idioms);mutate(d);assert.throws(()=>validateIdiomContent(...d));});
test('word repository deduplicates concurrent loading, freezes content and retries invalid JSON content',async()=>{
 let malformed=true;const calls=new Map();const http={get:url=>{const name=url.split('word-games/')[1];calls.set(name,(calls.get(name)??0)+1);const d=structuredClone(words[wordFiles.indexOf(name)]);if(malformed&&name==='definition-guess/rounds.json')d.rounds[0].questions[0].correctWordId='word_dog';return of(d);}};
 const repo=make(WordGameContentRepository,[{provide:HttpClient,useValue:http}]);const first=repo.load();assert.equal(repo.load(),first);await assert.rejects(first);assert.equal(repo.status(),'error');assert.equal(repo.byId.size,0);
 malformed=false;const content=await repo.load();assert.equal(repo.status(),'loaded');assert.equal(Object.isFrozen(content.finder[0].letters),true);await repo.load();assert.equal(calls.get('word-bank.json'),2);
});
test('network failure keeps the completed files cached and retries only the missing file',async()=>{
 let fail=true;const calls=new Map();const repo=make(WordGameContentRepository,[{provide:HttpClient,useValue:{get:url=>{const name=url.split('word-games/')[1];calls.set(name,(calls.get(name)??0)+1);return fail&&name==='word-bank.json'?throwError(()=>Error('offline')):of(structuredClone(words[wordFiles.indexOf(name)]));}}}]);
 await assert.rejects(repo.load());fail=false;await repo.load();assert.equal(calls.get('word-bank.json'),2);assert.equal(calls.get('word-finder/puzzles.json'),1);
});
const session=(Type)=>{
 const byId=new Map(words[0].words.map(w=>[w.id,w]));const bySpelling=new Map(words[0].words.flatMap(w=>w.acceptedSpellings.map(s=>[s,w])));const saves=[];
 const content={words:words[0].words,finder:words[1].puzzles,guess:words[2].rounds,definitions:words[3].rounds,accepted:new Set(words[4].words)};
 const state=make(Type,[{provide:WordGameContentRepository,useValue:{load:async()=>content,byId,bySpelling,word:id=>byId.get(id)}},{provide:WordGameProgressService,useValue:{finish:(result,won)=>saves.push({result,won})}}]);return {state,saves,content};
};
test('Finder session: same tile once, shuffle clears selection, full round records exactly once',async()=>{
 const {state,saves,content}=session(FinderSession);await state.load();state.start(content.finder[0]);state.select(0);state.select(0);assert.equal(state.selected().length,1);state.shuffle();assert.equal(state.selected().length,0);
 for(const id of state.round().requiredWordIds){for(const l of state.repository.word(id).word){const tile=state.tiles().find(t=>t.letter.toLowerCase()===l&&!state.selected().includes(t.id));state.select(tile.id);}state.submit();}
 state.submit();assert.equal(saves.length,1);assert.equal(saves[0].result.completed,true);
});
test('Guess session: invalid word preserves attempts; hints, victory and input locking',async()=>{
 const {state,saves,content}=session(GuessSession);await state.load();state.start(content.guess[0]);for(const l of 'zzzzz')state.key(l);state.submit();assert.equal(state.state().attempts.length,0);assert.equal(state.state().message,'Not a word');
 for(let i=0;i<5;i++)state.key('Backspace');state.hint();state.hint();state.hint();state.hint();assert.equal(state.hints().length,3);
 for(const l of state.repository.word(state.round().targetWordId).word)state.key(l);state.submit();state.key('a');state.submit();assert.equal(saves.length,1);assert.equal(saves[0].won,true);assert.equal(state.draft(),'');
});
test('Definition session: hints and mistakes reach summary and save once',async()=>{
 const {state,saves,content}=session(DefinitionSession);await state.load();state.start(content.definitions[0]);state.hint();state.answer(state.question().optionWordIds.find(id=>id!==state.question().correctWordId));state.next();
 while(!state.result()){state.answer(state.question().correctWordId);state.next();}state.next();assert.equal(saves.length,1);assert.equal(saves[0].result.score,5);assert.equal(saves[0].result.hintsUsed,1);assert.equal(saves[0].result.difficultWordIds.length,1);
});
