const { Client, CommandInteraction } = require("discord.js");
const Lang = require('../../schemas/Lang');
const Points = require('../../schemas/Point');

module.exports = {
    name: "top",
    description: "Top Users Command!",
    type: 'CHAT_INPUT',
    run: async (client, interaction, args, Discord, emoji, color, discordCode) => {
        
        let data = await Points.find({})
        let members= []

        for( let obj of data ){
            if(client.users.cache
            .map((member) => member.id)
            .includes(obj._id)) members.push(obj)
        }
        
        members = members.sort(function (a, b) {
            return a.points - b.points
        }).reverse()
        
        members = members.filter(function BigEnough(value) {
            return value.points > 0
        })
        
        let pos = 0
        for(let obj of members){
            pos++
            if(obj._id == interaction.user.id) {

            }
        }

        members = members.slice(0, 10)
        let desc = "";

        for(let i = 0; i < members.length; i++){
            let user = client.users.cache.get(members[i]._id)
            
            if(!user) return;
            let poi = members[i].points
            
            desc += `**${i + 1}.** \`${user.tag}\` - \`${poi}\` point .\n`
        }

        const exampleEmbed = new Discord.MessageEmbed()
	.setColor(color)
	.setTitle(emoji.point + ` - List of Top User's :`)
	.setDescription(`${desc}`)
	.setThumbnail(emoji.thu)
    .setAuthor('زحل Zo7al', 'https://i.postimg.cc/mkcLq8Cx/3.gif', 'https://linktr.ee/zo7al')
    .setFooter('Use Code : ZO7AL', 'https://i.postimg.cc/mkcLq8Cx/3.gif');

        interaction.followUp({ embeds: [exampleEmbed] })
    },
};
