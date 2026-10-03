const { Client, CommandInteraction } = require("discord.js");
const db = require('quick.db')
const client = require("../../index");
    const Canvas = require("canvas");
    Canvas.registerFont('./Almarai-Light.ttf', { family: 'Almarai' });
const jimp = require("jimp");
const Points = require('../../schemas/Point');
const Lang = require('../../schemas/Lang');

module.exports = {
    name: "ايموجي",
    description: "اوجد الايموجي الصحيح",
    type: 'CHAT_INPUT',
    run: async (client, interaction, args, Discord, emoji, color, discordCode) => {
        try {

        let langD = await Lang.findById(interaction.guild.id);
        let lang = client.replys.ar;
        if(langD) {
            if(langD.lang === "en"){
                lang = client.replys.en
            } else {
                lang = client.replys.ar
            }    
        }
        let check = db.get(`emojisCheck_${interaction.guild.id}`);
        let timeout = 5000;

        if(check){
            interaction.followUp(`**${client.emoji.watch} \`-\` ${lang.match}**`)
        } else {

                  let type = require(`../../gamesdb/ar/emojis.json`);
                  if(langD){
                    type = require(`../../gamesdb/${langD.lang}/emojis.json`);
                  }
                  const item = type[Math.floor(Math.random() * type.length)];
                  let author = interaction.user;
                  const filter = response => {
                      return item.answers.some(answer => answer.toLowerCase() === response.content.toLowerCase());
                  };
                  interaction.followUp({ content: `${client.emoji.watch} \`-\` ${lang.emojis.t1}` }).then(async message => {
                    const background = await Canvas.loadImage(client.config.back);
                    const canvas =  Canvas.createCanvas(700, 250);
                    const  ctx = canvas.getContext('2d');
                    const emojis = `${lang.emojis.t2}`;

                    ctx.fillStyle = '#ffffff';
                    ctx.drawImage(background, 10, 0, canvas.width, canvas.height);
                    if(langD){
                        ctx.font = (langD.lang === 'en') ? '28px Almarai' : '35px Almarai';
                    } else {
                        ctx.font = '35px Almarai';
                    }
                    ctx.textAlign = "center";
                    ctx.fillText(emojis  , 375, 195);
                    ctx.font = '35px Almarai';
                    ctx.textAlign = "center";
                    ctx.fillText(item.type  , 350, 75);

                let url = interaction.user.displayAvatarURL({ dynamic: true, format: "png" });
                jimp.read(url, (err, ava) => { 
                    if (err) return console.log(err);
                    ava.getBuffer(jimp.MIME_PNG, (err, buf) => {
                    if (err) return console.log(err);

                    let Avatar = Canvas.Image;
                    let ava = new Avatar;
                    ava.src = buf;
                    ctx.beginPath();
                    ctx.arc(999, 999, 999, 999, Math.PI*2);

                        ctx.closePath(); 
                        ctx.clip();
                        ctx.drawImage(ava, 999, 999, 999, 999);   
                        const attachment = new Discord.MessageAttachment(canvas.toBuffer());

                    interaction.channel.send({ files: [attachment] }).catch(console.error);
                    db.set(`emojisCheck_${interaction.guild.id}`, Date.now());
                    })

            interaction.channel.awaitMessages({filter, 
                        max: 1,
                        time: 15000,
                        errors: ['time']
            }).then(async collected => {

            copy = collected.first().content;
            won = collected.first().author;
           let points = await Points.findById(won.id)
            if (copy == item.answers){

                if(!points) {
                    await Points.findOneAndUpdate({
                        _id: won.id,
                    },
                    {
                        points: 0,
                    },
                    {
                        upsert: true
                    }).exec();
                }

                await Points.findOneAndUpdate({
                    _id: won.id,
                },
                {
                    points: points.points + 1,
                },
                {
                    upsert: true
                }).exec();

                const pointsUser = await Points.findById(won.id)


                var embed = new Discord.MessageEmbed() 
                .setColor(color)
                .setDescription(`${collected.first().author} ${lang.emojis.t3}`)
                interaction.channel.send({ embeds: [embed] });
                db.delete(`emojisCheck_${interaction.guild.id}`);
                        copy = collected.first().content;


            } else {

                if(!points) {
                    await Points.findOneAndUpdate({
                        _id: won.id,
                    },
                    {
                        points: 0,
                    },
                    {
                        upsert: true
                    }).exec();
                }

                await Points.findOneAndUpdate({
                    _id: won.id,
                },
                {
                    points: points.points + 1,
                },
                {
                    upsert: true
                }).exec();

                const pointsUser = await Points.findById(won.id)

                var embed = new Discord.MessageEmbed()
                .setColor(color)
                .setDescription(`${collected.first().author} ${lang.emojis.t3}`)

                interaction.channel.send({ embeds: [embed] });
                db.delete(`emojisCheck_${interaction.guild.id}`);
                copy = collected.first().content;   


            }}).catch((collected, err) => {
                interaction.channel.send(`> **${lang.err}**`);
                db.delete(`emojisCheck_${interaction.guild.id}`);
            })
        })
    db.delete(`emojisCheck_${interaction.guild.id}`);

    })
}        
} catch (error) {
  console.error(error);
  // expected output: ReferenceError: nonExistentFunction is not defined
  // Note - error messages will vary depending on browser
}

    },

};
