'use strict';
const { randomInt } = require('node:crypto');
const { buttons, listen, pause, award, inSession, ButtonStyle }=require('./components');
const {choose,tr,safe,embed}=require('../text');
const prompts={
  ar:['لو عندك يوم كامل بدون مسؤوليات، وش تسوي؟','وش اللعبة اللي ترجع لها دائمًا؟','لو تسافر الآن، أي دولة تختار؟','وش أكثر شيء يضحكك؟','وش هدفك لهذا الشهر؟','وش آخر شيء تعلمته؟','لو تصمم لعبة، وش بتكون فكرتها؟','وش أفضل ذكرياتك مع أصحابك؟','وش أكثر أكلة ما تمل منها؟','وش أغرب موقف صار لك في ماينكرافت؟','قهوة أو شاي؟ وليه؟','لو تعيش داخل لعبة أسبوع، أي لعبة تختار؟','وش المهارة اللي ودك تتقنها؟','وش أفضل اسم لسفينة فضائية؟','وش الشيء اللي يخليك تحس بالفوز؟','كيف تعرفت على أقرب صاحب لك؟','لو تربح مليون، وش أول شيء تسويه؟','وش أفضل شخصية كرتونية عندك؟','ليل أو نهار؟','أي لاعب تبغاه معك في فريقك؟'],
  en:['How would you spend a completely free day?','Which game do you always come back to?','Which country would you visit right now?','What makes you laugh the most?','What is your goal this month?','What did you learn recently?','If you made a game, what would it be about?','What is your best memory with friends?','Which food do you never get tired of?','What is your strangest Minecraft story?','Coffee or tea, and why?','Which game would you live in for a week?','Which skill would you like to master?','What would you name a spaceship?','What makes you feel like a winner?','How did you meet your closest friend?','What would you do first with a million?','Who is your favourite cartoon character?','Night or day?','Who would you pick for your team?'],
};
async function cuttweet(ctx) { return ctx.reply({embeds:[embed(ctx.config,tr(ctx.lang,'كت تويت','Quick question'),choose(prompts[ctx.lang]))]}); }
const emojiPool=['😀','😎','🥳','👻','🤖','👑','🐱','🐶','🦊','🐸','🐼','🐵','🍎','🍉','🍕','🍔','⚽','🏀','🎮','🚀','🪐','⭐','🌈','🔥','💎','🎯'];
async function emojis(ctx) { return inSession(ctx,async session=>{
  const pool=[...emojiPool]; const choices=[]; while(choices.length<4) choices.push(pool.splice(randomInt(pool.length),1)[0]);
  const target=choose(choices); let answered=false;
  const message=await ctx.reply({ embeds:[embed(ctx.config,tr(ctx.lang,'تذكر الإيموجي','Remember the emoji'),`${tr(ctx.lang,'احفظ هذا الإيموجي. سيختفي بعد 3 ثوانٍ!','Remember this emoji. It disappears in 3 seconds!')}\n\n# ${target}`)] });
  session.cleanups.push(()=>message.edit({components:[]}).catch(()=>{}));
  if(!await pause(session,3000)) return;
  await message.edit({embeds:[embed(ctx.config,tr(ctx.lang,'أي إيموجي شاهدت؟','Which emoji did you see?'),tr(ctx.lang,'أول اختيار ينهي الجولة.','The first choice ends the round.'))],components:buttons(choices.map((x,i)=>({id:`emoji_${i}`,emoji:x}))) });
  await listen(ctx,message,session,async(b,collector)=>{
    if(answered) return; const match=b.customId.match(/^emoji_([0-3])$/); if(!match || b.user.bot) return;
    answered=true;collector.stop('answered');
    const selected=choices[Number(match[1])];
    const text=selected===target ? await award(ctx,b.user.id,tr(ctx.lang,'تذكرته صح!','You remembered correctly!')) : tr(ctx.lang,`اختيار غير صحيح من <@${b.user.id}>. الإيموجي كان ${target}.`,`Incorrect choice by <@${b.user.id}>. The emoji was ${target}.`);
    await message.edit({embeds:[embed(ctx.config,tr(ctx.lang,'نتيجة الذاكرة','Memory result'),text)],components:[]});
  },ctx.config.timeout);
  if(!answered && !session.stopped) await message.edit({embeds:[embed(ctx.config,tr(ctx.lang,'انتهى الوقت',"Time's up"),target)],components:[]});
}); }
async function wheel(ctx) { return inSession(ctx,async session=>{
  const raw=ctx.option('names') || (ctx.slash ? '' : ctx.args.join(' '));
  let entries=raw ? [...new Set(raw.split(/[,،\n]/).map(x=>safe(x.trim())).filter(Boolean))] : [];
  if(raw && (entries.length<2 || entries.length>20)) return ctx.reply(tr(ctx.lang,'اكتب من 2 إلى 20 اسمًا مفصولة بفواصل.','Enter 2 to 20 names separated by commas.'));
  let message;
  if(!raw) {
    const joined=new Map([[ctx.user.id,ctx.user.username]]);let start=false;
    const draw=()=>embed(ctx.config,tr(ctx.lang,'عجلة الأسماء','Name wheel'),[...joined.values()].map(x=>`• ${safe(x)}`).join('\n')+'\n\n'+tr(ctx.lang,'انضم ثم يبدأ صاحب اللعبة السحب. التسجيل يغلق بعد 40 ثانية.','Join; the host starts the draw. Registration closes after 40 seconds.'));
    message=await ctx.reply({embeds:[draw()],components:buttons([{id:'join',label:tr(ctx.lang,'انضمام','Join')},{id:'leave',label:tr(ctx.lang,'انسحاب','Leave'),style:ButtonStyle.Secondary},{id:'spin',label:tr(ctx.lang,'لف العجلة','Spin'),style:ButtonStyle.Success}])});
    await listen(ctx,message,session,async(b,collector)=>{
      if(start) return;
      if(b.customId==='join') { if(joined.size>=20 && !joined.has(b.user.id)) return ctx.private(b,tr(ctx.lang,'العجلة ممتلئة (20 لاعبًا).','The wheel is full (20 players).')); joined.set(b.user.id,b.user.username); }
      else if(b.customId==='leave') joined.delete(b.user.id);
      else if(b.customId==='spin') {
        if(b.user.id!==ctx.user.id) return ctx.private(b,tr(ctx.lang,'صاحب اللعبة هو من يبدأ.','Only the host can start.'));
        if(joined.size<2) return ctx.private(b,tr(ctx.lang,'تحتاج لاعبين على الأقل.','At least two players are needed.'));
        start=true; collector.stop('spin'); return;
      }
      await message.edit({embeds:[draw()]});
    },40000);
    if(session.stopped) return;
    entries=[...joined.values()].map(safe);
    if(entries.length<2) { await message.edit({embeds:[embed(ctx.config,'WHEEL',tr(ctx.lang,'لم ينضم عدد كافٍ.','Not enough players joined.'))],components:[]}); return; }
  } else message=await ctx.reply({embeds:[embed(ctx.config,'WHEEL','🎡')]});
  session.cleanups.push(()=>message.edit({components:[]}).catch(()=>{}));
  for(let i=0;i<3;i++) {
    if(session.stopped) return;
    await message.edit({embeds:[embed(ctx.config,tr(ctx.lang,'العجلة تدور…','Spinning…'),`🎡 **${choose(entries)}**`)],components:[]});
    if(!await pause(session,700)) return;
  }
  await message.edit({embeds:[embed(ctx.config,tr(ctx.lang,'اختيار العجلة','Wheel pick'),`🎉 **${entries[randomInt(entries.length)]}**`)],components:[]});
}); }
module.exports={cuttweet,emojis,wheel,prompts,emojiPool};
