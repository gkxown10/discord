require("dotenv").config();
const { Client, IntentsBitField, Collection } = require("discord.js");
const mongoose = require("mongoose");
const cron = require("node-cron");
const moment = require("moment-timezone");

const usersWhoChatted = new Set(); // Track users who have chatted in #본캐부캐-정보

// Create a new client instance
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

// Initialize the command collection
client.commands = new Collection();
client.commands.set('부검', require('./Commands/whoHasntChatted.js'));

// Main async function to connect to MongoDB and start the bot
(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Login to Discord using your bot's token
    client.login(process.env.TOKEN);

  } catch (error) {
    console.log(`Error connecting to DB: ${error}`);
  }
})();

// Command registration
client.once("ready", async () => {
  console.log(`${client.user.tag} is online and commands have been registered.`);

  await client.application.commands.set([
    {
      name: '부검',
      description: '부검:#본캐부캐-정보 에 입력하지 않은 인원 찾아내기',
      type: 1, // Slash Command
    },
    {
      name: 'resetchattracking',
      description: '부검을 위한 #본캐부캐-정보 에 남은 정보를 리셋함',
      type: 1, // Slash Command
    },
    {
      name: 'checkchatted',
      description: '채팅 친 유저의 이름 목록 확인',
      type: 1, // Slash Command
    },
    {
      name: 'checkmessage',
      description: '특정 유저가 보낸 메시지 확인',
      options: [
        {
          type: 3, // STRING
          name: 'userid',
          description: '메시지를 확인할 유저의 ID',
          required: true,
        },
      ],
      type: 1, // Slash Command
    },
  ]);

  // Scheduled task: Thursday at 9:00 AM Korea Time
  cron.schedule('0 9 * * 4', async () => {
    try {
      console.log("Scheduled task triggered.");
      const guild = client.guilds.cache.first(); // Adjust if the bot is in multiple servers
      if (!guild) {
        console.error('Guild not found.');
        return;
      }

      const targetChannel = guild.channels.cache.get('1230710960465907734'); // Replace with the ID of #완장관리탭
      const role = guild.roles.cache.find(r => r.name === '파란 지우개');

      if (!targetChannel) {
        console.error('Target channel not found.');
        return;
      }

      if (!role) {
        console.error('Role "파란 지우개" not found.');
        return;
      }

      // Send message
      await targetChannel.send(`${role} 수로 안친 길드원들 역할 조정 부탁드립니다.`);
      console.log('Scheduled message sent to #완장관리탭 for role @파란 지우개.');
    } catch (error) {
      console.error('Error during scheduled task:', error);
    }
  }, {
    timezone: 'Asia/Seoul', // Korean time zone
  });
});

// Track messages in #본캐부캐-정보
client.on('messageCreate', async (message) => {
  const targetChannelId = '1233275024811622431'; // Replace with the ID of #본캐부캐-정보
  console.log(`Received message from ${message.author.tag} in channel ${message.channel.id}`);
  if (message.channel.id === targetChannelId && !message.author.bot) {
    if (message.content.trim()) {
      if (!usersWhoChatted.has(message.author.id)) {
        usersWhoChatted.add(message.author.id);
        console.log(`${message.author.tag} has been added to the set of users who have chatted.`);
      }
    }
  }
});

// Command handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    const command = client.commands.get(interaction.commandName);
    if (interaction.commandName === 'resetchattracking') {
      usersWhoChatted.clear();
      await interaction.reply('The chat tracking for #본캐부캐-정보 has been reset.');
    } else if (interaction.commandName === 'checkchatted') {
      // List users who chatted
      const userList = Array.from(usersWhoChatted)
        .map(userId => `<@${userId}>`)
        .join('\n');
      await interaction.reply(userList || 'No users have chatted yet.');
    } else if (interaction.commandName === 'checkmessage') {
      // Find messages from a specific user
      const userId = interaction.options.getString('userid');
      const messages = usersWhoChatted[userId];
      await interaction.reply(messages ? `Messages from <@${userId}>:\n${messages.join('\n')}` : `No messages found for <@${userId}>.`);
    } else if (command) {
      await interaction.deferReply();
      await command.run({ client, interaction, usersWhoChatted });
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    await interaction.reply({ content: 'An error occurred.', ephemeral: true });
  }
});

// Welcome message
client.on("guildMemberAdd", async (member) => {
  const targetChannelId = '1229948971406069772'; // Replace with the ID of #일반채팅
  const welcomeChannel = member.guild.channels.cache.get(targetChannelId);
  if (welcomeChannel) {
    const welcomeMessage = `
      안녕하세요, <@${member.id}>! 환영합니다!
      
      <#1233275024811622431> 여기에 본부캐 정보 입력
      길드컨텐츠는 수로 혹은 플래그중 1개 매주 필수로 해주셔야합니다.
      
      보스 구인구직은 <#1258908669840588822>에서,
      커머시나 골럭스는 <#1229996825956716615>에서 권한부여 받고 탭 이용 가능합니다.
      
      문제가 생길 경우 <#1269814459111571548>에서 티켓 누른 뒤 문의하시면 됩니다.
      골럭스 버스 필요하면 <#1232158295104553080>에서 운영하고 있으니 참여해주세요!
    `;
    await welcomeChannel.send(welcomeMessage);
    console.log(`Welcome message sent to ${member.user.tag}`);
  }
});

// Farewell message
client.on("guildMemberRemove", (member) => {
  const channel = member.guild.channels.cache.find(ch => ch.name === '생사부');
  if (!channel) return console.error('Channel not found');
  channel.send(`${member.user.tag} 가 서버에서 퇴장하였습니다.`);
});
