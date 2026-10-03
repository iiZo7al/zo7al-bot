const { Client, CommandInteraction } = require("discord.js");
const Lang = require('../../schemas/Lang');
const db = require('quick.db')

module.exports = {
    name: "lang",
    description: "Lang Command!",
    type: 'CHAT_INPUT',
    options: [
        {
            name: 'ar',
            type: 'SUB_COMMAND',
            description: "لتحويل لغة البوت للغة العربية !",
            required: false
        },
        {
            name: 'en',
            type: 'SUB_COMMAND',
            description: "To convert the language of the bot to English !",
            required: false
        }
    ],
    
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
        if (!interaction.member.permissions.has("ADMINISTRATOR")) return interaction.followUp({ content: lang.permErr,});

        if (interaction.options.getSubcommand() === 'ar') {
            await Lang.findOneAndUpdate({
                    _id: interaction.guild.id,
                },
                {
                    lang: "ar",
                },
                {
                    upsert: true
                }).exec();
            interaction.followUp({ content: client.replys.ar.lang })
        } else if (interaction.options.getSubcommand() === 'en') {
            await Lang.findOneAndUpdate({
                    _id: interaction.guild.id,
                },
                {
                    lang: "en",
                },
                {
                    upsert: true
                }).exec();
            interaction.followUp({ content: client.replys.en.lang })
        }
    },
};