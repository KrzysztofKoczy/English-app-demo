import "@angular/compiler";
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const {validateIdiomContent}=require('../.cache/audit-tests/idioms/idiom-validation.js');
const {validateWordGameContent}=require('../.cache/audit-tests/word-games/word-game-validation.js');
const assets=path.join(root,'src/assets'),errors=[],warnings=[],files=[];
const load=p=>JSON.parse(fs.readFileSync(path.join(assets,p),'utf8'));
const fail=(file,detail)=>errors.push({file,detail});
for(const name of fs.readdirSync(assets,{recursive:true}).filter(p=>p.endsWith('.json'))){try{load(name);files.push({file:name,syntax:'pass'});}catch(e){fail(name,e.message);files.push({file:name,syntax:'fail'});}}
try{validateIdiomContent(...['idioms.json','categories.json','exercises.json'].map(p=>load('data/idioms/'+p)));}catch(e){fail('idioms',e.message);}
try{validateWordGameContent(...['word-bank.json','word-finder/puzzles.json','word-guess/rounds.json','definition-guess/rounds.json'].map(p=>load('game-data/word-games/'+p)));}catch(e){fail('word-games',e.message);}
const {validateQuestions}=require('../.cache/audit-tests/core/demo-content.js');
const topics=load('demo/topics.json'),battle=load('demo/battle.json');
try {
 if(topics.version!==1||battle.version!==1)throw Error('Unsupported version');
 if(topics.topics.length!==3||new Set(topics.topics.map(t=>t.id)).size!==3)throw Error('Expected three unique topics');
 for(const topic of topics.topics){validateQuestions(topic.questions);if(topic.questions.length!==20)throw Error('Expected 20 questions per topic');}
 validateQuestions(topics.topics.flatMap(t=>t.questions));
 validateQuestions(battle.questions);
 if(battle.questions.length!==30)throw Error('Expected 30 Battle questions');
} catch(e){fail('demo',e.message);}
const questions=battle.questions.length;
const idioms=load('data/idioms/idioms.json').idioms,exercises=load('data/idioms/exercises.json').exercises;
for(const i of idioms){if(!exercises.some(e=>e.idiomId===i.id))warnings.push(`No exercises supplied for ${i.id}`);if(!i.sources.length || i.sources.some(s=>!s.verified))warnings.push(`Unverified sources for ${i.id}; status unchanged.`);}
const result={files:files.length,validSyntax:files.filter(f=>f.syntax==='pass').length,parsedBattleQuestions:questions,errors,warnings};
fs.mkdirSync(path.join(root,'.cache'),{recursive:true});fs.writeFileSync(path.join(root,'.cache/content-validation.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;

