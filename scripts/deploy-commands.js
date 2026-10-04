'use strict';
const { REST, Routes }=require('discord.js');
const config=require('../lib/config');
const {slashData}=require('../lib/catalog');
async function deploy() {
  if(!config.token || !config.clientId) throw new Error('Set DISCORD_TOKEN and CLIENT_ID in .env.');
  const rest=new REST({version:'10'}).setToken(config.token);
  const route=config.guildId ? Routes.applicationGuildCommands(config.clientId,config.guildId) : Routes.applicationCommands(config.clientId);
  const result=await rest.put(route,{body:slashData()});
  console.log(`Zo7al • Registered ${result.length} commands ${config.guildId ? 'in test server' : 'globally'}.`);
}
if(require.main===module) deploy().catch(error=>{console.error('Zo7al • Deploy failed:',error.message);process.exitCode=1;});
module.exports={deploy};
