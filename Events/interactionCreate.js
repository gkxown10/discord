module.exports = {
  name: 'interactionCreate', // This is not a command, but an event handler
  run: async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // Example command handling: 본캐저장 command
    if (interaction.commandName === '본캐저장') {
      // Toggle processing state
      const isProcessingActive = !messageCreateHandler.isProcessingActive;
      messageCreateHandler.activateProcessing(isProcessingActive);

      if (isProcessingActive) {
        await interaction.reply("본캐 저장이 활성화되었습니다.");
      } else {
        await interaction.reply("본캐 저장이 비활성화되었습니다.");
      }
    }
  },
};
