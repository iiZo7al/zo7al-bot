'use strict';
const database=require('../../gamesdb/akinator.json');
const {buttons,listen,inSession,ButtonStyle}=require('./components');
const {tr,safe,embed}=require('../text');
function decode(value) {
  const entities={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',rsquo:"'",lsquo:"'",ldquo:'"',rdquo:'"'};
  return String(value || '').replace(/<[^>]*>/g,'').replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi,(_,key)=>{
    if(key[0]==='#') { const n=key[1].toLowerCase()==='x' ? parseInt(key.slice(2),16) : parseInt(key.slice(1),10); return n<=0x10ffff ? String.fromCodePoint(n) : ''; }
    return entities[key] || _;
  });
}
// Uses the public web form protocol documented by jgoralcz/aki-api.
// Native fetch avoids the package's certificate-download install script.
class RemoteGenie {
  constructor(lang,signal,request=fetch) { this.lang=lang;this.signal=signal;this.request=request;this.base=`https://${lang}.akinator.com`;this.cookies='';this.stepIndex=0;this.progress=0;this.mode='online'; }
  async post(route,fields) {
    const form=new FormData();
    for(const [key,value] of Object.entries({sid:'1',cm:'true',...fields})) form.set(key,String(value));
    const response=await this.request(`${this.base}/${route}`,{
      method:'POST',body:form,headers:{ ...(this.cookies ? {Cookie:this.cookies} : {}), 'User-Agent':'Zo7alBot/2.0' },
      signal:AbortSignal.any([this.signal,AbortSignal.timeout(10000)]),
    });
    if(!response.ok) throw new Error(`Akinator HTTP ${response.status}`);
    const cookies=response.headers.getSetCookie?.() || [];
    if(cookies.length) this.cookies=cookies.map(x=>x.split(';')[0]).join('; ');
    return response;
  }
  fields() { return {session:this.session,signature:this.signature,step:this.stepIndex,progression:this.progress}; }
  async start() {
    const html=await (await this.post('game',{})).text();
    this.session=html.match(/\bsession\s*:\s*['"]([^'"]+)['"]/)?.[1];
    this.signature=html.match(/\bsignature\s*:\s*['"]([^'"]+)['"]/)?.[1];
    this.question=decode(html.match(/<p[^>]*id=['"]question-label['"][^>]*>([\s\S]*?)<\/p>/)?.[1]);
    if(!this.session || !this.signature || !this.question) throw new Error('Akinator session unavailable.');
    return this.view();
  }
  view() { return this.guess ? {type:'guess',name:decode(this.guess.name_proposition),description:decode(this.guess.description_proposition),photo:this.guess.photo} : {type:'question',question:this.question}; }
  async update(route,extra={}) {
    const data=await (await this.post(route,{...this.fields(),...extra})).json();
    if(!data || /^KO|^WARN/.test(data.completion || '')) throw new Error('Akinator could not answer.');
    if(data.id_proposition || data.id_base_proposition) this.guess=data;
    else {
      if(!data.question) throw new Error('Akinator returned no question.');
      this.guess=null;this.question=decode(data.question);this.stepIndex=Number(data.step);this.progress=Number(data.progression);
    }
    return this.view();
  }
  async answer(index) { return this.update('answer',{answer:index,step_last_proposition:''}); }
  async back() { return this.stepIndex>0 ? this.update('cancel_answer') : this.view(); }
  async reject() { return this.update('exclude'); }
}
class LocalGenie {
  constructor(lang) { this.lang=lang;this.mode='local';this.candidates=[...database.characters];this.asked=[];this.history=[];this.current=null;this.guess=null;this.stepIndex=0; }
  view() {
    if(!this.candidates.length) return {type:'empty'};
    const choices=database.questions.filter(q=>!this.asked.includes(q.id)).map(q=>({q,yes:this.candidates.filter(c=>c.traits.includes(q.id)).length})).filter(x=>x.yes>0 && x.yes<this.candidates.length).sort((a,b)=>Math.abs(a.yes-this.candidates.length/2)-Math.abs(b.yes-this.candidates.length/2));
    if(this.candidates.length===1 || !choices.length || this.asked.length>=20) {
      this.guess=this.candidates[0];this.current=null;
      return {type:'guess',name:this.guess[this.lang],description:tr(this.lang,'تخمين من قاعدة زحل المحلية.','Guess from Zo7al’s local database.')};
    }
    this.current=choices[0].q;this.guess=null;
    return {type:'question',question:this.current[this.lang]};
  }
  async start() { return this.view(); }
  snapshot() { return {candidates:[...this.candidates],asked:[...this.asked],stepIndex:this.stepIndex}; }
  async answer(index) {
    if(!this.current) return this.view();
    this.history.push(this.snapshot());const id=this.current.id;this.asked.push(id);this.stepIndex++;
    if(index!==2) this.candidates=this.candidates.filter(c=>c.traits.includes(id)===[0,3].includes(index));
    return this.view();
  }
  async back() { const previous=this.history.pop();if(previous) Object.assign(this,previous);return this.view(); }
  async reject() { this.history.push(this.snapshot());this.candidates=this.candidates.filter(c=>c.id!==this.guess?.id);return this.view(); }
}
async function aki(ctx) { return inSession(ctx,async session=>{
  let engine,view,finished=false,fallback=false;
  const local=async()=>{engine=new LocalGenie(ctx.lang);fallback=true;return engine.start();};
  if(process.env.AKINATOR_MODE==='local') view=await local();
  else {
    engine=new RemoteGenie(ctx.lang,session.controller.signal);
    try { view=await engine.start(); }
    catch(error) { if(session.stopped) return;console.warn('Zo7al • Akinator unavailable; using local database.');view=await local(); }
  }
  if(session.stopped) return;
  const panel=()=>{
    const mode=engine.mode==='local' ? tr(ctx.lang,'المارد المحلي • 40 شخصية','Local genie • 40 characters') : 'Akinator';
    const note=fallback ? tr(ctx.lang,'تعمل هذه الجولة بقاعدة زحل المحلية. فكر بشخصية معروفة أو شخصية كرتونية.','This round uses Zo7al’s local database. Think of a well-known person or cartoon character.')+'\n\n' : '';
    const description=view.type==='guess' ? `${tr(ctx.lang,'أعتقد أنك تفكر في','I think you are thinking of')} **${safe(view.name)}**\n${safe(view.description)}\n\n${tr(ctx.lang,'هل تخميني صحيح؟','Am I right?')}` : note+`**${view.question}**\n\n${tr(ctx.lang,'السؤال','Question')} ${engine.stepIndex+1}`;
    const value=embed(ctx.config,`🧙 ${mode}`,description);
    if(view.type==='guess' && /^https:\/\//.test(view.photo || '')) value.setThumbnail(view.photo);
    const items=view.type==='guess' ? [{id:'confirm',label:tr(ctx.lang,'صحيح!','Correct!'),style:ButtonStyle.Success},{id:'reject',label:tr(ctx.lang,'لا، حاول مجددًا','No, try again'),style:ButtonStyle.Danger}] : [
      {id:'answer_0',label:tr(ctx.lang,'نعم','Yes')},{id:'answer_1',label:tr(ctx.lang,'لا','No')},{id:'answer_2',label:tr(ctx.lang,'لا أعرف',"Don't know"),style:ButtonStyle.Secondary},{id:'answer_3',label:tr(ctx.lang,'غالبًا','Probably')},{id:'answer_4',label:tr(ctx.lang,'غالبًا لا','Probably not')},
    ];
    items.push({id:'back',label:tr(ctx.lang,'رجوع','Back'),style:ButtonStyle.Secondary,disabled:engine.stepIndex===0},{id:'end',label:tr(ctx.lang,'إنهاء','End'),style:ButtonStyle.Danger});
    return {embeds:[value],components:buttons(items)};
  };
  const message=await ctx.reply(panel());
  await listen(ctx,message,session,async(b,collector)=>{
    if(b.user.id!==ctx.user.id) return ctx.private(b,tr(ctx.lang,'هذه جولة صاحب الأمر. ابدأ جولتك في روم آخر.','This is the host’s round. Start your own in another channel.'));
    if(finished) return;
    if(b.customId==='end' || (b.customId==='confirm' && view.type==='guess')) {
      finished=true;collector.stop('done');await message.edit({embeds:[embed(ctx.config,'🧙',tr(ctx.lang,b.customId==='confirm' ? 'عرفت الشخصية! العب مرة أخرى مع شخصية مختلفة.' : 'انتهت الجولة.',b.customId==='confirm' ? 'I found your character! Try again with a different one.' : 'Round ended.'))],components:[]});return;
    }
    try {
      if(b.customId==='back') view=await engine.back();
      else if(b.customId==='reject' && view.type==='guess') view=await engine.reject();
      else if(/^answer_[0-4]$/.test(b.customId) && view.type==='question') view=await engine.answer(Number(b.customId.slice(-1)));
      else return;
    } catch(error) {
      if(session.stopped) return;
      view=await local();
    }
    if(session.stopped) return;
    if(view.type==='empty' || engine.stepIndex>=60) {
      finished=true;collector.stop('done');await message.edit({embeds:[embed(ctx.config,'🧙',tr(ctx.lang,'لم أعرف الشخصية هذه المرة. جرب شخصية أخرى.','I could not find the character. Try another.'))],components:[]});return;
    }
    await message.edit(panel());
  },300000);
  if(!finished && !session.stopped) await message.edit({embeds:[embed(ctx.config,'🧙',tr(ctx.lang,'انتهى وقت الجولة.','The round timed out.'))],components:[]});
}); }
module.exports={aki,LocalGenie,RemoteGenie,decode};
