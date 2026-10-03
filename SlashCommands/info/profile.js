const { Client, CommandInteraction } = require("discord.js");
const Lang = require('../../schemas/Lang');
const Points = require('../../schemas/Point');
const db = require('quick.db');
const Canvas = require("canvas");

module.exports = {
    name: "profile",
    description: "Profile Command!",
    type: 'CHAT_INPUT',
    options: [
        {
            name: 'user',
            type: 'USER',
            description: "To show any user profile",
            required: false
        }
    ],
    
    run: async (client, interaction, args, Discord, emoji, color, discordCode) => {
        
        let user = interaction.options.getUser('user') || interaction.user ;
        /*var level = db.fetch(`level_${user.id}`) || 0;
        var currentxp = db.fetch(`xp_${user.id}`) || 0;*/
        let pointsFind = await Points.findById(user.id)
        let points = 0;
        
        let des = db.fetch(`description_${user.id}`);
        /*var xpNeeded = level * 500 + 500*/

        if(!des) des = 'Set Your Description';
        if(pointsFind) points = pointsFind.points;

        const canvas = Canvas.createCanvas(512, 512);
        Canvas.registerFont('./Akira-Expanded-Demo.otf', {family: 'Akira'});
        const ctx = canvas.getContext('2d');
        let prime = db.fetch(`prime_${user.id}`)

        

        const background = await Canvas.loadImage('https://cdn.discordapp.com/attachments/897071639286657044/927642292175634492/ProfileCard_false.png');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        const applyText = (canvas, text) => {

	    let fontSize = 25;

    	do {
		    ctx.font = `${fontSize -= 5}px "Roboto"`;
	    } while (ctx.measureText(text).width > canvas.width - 300);

    	return ctx.font;
        };

        //UserName
        ctx.font = applyText(canvas, user.username);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = "center";
        ctx.fillText(user.username,  canvas.width / 2, canvas.height / 2.35);

        //description
        ctx.font = '15px Akira';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = "center";
        ctx.fillText(`${des}`,  canvas.width / 2, canvas.height / 1.28);

        //level
        /*ctx.font = '15px "Akira"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = "center";
        ctx.fillText(`${level}`,  canvas.width / 1.35, canvas.height / 1.73);*/

        //points
        ctx.font = '15px Akira';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = "center";
        ctx.fillText(`${points}`,  canvas.width / 4.7, canvas.height / 1.73);


        const avatar = await Canvas.loadImage(user.displayAvatarURL({dynamic:true, format: 'png'}));
        ctx.beginPath();
	    ctx.arc(255, 100, 75, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
	    ctx.drawImage(avatar, 180, 25, 150, 150);


        const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'profile.png');

        interaction.followUp({ files: [attachment] });
        


    },
};
