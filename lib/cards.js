'use strict';
const path = require('node:path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const root = path.resolve(__dirname, '..');
GlobalFonts.registerFromPath(path.join(root, 'Almarai-Light.ttf'), 'Almarai');
GlobalFonts.registerFromPath(path.join(root, 'Akira-Expanded-Demo.otf'), 'Akira');
async function card(question, title) {
  const canvas = createCanvas(800, 380), ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 800, 380);
  gradient.addColorStop(0, '#0d1830'); gradient.addColorStop(1, '#1c1230');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 800, 380);
  ctx.strokeStyle = '#fa6f3c'; ctx.lineWidth = 3; ctx.strokeRect(18, 18, 764, 344);
  ctx.fillStyle = '#fa6f3c'; ctx.font = '18px Akira'; ctx.fillText('ZO7AL GAMES', 42, 54);
  ctx.font = '25px Almarai'; ctx.textAlign = 'right'; ctx.fillStyle = '#a5b4cf'; ctx.fillText(title, 758, 56, 390);
  if (question.image) {
    const image = await loadImage(path.join(root, question.image));
    const scale = Math.min(560 / image.width, 242 / image.height);
    const w = image.width * scale, h = image.height * scale;
    ctx.drawImage(image, (800-w)/2, 82+(242-h)/2, w, h);
  } else {
    const text = question.prompt;
    let size = 58; do { ctx.font = `${size}px Almarai`; size -= 2; } while (ctx.measureText(text).width > 700 && size > 18);
    ctx.textAlign = 'center'; ctx.direction = /[\u0600-\u06ff]/.test(text) ? 'rtl' : 'ltr';
    ctx.fillStyle = '#ffffff'; ctx.fillText(text, 400, 217, 700);
  }
  ctx.direction = 'ltr'; ctx.textAlign = 'center'; ctx.font = '16px Akira'; ctx.fillStyle = '#8b9cba'; ctx.fillText('PLAY  THINK  WIN', 400, 344);
  return new AttachmentBuilder(await canvas.encode('png'), { name: 'challenge.png' });
}
module.exports = { card };
