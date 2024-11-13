const { ActivityType } = require("discord.js");

module.exports = (client) => {
  client.user.setActivity({
    name: "discord 봇 개발",
    type: ActivityType.Playing,
  });
};