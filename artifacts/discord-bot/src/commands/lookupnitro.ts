import { Message, GuildMember, TextChannel, UserFlags, Client } from 'discord.js';

interface NitroResult {
  member: GuildMember;
  reasons: string[];
}

// Fetch full user profiles in batches to check banner and decoration.
// Discord rate limits: ~50 requests/sec global — we use 5 at a time with a small gap.
async function fetchUsersInBatches(
  client: Client,
  userIds: string[],
  batchSize = 5,
  delayMs = 200
): Promise<Map<string, { banner: string | null; avatarDecoration: string | null }>> {
  const results = new Map<string, { banner: string | null; avatarDecoration: string | null }>();

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (id) => {
        try {
          const user = await client.users.fetch(id, { force: true });
          results.set(id, {
            banner: user.banner ?? null,
            avatarDecoration: user.avatarDecoration ?? null,
          });
        } catch {
          results.set(id, { banner: null, avatarDecoration: null });
        }
      })
    );

    if (i + batchSize < userIds.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return results;
}

function checkCachedSignals(member: GuildMember): string[] {
  const reasons: string[] = [];

  // Animated guild avatar — requires Nitro
  if (member.avatar?.startsWith('a_')) {
    reasons.push('animated server avatar');
  }

  // Animated global avatar — requires Nitro
  if (member.user.avatar?.startsWith('a_')) {
    reasons.push('animated avatar');
  }

  // Server booster — confirmed Nitro
  if (member.premiumSince) {
    const d = member.premiumSince;
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    reasons.push(`server booster since ${date}`);
  }

  // Early Nitro Supporter badge (had Nitro before Oct 2018) — public flag
  const flags = member.user.flags;
  if (flags?.has(UserFlags.PremiumEarlySupporter)) {
    reasons.push('early Nitro supporter badge');
  }

  return reasons;
}

export async function cmdLookupNitro(message: Message): Promise<void> {
  const channel = message.channel as TextChannel;
  await channel.sendTyping();

  // Step 1: load all guild members
  let fetchedAll = true;
  try {
    await message.guild!.members.fetch();
  } catch (err) {
    fetchedAll = false;
    console.error('[LOOKUPNITRO] members.fetch() failed — using cache.', err);
  }

  const nonBots = message.guild!.members.cache.filter((m) => !m.user.bot);
  const userIds = nonBots.map((m) => m.id);

  // Step 2: fetch full user profiles for banner + avatar decoration
  const statusLine = await channel.send(
    `Scanning ${nonBots.size} member(s) for Nitro signals — this may take a moment...`
  );

  const profileData = await fetchUsersInBatches(message.client, userIds);

  await statusLine.delete().catch(() => null);

  // Step 3: build results
  const results: NitroResult[] = [];

  nonBots.forEach((member) => {
    const reasons = checkCachedSignals(member);

    const profile = profileData.get(member.id);

    // Profile banner requires Nitro
    if (profile?.banner) {
      reasons.push('profile banner');
    }

    // Avatar decoration — indicates Nitro or Nitro gift
    if (profile?.avatarDecoration) {
      reasons.push('avatar decoration');
    }

    if (reasons.length > 0) {
      results.push({ member, reasons });
    }
  });

  const cacheNote = fetchedAll
    ? ''
    : '\n> Warning: Could not fetch full member list — results from cache only. Enable "Server Members Intent" in the Discord Developer Portal.';

  if (results.length === 0) {
    await message.reply(
      `No members with detectable Nitro signals found.${cacheNote}\n` +
      `> Checked: animated avatar, server avatar, boost status, early supporter badge, profile banner, avatar decoration.\n` +
      `> Note: Discord does not expose the Nitro badge through its public API — these are the only verifiable signals available.`
    );
    return;
  }

  // Sort: boosters first, then by signal count
  results.sort((a, b) => {
    const aBoost = a.member.premiumSince ? 1 : 0;
    const bBoost = b.member.premiumSince ? 1 : 0;
    if (bBoost !== aBoost) return bBoost - aBoost;
    return b.reasons.length - a.reasons.length;
  });

  const lines = results.map(({ member, reasons }) => {
    return `${member.user.tag} (${member.user.id}) — ${reasons.join(', ')}`;
  });

  const CHUNK = 20;
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += CHUNK) {
    chunks.push(lines.slice(i, i + CHUNK));
  }

  const note =
    `> Signals checked: animated avatar, server avatar, boost, early supporter badge, profile banner, avatar decoration.\n` +
    `> Note: Discord's API does not expose the Nitro badge directly — these are all verifiable signals available.`;

  await message.reply(
    `**Members with Nitro signals** — ${results.length} found:${cacheNote}\n\`\`\`\n${chunks[0].join('\n')}\n\`\`\`\n${note}`
  );

  for (let i = 1; i < chunks.length; i++) {
    await channel.send(`\`\`\`\n${chunks[i].join('\n')}\n\`\`\``);
  }
}
