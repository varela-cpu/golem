import { AnySelectMenuInteraction, TextChannel } from "discord.js";
import { eliminarClanData, getAuthLogChannel } from "../lib/data.js";
import { logger } from "../lib/logger.js";

export async function handleSelect(interaction: AnySelectMenuInteraction): Promise<void> {
  const { customId } = interaction;

  // ── Delete clan dropdown ─────────────────────────────────────────────────
  if (customId === "select_borrar_clan") {
    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.guild) return;

    const nombreClan = interaction.values[0];
    await interaction.deferUpdate();

    const guild = interaction.guild;
    const clanData = eliminarClanData(nombreClan);

    if (!clanData) {
      await interaction.followUp({ content: `❌ No se encontraron datos del clan **${nombreClan}**.`, ephemeral: true });
      return;
    }

    try {
      if (clanData.activated) {
        const cat = guild.channels.cache.get(clanData.cat_id);
        if (cat && cat.type === 4) {
          const hijos = guild.channels.cache.filter((c) => "parentId" in c && c.parentId === cat.id);
          for (const [, canal] of hijos) await canal.delete(`Clan disuelto: ${nombreClan}`);
          await cat.delete(`Clan disuelto: ${nombreClan}`);
        }
        const rolClan = guild.roles.cache.get(clanData.rol_id);
        const rolLider = guild.roles.cache.get(clanData.rol_lider_id);
        if (rolClan) await rolClan.delete();
        if (rolLider) await rolLider.delete();
      }

      const logChannelId = getAuthLogChannel();
      if (logChannelId) {
        const logChannel = interaction.client.channels.cache.get(logChannelId) as TextChannel | undefined;
        await logChannel?.send(`!c lp deletegroup ${nombreClan}`);
      }

      logger.info({ clan: nombreClan }, "Clan eliminado via selector");
      await interaction.editReply({ content: `El clan **${nombreClan}** ha sido disuelto.`, components: [] });
    } catch (err) {
      logger.error({ err }, "Error al eliminar clan");
      await interaction.editReply({ content: "❌ Error al eliminar el clan.", components: [] });
    }
    return;
  }
}
