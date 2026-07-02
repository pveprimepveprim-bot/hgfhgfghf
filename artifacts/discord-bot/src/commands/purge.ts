import { Message, TextChannel } from 'discord.js';

export async function cmdPurge(message: Message, args: string[]): Promise<void> {
  const amount = parseInt(args[0], 10);

  if (!args[0] || isNaN(amount) || amount < 1 || amount > 100) {
    await message.reply('Usage: `+purge <1-100>` — deletes that many recent messages.');
    return;
  }

  const channel = message.channel as TextChannel;

  try {
    // Delete the command message first
    await message.delete().catch(() => null);

    const deleted = await channel.bulkDelete(amount, true);
    const reply = await channel.send(`Deleted **${deleted.size}** message(s).`);

    // Auto-delete the confirmation after 4 seconds
    setTimeout(() => reply.delete().catch(() => null), 4000);
  } catch (err) {
    console.error('[PURGE]', err);
    await message.reply('Failed to purge messages. Messages older than 14 days cannot be bulk-deleted.');
  }
}
