require("dotenv").config();
const { Client, IntentsBitField, Collection } = require("discord.js");
const mongoose = require("mongoose");
const cron = require("node-cron");
const moment = require("moment-timezone");

const usersWhoChatted = new Set(); //  #본캐부캐-정보 채팅 친 인원 트래킹

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

    // 디스코드 로그인 토큰 필요
    client.login(process.env.TOKEN);

  } catch (error) {
    console.log(`Error connecting to DB: ${error}`);
  }
})();

// 명령어
client.on("interactionCreate", async (interaction) =>{
  if (!interaction.isCommand()) return;

  try {
    const command = client.commands.get(interaction.commandName);

    if (command) {
      await command.run({client, interaction, usersWhoChatted});
  
    }
  } catch (error){
    console.error("Error handling interaction: ", error);
    await interaction.reply({ content: "오류", ephemeral: true});
  }
}
);

  // 목요일 오전 9시 타임존
  cron.schedule('0 9 * * 4', async () => {
    try {
      console.log("Cron job triggered at 23:23 Korea time");
      const guild = client.guilds.cache.first(); // 길드 전용봇 다른곳에서 쓸 경우 수정
      if (!guild) {
        console.error('Guild not found.');
        return;
      }

      const targetChannel = guild.channels.cache.get('1230710960465907734'); // 완장관리탭 ID
      const role = guild.roles.cache.find(r => r.name === '파란 지우개');

      if (!targetChannel) {
        console.error('Target channel not found.');
        return;
      }

      if (!role) {
        console.error('Role "파란 지우개" not found.');
        return;
      }

      // 목요일 춘식이 알림
      await targetChannel.send(`${role} 수로 안친 길드원들 역할 조정 부탁드립니다.`);
      console.log('Scheduled message sent to #완장관리탭 for role @파란 지우개.');
    } catch (error) {
      console.error('Error during scheduled task:', error);
    }
  }, {
    timezone: 'Asia/Seoul' // 한국 타임존
  });
});


// #본캐부캐-정보 트래킹
client.on('messageCreate', async (message) => {
  const targetChannelId = '1233275024811622431'; // #본캐부캐-정보 채널 ID
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

// 명령어 핸들러
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  try {
    const command = client.commands.get(interaction.commandName);
    if (interaction.commandName === 'resetchattracking') {
      usersWhoChatted.clear();
      await interaction.reply('The chat tracking for #본캐부캐-정보 has been reset.');
    } else if (command) {
      await interaction.deferReply();
      await command.run({ client, interaction, usersWhoChatted });
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    await interaction.editReply({ content: 'An error occurred.', ephemeral: true });
  }
});

// 환영인사 핸들러
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

// 퇴장/강퇴인원 문구
client.on("guildMemberRemove", (member) => {
  const channel = member.guild.channels.cache.find(ch => ch.name === '생사부');
  if (!channel) return console.error('Channel not found');
  channel.send(`${member.user.tag} 가 서버에서 퇴장하였습니다.`);
});
