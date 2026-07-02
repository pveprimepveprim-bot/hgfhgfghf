import { Message, GuildMember, TextChannel } from 'discord.js';

function hasNitroIndicators(member: GuildMember): { nitro: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Animated avatar — requires Nitro
  if (member.user.avatar?.startsWith('a_')) {
    reasons.push('animated avatar');
  }

  // Server booster — confirmed Nitro
  if (member.premiumSince) {
    const since = member.premiumSince;
    const date = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`;
    reasons.push(`boosting since ${date}`);
  }

  // Animated server avatar — requires Nitro
  if (member.avatar?.startsWith('a_')) {
    reasons.push('animated server avatar');
  }

  return { nitro: reasons.length > 0, reasons };
}

export async function cmdLookupNitro(message: Message): Promise<void> {
  const channel = message.channel as TextChannel;
  await channel.sendTyping();

  // Try to load all members — requires Server Members Intent enabled in Dev Portal.
  // If it fails, continue with whatever is already in the cache.
  let fetchedAll = true;
  try {
    await message.guild!.members.fetch();
  } catch (err) {
    fetchedAll = false;
    console.error('[LOOKUPNITRO] members.fetch() failed — using cache. Enable "Server Members Intent" in the Discord Developer Portal.', err);
  }

  const results: Array<{ member: GuildMember; reasons: string[] }> = [];

  message.guild!.members.cache.forEach((member) => {
    if (member.user.bot) return;
    const { nitro, reasons } = hasNitroIndicators(member);
    if (nitro) results.push({ member, reasons });
  });

  const cacheNote = fetchedAll
    ? ''
    : '\n> **Warning:** Could not fetch the full member list — results from cache only. Enable "Server Members Intent" in the Discord Developer Portal for complete results.';

  if (results.length === 0) {
    await message.reply(
      `No members with detectable Nitro indicators found.${cacheNote}\n> Detection signals: animated avatar, server boost, animated server avatar.`
    );
    return;
  }

  // Sort: boosters first
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
    `**Members with Nitro indicators** — ${results.length} found:${cacheNote}\n\`\`\`\n${chunks[0].join('\n')}\n\`\`\`\n*Signals: animated avatar, server boost, animated server avatar.*`
  );

  for (let i = 1; i < chunks.length; i++) {
    await channel.send(`\`\`\`\n${chunks[i].join('\n')}\n\`\`\``);
  }
}
