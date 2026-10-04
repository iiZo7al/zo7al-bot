'use strict';
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const config = require('./lib/config');
const { Store } = require('./lib/store');
const { Sessions } = require('./lib/sessions');
function createClient() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    allowedMentions: { parse: [], repliedUser: false },
  });
  client.config = config;
  client.commands = new Collection();
  client.slashCommands = new Collection();
  client.store = new Store(config);
  client.sessions = new Sessions();
  return client;
}
async function start() {
  if (!config.token) throw new Error('Set DISCORD_TOKEN in .env (legacy environment variable token is also supported).');
  const healthPort = process.env.PORT ? Number(process.env.PORT) : null;
  if (healthPort !== null && (!Number.isInteger(healthPort) || healthPort < 0 || healthPort > 65535)) throw new Error('PORT must be a valid port number.');
  const client = createClient();
  try {
    await client.store.init();
    await require('./handler')(client);
    client.on(Events.Error, error => console.error('Zo7al • Discord:', error.message));
    await client.login(config.token);
  } catch (error) { client.destroy(); await client.store.close(); throw error; }
  let health;
  if (healthPort !== null) {
    health = require('node:http').createServer((req, res) => {
      res.writeHead(client.isReady() ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ name:'Zo7al', ready:client.isReady() }));
    }).listen(healthPort, '0.0.0.0');
    health.on('error', error => console.error('Zo7al • Health endpoint:', error.message));
  }
  let closing = false;
  const shutdown = async () => {
    if (closing) return; closing = true;
    for (const session of [...client.sessions.active.values()]) await client.sessions.cancel(session);
    health?.close(); client.destroy(); await client.store.close();
  };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  return client;
}
if (require.main === module) start().catch(error => {
  // Log short errors rather than whole HTTP requests (which may contain credentials).
  console.error('Zo7al • Startup failed:', error.message);
  if (error.code === 4014 || /disallowed intents/i.test(error.message)) console.error('Enable MESSAGE CONTENT INTENT under Developer Portal > Bot.');
  process.exitCode = 1;
});
module.exports = { createClient, start };
