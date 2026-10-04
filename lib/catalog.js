'use strict';
const { ApplicationCommandOptionType: Option, PermissionFlagsBits } = require('discord.js');
const { normalize } = require('./text');
const games = [
  ['img',['i','صور','خمن','مشاهير'],['من هو هذا المشهور؟','Who is this celebrity?'],['اكتب اسم المشهور الظاهر في الصورة.','Name the celebrity in the photo.']],
  ['flags',['f','اعلام'],['خمن اسم الدولة','Guess the country'],['اكتب اسم الدولة صاحبة العلم.','Name the country shown by the flag.']],
  ['brands',['علامات','شعارات'],['خمن الشعار التجاري','Guess the brand'],['اكتب اسم العلامة صاحبة الشعار.','Name the brand shown by the logo.']],
  ['capitals',['c','عواصم'],['ما هي عاصمة الدولة؟','What is the capital?'],['اكتب اسم عاصمة الدولة.','Write the capital of this country.']],
  ['combine',['اشبك','شبك'],['اشبك الأحرف','Combine the letters'],['اجمع الحروف في كلمة واحدة.','Combine these letters into one word.']],
  ['cuttweet',['cutTweet','cut','كت'],['كت تويت على السريع','Quick question']],
  ['dots',['نقاط'],['أضف النقاط للحروف','Add the missing dots'],['أضف النقاط للحروف لتكتشف الكلمة العربية.','Restore the dots to find the Arabic word.']],
  ['emojis',['e','ايموجي'],['تذكر الإيموجي الصحيح','Remember the emoji']],
  ['letters',['l','letter','حروف'],['عد حروف الكلمة','Count the letters'],['اكتب عدد الحروف؛ المسافات والتشكيل لا تُحسب.','Count the letters, excluding spaces and vowel marks.']],
  ['math',['m','رياضيات'],['حل المسألة','Solve the calculation'],['اكتب الناتج الصحيح.','Write the correct result.']],
  ['missing',['حرف'],['الحرف المفقود','Missing letter'],['اكتب الحرف المفقود أو الكلمة كاملة.','Write the missing letter or the complete word.']],
  ['numbers',['num','ارقام'],['اكتب الرقم','Type the number'],['اكتب الرقم قبل انتهاء الوقت.','Type this number before time runs out.']],
  ['opposite',['o','مضاد'],['خمن مضاد الكلمة','Guess the opposite'],['اكتب مضاد الكلمة.','Write the opposite of this word.']],
  ['plural',['جمع'],['خمن جمع الكلمة','Guess the plural'],['اكتب جمع الكلمة.','Write the plural form.']],
  ['punish',['عقاب'],['تحدي العقاب','Punishment challenge']],
  ['reverse',['r','عكس'],['اعكس الكلمة','Reverse the word'],['اكتب حروف الكلمة بالترتيب المعكوس.','Write the letters in reverse order.']],
  ['rewrite',['type','اسرع'],['أسرع كتابة','Typing race'],['أعد كتابة النص بأسرع وقت.','Retype the text as fast as you can.']],
  ['single',['مفرد'],['خمن مفرد الكلمة','Guess the singular'],['اكتب مفرد الكلمة.','Write the singular form.']],
  ['spell',['fkk','فكك'],['فكك الجملة','Separate the letters'],['اكتب كل حرف منفصلًا بمسافة.','Separate every letter with one space.']],
  ['translate',['tran','ترجمة'],['ترجمة الكلمات','Translate the word'],['ترجم الكلمة إلى العربية أو الإنجليزية حسب لغة السؤال.','Translate to Arabic or English, depending on the word.']],
  ['aki',['المارد'],['المارد السحري','The magic genie']],
  ['rps',['حجرة','مقص'],['حجرة ورقة مقص','Rock paper scissors']],
  ['ttt',['xo','ox'],['إكس أو','Tic tac toe']],
  ['wheel',['wh','عجلة'],['عجلة الأسماء','Name wheel']],
];
const userOption = required => [{ name:'user', description:'صديقك / Your friend', type:Option.User, required }];
const commands=games.map(([name,aliases,title,instructions])=>({
  name, aliases, title:{ar:title[0],en:title[1]}, instructions:instructions ? {ar:instructions[0],en:instructions[1]} : undefined,
  description:title[0], game:true,
  options:['rps','ttt','punish'].includes(name) ? userOption(true) : name==='wheel' ? [{name:'names',description:'أسماء مفصولة بفواصل (اختياري) / Comma-separated names',type:Option.String,required:false,max_length:1000}] : [],
  async run(ctx) {
    if (this.instructions) return require('./games/quiz').runQuiz(ctx,this);
    if (['rps','ttt','punish'].includes(name)) return require('./games/duels')[name](ctx);
    if (name==='aki') return require('./games/akinator').aki(ctx);
    return require('./games/social')[name](ctx);
  },
}));
for(const [name,aliases,ar,en] of [
  ['help',['مساعدة'],'قائمة الألعاب والأوامر','Games and commands'],
  ['ping',['بنق'],'سرعة استجابة البوت','Bot latency'],
  ['points',['نقاطي'],'نقاط اللاعب','Player points'],
  ['profile',['بروفايل'],'ملف اللاعب','Player profile'],
  ['top',['توب'],'أفضل اللاعبين','Leaderboard'],
  ['lang',['لغة'],'تغيير لغة السيرفر','Set server language'],
  ['fix',[],'إلغاء كل جولات السيرفر العالقة','Cancel all server rounds'],
  ['stop',['ايقاف'],'إيقاف جولة هذا الروم','Stop this channel game'],
]) {
  commands.push({ name,aliases,title:{ar,en},description:ar,
    options:['profile','points'].includes(name) ? userOption(false) : name==='lang' ? ['ar','en'].map(lang=>({name:lang,type:Option.Subcommand,description:lang==='ar' ? 'العربية' : 'English'})) : [],
    default_member_permissions:['lang','fix'].includes(name) ? PermissionFlagsBits.ManageGuild.toString() : undefined,
    async run(ctx) { return require('./info')[name](ctx); },
  });
}
const byAlias=new Map();
for(const cmd of commands) for(const alias of [cmd.name,...cmd.aliases]) {
  const key=normalize(alias);
  if(byAlias.has(key) && byAlias.get(key)!==cmd) throw new Error(`Duplicate alias: ${alias}`);
  byAlias.set(key,cmd);
}
function get(name) { return byAlias.get(normalize(name)); }
function slashData() {
  const result=[];const used=new Set();
  for(const cmd of commands) for(const raw of [cmd.name,...cmd.aliases]) {
    const name=raw.toLowerCase(); if(used.has(name)) continue; used.add(name);
    result.push({ name, description:cmd.description, description_localizations:{'en-US':cmd.title.en,'en-GB':cmd.title.en,ar:cmd.title.ar},
      type:1, dm_permission:false, options:cmd.options,
      ...(cmd.default_member_permissions ? {default_member_permissions:cmd.default_member_permissions} : {}),
    });
  }
  if(result.length>100) throw new Error('Discord supports at most 100 slash commands.');
  return result;
}
module.exports={commands,get,slashData};
