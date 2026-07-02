import { Message, PermissionFlagsBits } from 'discord.js';
import { cmdLookup } from './commands/lookup.js';
import { cmdLookupNitro } from './commands/lookupnitro.js';
import { cmdDm } from './commands/dm.js';
import { cmdHelp } from './commands/help.js';

function isAdmin(message: Message): boolean {
  const member = message.member;
  if (!member) return false;
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

async function deny(message: Message): Promise<void> {
  await message.reply('You do not have permission to use this command.');
}

export async function handleCommand(
  message: Message,
  command: string,
  args: string[]
): Promise<void> {
  // +lookup<year> or +lookup <year>
  const lookupMatch = command.match(/^lookup(\d{4})?$/);
  if (lookupMatch) {
    if (!isAdmin(message)) return deny(message);
    const year = lookupMatch[1] ?? args[0];
    return cmdLookup(message, year);
  }

  switch (command) {
    case 'lookupnitro':
      if (!isAdmin(message)) return deny(message);
      return cmdLookupNitro(message);

    case 'dm':
      if (!isAdmin(message)) return deny(message);
      return cmdDm(message, args);

    case 'help':
      if (!isAdmin(message)) return deny(message);
      return cmdHelp(message);

    default:
      break;
  }
}
