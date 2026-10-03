const Discord = require("discord.js");
const client = require("../index");
client.config = require("../config.json");
const emoji = require("../emoji.json");
const discordCode = client.config.discord
const color = client.config.color

client.on("interactionCreate", async interaction => {
    // Slash Command Handling
    if (interaction.isCommand()) {
        await interaction.deferReply({ ephemeral: false }).catch(() => {});

        const cmd = client.slashCommands.get(interaction.commandName);
        if (!cmd)
            return interaction.followUp({ content: "An error has occured " });
        if(interaction.masterOnly) return interaction.followUp('> **This command only for Master Users** ..')
        
        const args = [];


        for (let option of interaction.options.data) {
            if (option.type === "SUB_COMMAND") {
                if (option.name) args.push(option.name);
                option.options?.forEach((x) => {
                    if (x.value) args.push(x.value);
                });
            } else if (option.value) args.push(option.value);
        }
        interaction.member = interaction.guild.members.cache.get(interaction.user.id);
        

        /*let premium = interaction.guild.members.cache.fetch('919931389346975744');
        if(premium) return interaction.followUp({ content: `an bot here` })*/

        cmd.run(client, interaction, args, Discord, emoji, color, discordCode);
    }

    // Context Menu Handling
    if (interaction.isContextMenu()) {
        await interaction.deferReply({ ephemeral: false });
        const command = client.slashCommands.get(interaction.commandName);
        if (command) command.run(client, interaction);
    }
});
