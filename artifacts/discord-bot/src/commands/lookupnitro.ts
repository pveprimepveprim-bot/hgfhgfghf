import { Message, GuildMember, TextChannel } from 'discord.js';

function hasNitroIndicators(member: GuildMember): { nitro: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Animated avatar requires Nitro
  if (member.user.avatar?.startsWith('a_')) {
    reasons.push('animated avatar');
  }

  // Server booster — confirmed Nitro
  if (member.premiumSince) {
    const since = member.premiumSince;
    const date = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`;
    reasons.push(`boosting since ${date}`);
  }

  // Animated guild avatar requires Nitro
  if (member.avatar?.startsWith('a_')) {
    reasons.push('animated server avatar');
  }

  return { nitro: reasons.length > 0, reasons };
}

export async function cmdLookupNitro(message: Message): Promise<void> {
  const channel = message.channel as TextChannel;
  await channel.sendTyping();

  try {
    try {
      await message.guild!.members.fetch({ withPresences: true });
    } catch {
      await message.guild!.members.fetch();
    }
  } catch {
    await message.reply('Failed to fetch member list.');
    return;
  }

  const results: Array<{ member: GuildMember; reasons: string[] }> = [];

  message.guild!.members.cache.forEach((member) => {
    if (member.user.bot) return;
    const { nitro, reasons } = hasNitroIndicators(member);
    if (nitro) results.push({ member, reasons });
  });

  if (results.length === 0) {
    await message.reply('No members with detectable Nitro indicators found.');
    return;
  }

  // Sort: boosters first, then others
  results.sort((a, b) => {
    const aBoost = a.member.premiumSince ? 1 : 0;
    const bBoost = b.member.premiumSince ? 1 : 0;
    return bBoost - aBoost;
  });

  const lines = results.map(({ member, reasons }) => {
    return `${member.user.tag} (${member.user.id}) — ${reasons.join(', ')}`;
  });

  const CHUNK = 20;
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += CHUNK) {
    chunks.push(lines.slice(i, i + CHUNK));
  }

  await message.reply(
    `**Members with Nitro indicators** — ${results.length} found:\n\`\`\`\n${chunks[0].join('\n')}\n\`\`\`\n*Detected via: animated avatar, server boost, animated server avatar, or profile banner.*`
  );

  for (let i = 1; i < chunks.length; i++) {
    await channel.send(`\`\`\`\n${chunks[i].join('\n')}\n\`\`\``);
  }
}
