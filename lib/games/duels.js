'use strict';
const { buttons, listen, pause, invite, award, inSession, ButtonStyle } = require('./components');
const { tr, embed, choose } = require('../text');
const wins = { rock:'scissors', paper:'rock', scissors:'paper' };
function rpsWinner(a, b) { return a === b ? -1 : wins[a] === b ? 0 : 1; }
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function boardResult(board) {
  for (const line of lines) if (board[line[0]] && line.every(i => board[i] === board[line[0]])) return board[line[0]];
  return board.every(Boolean) ? 'draw' : null;
}
async function rps(ctx) { return inSession(ctx, async session => {
  const duel = await invite(ctx, session, 'rps'); if (!duel) return;
  const { message, players } = duel, picks = new Map(); let finished = false;
  const labels = { rock:'🪨', paper:'📄', scissors:'✂️' };
  const draw = () => embed(ctx.config, tr(ctx.lang,'حجرة • ورقة • مقص','Rock • Paper • Scissors'), players.map(p => `<@${p.id}> ${picks.has(p.id) ? '✅' : '⏳'}`).join('\n')+'\n'+tr(ctx.lang,'اختر بالزر؛ اختيارك مخفي حتى يختار اللاعبان.','Choose below; choices stay secret until both players choose.'));
  await message.edit({ content:'', embeds:[draw()], components:buttons(Object.keys(labels).map(id => ({ id, emoji:labels[id], label:tr(ctx.lang, {rock:'حجرة',paper:'ورقة',scissors:'مقص'}[id], id) }))) });
  await listen(ctx, message, session, async (b, collector) => {
    if (!players.some(p => p.id === b.user.id)) return ctx.private(b,tr(ctx.lang,'هذا التحدي للاعبين المدعوين.','This challenge is for the invited players.'));
    if (finished || !wins[b.customId]) return;
    if (picks.has(b.user.id)) return ctx.private(b,tr(ctx.lang,'اخترت بالفعل.','You already chose.'));
    picks.set(b.user.id,b.customId);
    if (picks.size < 2) { await ctx.private(b,tr(ctx.lang,'تم حفظ اختيارك سرًا.','Your secret choice is saved.')); await message.edit({ embeds:[draw()] }); return; }
    finished = true; collector.stop('done');
    const result = rpsWinner(picks.get(players[0].id),picks.get(players[1].id));
    let description = players.map(p => `<@${p.id}> ${labels[picks.get(p.id)]}`).join('\n');
    description = result < 0 ? description+'\n'+tr(ctx.lang,'تعادل!','Draw!') : await award(ctx,players[result].id,description);
    await message.edit({ embeds:[embed(ctx.config,'RPS',description)], components:[] });
  },90000);
  if (!finished && !session.stopped) await message.edit({ embeds:[embed(ctx.config,'RPS',tr(ctx.lang,'انتهى الوقت. لا تُحتسب نقاط.','Time expired. No points awarded.'))], components:[] });
}); }
function boardButtons(board, finished=false) {
  return [0,3,6].map(start => buttons([0,1,2].map(offset => {
    const i=start+offset; return { id:`cell_${i}`, label:board[i] || String(i+1), style:board[i]==='X' ? ButtonStyle.Danger : board[i]==='O' ? ButtonStyle.Success : ButtonStyle.Secondary, disabled:finished || Boolean(board[i]) };
  }))[0]);
}
async function ttt(ctx) { return inSession(ctx,async session => {
  const duel = await invite(ctx, session, 'ttt'); if (!duel) return;
  const { message,players }=duel, board=Array(9).fill(null); let turn=0, finished=false;
  const description=() => `${players.map((p,i)=>`${i ? '⭕' : '❌'} <@${p.id}>`).join('\n')}\n\n${tr(ctx.lang,'الدور','Turn')}: <@${players[turn].id}>`;
  await message.edit({ content:'', embeds:[embed(ctx.config,'TIC TAC TOE',description())], components:boardButtons(board) });
  await listen(ctx,message,session,async(b,collector) => {
    if (!players.some(p=>p.id===b.user.id)) return ctx.private(b,tr(ctx.lang,'هذا التحدي للاعبين المدعوين.','This challenge is for the invited players.'));
    if (finished) return;
    if (players[turn].id!==b.user.id) return ctx.private(b,tr(ctx.lang,'انتظر دورك.','Wait for your turn.'));
    const match=b.customId.match(/^cell_([0-8])$/); if (!match) return;
    const i=Number(match[1]); if(board[i]) return ctx.private(b,tr(ctx.lang,'هذه الخانة مستخدمة.','That cell is occupied.'));
    board[i]=turn ? 'O' : 'X'; const result=boardResult(board);
    if(result) {
      finished=true; collector.stop('done');
      const text=result==='draw' ? tr(ctx.lang,'تعادل!','Draw!') : await award(ctx,players[result==='X' ? 0 : 1].id,tr(ctx.lang,'انتهت الجولة!','Round finished!'));
      await message.edit({ embeds:[embed(ctx.config,'TIC TAC TOE',text)], components:boardButtons(board,true) });
    } else { turn=1-turn; await message.edit({ embeds:[embed(ctx.config,'TIC TAC TOE',description())], components:boardButtons(board) }); }
  },180000);
  if(!finished && !session.stopped) await message.edit({ embeds:[embed(ctx.config,'TIC TAC TOE',tr(ctx.lang,'انتهى الوقت. لا تُحتسب نقاط.','Time expired. No points awarded.'))],components:boardButtons(board,true) });
}); }
const punishments={
  ar:['اكتب جملة مضحكة بدون حرف الألف.','صف آخر مباراة لعبتها بثلاث كلمات.','تكلم عن نفسك بصيغة الغائب لمدة دقيقة.','اكتب اسمك بالعكس.','أرسل ثلاثة إيموجيات تصف ردة فعلك.','امدح صديقك بجملة مبالغ فيها.','اكتب رسالة كاملة باستخدام الإيموجي فقط.','قل ثلاث كلمات تبدأ بحرف الميم.','غَيّر لقبك داخل اللعبة التالية إلى «بطاطس» إن أحببت.','قل نكتة قصيرة في الشات.'],
  en:['Write a funny sentence without the letter A.','Describe your last match in three words.','Talk about yourself in the third person for one minute.','Write your name backwards.','Send three emojis describing your reaction.','Give your friend an exaggerated compliment.','Write one whole message using only emojis.','Name three things starting with M.','Use “Potato” as your nickname in the next game if you like.','Tell a short joke in chat.'],
};
async function punish(ctx) { return inSession(ctx,async session => {
  const duel=await invite(ctx,session,'punish'); if(!duel) return;
  const {message,players}=duel; let ready=false, finished=false, reveal=Promise.resolve();
  await message.edit({ content:'', embeds:[embed(ctx.config,tr(ctx.lang,'تحدي العقاب','Punishment challenge'),tr(ctx.lang,'انتظر الضوء الأخضر ثم اضغط! الضغط مبكرًا يعني الخسارة. العقاب تحدٍّ مرح في الشات.','Wait for green, then click! Clicking early loses. The punishment is a fun chat challenge.'))],components:buttons([{id:'react',label:tr(ctx.lang,'انتظر…','Wait…'),style:ButtonStyle.Danger}]) });
  const listening=listen(ctx,message,session,async(b,collector)=>{
    const index=players.findIndex(p=>p.id===b.user.id);
    if(index<0) return ctx.private(b,tr(ctx.lang,'هذا التحدي للاعبين المدعوين.','This challenge is for the invited players.'));
    if(finished || b.customId!=='react') return;
    finished=true; collector.stop('done');
    const winner=ready ? index : 1-index, loser=1-winner;
    const reason=ready ? tr(ctx.lang,'أسرع ردة فعل!','Fastest reaction!') : tr(ctx.lang,'تم الضغط قبل الضوء الأخضر!','Clicked before green!');
    session.controller.abort();
    await reveal;
    const description=await award(ctx,players[winner].id,reason)+`\n\n${tr(ctx.lang,'عقاب','Challenge for')} <@${players[loser].id}>: **${choose(punishments[ctx.lang])}**`;
    await message.edit({ embeds:[embed(ctx.config,tr(ctx.lang,'نتيجة التحدي','Challenge result'),description)],components:[] });
  },30000);
  reveal=(async()=>{
    if(await pause(session,2000+Math.floor(Math.random()*3000)) && !finished) {
      ready=true;
      await message.edit({ embeds:[embed(ctx.config,tr(ctx.lang,'اضغط الآن!','Click now!'),'🟢')],components:buttons([{id:'react',label:tr(ctx.lang,'اضغط!','Click!'),style:ButtonStyle.Success}]) });
    }
  })();
  try { await Promise.all([listening,reveal]); }
  finally { session.controller.abort(); }
  if(!finished && !session.stopped) await message.edit({ embeds:[embed(ctx.config,'PUNISH',tr(ctx.lang,'انتهى الوقت.','Time expired.'))],components:[] });
}); }
module.exports={rps,ttt,punish,rpsWinner,boardResult,boardButtons,punishments};
