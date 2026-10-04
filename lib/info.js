'use strict';
const {PermissionFlagsBits,ActionRowBuilder,ButtonBuilder,ButtonStyle}=require('discord.js');
const {tr,embed,safe}=require('./text');
function canManage(ctx) {
  return Boolean((ctx.slash ? ctx.source.memberPermissions : ctx.source.member?.permissions)?.has(PermissionFlagsBits.ManageGuild));
}
async function help(ctx) {
  const {commands}=require('./catalog');
  const games=commands.filter(x=>x.game);
  const blocks=[];
  for(let start=0;start<games.length;start+=8) {
    const description=games.slice(start,start+8).map(x=>`**/${x.name}** • ${x.title[ctx.lang]}\n${tr(ctx.lang,'الاختصارات','Aliases')}: ${[x.name,...x.aliases].map(a=>`\`${ctx.config.prefix}${a}\``).join(' ')}`).join('\n\n');
    blocks.push(embed(ctx.config,`${tr(ctx.lang,'الألعاب','Games')} ${start/8+1}/3`,description));
  }
  blocks.push(embed(ctx.config,tr(ctx.lang,'المعلومات والإدارة','Info and administration'),`/points • /profile • /top • /ping\n/stop • /fix • /lang ar • /lang en\n\n${tr(ctx.lang,'استخدم أوامر / أو البادئة','Use slash commands or the prefix')}: \`${ctx.config.prefix}\`\n${tr(ctx.lang,'ألعاب الأصدقاء: /rps و /ttt و /punish مع اختيار صديق. للعجلة: /wheel names:Ali, Sara أو انضمام بالأزرار. المارد يستخدم Akinator مع بديل محلي يضم 40 شخصية عند تعذر الخدمة.','Duels: /rps, /ttt and /punish with a friend. Wheel: /wheel names:Ali, Sara or join with buttons. The genie uses Akinator, with a local 40-character fallback if the service is unavailable.')}`));
  const permissions=[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.SendMessagesInThreads,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.EmbedLinks,PermissionFlagsBits.AttachFiles].reduce((sum,value)=>sum|value,0n).toString();
  const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel(tr(ctx.lang,'دعوة البوت','Invite bot')).setStyle(ButtonStyle.Link).setURL(`https://discord.com/oauth2/authorize?client_id=${ctx.client.user.id}&permissions=${permissions}&scope=bot%20applications.commands`),new ButtonBuilder().setLabel(tr(ctx.lang,'الدعم','Support')).setStyle(ButtonStyle.Link).setURL(ctx.config.support));
  return ctx.reply({embeds:blocks,components:[row]});
}
async function ping(ctx) { return ctx.reply({embeds:[embed(ctx.config,'PING',`🏓 ${Math.max(0,Math.round(ctx.client.ws.ping))} ms`)]}); }
async function points(ctx) {
  const user=await ctx.target() || ctx.user;
  return ctx.reply({embeds:[embed(ctx.config,tr(ctx.lang,'النقاط','Points'),`<@${user.id}> • 🏆 **${await ctx.store.points(user.id)}**`)]});
}
async function profile(ctx) {
  const user=await ctx.target() || ctx.user;
  return ctx.reply({embeds:[embed(ctx.config,tr(ctx.lang,'ملف اللاعب','Player profile'),`**${safe(user.username)}**\n🏆 ${tr(ctx.lang,'النقاط','Points')}: **${await ctx.store.points(user.id)}**`).setThumbnail(user.displayAvatarURL({extension:'png',size:256}))]});
}
async function top(ctx) {
  const data=await ctx.store.top(10);
  const description=data.length ? data.map((x,i)=>`**${i+1}.** <@${x.id}> • 🏆 **${x.points}**`).join('\n') : tr(ctx.lang,'لا توجد نقاط بعد. ابدأ أول لعبة!','No scores yet. Start the first game!');
  return ctx.reply({embeds:[embed(ctx.config,tr(ctx.lang,'أفضل اللاعبين • عالمي','Top players • Global'),description)]});
}
async function lang(ctx) {
  if(!canManage(ctx)) return ctx.reply(tr(ctx.lang,'تحتاج صلاحية إدارة السيرفر.','Manage Server permission is required.'));
  const language=ctx.slash ? ctx.source.options.getSubcommand() : ctx.args[0]?.toLowerCase();
  if(!['ar','en'].includes(language)) return ctx.reply('🪐 Zo7al • `/lang ar` / `/lang en`');
  await ctx.store.setLanguage(ctx.guildId,language);
  return ctx.reply(tr(language,'🪐 Zo7al • تم تغيير لغة السيرفر إلى العربية.','🪐 Zo7al • Server language is now English.'));
}
async function fix(ctx) {
  if(!canManage(ctx)) return ctx.reply(tr(ctx.lang,'تحتاج صلاحية إدارة السيرفر.','Manage Server permission is required.'));
  await ctx.sessions.cancelGuild(ctx.guildId);
  return ctx.reply(tr(ctx.lang,'🪐 Zo7al • أُلغيت جميع جولات السيرفر. النقاط محفوظة.','🪐 Zo7al • All server rounds cancelled. Scores are saved.'));
}
async function stop(ctx) {
  const session=ctx.sessions.get(ctx.guildId,ctx.channelId);
  if(!session) return ctx.reply(tr(ctx.lang,'لا توجد جولة في هذا الروم.','No active round in this channel.'));
  if(session.ownerId!==ctx.user.id && !canManage(ctx)) return ctx.reply(tr(ctx.lang,'إيقاف الجولة متاح لصاحبها أو إدارة السيرفر.','Only the game host or a server manager can stop it.'));
  await ctx.sessions.cancel(session);
  return ctx.reply(tr(ctx.lang,'🪐 Zo7al • تم إيقاف الجولة.','🪐 Zo7al • Round stopped.'));
}
module.exports={help,ping,points,profile,top,lang,fix,stop,canManage};
