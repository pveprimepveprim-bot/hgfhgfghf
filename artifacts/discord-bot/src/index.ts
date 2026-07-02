import {
  Client,
  GatewayIntentBits,
  Partials,
  Message,
  GuildMember,
  TextChannel,
} from 'discord.js';
import { handleCommand } from './handler.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

const PREFIX = '+';

client.once('ready', () => {
  console.log(`[BOT] Online — logged in as ${client.user?.tag}`);
  console.log(`[BOT] Serving ${client.guilds.cache.size} guild(s)`);
});

client.on('guildMemberAdd', async (member: GuildMember) => {
  const verifyChannel = member.guild.channels.cache.find(
    (ch) => ch.name === 'verify' && ch.isTextBased()
  ) as TextChannel | undefined;

  if (!verifyChannel) return;

  try {
    const msg = await verifyChannel.send(`<@${member.id}>`);
    await msg.delete();
  } catch (err) {
    console.error('[GHOST PING] Failed to send or delete ping:', err);
  }
});

client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;
  if (!message.guild) return;

  const raw = message.content.slice(PREFIX.length).trim();
  const args = raw.split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  await handleCommand(message, command, args);
});

client.on('error', (err) => {
  console.error('[CLIENT ERROR]', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('[BOT] DISCORD_TOKEN is not set. Exiting.');
  process.exit(1);
}

client.login(token);
