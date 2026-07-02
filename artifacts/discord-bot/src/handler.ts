import { Message, PermissionFlagsBits } from 'discord.js';
import { cmdLookup } from './commands/lookup.js';
import { cmdLookupNitro } from './commands/lookupnitro.js';
import { cmdDm } from './commands/dm.js';
import { cmdHelp } from './commands/help.js';
import { cmdBan } from './commands/ban.js';
import { cmdKick } from './commands/kick.js';
import { cmdMute, cmdUnmute } from './commands/mute.js';
import { cmdWarn, cmdWarnings, cmdClearWarnings } from './commands/warn.js';
import { cmdPurge } from './commands/purge.js';
import { cmdSlowmode, cmdLock, cmdUnlock } from './commands/channel.js';
import { cmdUserInfo, cmdServerInfo } from './commands/info.js';
import { cmdRole } from './commands/role.js';

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

    case 'ban':
      if (!isAdmin(message)) return deny(message);
      return cmdBan(message, args);

    case 'kick':
      if (!isAdmin(message)) return deny(message);
      return cmdKick(message, args);

    case 'mute':
    case 'timeout':
      if (!isAdmin(message)) return deny(message);
      return cmdMute(message, args);

    case 'unmute':
    case 'untimeout':
      if (!isAdmin(message)) return deny(message);
      return cmdUnmute(message);

    case 'warn':
      if (!isAdmin(message)) return deny(message);
      return cmdWarn(message, args);

    case 'warnings':
      if (!isAdmin(message)) return deny(message);
      return cmdWarnings(message);

    case 'clearwarnings':
    case 'delwarnings':
      if (!isAdmin(message)) return deny(message);
      return cmdClearWarnings(message);

    case 'purge':
    case 'clear':
      if (!isAdmin(message)) return deny(message);
      return cmdPurge(message, args);

    case 'slowmode':
      if (!isAdmin(message)) return deny(message);
      return cmdSlowmode(message, args);

    case 'lock':
      if (!isAdmin(message)) return deny(message);
      return cmdLock(message);

    case 'unlock':
      if (!isAdmin(message)) return deny(message);
      return cmdUnlock(message);

    case 'role':
      if (!isAdmin(message)) return deny(message);
      return cmdRole(message, args);

    case 'userinfo':
    case 'ui':
      if (!isAdmin(message)) return deny(message);
      return cmdUserInfo(message);

    case 'serverinfo':
    case 'si':
      if (!isAdmin(message)) return deny(message);
      return cmdServerInfo(message);

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
