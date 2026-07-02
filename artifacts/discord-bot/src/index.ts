import {
  Client,
  GatewayIntentBits,
  Partials,
  Message,
  GuildMember,
  TextChannel,
  ButtonInteraction,
  Interaction,
} from 'discord.js';
import { handleCommand } from './handler.js';
import {
  createToken,
  getPendingCompletions,
  markProcessed,
  cleanup,
} from './verify-store.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

const PREFIX = '+';

// ── Ghost ping on join ────────────────────────────────────────────────────────

client.on('guildMemberAdd', async (member: GuildMember) => {
  const verifyChannel = member.guild.channels.cache.find(
    (ch) => ch.name === 'verify' && ch.isTextBased()
  ) as TextChannel | undefined;

  if (!verifyChannel) return;

  try {
    const msg = await verifyChannel.send(`<@${member.id}>`);
    await msg.delete();
  } catch (err) {
    console.error('[GHOST PING] Failed:', err);
  }
});

// ── Button interactions ───────────────────────────────────────────────────────

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isButton()) return;
  const btn = interaction as ButtonInteraction;

  if (btn.customId !== 'gestion_verify') return;
  if (!btn.guild) return;

  const token = createToken(btn.user.id, btn.guild.id);
  // APP_DOMAIN is used on Railway. Falls back to Replit's auto-set variable.
  const domain = process.env.APP_DOMAIN ?? process.env.REPLIT_DEV_DOMAIN;

  if (!domain) {
    await btn.reply({
      content: 'Verification is not configured correctly. Contact an admin.',
      ephemeral: true,
    });
    return;
  }

  const link = `https://${domain}/api/verify/${token}`;

  await btn.reply({
    content: `Your verification link (valid for 15 minutes — do not share it):\n${link}`,
    ephemeral: true,
  });
});

// ── Prefix commands ───────────────────────────────────────────────────────────

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

// ── Verification poller — assigns role after web form completion ──────────────

async function pollVerifications(): Promise<void> {
  const pending = getPendingCompletions();
  if (pending.length === 0) return;

  for (const entry of pending) {
    try {
      const guild = client.guilds.cache.get(entry.guildId);
      if (!guild) continue;

      const member = await guild.members.fetch(entry.userId).catch(() => null);
      if (!member) {
        markProcessed(entry.token);
        continue;
      }

      // Find a role named "verif" (case-insensitive)
      const role = guild.roles.cache.find(
        (r) => r.name.toLowerCase() === 'verif'
      );

      if (!role) {
        console.error(`[VERIFY] No "verif" role found in guild ${guild.name}`);
        markProcessed(entry.token);
        continue;
      }

      await member.roles.add(role, 'Completed web verification');

      // Notify the member
      await member.send(
        `You have been verified in **${guild.name}** and given the **${role.name}** role.`
      ).catch(() => null);

      markProcessed(entry.token);
      console.log(`[VERIFY] Assigned "${role.name}" to ${member.user.tag} in ${guild.name}`);
    } catch (err) {
      console.error('[VERIFY POLLER] Error processing entry:', err);
    }
  }
}

// ── Startup ───────────────────────────────────────────────────────────────────

client.once('ready', () => {
  console.log(`[BOT] Online — logged in as ${client.user?.tag}`);
  console.log(`[BOT] Serving ${client.guilds.cache.size} guild(s)`);

  // Poll for completed verifications every 5 seconds
  setInterval(() => pollVerifications().catch(console.error), 5000);

  // Clean up stale tokens hourly
  setInterval(() => cleanup(), 60 * 60 * 1000);
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
