import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { setAuthImageUrl } from "../lib/data.js";
import { Command } from "../lib/types.js";

export const imagen: Command = {
  data: new SlashCommandBuilder()
    .setName("imagen")
    .setDescription("Establece la imagen que aparece en el panel de autenticación")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("url")
        .setDescription("URL directa de la imagen (debe empezar con https://)")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString("url", true).trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      await interaction.reply({ content: "❌ La URL debe empezar con `https://`.", ephemeral: true });
      return;
    }
    setAuthImageUrl(url);
    await interaction.reply({
      content: `✅ Imagen del panel de autenticación actualizada. Usa \`/setup_autenticacion\` para publicar el panel con la nueva imagen.`,
      ephemeral: true,
    });
  },
};
