'use strict';
const { Events } = require('discord.js');
const { dispatch } = require('../lib/dispatch');
module.exports = client => client.on(Events.MessageCreate, message => {
  if (message.author.bot || !message.guild || !message.content.startsWith(client.config.prefix)) return;
  const [name, ...args] = message.content.slice(client.config.prefix.length).trim().split(/\s+/);
  if (!name) return;
  dispatch(client, message, name, args).catch(error => console.error('Zo7al • Message:', error.message));
});
