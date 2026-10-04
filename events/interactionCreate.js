'use strict';
const { Events } = require('discord.js');
const { dispatch } = require('../lib/dispatch');
module.exports = client => client.on(Events.InteractionCreate, interaction => {
  if (!interaction.isChatInputCommand()) return;
  dispatch(client, interaction, interaction.commandName).catch(error => console.error('Zo7al • Interaction:', error.message));
});
