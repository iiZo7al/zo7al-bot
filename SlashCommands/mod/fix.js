const { Client, CommandInteraction } = require("discord.js");
const Lang = require('../../schemas/Lang');
const db = require('quick.db')

module.exports = {
    name: "fix",
    description: "To Fix the Problems!",
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
        if (!interaction.member.permissions.has("ADMINISTRATOR")) return interaction.followUp({ content: lang.permErr });
        

        db.delete(`capitalsCheck_${interaction.guild.id}`);
        db.delete(`fkkCheck_${interaction.guild.id}`);
        db.delete(`letterCheck_${interaction.guild.id}`);
        db.delete(`mathCheck_${interaction.guild.id}`);
        db.delete(`pluralCheck_${interaction.guild.id}`);
        db.delete(`singleCheck_${interaction.guild.id}`);
        db.delete(`translateCheck_${interaction.guild.id}`);
        db.delete(`typeCheck_${interaction.guild.id}`);

        interaction.followUp({ content: lang.fixed })
    },
};