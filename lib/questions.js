'use strict';
const { choose, letters, undot } = require('./text');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const data = (lang, name) => require(path.join(root, 'gamesdb', lang, `${name}.json`));
const countries = require('../gamesdb/countries.json');
const pairs = {
  ar: { opposite: data('ar', 'opposite'), plural: data('ar', 'plural'), single: data('ar', 'single') },
  en: {
    opposite: [['hot','cold'],['big','small'],['fast','slow'],['open','closed'],['up','down'],['light','dark'],['happy','sad'],['early','late'],['young','old'],['good','bad'],['strong','weak'],['clean','dirty'],['full','empty'],['rich','poor'],['near','far'],['right','left'],['day','night'],['begin','end']],
    plural: [['child','children'],['person','people'],['mouse','mice'],['foot','feet'],['tooth','teeth'],['man','men'],['woman','women'],['city','cities'],['box','boxes'],['leaf','leaves'],['wolf','wolves'],['book','books'],['game','games'],['star','stars'],['country','countries']],
    single: [['children','child'],['people','person'],['mice','mouse'],['feet','foot'],['teeth','tooth'],['men','man'],['women','woman'],['cities','city'],['boxes','box'],['leaves','leaf'],['wolves','wolf'],['books','book'],['games','game'],['stars','star'],['countries','country']],
  },
};
const translations = [['قطة','cat'],['كلب','dog'],['أسد','lion'],['حصان','horse'],['سماء','sky'],['قمر','moon'],['شمس','sun'],['نجمة','star'],['ماء','water'],['نار','fire'],['كتاب','book'],['مدرسة','school'],['نافذة','window'],['باب','door'],['شجرة','tree'],['زهرة','flower'],['بيت','house'],['سيارة','car'],['مدينة','city'],['بحر','sea'],['جبل','mountain'],['حديقة','garden'],['صديق','friend'],['لعبة','game'],['تفاحة','apple'],['موز','banana'],['طعام','food'],['ليل','night'],['نهار','day'],['طائر','bird'],['سمكة','fish'],['أرنب','rabbit'],['سعيد','happy'],['سريع','fast'],['صغير','small']];
function words(lang) { return data(lang, 'type').map(x => x.type).filter(x => typeof x === 'string' && letters(x).length >= 3); }
function plainWords(lang) { return words(lang).filter(x => !/\s/.test(x) && !/[_\d]/.test(x)); }
function question(name, lang = 'ar') {
  let word;
  switch (name) {
    case 'img': {
      const x = choose(require('../gamesdb/celebrities.json'));
      return { image: x.image, answers: x.answers, display: lang === 'en' ? x.en : x.ar };
    }
    case 'brands': {
      const x = choose(require('../gamesdb/brands.json'));
      return { image: x.image, answers: x.answers, display: lang === 'en' ? x.en : x.ar };
    }
    case 'flags': {
      const x = choose(countries);
      return { image: x.image, answers: [x.ar, x.en, ...x.aliases], display: lang === 'en' ? x.en : x.ar };
    }
    case 'capitals': {
      const x = choose(countries);
      const aliases = x.code === 'us' ? ['Washington','Washington DC','واشنطن دي سي'] : x.code === 'mx' ? ['Mexico City','مكسيكو سيتي','مدينة مكسيكو'] : [];
      return { prompt: lang === 'en' ? x.en : x.ar, answers: [x.capitalAr, x.capitalEn, ...aliases], display: lang === 'en' ? x.capitalEn : x.capitalAr };
    }
    case 'combine':
      word = choose(plainWords(lang)); return { prompt: letters(word).join(' '), answers: [word] };
    case 'spell':
      word = choose(words(lang)); return { prompt: word, answers: [letters(word).join(' ')] };
    case 'reverse':
      word = choose(plainWords(lang)); return { prompt: word, answers: [letters(word).reverse().join('')] };
    case 'letters':
      word = choose(words(lang)); return { prompt: word, answers: [String(letters(word).length)] };
    case 'missing': {
      word = choose(plainWords(lang)); const chars = letters(word); const index = Math.floor(Math.random() * chars.length);
      const removed = chars[index]; chars[index] = '＿';
      return { prompt: chars.join(''), answers: [removed, word], display: `${removed} • ${word}` };
    }
    case 'numbers':
      word = String(Math.floor(10000 + Math.random() * 990000)); return { prompt: word, answers: [word] };
    case 'rewrite':
      word = choose(words(lang)); return { prompt: word, answers: [word] };
    case 'dots': {
      // Arabic letter-dot game remains Arabic in English servers; only the instructions change.
      word = choose(plainWords('ar').filter(x => undot(x) !== x));
      const prompt = undot(word);
      const answers = plainWords('ar').filter(x => undot(x) === prompt);
      return { prompt, answers };
    }
    case 'math': {
      const operations = ['+', '−', '×', '÷']; const op = choose(operations);
      let a = Math.floor(Math.random() * 35) + 1, b = Math.floor(Math.random() * 12) + 1, result;
      if (op === '+') result = a + b;
      if (op === '−') { if (a < b) [a, b] = [b, a]; result = a - b; }
      if (op === '×') { a %= 13; result = a * b; }
      if (op === '÷') { result = a; a *= b; }
      return { prompt: `${a} ${op} ${b}`, answers: [String(result)] };
    }
    case 'opposite': case 'plural': case 'single': {
      const item = choose(pairs[lang][name]); return Array.isArray(item) ? { prompt: item[0], answers: [item[1]] } : { prompt: item.type, answers: item.answers };
    }
    case 'translate': {
      const pair = choose(translations), direction = Math.random() < .5 ? 0 : 1;
      return { prompt: pair[direction], answers: [pair[1-direction]] };
    }
    default: throw new Error(`Unknown quiz: ${name}`);
  }
}
module.exports = { question, words, translations, pairs };
