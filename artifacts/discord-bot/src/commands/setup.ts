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
    .setDescription("Publica el panel del sistema de clanes en este canal")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("⚔️ SISTEMA DE CLANES ⚔️")
      .setDescription(
        "¡Crea tu propia facción!\n\n" +
          "**REGLAS:**\n" +
          "1. No puedes estar en dos clanes.\n" +
          "2. Mínimo 2 miembros.\n" +
          "3. El Staff debe aprobar tu solicitud."
      )
      .setColor(0x992d22);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_pedir_clan")
        .setLabel("Pedir Creación de Clan")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("⚔️")
    );

    await interaction.reply({ content: "✅ Panel publicado.", ephemeral: true });
    const channel = interaction.channel as TextChannel | null;
    await channel?.send({ embeds: [embed], components: [row] });
  },
};
