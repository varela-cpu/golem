import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { cargarClanes } from "../lib/data.js";
import { Command } from "../lib/types.js";

export const eliminar: Command = {
  data: new SlashCommandBuilder()
    .setName("eliminar")
    .setDescription("Elimina un clan usando un selector")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Este comando solo puede usarse dentro de un servidor.", ephemeral: true });
      return;
    }

    const clanes = cargarClanes();
    const nombres = Object.keys(clanes);

    if (nombres.length === 0) {
      await interaction.reply({ content: "⚠️ No hay clanes registrados.", ephemeral: true });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId("select_borrar_clan")
      .setPlaceholder("Selecciona el clan a eliminar...")
      .addOptions(
        nombres.slice(0, 25).map((name) =>
          new StringSelectMenuOptionBuilder().setLabel(name).setValue(name)
        )
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.reply({
      content: "Selecciona qué clan quieres disolver:",
      components: [row],
      ephemeral: true,
    });
  },
};
