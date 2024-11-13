client.on('messageCreate', async (message) => {
  const targetChannelId = '1233275024811622431'; // Correct ID for #본캐부캐-정보

  // Log every message the bot receives for debugging purposes
  console.log(`Received message from ${message.author.tag} in channel ${message.channel.id}`);

  // Ensure the message is from the correct channel and exclude bots
  if (message.channel.id === targetChannelId && !message.author.bot) {
    // Check if the message contains valid content
    if (message.content.trim()) {
      if (!usersWhoChatted.has(message.author.id)) {
        usersWhoChatted.add(message.author.id);  // Add the user to the set of those who have chatted
        console.log(`${message.author.tag} has been added to the set of users who have chatted.`);
        console.log(`Current users in the set: ${Array.from(usersWhoChatted).length}`);
      } else {
        console.log(`${message.author.tag} has already been added to the set.`);
      }
    } else {
      console.log(`${message.author.tag} sent a message without any valid content.`);
    }
  } else {
    console.log(`Message received from ${message.author.tag} in a different channel (ID: ${message.channel.id})`);
  }
});
