'use strict';
const { question } = require('../questions');
const { card } = require('../cards');
const { normalize, tr, embed } = require('../text');
function answerRound(ctx, session, answers) {
  const acceptable = new Set(answers.map(normalize));
  if(session.stopped) return {begin() {},result:Promise.resolve(null)};
  let startTime=Infinity,winner=null,buffer=[];
  const collector=ctx.channel.createMessageCollector({
    filter:m=>!m.author.bot && acceptable.has(normalize(m.content)),
    time:ctx.config.timeout+15000,
  });
  session.collector=collector;
  const result=new Promise(resolve=>collector.once('end',()=>resolve(winner)));
  function accept(message) {
    if(!collector.ended && message.createdTimestamp>=startTime) {winner=message;collector.stop('winner');}
  }
  collector.on('collect',message=>{if(startTime===Infinity) buffer.push(message);else accept(message);});
  return {result,begin(time) {
    startTime=time;
    if(collector.ended) return;
    collector.resetTimer({time:ctx.config.timeout});
    for(const message of buffer) accept(message);
    buffer=[];
  }};
}
function waitForAnswer(ctx, session, answers, startTime) {
  const round=answerRound(ctx,session,answers);round.begin(startTime);return round.result;
}
async function runQuiz(ctx, game) {
  const session = ctx.sessions.acquire(ctx.guildId, ctx.channelId, ctx.user.id);
  if (!session) return ctx.reply(tr(ctx.lang, '⏳ توجد لعبة في هذا الروم. انتظر نهايتها أو استخدم /stop.', '⏳ A game is already running here. Wait or use /stop.'));
  try {
    const q = question(game.name, ctx.lang);
    const attachment = await card(q, game.title[ctx.lang]);
    if (session.stopped) return;
    // Listen before publishing so fast replies cannot land between send and collector setup.
    const round=answerRound(ctx,session,q.answers);
    const message = await ctx.reply({
      embeds: [embed(ctx.config, game.title[ctx.lang], `${game.instructions[ctx.lang]}\n\n⏱️ ${Math.round(ctx.config.timeout/1000)} ${tr(ctx.lang, 'ثانية • أول إجابة صحيحة تحصل على نقطة.', 'seconds • First correct answer earns a point.')}`).setImage('attachment://challenge.png')],
      files: [attachment],
    });
    round.begin(message.createdTimestamp);
    const winner = await round.result;
    if (session.stopped) return;
    const answer = q.display || q.answers[0];
    if (winner) {
      const points = await ctx.store.addPoint(winner.author.id);
      await ctx.send({ embeds: [embed(ctx.config, tr(ctx.lang, 'إجابة صحيحة!', 'Correct!'), `<@${winner.author.id}> • ${tr(ctx.lang, 'الإجابة', 'Answer')}: **${answer}**\n🏆 +1 • ${tr(ctx.lang, 'مجموع النقاط', 'Total points')}: **${points}**`)] });
    } else {
      await ctx.send({ embeds: [embed(ctx.config, tr(ctx.lang, 'انتهى الوقت', "Time's up"), `${tr(ctx.lang, 'الإجابة الصحيحة', 'Correct answer')}: **${answer}**`)] });
    }
  } finally { session.collector?.stop('finished'); ctx.sessions.release(session); }
}
module.exports = { runQuiz, waitForAnswer, answerRound };
