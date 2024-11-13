const { SlashCommandBuilder } = require('discord.js');
const messageCreateHandler = require("../events/messageCreate"); // Import the messageCreate handler

module.exports = {
  data: new SlashCommandBuilder()
    .setName('본캐저장') // Must be all lowercase with no spaces
    .setDescription('메시지를 처리하기 위해 본캐 저장을 활성화합니다.'),
  
  run: async ({ interaction }) => {
    // Toggle the processing state
    const isProcessingActive = !messageCreateHandler.isProcessingActive;
    messageCreateHandler.activateProcessing(isProcessingActive); // Call the method from messageCreate.js

    if (isProcessingActive) {
      await interaction.reply("본캐 저장이 활성화되었습니다.");
    } else {
      await interaction.reply("본캐 저장이 비활성화되었습니다.");
    }
  },
};
