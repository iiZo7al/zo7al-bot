const { Message, Client } = require("discord.js");

module.exports = {
    name: "ping",
    description: "Ping Command !",
    aliases: ['p'],
    run: async (client, message, args, Discord, hash, emoji, color, discordCode) => {
        message.channel.send(`${client.ws.ping} ws ping`);
    },
};
