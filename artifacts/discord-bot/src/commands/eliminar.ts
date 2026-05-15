import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { eliminarClanData } from "../lib/data.js";
import { logger } from "../lib/logger.js";
import { Command } from "../lib/types.js";

export const eliminar: Command = {
  data: new SlashCommandBuilder()
    .setName("eliminar")
    .setDescription("Elimina un clan (roles y categoría con sus canales)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("nombre")
        .setDescription("Nombre exacto del clan a eliminar")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ Este comando solo puede usarse dentro de un servidor.",
        ephemeral: true,
      });
      return;
    }

    const nombreClan = interaction.options.getString("nombre", true);
    await interaction.deferReply();

    try {
      const guild = interaction.guild;
      const deleted: string[] = [];

      const roles = guild.roles.cache.filter(
        (r) => r.name === nombreClan || r.name === `${nombreClan}-lider`
      );
      for (const [, role] of roles) {
        await role.delete(`Eliminación del clan: ${nombreClan}`);
        deleted.push(`Rol: ${role.name}`);
      }

      const categoria = guild.channels.cache.find(
        (c) => c.type === 4 && c.name === nombreClan
      );

      if (categoria && categoria.type === 4) {
        const hijos = guild.channels.cache.filter(
          (c) => "parentId" in c && c.parentId === categoria.id
        );
        for (const [, canal] of hijos) {
          await canal.delete(`Eliminación del clan: ${nombreClan}`);
          deleted.push(`Canal: ${canal.name}`);
        }
        await categoria.delete(`Eliminación del clan: ${nombreClan}`);
        deleted.push(`Categoría: ${categoria.name}`);
      }

      if (deleted.length === 0) {
        await interaction.editReply(
          `⚠️ No se encontraron roles ni canales para el clan **${nombreClan}**.`
        );
        return;
      }

      eliminarClanData(nombreClan);
      logger.info({ guild: guild.id, clan: nombreClan, deleted }, "Clan eliminado");

      await interaction.editReply(
        `✅ El clan **${nombreClan}** ha sido eliminado.\n\n` +
          `🗑️ Elementos eliminados:\n${deleted.map((d) => `• ${d}`).join("\n")}`
      );
    } catch (err) {
      logger.error({ err }, "Error al eliminar el clan");
      await interaction.editReply(
        "❌ Ocurrió un error al eliminar el clan. Asegúrate de que el bot tenga los permisos necesarios."
      );
    }
  },
};
