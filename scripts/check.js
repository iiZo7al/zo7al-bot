'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>['node_modules','.git','data'].includes(x.name) ? [] : x.isDirectory() ? files(path.join(dir,x.name)) : [path.join(dir,x.name)]); }
const all=files(root);
for(const file of all.filter(x=>x.endsWith('.js'))) {
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0) { console.error(result.stderr);process.exit(1); }
}
const {commands,slashData,get}=require('../lib/catalog');
const {question}=require('../lib/questions');
if(commands.filter(x=>x.game).length!==24) throw new Error('Expected 24 games.');
for(const name of ['brands','celebrities','countries']) for(const item of require(`../gamesdb/${name}.json`)) {
  if(!fs.existsSync(path.join(root,item.image)) || fs.statSync(path.join(root,item.image)).size===0) throw new Error(`Missing image: ${item.image}`);
}
for(const command of commands) {
  if(typeof command.run!=='function') throw new Error(`No runner: ${command.name}`);
  if(command.instructions) for(const lang of ['ar','en']) for(let i=0;i<15;i++) {
    const q=question(command.name,lang);
    if(!q.answers?.length || q.answers.some(x=>typeof x!=='string' || !x.trim()) || (!q.prompt && !q.image)) throw new Error(`Invalid question: ${command.name}/${lang}`);
  }
}
for(const command of slashData()) if(!get(command.name) || !/^[\p{Ll}\p{Lo}\p{N}_-]{1,32}$/u.test(command.name)) throw new Error(`Invalid slash name: ${command.name}`);
for(const file of all.filter(x=>x.includes(`${path.sep}SlashCommands${path.sep}`) && x.endsWith('.js'))) if(!require(file)?.name) throw new Error(`Invalid command module: ${file}`);
require('../lib/games/akinator');require('../lib/games/duels');require('../lib/games/social');require('../index');
console.log(`Zo7al • ${all.filter(x=>x.endsWith('.js')).length} JS files checked; 24 games, ${slashData().length} slash commands; Arabic/English data and bundled images valid.`);
