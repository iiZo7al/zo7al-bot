'use strict';
const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Context } = require('./context');
const { get } = require('./catalog');
const { tr } = require('./text');
async function dispatch(client, source, name, args = []) {
  const command = get(name); if (!command) return;
  const slash = typeof source.isChatInputCommand === 'function';
  if (!source.guildId && !source.guild) {
    if (slash) await source.reply({ content:'🪐 Zo7al • Games run inside a server.', flags:MessageFlags.Ephemeral });
    return;
  }
  const permissions = source.channel?.permissionsFor(client.user);
  const sendPermission = source.channel?.isThread?.() ? PermissionFlagsBits.SendMessagesInThreads : PermissionFlagsBits.SendMessages;
  const required = [PermissionFlagsBits.ViewChannel, sendPermission, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory];
  if (!permissions || !required.every(p => permissions.has(p))) {
    const text = '🪐 Zo7al • Bot permissions required: View Channel, Send Messages (Send Messages in Threads for threads), Embed Links, Attach Files, Read Message History.';
    if (slash) await source.reply({ content:text, flags:MessageFlags.Ephemeral }).catch(() => {});
    else if (permissions?.has(sendPermission)) await source.reply({ content:text, allowedMentions:{ parse:[],repliedUser:false } }).catch(() => {});
    return;
  }
  const ctx = new Context(client, source, args);
  try {
    if (slash) await source.deferReply();
    await ctx.init();
    await command.run(ctx);
  } catch (error) {
    console.error(`Zo7al • ${command.name}:`, error.message);
    const text = tr(ctx.lang || client.config.defaultLanguage,'🪐 Zo7al • تعذر إكمال الأمر. تحقق من صلاحيات البوت ثم حاول مجددًا.','🪐 Zo7al • The command could not finish. Check bot permissions and try again.');
    if (slash && source.deferred && !ctx.responded) await source.editReply({content:text,embeds:[],components:[],attachments:[]}).catch(() => {});
    else if (slash && (source.deferred || source.replied)) await source.followUp({content:text,flags:MessageFlags.Ephemeral}).catch(() => {});
    else await source.reply({content:text,allowedMentions:{parse:[],repliedUser:false}}).catch(() => {});
  }
}
module.exports = { dispatch };
