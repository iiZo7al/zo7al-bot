const Discord = require("discord.js");
const client = require("../index");
client.config = require("../config.json");
const emoji = require("../emoji.json");
const discordCode = client.config.discord
const color = client.config.color

client.on("messageCreate", async message => {


    if (
        message.author.bot ||
        !message.guild ||
        !message.content.toLowerCase().startsWith(client.config.prefix)
    )
        return;

    const [cmd, ...args] = message.content
        .slice(client.config.prefix.length)
        .trim()
        .split(/ +/g);

    const command = client.commands.get(cmd.toLowerCase()) || client.commands.find(c => c.aliases?.includes(cmd.toLowerCase()));

    if (!command) return;
    await command.run(client, message, args, Discord, emoji, color, discordCode);
});
