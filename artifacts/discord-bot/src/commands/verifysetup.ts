import {
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';

export async function cmdVerifySetup(message: Message, args: string[]): Promise<void> {
  const gifUrl = args[0];

  if (!gifUrl) {
    await message.reply(
      'Usage: `+verifysetup <gif_or_image_url>`\nExample: `+verifysetup https://i.imgur.com/example.gif`'
    );
    return;
  }

  // Basic URL check
  try {
    new URL(gifUrl);
  } catch {
    await message.reply('That does not look like a valid URL. Provide a direct link to a GIF or image.');
    return;
  }

  const channel = message.channel as TextChannel;

  const embed = new EmbedBuilder()
    .setImage(gifUrl)
    .setColor(0x2b2d31);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('gestion_verify')
      .setLabel('Access')
      .setStyle(ButtonStyle.Secondary)
  );

  try {
    await channel.send({ embeds: [embed], components: [row] });
    await message.delete().catch(() => null);
  } catch (err) {
    console.error('[VERIFYSETUP]', err);
    await message.reply('Failed to post the verification panel. Make sure the URL is a valid image or GIF link.');
  }
}
