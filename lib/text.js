'use strict';
const { EmbedBuilder } = require('discord.js');
function normalize(value) {
  return String(value).normalize('NFKC').toLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, n => String(n.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, n => String(n.charCodeAt(0) - 0x6f0))
    .trim().replace(/\s+/g, ' ');
}
function letters(value) {
  return Array.from(String(value).normalize('NFC').replace(/[\u064b-\u065f\u0670\u0640\s]/g, ''));
}
function undot(value) {
  const map = { ب:'ٮ', ت:'ٮ', ث:'ٮ', ن:'ٮ', ي:'ى', ج:'ح', خ:'ح', ذ:'د', ز:'ر', ش:'س', ض:'ص', ظ:'ط', غ:'ع', ف:'ڡ', ق:'ٯ', ة:'ه' };
  return Array.from(String(value).replace(/[\u064b-\u065f\u0670\u0640]/g, ''), x => map[x] || x).join('');
}
const choose = list => list[Math.floor(Math.random() * list.length)];
const tr = (lang, ar, en) => lang === 'en' ? en : ar;
const safe = value => String(value).replace(/[@`*_~|<>\\]/g, '').slice(0, 120);
function embed(config, title, description) {
  const value = new EmbedBuilder().setColor(config.color).setTitle(`🪐 Zo7al • ${title}`).setFooter({ text: 'ZO7AL GAMES' });
  if (description) value.setDescription(description);
  return value;
}
module.exports = { normalize, letters, undot, choose, tr, safe, embed };
