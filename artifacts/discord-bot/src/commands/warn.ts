import { Message, TextChannel } from 'discord.js';
import { addWarning, getWarnings, clearWarnings } from '../warnings.js';

export async function cmdWarn(message: Message, args: string[]): Promise<void> {
  const target = message.mentions.members?.first();
  if (!target) {
    await message.reply('Usage: `+warn @user [reason]`');
    return;
  }

  if (target.user.bot) {
    await message.reply('You cannot warn a bot.');
    return;
  }

  const reason = args.slice(1).join(' ').trim() || 'No reason provided';
  const entry = addWarning(message.guild!.id, target.id, message.author.tag, reason);

  const total = getWarnings(message.guild!.id, target.id).length;

  await target.send(
    `You have received a warning in **${message.guild!.name}**.\nReason: ${reason}\nTotal warnings: ${total}`
  ).catch(() => null);

  await message.reply(
    `**${target.user.tag}** has been warned (warning #${total}).\nReason: ${reason}\nWarned at: ${new Date(entry.timestamp).toUTCString()}`
  );
}

export async function cmdWarnings(message: Message): Promise<void> {
  const target = message.mentions.members?.first() ?? message.member;
  if (!target) {
    await message.reply('Usage: `+warnings @user`');
    return;
  }

  const warnings = getWarnings(message.guild!.id, target.id);

  if (warnings.length === 0) {
    await message.reply(`**${target.user.tag}** has no warnings.`);
    return;
  }

  const lines = warnings.map((w, i) => {
    const date = new Date(w.timestamp).toUTCString();
    return `#${i + 1} | ${date} | By: ${w.by} | ${w.reason}`;
  });

  const CHUNK = 15;
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += CHUNK) {
    chunks.push(lines.slice(i, i + CHUNK));
  }

  await message.reply(
    `**Warnings for ${target.user.tag}** — ${warnings.length} total:\n\`\`\`\n${chunks[0].join('\n')}\n\`\`\``
  );
  for (let i = 1; i < chunks.length; i++) {
    await (message.channel as TextChannel).send(`\`\`\`\n${chunks[i].join('\n')}\n\`\`\``);
  }
}

export async function cmdClearWarnings(message: Message): Promise<void> {
  const target = message.mentions.members?.first();
  if (!target) {
    await message.reply('Usage: `+clearwarnings @user`');
    return;
  }

  const count = getWarnings(message.guild!.id, target.id).length;
  if (count === 0) {
    await message.reply(`**${target.user.tag}** has no warnings to clear.`);
    return;
  }

  clearWarnings(message.guild!.id, target.id);
  await message.reply(`Cleared **${count}** warning(s) for **${target.user.tag}**.`);
}
