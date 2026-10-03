const { Client, CommandInteraction } = require("discord.js");

module.exports = {
    name: "ping",
    description: "Ping Command!",
    type: 'CHAT_INPUT',
    run: async (client, interaction, args, Discord, emoji, color, discordCode) => {
        interaction.followUp({ content: `**🔔 My Ping is :** \`${client.ws.ping}ms!\`` });
    },
};
