import { Message, GuildMember, TextChannel } from 'discord.js';

export async function cmdLookup(message: Message, yearArg?: string): Promise<void> {
  if (!yearArg || !/^\d{4}$/.test(yearArg)) {
    await message.reply(
      `Usage: \`+lookup <year>\` — e.g. \`+lookup 2020\`\nYear must be a 4-digit number.`
    );
    return;
  }

  const year = parseInt(yearArg, 10);

  if (year < 2015 || year > new Date().getFullYear()) {
    await message.reply(`Year must be between 2015 and ${new Date().getFullYear()}.`);
    return;
  }

  const channel = message.channel as TextChannel;
  await channel.sendTyping();

  // Try to load all members — requires Server Members Intent enabled in Dev Portal.
  // If it fails, continue with whatever is already in the cache.
  let fetchedAll = true;
  try {
    await message.guild!.members.fetch();
  } catch (err) {
    fetchedAll = false;
    console.error('[LOOKUP] members.fetch() failed — using cache. Enable "Server Members Intent" in the Discord Developer Portal.', err);
  }

  const matched: GuildMember[] = [];

  message.guild!.members.cache.forEach((member) => {
    const created = member.user.createdAt;
    if (created.getFullYear() === year) {
      matched.push(member);
    }
  });

  const cacheNote = fetchedAll
    ? ''
    : '\n> **Warning:** Could not fetch the full member list — results are from cache only. Enable "Server Members Intent" in the Discord Developer Portal for complete results.';

  if (matched.length === 0) {
    await message.reply(
      `No members found with accounts created in **${year}**.${cacheNote}`
    );
    return;
  }

  // Sort by account creation date
  matched.sort((a, b) => a.user.createdTimestamp - b.user.createdTimestamp);

  const lines = matched.map((m) => {
    const d = m.user.createdAt;
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `${m.user.tag} (${m.user.id}) — joined Discord: ${date}`;
  });

  // Split into chunks of 20 lines per message to stay under Discord limits
  const CHUNK = 20;
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += CHUNK) {
    chunks.push(lines.slice(i, i + CHUNK));
  }

  await message.reply(
    `**Accounts created in ${year}** — ${matched.length} member(s):${cacheNote}\n\`\`\`\n${chunks[0].join('\n')}\n\`\`\``
  );

  for (let i = 1; i < chunks.length; i++) {
    await channel.send(`\`\`\`\n${chunks[i].join('\n')}\n\`\`\``);
  }
}
