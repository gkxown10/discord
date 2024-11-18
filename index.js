require("dotenv").config();
const { Client, IntentsBitField, Collection } = require("discord.js");
const mongoose = require("mongoose");
const cron = require("node-cron");

const usersWhoChatted = new Map(); // Map to track users and their messages in #본캐부캐-정보

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
    await client.login(process.env.TOKEN);

    // Register commands
    client.once("ready", async () => {
      console.log(`${client.user.tag} is online and commands have been registered.`);

      // Register slash commands
      try {
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
        console.log("Commands registered successfully.");
      } catch (error) {
        console.error("Error registering commands:", error);
      }

      // Schedule a message to be sent every Thursday at 9:00 AM Korea time
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

    // Event listener for tracking messages in #본캐부캐-정보
    client.on('messageCreate', async (message) => {
      const targetChannelId = '1233275024811622431'; // #본캐부캐-정보 채널 ID
      if (message.channel.id === targetChannelId && !message.author.bot) {
        if (message.content.trim()) {
          if (!usersWhoChatted.has(message.author.id)) {
            usersWhoChatted.set(message.author.id, message.content.trim());
            console.log(`${message.author.tag} has been added to the chat tracker.`);
          } else {
            usersWhoChatted.set(message.author.id, message.content.trim());
            console.log(`${message.author.tag}'s message updated in the tracker.`);
          }
        }
      }
    });

    // Handle slash commands
    client.on('interactionCreate', async interaction => {
      if (!interaction.isCommand()) return;

      try {
        const { commandName, options } = interaction;

        if (commandName === 'resetchattracking') {
          usersWhoChatted.clear();
          await interaction.reply('The chat tracking for #본캐부캐-정보 has been reset.');
        } else if (commandName === 'checkchatted') {
          const userList = Array.from(usersWhoChatted.keys()).map(userId => `<@${userId}>`);
          if (userList.length === 0) {
            await interaction.reply('No users have chatted in #본캐부캐-정보 yet.');
          } else {
            await interaction.reply(`Users who have chatted in #본캐부캐-정보:\n${userList.join('\n')}`);
          }
        } else if (commandName === 'checkmessage') {
          const userId = options.getString('userid');
          const message = usersWhoChatted.get(userId);
          if (message) {
            await interaction.reply(`Message from <@${userId}>: "${message}"`);
          } else {
            await interaction.reply(`<@${userId}> has not sent a message in #본캐부캐-정보.`);
          }
        }
      } catch (error) {
        console.error('Error handling interaction:', error);
        await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
      }
    });

    // Welcome new members
    client.on("guildMemberAdd", async (member) => {
      const targetChannelId = '1229948971406069772'; //#일반채팅 ID
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

    // Handle member removal
    client.on("guildMemberRemove", (member) => {
      const channel = member.guild.channels.cache.find(ch => ch.name === '생사부');
      if (!channel) return console.error('Channel not found');
      channel.send(`${member.user.tag} 가 서버에서 퇴장하였습니다.`);
    });
  } catch (error) {
    console.error(`Error during bot initialization: ${error}`);
  }
})();
