import { Message } from 'discord.js';

// Parses duration strings like "10m", "2h", "1d", "30s"
function parseDuration(raw: string): number | null {
  const match = raw.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

export async function cmdMute(message: Message, args: string[]): Promise<void> {
  const target = message.mentions.members?.first();
  if (!target) {
    await message.reply('Usage: `+mute @user <duration> [reason]`\nDuration examples: `10m`, `2h`, `1d`, `30s`');
    return;
  }

  if (target.id === message.author.id) {
    await message.reply('You cannot mute yourself.');
    return;
  }

  const durationRaw = args[1];
  if (!durationRaw) {
    await message.reply('Provide a duration. Examples: `10m`, `2h`, `1d`');
    return;
  }

  const ms = parseDuration(durationRaw);
  if (!ms) {
    await message.reply('Invalid duration format. Use `10m`, `2h`, `1d`, `30s`.');
    return;
  }

  // Discord timeout max is 28 days
  const MAX_MS = 28 * 24 * 60 * 60 * 1000;
  if (ms > MAX_MS) {
    await message.reply('Maximum timeout duration is 28 days.');
    return;
  }

  const reason = args.slice(2).join(' ').trim() || 'No reason provided';

  try {
    await target.timeout(ms, `${message.author.tag}: ${reason}`);
    await message.reply(`**${target.user.tag}** has been timed out for **${durationRaw}**.\nReason: ${reason}`);
  } catch (err) {
    console.error('[MUTE]', err);
    await message.reply('Failed to timeout that member. Ensure the bot has the Moderate Members permission.');
  }
}

export async function cmdUnmute(message: Message): Promise<void> {
  const target = message.mentions.members?.first();
  if (!target) {
    await message.reply('Usage: `+unmute @user`');
    return;
  }

  if (!target.isCommunicationDisabled()) {
    await message.reply(`**${target.user.tag}** is not currently timed out.`);
    return;
  }

  try {
    await target.timeout(null);
    await message.reply(`**${target.user.tag}**'s timeout has been removed.`);
  } catch (err) {
    console.error('[UNMUTE]', err);
    await message.reply('Failed to remove timeout.');
  }
}
