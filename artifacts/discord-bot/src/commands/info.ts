import { Message, GuildMember } from 'discord.js';

function formatDate(date: Date): string {
  return date.toUTCString();
}

export async function cmdUserInfo(message: Message): Promise<void> {
  const target = message.mentions.members?.first() ?? (message.member as GuildMember);

  const user = target.user;
  const joined = target.joinedAt;
  const created = user.createdAt;
  const roles = target.roles.cache
    .filter((r) => r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .map((r) => r.name)
    .slice(0, 10);

  const lines = [
    `User:        ${user.tag}`,
    `ID:          ${user.id}`,
    `Bot:         ${user.bot ? 'Yes' : 'No'}`,
    `Account:     ${formatDate(created)}`,
    `Joined:      ${joined ? formatDate(joined) : 'Unknown'}`,
    `Boosting:    ${target.premiumSince ? formatDate(target.premiumSince) : 'No'}`,
    `Nickname:    ${target.nickname ?? 'None'}`,
    `Roles (${roles.length}): ${roles.join(', ') || 'None'}`,
  ];

  await message.reply(`\`\`\`\n${lines.join('\n')}\n\`\`\``);
}

export async function cmdServerInfo(message: Message): Promise<void> {
  const guild = message.guild!;

  // Fetch if not cached
  const fullGuild = await guild.fetch();

  const owner = await guild.fetchOwner().catch(() => null);
  const created = guild.createdAt;
  const totalMembers = guild.memberCount;
  const botCount = guild.members.cache.filter((m) => m.user.bot).size;
  const humanCount = guild.members.cache.filter((m) => !m.user.bot).size;
  const channels = guild.channels.cache;
  const textChannels = channels.filter((c) => c.isTextBased()).size;
  const voiceChannels = channels.filter((c) => c.isVoiceBased()).size;
  const roles = guild.roles.cache.size - 1; // exclude @everyone
  const boosts = guild.premiumSubscriptionCount ?? 0;
  const boostTier = guild.premiumTier;

  const lines = [
    `Server:      ${guild.name}`,
    `ID:          ${guild.id}`,
    `Owner:       ${owner ? owner.user.tag : 'Unknown'}`,
    `Created:     ${formatDate(created)}`,
    `Members:     ${totalMembers} (${humanCount} humans, ${botCount} bots)`,
    `Channels:    ${textChannels} text, ${voiceChannels} voice`,
    `Roles:       ${roles}`,
    `Boosts:      ${boosts} (Tier ${boostTier})`,
    `Verification: ${guild.verificationLevel}`,
  ];

  await message.reply(`\`\`\`\n${lines.join('\n')}\n\`\`\``);
}
