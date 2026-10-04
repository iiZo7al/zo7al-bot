'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {EventEmitter}=require('node:events');
const {get,commands,slashData}=require('../lib/catalog');
const {Store}=require('../lib/store');
const {Sessions}=require('../lib/sessions');
const {normalize,letters,undot}=require('../lib/text');
const {question}=require('../lib/questions');
const {card}=require('../lib/cards');
const {waitForAnswer,runQuiz}=require('../lib/games/quiz');
const {rpsWinner,boardResult,rps,ttt}=require('../lib/games/duels');
const {LocalGenie,RemoteGenie}=require('../lib/games/akinator');
const {pause,listen}=require('../lib/games/components');
class Collector extends EventEmitter {
  constructor(options={}) { super();this.options=options;this.values=[];this.ended=false;this.timer=setTimeout(()=>this.stop('time'),options.time || 1000); }
  stop(reason='done') { if(this.ended) return;this.ended=true;clearTimeout(this.timer);this.emit('end',{first:()=>this.values[0]},reason); }
  resetTimer({time}) { clearTimeout(this.timer);this.timer=setTimeout(()=>this.stop('time'),time); }
  send(item) { if(this.ended || (this.options.filter && !this.options.filter(item))) return;this.values.push(item);this.emit('collect',item);if(this.options.max && this.values.length>=this.options.max) this.stop('limit'); }
}
function component(user,id) {
  return {user:{id:user,bot:false},customId:id,deferred:false,async deferUpdate(){this.deferred=true;},async followUp(payload){this.privatePayload=payload;}};
}
async function fixture(t) {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'zo7al-test-'));
  const config={dataDir:dir,defaultLanguage:'ar',color:0xfa6f3c,timeout:50};
  const store=await new Store(config).init();
  t.after(async()=>{await store.close();await fs.rm(dir,{recursive:true,force:true});});
  return {config,store};
}
function duelContext({config,store},game,actions) {
  const all=[];let stage=0;
  const message={createdTimestamp:Date.now(),edits:[],async edit(payload){this.edits.push(payload);return this;},createMessageComponentCollector(options){
    const collector=new Collector(options); all.push(collector);
    setImmediate(()=>{
      if(stage++===0) collector.send(component('friend','accept'));
      else for(const [user,id] of actions) collector.send(component(user,id));
    });return collector;
  }};
  const ctx={config,store,sessions:new Sessions(),lang:'ar',guildId:'guild',channelId:'channel',user:{id:'host',username:'Host'},guild:{members:{async fetch(){return {id:'friend'};}}},async target(){return {id:'friend',username:'Friend',bot:false};},async reply(payload){message.edits.push(payload);return message;},async private(b,text){return b.followUp({content:text});}};
  return {ctx,message,all};
}
test('all requested aliases resolve, including Arabic and legacy commands',()=>{
  const groups={img:['img','i','صور','خمن','مشاهير'],flags:['flags','f','اعلام'],brands:['brands','علامات','شعارات'],capitals:['capitals','c','عواصم'],combine:['combine','اشبك','شبك'],cuttweet:['cutTweet','cut','كت'],dots:['dots','نقاط'],emojis:['emojis','e','ايموجي'],letters:['letters','l','حروف'],math:['math','m','رياضيات'],missing:['missing','حرف'],numbers:['numbers','num','ارقام'],opposite:['opposite','o','مضاد'],plural:['plural','جمع'],punish:['punish','عقاب'],reverse:['reverse','r','عكس'],rewrite:['rewrite','اسرع'],single:['single','مفرد'],spell:['spell','فكك'],translate:['translate','tran','ترجمة'],aki:['aki','المارد'],rps:['rps','حجرة','مقص'],ttt:['ttt','xo','ox'],wheel:['wheel','wh','عجلة']};
  assert.equal(commands.filter(x=>x.game).length,24);
  for(const [name,aliases] of Object.entries(groups)) for(const alias of aliases) assert.equal(get(alias)?.name,name,alias);
  const slash=slashData();assert.ok(slash.length<=100);assert.equal(new Set(slash.map(x=>x.name)).size,slash.length);
  for(const definition of slash) {assert.ok(get(definition.name));assert.equal(definition.dm_permission,false);assert.ok(definition.description.length<=100);}
});
test('Arabic normalization handles vowel marks, hamza and Arabic digit input',()=>{
  assert.equal(normalize('  إِسْلام   ١٢٣ '),'اسلام 123');
  assert.equal(normalize('۶۸۰۰۰۶'),'680006');
  assert.equal(letters('لُؤلُؤة كبيرة').length,10);
  assert.equal(undot('بَنات'),undot('بنات'));
});
test('first point, simultaneous wins and scores persist across restart',async t=>{
  const {config,store}=await fixture(t);
  assert.equal(await store.addPoint('new-user'),1);
  await Promise.all(Array.from({length:30},()=>store.addPoint('new-user')));
  assert.equal(await store.points('new-user'),31);
  await store.addPoint('second');await store.setLanguage('guild','en');
  const restarted=await new Store(config).init();
  assert.equal(await restarted.points('new-user'),31);assert.equal(await restarted.language('guild'),'en');
  assert.equal((await restarted.top())[0].id,'new-user');await restarted.close();
});
test('corrupted storage fails without overwriting scores',async t=>{
  const {config,store}=await fixture(t);await store.addPoint('user');
  await fs.writeFile(store.file,'bad json');
  await assert.rejects(new Store(config).init());
  assert.equal(await fs.readFile(store.file,'utf8'),'bad json');
});
test('MongoDB first-win update uses atomic increment without conflicting insert defaults',async()=>{
  const store=new Store({});let received;
  store.Point={findOneAndUpdate(filter,update,options){received={filter,update,options};return {async lean(){return {points:1};}};}};
  assert.equal(await store.addPoint('first'),1);assert.deepEqual(received.update,{$inc:{points:1}});assert.equal(received.options.setDefaultsOnInsert,false);assert.equal(received.options.upsert,true);
});
test('channel locks are isolated and releasing an old session cannot erase a new game',async()=>{
  const sessions=new Sessions();const first=sessions.acquire('g','a','u');
  assert.equal(sessions.acquire('g','a','v'),null);assert.ok(sessions.acquire('g','b','v'));
  await sessions.cancel(first);const next=sessions.acquire('g','a','v');sessions.release(first);assert.equal(sessions.get('g','a'),next);
  await sessions.cancelGuild('g');assert.equal(sessions.active.size,0);
});
test('stop aborts pending reveal timers immediately',async()=>{
  const sessions=new Sessions(),session=sessions.acquire('g','c','u');
  const waiting=pause(session,10000);await sessions.cancel(session);assert.equal(await waiting,false);
});
test('both languages have valid questions for every quiz; generated answers match task',()=>{
  for(const lang of ['ar','en']) for(const game of commands.filter(x=>x.instructions)) for(let i=0;i<30;i++) {
    const q=question(game.name,lang);assert.ok(q.prompt || q.image);assert.ok(q.answers.length>0);
    if(game.name==='letters') assert.equal(q.answers[0],String(letters(q.prompt).length));
    if(game.name==='combine') assert.equal(letters(q.prompt).join(''),letters(q.answers[0]).join(''));
    if(game.name==='spell') assert.equal(q.answers[0],letters(q.prompt).join(' '));
    if(game.name==='reverse') assert.equal(q.answers[0],letters(q.prompt).reverse().join(''));
    if(game.name==='dots') assert.ok(q.answers.every(a=>undot(a)===q.prompt));
    if(game.name==='math') {const [a,op,b]=q.prompt.split(' ');const expected={'+':()=>+a+(+b),'−':()=>a-b,'×':()=>a*b,'÷':()=>a/b}[op]();assert.equal(Number(q.answers[0]),expected);}
  }
});
test('local card rendering works for Arabic, flags, logos and celebrity portraits',async()=>{
  for(const name of ['dots','math','flags','brands','img']) {
    const attachment=await card(question(name,'ar'),'زحل');assert.equal(attachment.name,'challenge.png');assert.ok(attachment.attachment.length>1000);assert.equal(attachment.attachment.subarray(1,4).toString(),'PNG');
  }
});
test('answer collector ignores bots and old messages, accepts Arabic digits and awards only first response',async()=>{
  let collector;const ctx={config:{timeout:100},channel:{createMessageCollector(options){collector=new Collector(options);return collector;}}};
  const session={stopped:false};const result=waitForAnswer(ctx,session,['123'],1000);
  collector.send({author:{id:'bot',bot:true},content:'123',createdTimestamp:2000});
  collector.send({author:{id:'old',bot:false},content:'123',createdTimestamp:500});
  collector.send({author:{id:'winner',bot:false},content:'١٢٣',createdTimestamp:2000});
  collector.send({author:{id:'second',bot:false},content:'123',createdTimestamp:2001});
  assert.equal((await result).author.id,'winner');
});
test('timeout and cancellation release quiz state without points',async t=>{
  const {config,store}=await fixture(t);const sessions=new Sessions();const outputs=[];
  const ctx={config:{...config,timeout:5},store,sessions,lang:'en',guildId:'g',channelId:'c',user:{id:'u'},channel:{createMessageCollector(options){return new Collector(options);}},async reply(payload){outputs.push(payload);return {createdTimestamp:Date.now()};},async send(payload){outputs.push(payload);}};
  await runQuiz(ctx,get('math'));assert.equal(sessions.active.size,0);assert.equal(await store.points('u'),0);assert.match(outputs.at(-1).embeds[0].data.title,/Time's up/);
  ctx.channel.createMessageCollector=options=>{const c=new Collector(options);setImmediate(()=>sessions.cancel(sessions.get('g','c')));return c;};
  await runQuiz(ctx,get('math'));assert.equal(sessions.active.size,0);assert.equal(await store.points('u'),0);
});
test('render/send errors release locks so the next game can start',async()=>{
  const sessions=new Sessions();const ctx={config:{color:0,timeout:50},sessions,lang:'ar',guildId:'g',channelId:'c',user:{id:'u'},channel:{createMessageCollector(options){return new Collector(options);}},async reply(){throw new Error('send failed');}};
  await assert.rejects(runQuiz(ctx,get('math')),/send failed/);assert.equal(sessions.active.size,0);
});
test('rock paper scissors covers all wins and ties',()=>{
  for(const [a,b,winner] of [['rock','scissors',0],['paper','rock',0],['scissors','paper',0],['rock','paper',1],['scissors','rock',1],['paper','scissors',1],['rock','rock',-1],['paper','paper',-1],['scissors','scissors',-1]]) assert.equal(rpsWinner(a,b),winner);
});
test('RPS challenge keeps spectators out and duplicate choices cannot change result',async t=>{
  const fix=await fixture(t);const {ctx,all}=duelContext(fix,'rps',[['outsider','paper'],['host','rock'],['host','paper'],['friend','scissors'],['friend','paper']]);
  await rps(ctx);assert.equal(await fix.store.points('host'),1);assert.equal(await fix.store.points('friend'),0);assert.equal(ctx.sessions.active.size,0);assert.ok(all.every(x=>x.ended));
});
test('RPS draw gives no point',async t=>{
  const fix=await fixture(t);const {ctx}=duelContext(fix,'rps',[['host','rock'],['friend','rock']]);await rps(ctx);assert.equal(await fix.store.points('host'),0);assert.equal(await fix.store.points('friend'),0);
});
test('tic tac toe checks rows, columns, diagonals, ties and incomplete boards',()=>{
  assert.equal(boardResult(['X','X','X',null,null,null,null,null,null]),'X');assert.equal(boardResult(['O',null,null,'O',null,null,'O',null,null]),'O');assert.equal(boardResult(['X',null,null,null,'X',null,null,null,'X']),'X');assert.equal(boardResult(['X','O','X','X','O','O','O','X','X']),'draw');assert.equal(boardResult(Array(9).fill(null)),null);
});
test('tic tac toe rejects wrong turns and occupied cells, scores only winner',async t=>{
  const fix=await fixture(t);const {ctx}=duelContext(fix,'ttt',[['friend','cell_8'],['host','cell_0'],['friend','cell_0'],['outsider','cell_8'],['friend','cell_3'],['host','cell_1'],['friend','cell_4'],['host','cell_2']]);
  await ttt(ctx);assert.equal(await fix.store.points('host'),1);assert.equal(await fix.store.points('friend'),0);assert.equal(ctx.sessions.active.size,0);
});
test('local genie follows truthful answers, supports back and rejected guesses',async()=>{
  const genie=new LocalGenie('ar');let view=await genie.start();const character=require('../gamesdb/akinator.json').characters.find(x=>x.en==='Cristiano Ronaldo');
  let count=0;while(view.type==='question' && count++<30) view=await genie.answer(character.traits.includes(genie.current.id) ? 0 : 1);
  assert.equal(view.type,'guess');assert.equal(view.name,character.ar);
  const back=await genie.back();assert.equal(back.type,'question');view=await genie.answer(character.traits.includes(genie.current.id) ? 0 : 1);assert.equal(view.type,'guess');
  const rejected=await genie.reject();assert.notEqual(rejected.name,character.ar);
});
test('remote genie parses form, keeps session parameters, returns guesses and supports back',async()=>{
  const replies=[`<p class="question-text" id="question-label">Is your character real?</p><script>session: 's', signature: 'k'</script>`,{step:'1',progression:'30',question:'Is your character male?'},{step:'0',progression:'0',question:'Is your character real?'},{id_proposition:'1',name_proposition:'Someone',description_proposition:'Creator',photo:'https://example.com/image.png'},{step:'2',progression:'25',question:'Another question?'}];
  const requests=[];const genie=new RemoteGenie('en',new AbortController().signal,async(url,options)=>{
    requests.push({url,body:Object.fromEntries(options.body.entries())});const result=replies.shift();return {ok:true,headers:{getSetCookie:()=>[]},async text(){return result;},async json(){return result;}};
  });
  assert.equal((await genie.start()).type,'question');assert.equal((await genie.answer(0)).question,'Is your character male?');assert.equal((await genie.back()).question,'Is your character real?');assert.equal((await genie.answer(1)).name,'Someone');assert.equal((await genie.reject()).type,'question');assert.equal(requests[1].body.session,'s');assert.equal(requests[1].body.cm,'true');assert.equal(requests[1].body.answer,'0');
});

test('quiz awards the first correct response once, including the very first player',async t=>{
  const fix=await fixture(t),sessions=new Sessions();const random=Math.random;Math.random=()=>0;t.after(()=>{Math.random=random;});
  const ctx={...fix,sessions,lang:'ar',guildId:'g',channelId:'c',user:{id:'host'},async reply(){return {createdTimestamp:1000};},async send(){},channel:{createMessageCollector(options){const c=new Collector(options);setImmediate(()=>{c.send({author:{id:'new',bot:false},content:'٢',createdTimestamp:1001});c.send({author:{id:'other',bot:false},content:'2',createdTimestamp:1002});});return c;}}};
  await runQuiz(ctx,get('math'));assert.equal(await fix.store.points('new'),1);assert.equal(await fix.store.points('other'),0);assert.equal(sessions.active.size,0);
});
test('punishment early click loses, awards opponent and cancels reveal',async t=>{
  const fix=await fixture(t),{ctx,message}=duelContext(fix,'punish',[['host','react']]);
  await require('../lib/games/duels').punish(ctx);assert.equal(await fix.store.points('host'),0);assert.equal(await fix.store.points('friend'),1);assert.equal(ctx.sessions.active.size,0);assert.ok(message.edits.some(x=>x.embeds?.[0].data.description?.includes('قبل الضوء الأخضر')));
});
test('wheel sanitizes names and requires two distinct entries without awarding points',async t=>{
  const fix=await fixture(t);const results=[];const message={async edit(x){results.push(x);return this;}};
  const ctx={...fix,sessions:new Sessions(),lang:'en',guildId:'g',channelId:'c',user:{id:'host'},slash:true,option(){return 'Alice, Bob, Alice, @everyone';},async reply(x){results.push(x);return message;}};
  await require('../lib/games/social').wheel(ctx);const last=results.findLast(x=>x.embeds).embeds[0].data.description;assert.match(last,/Alice|Bob|everyone/);assert.ok(!last.includes('@'));assert.equal(ctx.sessions.active.size,0);assert.equal(await fix.store.points('host'),0);
  ctx.option=()=> 'one,one';let invalid='';ctx.reply=async text=>{invalid=text;};await require('../lib/games/social').wheel(ctx);assert.match(invalid,/2 to 20/);assert.equal(ctx.sessions.active.size,0);
});
test('emoji memory hides the target before enabling choices and saves a correct point',async t=>{
  const fix=await fixture(t);let target,previous;const history=[];
  const message={async edit(payload){history.push(payload);previous=payload;return this;},createMessageComponentCollector(options){const c=new Collector(options);setImmediate(()=>{const button=previous.components.flatMap(x=>x.components).find(x=>x.data.emoji?.name===target);c.send(component('winner',button.data.custom_id));});return c;}};
  const ctx={...fix,sessions:new Sessions(),lang:'en',guildId:'g',channelId:'c',user:{id:'host'},async reply(payload){target=payload.embeds[0].data.description.split('# ')[1];history.push(payload);return message;},async private(){}};
  await require('../lib/games/social').emojis(ctx);assert.ok(!history[1].embeds[0].data.description.includes(target));assert.equal(await fix.store.points('winner'),1);assert.equal(ctx.sessions.active.size,0);
});
test('an invited player may decline without creating points',async t=>{
  const fix=await fixture(t);const {ctx,message}=duelContext(fix,'rps',[]);
  message.createMessageComponentCollector=options=>{const c=new Collector(options);setImmediate(()=>c.send(component('friend','decline')));return c;};
  await rps(ctx);assert.equal(await fix.store.points('host'),0);assert.equal(await fix.store.points('friend'),0);assert.equal(ctx.sessions.active.size,0);
});

test('fast answers arriving during send are buffered, and pre-question guesses are excluded',async t=>{
  const fix=await fixture(t),sessions=new Sessions();let collector;const original=Math.random;Math.random=()=>0;t.after(()=>{Math.random=original;});
  const ctx={...fix,sessions,lang:'en',guildId:'g',channelId:'c',user:{id:'host'},channel:{createMessageCollector(options){collector=new Collector(options);return collector;}},async reply(){
    collector.send({author:{id:'too-early',bot:false},content:'2',createdTimestamp:999});collector.send({author:{id:'fast',bot:false},content:'2',createdTimestamp:1001});return {createdTimestamp:1000};
  },async send(){}};
  await runQuiz(ctx,get('math'));assert.equal(await fix.store.points('fast'),1);assert.equal(await fix.store.points('too-early'),0);assert.equal(sessions.active.size,0);
});
test('unavailable Akinator falls back locally and finishes via player-only buttons',async t=>{
  const fix=await fixture(t),sessions=new Sessions();const oldFetch=global.fetch,mode=process.env.AKINATOR_MODE;
  global.fetch=async()=>{throw new Error('offline');};delete process.env.AKINATOR_MODE;
  t.after(()=>{global.fetch=oldFetch;if(mode===undefined) delete process.env.AKINATOR_MODE;else process.env.AKINATOR_MODE=mode;});
  const database=require('../gamesdb/akinator.json'),character=database.characters.find(x=>x.en==='Cristiano Ronaldo');let collector,payload;const all=[];
  function advance() {
    if(!collector || collector.ended) return;
    const text=payload.embeds[0].data.description;
    const q=database.questions.find(x=>text.includes('**'+x.en+'**'));
    collector.send(component('host',q ? 'answer_'+(character.traits.includes(q.id) ? '0' : '1') : 'confirm'));
  }
  const message={async edit(x){all.push(x);if(x.embeds) payload=x;if(x.components?.length) setImmediate(advance);return this;},createMessageComponentCollector(options){collector=new Collector(options);setImmediate(()=>{collector.send(component('outsider','answer_0'));advance();});return collector;}};
  const ctx={...fix,sessions,lang:'en',guildId:'g',channelId:'c',user:{id:'host'},async reply(x){payload=x;all.push(x);return message;},async private(b,text){return b.followUp({content:text});}};
  await require('../lib/games/akinator').aki(ctx);assert.ok(all[0].embeds[0].data.title.includes('Local genie'));assert.ok(all.some(x=>x.embeds?.[0].data.description?.includes(character.en)));assert.equal(await fix.store.points('host'),0);assert.equal(sessions.active.size,0);
});
