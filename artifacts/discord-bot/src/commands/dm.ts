import { Message, GuildMember, TextChannel } from 'discord.js';

export async function cmdDm(message: Message, args: string[]): Promise<void> {
  if (!args.length) {
    await message.reply(
      'Usage:\n' +
      '`+dm @user <message>` — DM a specific member\n' +
      '`+dm all <message>` — DM every member in the server'
    );
    return;
  }

  // +dm all <message>
  if (args[0].toLowerCase() === 'all') {
    const text = args.slice(1).join(' ').trim();
    if (!text) {
      await message.reply('Provide a message to send. Usage: `+dm all <message>`');
      return;
    }

    await (message.channel as TextChannel).sendTyping();

    try {
      await message.guild!.members.fetch();
    } catch {
      await message.reply('Failed to fetch member list.');
      return;
    }

    const members = message.guild!.members.cache.filter((m) => !m.user.bot);
    let sent = 0;
    let failed = 0;

    for (const [, member] of members) {
      try {
        await member.send(text);
        sent++;
      } catch {
        failed++;
      }
    }

    await message.reply(
      `DM sent to ${sent} member(s). Failed to reach ${failed} (DMs closed or blocked).`
    );
    return;
  }

  // +dm @user <message>
  const mention = message.mentions.members?.first();
  if (!mention) {
    await message.reply(
      'Could not resolve the target member. Usage: `+dm @user <message>`'
    );
    return;
  }

  // Remove the mention from the args to get the message
  const textParts = args.slice(1).join(' ').trim();
  if (!textParts) {
    await message.reply('Provide a message to send. Usage: `+dm @user <message>`');
    return;
  }

  try {
    await mention.send(textParts);
    await message.reply(`Message sent to **${mention.user.tag}**.`);
  } catch {
    await message.reply(
      `Could not DM **${mention.user.tag}** — they may have DMs disabled.`
    );
  }
}
