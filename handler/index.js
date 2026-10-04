'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { commands, slashData } = require('../lib/catalog');
module.exports = async client => {
  for (const command of commands) {
    for (const alias of [command.name, ...command.aliases]) client.commands.set(alias.toLowerCase(), command);
  }
  for (const definition of slashData()) client.slashCommands.set(definition.name, commands.find(x => x.name === definition.name || x.aliases.some(a => a.toLowerCase() === definition.name)));
  const events = path.join(__dirname, '..', 'events');
  for (const file of fs.readdirSync(events).filter(x => x.endsWith('.js')).sort()) require(path.join(events, file))(client);
};
