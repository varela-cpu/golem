import { AnySelectMenuInteraction, TextChannel } from "discord.js";
import { eliminarClanData, getAuthLogChannel, getMcUsername, usuarioEnClan } from "../lib/data.js";
import { logger } from "../lib/logger.js";
import { updatePendingRequest } from "../lib/pending.js";

export async function handleSelect(interaction: AnySelectMenuInteraction): Promise<void> {
  const { customId, user } = interaction;

  // ── Member selection for clan request flow ───────────────────────────────
  if (customId === "select_miembros_req") {
    if (!interaction.isUserSelectMenu()) return;
    if (!interaction.guild) return;

    const selected = [...interaction.users.values()];
    const autenticadoRole = interaction.guild.roles.cache.find((r) => r.name === "Autenticado");

    for (const u of selected) {
      if (u.id === user.id) continue;
      const clanActual = usuarioEnClan(u.id);
      if (clanActual) {
        await interaction.reply({ content: `❌ **${u.username}** ya pertenece al clan **${clanActual}**.`, ephemeral: true });
        return;
      }
      if (autenticadoRole) {
        const gm = interaction.guild.members.cache.get(u.id) ?? await interaction.guild.members.fetch(u.id).catch(() => null);
        if (!gm || !gm.roles.cache.has(autenticadoRole.id)) {
          await interaction.reply({ content: `❌ **${u.username}** no está autenticado en el servidor. Solo se pueden añadir miembros con el rol **Autenticado**.`, ephemeral: true });
          return;
        }
      }
    }

    const validos = selected.filter((u) => u.id !== user.id);
    if (validos.length < 1) {
      await interaction.reply({ content: "❌ No puedes seleccionarte a ti mismo como miembro. Elige a otras personas.", ephemeral: true });
      return;
    }

    updatePendingRequest(user.id, { miembros: validos });
    await interaction.reply({ content: `👥 ${validos.length} miembro(s) seleccionado(s). Ahora haz clic en **Siguiente →**`, ephemeral: true });
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
        if (logChannel) {
          const todosIds = [clanData.lider_id, ...clanData.miembros_ids];
          for (const uid of todosIds) {
            const mc = getMcUsername(uid) ?? uid;
            await logChannel.send(`lp user ${mc} parent remove ${nombreClan}`);
          }
          await logChannel.send(`lp deletegroup ${nombreClan}`);
        }
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
