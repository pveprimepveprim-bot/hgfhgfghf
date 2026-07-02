import { Message } from 'discord.js';

export async function cmdKick(message: Message, args: string[]): Promise<void> {
  const target = message.mentions.members?.first();
  if (!target) {
    await message.reply('Usage: `+kick @user [reason]`');
    return;
  }

  if (!target.kickable) {
    await message.reply(`Cannot kick **${target.user.tag}** — they may have a higher role than the bot.`);
    return;
  }

  if (target.id === message.author.id) {
    await message.reply('You cannot kick yourself.');
    return;
  }

  const reason = args.slice(1).join(' ').trim() || 'No reason provided';

  try {
    await target.send(`You have been kicked from **${message.guild!.name}**.\nReason: ${reason}`).catch(() => null);
    await target.kick(`${message.author.tag}: ${reason}`);
    await message.reply(`**${target.user.tag}** has been kicked.\nReason: ${reason}`);
  } catch (err) {
    console.error('[KICK]', err);
    await message.reply('Failed to kick that member.');
  }
}
