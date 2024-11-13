const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('부검')
    .setDescription('부검: Prints the names of people who have not chatted in the channel'),

  run: async ({ client, interaction, usersWhoChatted }) => {
    const guild = interaction.guild;
    const targetChannelId = '1233275024811622431'; // Correct ID for #본캐부캐-정보
    const targetChannel = guild.channels.cache.get(targetChannelId);

    if (!targetChannel) {
      await interaction.reply("The target channel could not be found.");
      return;
    }

    try {
      // Fetch the last 1000 messages from the target channel dynamically
      let lastMessageId;
      const allUsersWhoChatted = new Set(); // Track all users who chatted in the channel

      // Keep fetching messages until there are no more messages or you've fetched enough
      while (true) {
        const fetchedMessages = await targetChannel.messages.fetch({ limit: 100, before: lastMessageId });

        if (fetchedMessages.size === 0) {
          break;
        }

        fetchedMessages.forEach(message => {
          if (!message.author.bot) {
            allUsersWhoChatted.add(message.author.id);
          }
        });

        // Update the lastMessageId to fetch older messages in the next loop
        lastMessageId = fetchedMessages.last().id;

        // Break after 1000 messages to avoid fetching too many messages (you can adjust this as needed)
        if (allUsersWhoChatted.size >= 1000) break;
      }

      // Fetch all members of the server
      const allMembers = await guild.members.fetch();

      // Filter members who have not chatted
      const membersWhoHaveNotChatted = allMembers.filter(member =>
        !allUsersWhoChatted.has(member.user.id) && !member.user.bot // Exclude bots
      );

      if (membersWhoHaveNotChatted.size === 0) {
        await interaction.editReply('모두 입력을 완료하였습니다.');
      } else {
        // Get the usernames of members who haven't chatted
        const names = membersWhoHaveNotChatted.map(member => member.user.tag).join(', ');

        // Split the names string into chunks of 2000 characters or less for message limits
        const chunks = names.match(/.{1,1900}(,|$)/g);

        for (const chunk of chunks) {
          await interaction.followUp(`본부캐 입력을 하지 않은 인원: ${chunk}`);
        }
      }
    } catch (error) {
      console.error('Error fetching messages or members:', error);
      await interaction.editReply('에러 ㅋㅋ');
    }
  },
};
