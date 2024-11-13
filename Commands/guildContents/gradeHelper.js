const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
  } = require("discord.js");
  const memberDB = require("../../models/memberSchema.js");
  
  const choices = [
    { name: "반영", emoji: "✅", beats: "반영" },
    { name: "미반영", emoji: "❎", beats: "미반영" },
  ];
  
  module.exports = {
    managerOnly: true,
    run: async ({ interaction }) => {
      const inputMonth = interaction.options.get("month").value;
      const inputWeek = interaction.options.get("week").value;
      const targetTime = `${inputMonth}-${inputWeek}`;
  
      // Defer the reply to avoid interaction timeout
      await interaction.deferReply();
  
      const ifexist = await memberDB.exists({
        guildContents: {
          $elemMatch: { time: targetTime },
        },
      });
  
      if (!ifexist) {
        await interaction.editReply(
          "해당 주차 길드컨텐츠 참여 정보가 존재하지 않습니다."
        );
        return;
      }
  
      let mainFarr = [];
      let subFarr = [];
      let mainTarr = [];
      let subTarr = [];
      let elseArr = [];
  
      for await (const doc of memberDB.find()) {
        const targetIndex = doc.guildContents.findIndex(
          (e) => e.time === targetTime
        );
  
        if (!doc.guildContents[targetIndex]?.participated) {
          if (doc.grade === "본캐") {
            mainFarr.push(doc.nickName);
          } else if (doc.grade === "부캐") {
            subFarr.push(doc.nickName);
          } else {
            elseArr.push(doc.nickName);
          }
        } else {
          if (doc.grade === "본캐압수") {
            mainTarr.push(doc.nickName);
          } else if (doc.grade === "부캐압수") {
            subTarr.push(doc.nickName);
          }
        }
      }
  
      if (mainTarr.length === 0) mainTarr.push("-");
      if (subTarr.length === 0) subTarr.push("-");
      if (mainFarr.length === 0) mainFarr.push("-");
      if (subFarr.length === 0) subFarr.push("-");
      if (elseArr.length === 0) elseArr.push("-");
  
      const embed = new EmbedBuilder().setColor("White").addFields(
        { name: "본캐 -> 본캐압수", value: `${mainFarr}` },
        { name: "부캐 -> 부캐압수", value: `${subFarr}` },
        { name: "본캐압수 -> 본캐", value: `${mainTarr}` },
        { name: "부캐압수 -> 부캐", value: `${subTarr}` },
        { name: "연속 길드컨텐츠 미참여", value: `${elseArr}` }
      );
  
      const buttons = choices.map((choice) => {
        return new ButtonBuilder()
          .setCustomId(choice.name)
          .setLabel(choice.name)
          .setStyle(ButtonStyle.Primary)
          .setEmoji(choice.emoji);
      });
  
      const row = new ActionRowBuilder().addComponents(buttons);
  
      const reply = await interaction.editReply({
        content: `${inputMonth}월 ${inputWeek}주차 직위조정 필요 캐릭터 목록은 다음과 같습니다.\n데이터베이스에 조정내용을 자동으로 반영하려면 "반영"버튼을 눌러주세요.`,
        embeds: [embed],
        components: [row],
      });
  
      // Wait for the user's button interaction
      const userInteraction = await reply.awaitMessageComponent();
  
      const userChoice = choices.find(
        (choice) => choice.name === userInteraction.customId
      );
  
      try {
        // Handle DB updates based on the user's choice
        if (userChoice.name === "반영") {
          for await (const doc of memberDB.find()) {
            const targetIndex = doc.guildContents.findIndex(
              (e) => e.time === targetTime
            );
  
            if (!doc.guildContents[targetIndex].participated) {
              if (doc.grade === "본캐") {
                doc.grade = "본캐압수";
                doc.warned++;
                await doc.save();
              } else if (doc.grade === "부캐") {
                doc.grade = "부캐압수";
                doc.warned++;
                await doc.save();
              } else {
                doc.warned++;
                await doc.save();
              }
            } else {
              if (doc.grade === "본캐압수") {
                doc.grade = "본캐";
                doc.warned = 0;
                await doc.save();
              } else if (doc.grade === "부캐압수") {
                doc.grade = "부캐";
                doc.warned = 0;
                await doc.save();
              }
            }
          }
  
          // Safely fetch the channel and message before editing it
          const channel = await interaction.client.channels.fetch(
            interaction.channelId
          );
          const message = await channel.messages.fetch(reply.id);
          await message.edit({
            content: `[DB 반영 완료]\n${inputMonth}월 ${inputWeek}일차 자동 직위조정 내용은 다음과 같습니다.`,
            embeds: [embed],
            components: [],
          });
        } else if (userChoice.name === "미반영") {
          const channel = await interaction.client.channels.fetch(
            interaction.channelId
          );
          const message = await channel.messages.fetch(reply.id);
          await message.edit({
            content: `[DB 반영 취소됨]\n${inputMonth}월 ${inputWeek}일차 자동 직위조정 내용은 다음과 같습니다.`,
            embeds: [embed],
            components: [],
          });
        }
      } catch (error) {
        console.error("Error accessing the channel or message:", error);
        await interaction.editReply(
          "메시지를 수정하거나 권한을 반영하는 데 문제가 발생했습니다."
        );
      }
    },
    data: new SlashCommandBuilder()
      .setName("직위조정도우미")
      .setDescription("직위조정이 필요한 캐릭터 목록을 출력합니다.")
      .addNumberOption((option) =>
        option.setName("month").setDescription("정보를 확인할 월 정보").setRequired(true)
      )
      .addNumberOption((option) =>
        option.setName("week").setDescription("정보를 확인할 주차 정보").setRequired(true)
      ),
  };
  