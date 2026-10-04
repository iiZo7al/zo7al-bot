'use strict';
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { setTimeout: delay } = require('node:timers/promises');
const { tr, embed } = require('../text');
function buttons(items) {
  const result = [];
  for (let start = 0; start < items.length; start += 5) result.push(new ActionRowBuilder().addComponents(items.slice(start, start+5).map(x => {
    const button = new ButtonBuilder().setCustomId(x.id).setStyle(x.style || ButtonStyle.Primary).setDisabled(Boolean(x.disabled));
    if (x.label) button.setLabel(x.label);
    if (x.emoji) button.setEmoji(x.emoji);
    return button;
  })));
  return result;
}
function listen(ctx, message, session, onButton, time = 90000, idle) {
  return new Promise((resolve, reject) => {
    if (session.stopped) return resolve('cancelled');
    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time, ...(idle ? { idle } : {}) });
    session.collector = collector;
    let queue = Promise.resolve(), failure;
    collector.on('collect', b => {
      // Acknowledge immediately, even if another click is waiting on storage/network.
      const ack = b.deferUpdate().catch(() => false);
      queue = queue.then(async () => {
        if (await ack === false || session.stopped || collector.ended) return;
        await onButton(b, collector);
      }).catch(error => { failure = error; collector.stop('error'); });
    });
    collector.once('end', (_, reason) => {
      queue.then(() => failure ? reject(failure) : resolve(reason));
    });
    session.cleanups.push(() => message.edit({ components: [] }).catch(() => {}));
  });
}
async function pause(session, ms) {
  try { await delay(ms, undefined, { signal: session.controller.signal }); return !session.stopped; }
  catch (error) { if (error.name === 'AbortError') return false; throw error; }
}
async function invite(ctx, session, name) {
  const opponent = await ctx.target();
  if (!opponent || opponent.bot || opponent.id === ctx.user.id) {
    await ctx.reply(tr(ctx.lang, 'اختر صديقًا غير نفسك وغير البوتات: `/'+name+' user:@Friend`.', 'Choose a human friend other than yourself: `/'+name+' user:@Friend`.'));
    return null;
  }
  const member = await ctx.guild.members.fetch(opponent.id).catch(() => null);
  if (!member) { await ctx.reply(tr(ctx.lang, 'الصديق يجب أن يكون في نفس السيرفر.', 'Your friend must be in this server.')); return null; }
  if (session.stopped) return null;
  let accepted = false;
  const message = await ctx.reply({
    content: `<@${opponent.id}>`, allowedMentions: { users: [opponent.id] },
    embeds: [embed(ctx.config, name.toUpperCase(), tr(ctx.lang, `<@${ctx.user.id}> تحداك! لديك 30 ثانية لقبول التحدي.`, `<@${ctx.user.id}> challenged you! Accept within 30 seconds.`))],
    components: buttons([{ id:'accept', label:tr(ctx.lang,'قبول','Accept'), style:ButtonStyle.Success },{ id:'decline', label:tr(ctx.lang,'رفض','Decline'), style:ButtonStyle.Danger }]),
  });
  const reason = await listen(ctx, message, session, async (b, collector) => {
    if (b.user.id !== opponent.id) return ctx.private(b, tr(ctx.lang, 'هذا التحدي للشخص المدعو.', 'Only the invited player can respond.'));
    if (!['accept', 'decline'].includes(b.customId)) return;
    accepted = b.customId === 'accept'; collector.stop(accepted ? 'accepted' : 'declined');
  }, 30000);
  if (!accepted || session.stopped) {
    await message.edit({ content:'', embeds:[embed(ctx.config, name.toUpperCase(), tr(ctx.lang, reason === 'declined' ? 'تم رفض التحدي.' : 'انتهى التحدي.', reason === 'declined' ? 'Challenge declined.' : 'Challenge ended.'))], components:[] });
    return null;
  }
  return { message, players:[ctx.user, opponent] };
}
async function award(ctx, id, description) {
  const points = await ctx.store.addPoint(id);
  return `${description}\n🏆 <@${id}> • +1 • ${tr(ctx.lang, 'النقاط', 'Points')}: **${points}**`;
}
async function inSession(ctx, action) {
  const session = ctx.sessions.acquire(ctx.guildId, ctx.channelId, ctx.user.id);
  if (!session) return ctx.reply(tr(ctx.lang, '⏳ توجد لعبة في هذا الروم. انتظر أو استخدم /stop.', '⏳ A game is running here. Wait or use /stop.'));
  try { return await action(session); }
  finally { session.collector?.stop('finished'); ctx.sessions.release(session); await Promise.allSettled(session.cleanups.map(fn => fn())); }
}
module.exports = { buttons, listen, pause, invite, award, inSession, ButtonStyle };
