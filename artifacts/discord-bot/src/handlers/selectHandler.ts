import { AnySelectMenuInteraction } from "discord.js";
import { eliminarClanData, usuarioEnClan } from "../lib/data.js";
import { logger } from "../lib/logger.js";
import { getPending, updatePending, updatePendingRequest } from "../lib/pending.js";

export async function handleSelect(interaction: AnySelectMenuInteraction): Promise<void> {
  const { customId, user } = interaction;

  // ── Request flow selects ─────────────────────────────────────────────────
  if (customId === "select_lider_req") {
    if (!interaction.isUserSelectMenu()) return;
    const selected = interaction.users.first();
    if (!selected) return;

    const clanActual = usuarioEnClan(selected.id);
    if (clanActual) {
      await interaction.reply({ content: `❌ **${selected.displayName}** ya pertenece al clan **${clanActual}**.`, ephemeral: true });
      return;
    }
    updatePendingRequest(user.id, { lider: selected });
    await interaction.reply({ content: `👑 Líder seleccionado: **${selected.displayName}**`, ephemeral: true });
    return;
  }

  if (customId === "select_miembros_req") {
    if (!interaction.isUserSelectMenu()) return;
    const selected = [...interaction.users.values()];

    for (const u of selected) {
      const clanActual = usuarioEnClan(u.id);
      if (clanActual) {
        await interaction.reply({ content: `❌ **${u.displayName}** ya pertenece al clan **${clanActual}**.`, ephemeral: true });
        return;
      }
    }
    updatePendingRequest(user.id, { miembros: selected });
    await interaction.reply({ content: `👥 ${selected.length} miembro(s) seleccionado(s).`, ephemeral: true });
    return;
  }

  // ── Direct creation selects ──────────────────────────────────────────────
  if (customId === "select_lider") {
    if (!interaction.isUserSelectMenu()) return;
    const selected = interaction.users.first();
    if (!selected) return;

    const clanActual = usuarioEnClan(selected.id);
    if (clanActual) {
      await interaction.reply({ content: `❌ **${selected.displayName}** ya pertenece al clan **${clanActual}**.`, ephemeral: true });
      return;
    }
    updatePending(user.id, { lider: selected });
    await interaction.reply({ content: `👑 Líder fijado: **${selected.displayName}**`, ephemeral: true });
    return;
  }

  if (customId === "select_miembros") {
    if (!interaction.isUserSelectMenu()) return;
    const selected = [...interaction.users.values()];

    for (const u of selected) {
      const clanActual = usuarioEnClan(u.id);
      if (clanActual) {
        await interaction.reply({ content: `❌ **${u.displayName}** ya pertenece al clan **${clanActual}**.`, ephemeral: true });
        return;
      }
    }
    updatePending(user.id, { miembros: selected });
    await interaction.reply({ content: `👥 ${selected.length} miembro(s) seleccionado(s).`, ephemeral: true });
    return;
  }

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

      logger.info({ clan: nombreClan }, "Clan eliminado via selector");
      await interaction.editReply({ content: `El clan **${nombreClan}** ha sido disuelto.`, components: [] });
    } catch (err) {
      logger.error({ err }, "Error al eliminar clan");
      await interaction.editReply({ content: "❌ Error al eliminar el clan.", components: [] });
    }
    return;
  }
}
