require("dotenv").config();
const { Client, IntentsBitField, Collection } = require("discord.js");
const mongoose = require("mongoose");
const cron = require("node-cron");

const usersWhoChatted = new Map(); // Track users and their messages in #본캐부캐-정보

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

// Utility function to escape Discord formatting
function escapeDiscordFormatting(text) {
  return text.replace(/[*_~`|]/g, "\\$&");
}

// Main async function to connect to MongoDB and start the bot
(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Log in to Discord using your bot's token
    client.login(process.env.TOKEN);
  } catch (error) {
    console.log(`Error connecting to DB: ${error}`);
  }
})();

// Load previous messages from #본캐부캐-정보
async function loadPreviousMessages() {
  try {
    const targetChannelId = "1233275024811622431"; // #본캐부캐-정보 channel ID
    const guild = client.guilds.cache.first();
    const targetChannel = guild.channels.cache.get(targetChannelId);

    if (!targetChannel) {
      console.error("Target channel not found.");
      return;
    }

    let lastMessageId = null;
    let fetchedMessages;
    let totalFetched = 0;

    do {
      fetchedMessages = await targetChannel.messages.fetch({
        limit: 100,
        before: lastMessageId,
      });

      fetchedMessages.forEach((message) => {
        if (!message.author.bot) {
          usersWhoChatted.set(message.author.id, message.content);
        }
      });

      totalFetched += fetchedMessages.size;
      console.log(`Fetched ${fetchedMessages.size} messages. Total: ${totalFetched}`);

      lastMessageId = fetchedMessages.size > 0 ? fetchedMessages.last().id : null;
    } while (fetchedMessages.size > 0);

    console.log("Finished loading previous messages.");
  } catch (error) {
    console.error("Error loading previous messages:", error);
  }
}

// Command setup and cron job registration
client.once("ready", async () => {
  console.log(`${client.user.tag} is online and commands have been registered.`);

  await client.application.commands.set([
    {
      name: "부검",
      description: "부검:#본캐부캐-정보 에 입력하지 않은 인원 찾아내기",
    },
    {
      name: "리셋트래킹",
      description: "부검을 위한 #본캐부캐-정보 에 남은 정보를 리셋함",
    },
    {
      name: "아오",
      description: "‘구강(九綱)’. ‘편광(偏光)’. ‘까마귀와 성명(聲明)’. ‘표리의 틈새’",
    },

    {
      name: "채팅친인원",
      description: "채팅 친 유저의 이름 목록 확인",
    },
    {
      name: "본캐부검",
      description: "특정 유저가 보낸 메시지 확인",
      options: [
        {
          type: 3,
          name: "username",
          description: "메시지를 확인할 유저의 이름",
          required: true,
        },
      ],
    },
  ]);

  await loadPreviousMessages();
});

// Schedule a message for Thursdays at 9:00 AM KST
cron.schedule(
  "0 9 * * 4",
  async () => {
    try {
      console.log("Cron job triggered at 9:00 AM KST on Thursday.");
      const guild = client.guilds.cache.first();
      if (!guild) {
        console.error("Guild not found.");
        return;
      }

      const targetChannel = guild.channels.cache.get("1230710960465907734"); // 완장관리탭 ID
      const role = guild.roles.cache.find((r) => r.name === "파란 지우개");

      if (!targetChannel) {
        console.error("Target channel not found.");
        return;
      }

      if (!role) {
        console.error('Role "파란 지우개" not found.');
        return;
      }

      await targetChannel.send(`${role} 수로 안친 길드원들 역할 조정 부탁드립니다.`);
      console.log("Scheduled message sent to #완장관리탭 for role @파란 지우개.");
    } catch (error) {
      console.error("Error during scheduled task:", error);
    }
  },
  {
    timezone: "Asia/Seoul",
  }
);

// Track messages in #본캐부캐-정보
client.on("messageCreate", async (message) => {
  const targetChannelId = "1233275024811622431"; // #본캐부캐-정보 channel ID
  if (message.channel.id === targetChannelId && !message.author.bot) {
    usersWhoChatted.set(message.author.id, message.content); // Save the user's message
    console.log(`${message.author.tag} has been added to the tracked users.`);
  }
});

// Handle slash commands and other interactions
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  try {
    const { commandName, options } = interaction;

    if (commandName === "리셋트래킹") {
      await loadPreviousMessages(); // Reload previous messages
      await interaction.reply("채팅 트래킹을 리셋하고 이전 메시지를 다시 로드했습니다.");
    } else if (commandName === "채팅친인원") {
      await interaction.deferReply({ ephemeral: true });
      const userIds = Array.from(usersWhoChatted.keys());

      if (userIds.length === 0) {
        await interaction.editReply("채팅 친 유저가 없습니다.");
        return;
      }

      const guild = interaction.guild;
      const userNames = [];

      for (const userId of userIds) {
        let member = guild.members.cache.get(userId);
        if (!member) {
          try {
            member = await guild.members.fetch(userId);
          } catch {
            userNames.push(`Unknown User (${userId})`);
            continue;
          }
        }
        userNames.push(escapeDiscordFormatting(member.user.tag));
      }

      const chunks = [];
      let currentChunk = "";

      for (const userName of userNames) {
        if ((currentChunk + userName + "\n").length > 1900) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
        currentChunk += `${userName}\n`;
      }
      if (currentChunk) chunks.push(currentChunk);

      for (const chunk of chunks) {
        await interaction.followUp(chunk);
      }
    } 
    else if (commandName === "아오") {
      try {
  
        const akaEmoji = "<:AKA:1279535972035596331>";
        const murasakiEmoji = "<:MURASAKI:1279535991635574835>";
  
        await interaction.reply(`${akaEmoji} ${murasakiEmoji}`);
      } catch (error) {
        console.error("Error while handling /아오 command:", error);
        await interaction.reply({
          content: "이모지를 보내는 도중 문제가 발생했습니다.",
          ephemeral: true,
        });
      }
    }
    
    else if (commandName === "본캐부검") {
      await interaction.deferReply({ ephemeral: true });
      const userName = options.getString("username");
      const guild = interaction.guild;
      const member = guild.members.cache.find((m) => m.user.tag === userName);

      if (!member) {
        await interaction.editReply(`${userName}의 채팅을 찾지 못했습니다.`);
        return;
      }

      const messageContent = usersWhoChatted.get(member.user.id);

      if (!messageContent) {
        await interaction.editReply(`${userName}의 채팅을 찾지 못했습니다.`);
        return;
      }

      await interaction.editReply(
        `Message from ${escapeDiscordFormatting(member.user.tag)}: ${messageContent}`
      );
    } else if (commandName === "부검") {
      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild;

      const allMembers = await guild.members.fetch();
      const membersNotChatted = allMembers.filter(
        (member) => !usersWhoChatted.has(member.id) && !member.user.bot // Exclude bots
      );

      const chunks = [];
      let currentChunk = "";

      for (const member of membersNotChatted.values()) {
        const userName = escapeDiscordFormatting(member.user.tag);
        if ((currentChunk + userName + "\n").length > 1900) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
        currentChunk += `${userName}\n`;
      }
      if (currentChunk) chunks.push(currentChunk);

      for (const chunk of chunks) {
        await interaction.followUp(chunk);
      }
    }
  } catch (error) {
    console.error("Error handling interaction:", error);
    try {
      await interaction.reply({
        content: "An error occurred while processing the command.",
        ephemeral: true,
      });
    } catch {
      console.error("Failed to reply to interaction due to expiration.");
    }
  }
});


client.on("messageCreate", async (message) => {
  const targetChannelName = "본캐부캐-정보"; // Channel to track
  const logChannelName = "생사부"; // Channel to log resets

  // Ensure the message is in #본캐부캐-정보 and not from a bot
  if (message.channel.name === targetChannelName && !message.author.bot) {
    try {
      const guild = message.guild;

      // Find the log channel (#생사부)
      const logChannel = guild.channels.cache.find((ch) => ch.name === logChannelName);
      if (!logChannel) {
        console.error(`Log channel "${logChannelName}" not found.`);
        return;
      }

      // Clear the tracking map
      usersWhoChatted.clear();

      // Fetch historical messages from #본캐부캐-정보
      let lastMessageId = null;
      let fetchedMessages;

      do {
        fetchedMessages = await message.channel.messages.fetch({
          limit: 100,
          before: lastMessageId, // Fetch messages before the last fetched message
        });

        fetchedMessages.forEach((msg) => {
          if (!msg.author.bot) {
            usersWhoChatted.set(msg.author.id, msg.content); // Store user messages
          }
        });

        lastMessageId =
          fetchedMessages.size > 0 ? fetchedMessages.last().id : null; // Update the last message ID
      } while (fetchedMessages.size > 0); // Continue until no more messages

      // Notify about the reset in #생사부
      await logChannel.send("본캐부캐-정보 가 갱신되었습니다.");

      // Add the new message to the tracking map
      usersWhoChatted.set(message.author.id, message.content);

      // Debugging logs
      console.log(`Tracking reset. Loaded ${usersWhoChatted.size} messages.`);
      console.log(`New message added from ${message.author.username}: "${message.content}"`);
    } catch (error) {
      console.error("Error handling message reset:", error);
    }
  }
});



// Welcome message handler
client.on("guildMemberAdd", async (member) => {
  const targetChannelId = "1229948971406069772"; // #일반채팅 ID
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

// 퇴장메세지
client.on("guildMemberRemove", async (member) => {
  const channel = member.guild.channels.cache.find((ch) => ch.name === "생사부");
  if (!channel) {
    return console.error("채널을 찾을 수 없었습니다.");
  }

  const messageContent = usersWhoChatted.get(member.user.id);

  if (!messageContent) {
    channel.send(`${member.user.username} 님이 서버에서 퇴장하였습니다. 이전 채팅 기록이 없습니다.`);
  } else {
    channel.send(
      `${member.user.username} 님이 서버에서 퇴장하였습니다. 이전 채팅 기록: "${messageContent}"`
    );
  }
});
