'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
try { process.loadEnvFile(path.join(root, '.env')); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const legacy = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const seconds = Number(process.env.GAME_TIMEOUT_SECONDS || 20);
const prefix = process.env.PREFIX ?? legacy.prefix ?? '-';
if (!prefix.trim()) throw new Error('PREFIX cannot be empty.');
if (!Number.isFinite(seconds) || seconds < 5 || seconds > 120) throw new Error('GAME_TIMEOUT_SECONDS must be between 5 and 120.');
module.exports = {
  root, prefix,
  color: /^#?[0-9a-f]{6}$/i.test(legacy.color || '') ? parseInt(legacy.color.replace('#', ''), 16) : 0x38bdf8,
  token: process.env.DISCORD_TOKEN || process.env.token,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  mongo: process.env.MONGO || process.env.MONGODB_URI,
  dataDir: path.resolve(root, process.env.DATA_DIR || 'data'),
  defaultLanguage: process.env.DEFAULT_LANGUAGE === 'en' ? 'en' : 'ar',
  timeout: seconds * 1000,
  registerCommands: process.env.REGISTER_COMMANDS !== 'false',
  support: `https://discord.gg/${legacy.discord || 'nxScVYrSXq'}`,
};
