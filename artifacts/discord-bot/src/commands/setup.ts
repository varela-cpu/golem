import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { Command } from "../lib/types.js";

export const setup: Command = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Publica el panel de registro de clanes en este canal")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("🏰 SISTEMA DE CLANES")
      .setDescription(
        "Pulsa el botón de abajo para registrar tu clan.\n\n" +
          "**Requisitos:**\n" +
          "• No pertenecer ya a otro clan\n" +
          "• Tener un código de color en formato Hex (ej: `#FF0000`)\n" +
          "• Tener al menos 1 miembro para unirse"
      )
      .setColor(0x5865f2)
      .setFooter({ text: "Solo administradores pueden crear clanes" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_crear_clan")
        .setLabel("Crear un Clan")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🏰")
    );

    await interaction.reply({ content: "✅ Panel publicado.", ephemeral: true });
    const channel = interaction.channel as TextChannel | null;
    await channel?.send({ embeds: [embed], components: [row] });
  },
};
