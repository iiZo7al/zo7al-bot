const { Client, CommandInteraction } = require("discord.js");
const Lang = require('../../schemas/Lang');
const Points = require('../../schemas/Point');

module.exports = {
    name: "points",
    description: "Points Command!",
    type: 'CHAT_INPUT',
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

        const pointsUser = await Points.findById(interaction.user.id)
        if(pointsUser) { 
            if(pointsUser.points) { interaction.followUp({ content: lang.points1 + ` \`${pointsUser.points}\`` }) }
            else { interaction.followUp({ content: lang.points1 + ` \`0\`` }) }
            
        } else {
            interaction.followUp({ content: lang.points1 + ` \`0\`` })
        }
        
    },
};
