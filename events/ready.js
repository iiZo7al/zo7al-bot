const client = require("../index");

client.on("ready", () =>
    console.log(`${client.user.tag} is up and ready to go!`)
);
client.on("ready", () =>
    client.user.setPresence({
        activities: [{
        name: "/help",
        type: "STREAMING",
        url: "https://www.twitch.tv/iizo7al"
        }], status: "idle" })
);