import { Message } from 'discord.js';

export async function cmdRole(message: Message, args: string[]): Promise<void> {
  const target = message.mentions.members?.first();
  if (!target) {
    await message.reply('Usage: `+role @user @role` — adds the role if they don\'t have it, removes it if they do.');
    return;
  }

  const role = message.mentions.roles.first();
  if (!role) {
    await message.reply('Usage: `+role @user @role` — mention the role you want to toggle.');
    return;
  }

  if (role.managed) {
    await message.reply('That role is managed by an integration and cannot be assigned manually.');
    return;
  }

  if (role.position >= message.guild!.members.me!.roles.highest.position) {
    await message.reply('That role is equal to or higher than the bot\'s highest role.');
    return;
  }

  try {
    if (target.roles.cache.has(role.id)) {
      await target.roles.remove(role);
      await message.reply(`Removed **${role.name}** from **${target.user.tag}**.`);
    } else {
      await target.roles.add(role);
      await message.reply(`Added **${role.name}** to **${target.user.tag}**.`);
    }
  } catch (err) {
    console.error('[ROLE]', err);
    await message.reply('Failed to modify that role. Check bot permissions.');
  }
}
