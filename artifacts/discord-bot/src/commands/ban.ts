import { Message } from 'discord.js';

export async function cmdBan(message: Message, args: string[]): Promise<void> {
  const target = message.mentions.members?.first();
  if (!target) {
    await message.reply('Usage: `+ban @user [reason]`');
    return;
  }

  if (!target.bannable) {
    await message.reply(`Cannot ban **${target.user.tag}** — they may have a higher role than the bot.`);
    return;
  }

  if (target.id === message.author.id) {
    await message.reply('You cannot ban yourself.');
    return;
  }

  const reason = args.slice(1).join(' ').trim() || 'No reason provided';

  try {
    await target.send(`You have been banned from **${message.guild!.name}**.\nReason: ${reason}`).catch(() => null);
    await target.ban({ reason: `${message.author.tag}: ${reason}` });
    await message.reply(`**${target.user.tag}** has been banned.\nReason: ${reason}`);
  } catch (err) {
    console.error('[BAN]', err);
    await message.reply('Failed to ban that member.');
  }
}
