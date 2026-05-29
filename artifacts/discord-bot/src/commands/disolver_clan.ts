import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { cargarClanes, usuarioEnClan } from "../lib/data.js";
import { Command } from "../lib/types.js";

export const disolver_clan: Command = {
  data: new SlashCommandBuilder()
    .setName("disolver_clan")
    .setDescription("Disuelve tu clan permanentemente (solo líderes)"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Solo se puede usar en un servidor.", ephemeral: true });
      return;
    }

    const clanNombre = usuarioEnClan(interaction.user.id);
    if (!clanNombre) {
      await interaction.reply({ content: "❌ No perteneces a ningún clan.", ephemeral: true });
      return;
    }

    const db = cargarClanes();
    if (db[clanNombre].lider_id !== interaction.user.id) {
      await interaction.reply({ content: "❌ Solo el líder puede disolver el clan.", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("⚠️ ¿Estás seguro?")
      .setColor(0xff0000)
      .setDescription(
        `Estás a punto de **disolver permanentemente** el clan **${clanNombre}**.\n\n` +
        `Esto eliminará:\n` +
        `• Todos los canales de Discord del clan\n` +
        `• Los roles del clan\n` +
        `• Los registros de LuckPerms\n\n` +
        `**Esta acción no se puede deshacer.**`
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirmar_disolver:${clanNombre}`)
        .setLabel("☠️ Sí, disolver")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancelar_disolver")
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
