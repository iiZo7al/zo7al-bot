'use strict';
const { MessageFlags } = require('discord.js');
class Context {
  constructor(client, source, args = []) {
    this.client = client; this.source = source; this.args = args;
    this.slash = typeof source.isChatInputCommand === 'function';
    this.user = this.slash ? source.user : source.author;
    this.guildId = source.guildId || source.guild?.id;
    this.channelId = source.channelId || source.channel?.id;
    this.guild = source.guild; this.channel = source.channel;
    this.config = client.config; this.store = client.store; this.sessions = client.sessions;
  }
  async init() { this.lang = await this.store.language(this.guildId); return this; }
  async reply(value) {
    const payload = typeof value === 'string' ? { content: value } : value;
    const safe = { allowedMentions: { parse: [] }, ...payload };
    if (this.slash) { await this.source.editReply(safe); this.responded=true; return this.source.fetchReply(); }
    const message=await this.source.reply({ ...safe, allowedMentions: { ...safe.allowedMentions, repliedUser: false } });
    this.responded=true; return message;
  }
  async send(value) { return this.channel.send({ allowedMentions: { parse: [] }, ...(typeof value === 'string' ? { content: value } : value) }); }
  async private(component, text) {
    const payload = { content: text, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } };
    return component.deferred || component.replied ? component.followUp(payload) : component.reply(payload);
  }
  async target() {
    if (this.slash) return this.source.options.getUser('user');
    const id = this.args[0]?.match(/^(?:<@!?)?(\d{17,20})>?$/)?.[1];
    if (!id) return null;
    return this.client.users.fetch(id).catch(() => null);
  }
  option(name) { return this.slash ? this.source.options.getString(name) : null; }
}
module.exports = { Context };
