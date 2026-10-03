 const { Client, CommandInteraction } = require("discord.js");
const prefix = "/"
const { promisify } = require("util");
const { glob } = require("glob");

const globPromise = promisify(glob);
const Lang = require('../../schemas/Lang');

module.exports = {
    name: "help",
    description: "Help Command!",
    run: async (client, interaction, args, Discord, emoji, color, discordCode) => {

    
    let langD = await Lang.findById(interaction.guild.id);
        let lang = client.replys.ar;
        if(langD) {
            if(langD.lang === "en"){
                lang = client.replys.en
            } else {
                lang = client.replys.ar
            }    
    }

        const exampleEmbed = new Discord.MessageEmbed()
	.setColor(color)
	.setTitle(`${emoji.logo} - List of Commands :`)
	.setDescription(`
    
    **My Prefix : ( \`${prefix}\` )**

    **${emoji.point1} - __Info__ : **
    > \`/help\` : \`${lang.help.info1}\`
    > \`/ping\` : \`${lang.help.info2}\`
    > \`/profile\` : \`${lang.help.info3}\`
    > \`/top\` : \`${lang.help.info4}\`

    **${emoji.point1} - __Games__ : **
    > \`/عواصم\` : \`${lang.help.game1}\`
    > \`/كت\` : \`${lang.help.game2}\`
    > \`/فكك\` : \`${lang.help.game3}\`
    > \`/letter\` : \`${lang.help.game4}\`
    > \`/math\` : \`${lang.help.game5}\`
    > \`/plural\` : \`${lang.help.game6}\`
    > \`/single\` : \`${lang.help.game7}\`
    > \`/translate\` : \`${lang.help.game8}\`
    > \`/type\` : \`${lang.help.game9}\`

    **${emoji.point1} - __Admin__ : **
    > \`/fix\` : \`${lang.help.mod1}\`
    > \`/lang\` : \`${lang.help.mod2}\`
    
    `)
	.setThumbnail(emoji.thu)
	.setImage(emoji.help)


    		const row = new Discord.MessageActionRow()
			.addComponents(
				new Discord.MessageButton()
					.setLabel('Invite')
					.setStyle('LINK')
                    .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=${emoji.perm}&scope=bot%20applications.commands`)
                    .setEmoji(emoji.linkID)
			)
            .addComponents(
				new Discord.MessageButton()
					.setLabel('Support')
					.setStyle('LINK')
                    .setURL(`https://discord.gg/${discordCode}`)
                    .setEmoji(emoji.linkID)
            );
        interaction.followUp({ content: lang.help.dm })
        interaction.user.send({ embeds: [exampleEmbed], components: [row] }).catch(err => {
            interaction.followUp({ content: lang.help.err })
        })
        
        
        
            
        
        //interaction.user.send({ embeds: [exampleEmbed], components: [row] }).catch()
    },
};
