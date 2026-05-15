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

export const setup_auth: Command = {
  data: new SlashCommandBuilder()
    .setName("setup_autenticacion")
    .setDescription("Publica el panel de verificación de Minecraft en este canal")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("🛡️ Obtener verificación")
      .setDescription(
        "¡Bienvenido/a a nuestro servidor!\n\n" +
          "Este servidor es para nuestro servidor de Minecraft.\n\n" +
          "Aquí podrás compartir con otras personas del servidor en un chat público, " +
          "podrás saber información importante relacionada con dicho servidor.\n\n" +
          "Podrás crear tus propios clanes (con mínimo dos personas).\n\n" +
          "Por favor introduce tu nombre de usuario en Minecraft aquí, y luego dale al botón de autenticar. " +
          "Lo necesitaremos para agregarte a la whitelist."
      )
      .setColor(0xe67e22)
      .setImage("https://i.imgur.com/8fS0S6A.png")
      .setFooter({ text: "Sistema de Seguridad Golem", iconURL: "https://i.imgur.com/vMvX7pT.png" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("auth_btn")
        .setLabel("Autenticar")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🛡️")
    );

    await interaction.reply({ content: "✅ Panel de verificación publicado.", ephemeral: true });
    const channel = interaction.channel as TextChannel | null;
    await channel?.send({ embeds: [embed], components: [row] });
  },
};
