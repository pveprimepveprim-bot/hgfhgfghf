import { Message, TextChannel, PermissionFlagsBits, PermissionOverwrites } from 'discord.js';

export async function cmdSlowmode(message: Message, args: string[]): Promise<void> {
  const seconds = parseInt(args[0], 10);

  if (!args[0] || isNaN(seconds) || seconds < 0 || seconds > 21600) {
    await message.reply('Usage: `+slowmode <seconds>` — max 21600 (6 hours). Use `0` to disable.');
    return;
  }

  const channel = message.channel as TextChannel;

  try {
    await channel.setRateLimitPerUser(seconds);
    if (seconds === 0) {
      await message.reply('Slowmode disabled.');
    } else {
      await message.reply(`Slowmode set to **${seconds}** second(s).`);
    }
  } catch (err) {
    console.error('[SLOWMODE]', err);
    await message.reply('Failed to set slowmode.');
  }
}

export async function cmdLock(message: Message): Promise<void> {
  const channel = message.channel as TextChannel;
  const everyone = message.guild!.roles.everyone;

  try {
    await channel.permissionOverwrites.edit(everyone, {
      SendMessages: false,
    });
    await message.reply(`**#${channel.name}** has been locked. Members can no longer send messages.`);
  } catch (err) {
    console.error('[LOCK]', err);
    await message.reply('Failed to lock the channel.');
  }
}

export async function cmdUnlock(message: Message): Promise<void> {
  const channel = message.channel as TextChannel;
  const everyone = message.guild!.roles.everyone;

  try {
    await channel.permissionOverwrites.edit(everyone, {
      SendMessages: null,
    });
    await message.reply(`**#${channel.name}** has been unlocked.`);
  } catch (err) {
    console.error('[UNLOCK]', err);
    await message.reply('Failed to unlock the channel.');
  }
}
