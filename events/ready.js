'use strict';
const { Events, ActivityType } = require('discord.js');
const { slashData } = require('../lib/catalog');
module.exports = client => client.once(Events.ClientReady, async () => {
  console.log(`Zo7al • ${client.user.tag} ready • 24 games.`);
  client.user.setPresence({ activities:[{ name:'/help • Zo7al Games', type:ActivityType.Playing }], status:'online' });
  if (!client.config.registerCommands) return;
  try {
    const definitions = slashData();
    if (client.config.guildId) {
      const guild = await client.guilds.fetch(client.config.guildId);
      await guild.commands.set(definitions);
    } else await client.application.commands.set(definitions);
    console.log(`Zo7al • Registered ${definitions.length} slash commands and aliases.`);
  } catch (error) { console.error('Zo7al • Command registration failed:', error.message); }
});
