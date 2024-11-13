module.exports = {
  name: 'guildMemberRemove',

  run: async (member) => {
    const guild = member.guild;
    const displayName = member.displayName;
    const guildName = guild.name;

    // Use the channel ID to find the private channel
    const channel = guild.channels.cache.get('일반채팅'); // Replace 'YOUR_CHANNEL_ID' with the actual channel ID
    if (!channel) return console.error('Channel not found or bot has no access');

    try {
      // Fetch the last 5 audit logs for the 'MEMBER_KICK' action
      const fetchedLogs = await guild.fetchAuditLogs({
        limit: 5,
        type: 'MEMBER_KICK',
      });

      // Look for an audit log entry where the target was the member who left
      const kickLog = fetchedLogs.entries.find(entry => entry.target.id === member.id);

      // If no kick log is found, assume they left voluntarily
      if (!kickLog) {
        channel.send(`${displayName} 님이 ${guildName} 서버에서 퇴장하였습니다.`);
        return;
      }

      // If the user was kicked, show who kicked them and why
      const { executor, reason } = kickLog;
      channel.send(`${displayName} 님이 ${executor.tag} 에 의해 ${guildName} 서버에서 추방되었습니다. 사유: ${reason || '사유 없음'}`);
      
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      channel.send(`${displayName} 님이 ${guildName} 서버에서 퇴장하였습니다.`);
    }
  },
};
