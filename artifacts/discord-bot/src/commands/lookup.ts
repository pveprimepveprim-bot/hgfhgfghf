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

  try {
    await message.guild!.members.fetch();
  } catch {
    await message.reply('Failed to fetch member list.');
    return;
  }

  const matched: GuildMember[] = [];

  message.guild!.members.cache.forEach((member) => {
    const created = member.user.createdAt;
    if (created.getFullYear() === year) {
      matched.push(member);
    }
  });

  if (matched.length === 0) {
    await message.reply(`No members found with accounts created in **${year}**.`);
    return;
  }

  // Sort by account creation date
  matched.sort((a, b) => a.user.createdTimestamp - b.user.createdTimestamp);

  const lines = matched.map((m) => {
    const d = m.user.createdAt;
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `${m.user.tag} (${m.user.id}) — joined Discord: ${date}`;
  });

  // Split into chunks of 20 lines per message to avoid Discord limits
  const CHUNK = 20;
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += CHUNK) {
    chunks.push(lines.slice(i, i + CHUNK));
  }

  await message.reply(
    `**Accounts created in ${year}** — ${matched.length} member(s):\n\`\`\`\n${chunks[0].join('\n')}\n\`\`\``
  );

  for (let i = 1; i < chunks.length; i++) {
    await channel.send(`\`\`\`\n${chunks[i].join('\n')}\n\`\`\``);
  }
}
