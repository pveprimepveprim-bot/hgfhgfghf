import { Message } from 'discord.js';

export async function cmdHelp(message: Message): Promise<void> {
  const lines = [
    'PREFIX: +',
    '',
    'COMMANDS (admin only)',
    '---------------------',
    '+lookup <year>       List members whose Discord accounts were created in that year',
    '+lookupnitro         List members with detectable Nitro indicators',
    '+dm @user <msg>      Send a DM to a specific member',
    '+dm all <msg>        Send a DM to every member in the server',
    '+help                Show this list',
    '',
    'AUTO BEHAVIOR',
    '-------------',
    'Ghost ping           Every new member is ghost-pinged in #verify on join',
  ];

  await message.reply(`\`\`\`\n${lines.join('\n')}\n\`\`\``);
}
