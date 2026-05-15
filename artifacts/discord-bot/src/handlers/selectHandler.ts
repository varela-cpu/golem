import { AnySelectMenuInteraction } from "discord.js";
import { usuarioEnClan } from "../lib/data.js";
import { getPending, updatePending } from "../lib/pending.js";

export async function handleSelect(interaction: AnySelectMenuInteraction): Promise<void> {
  const { customId, user } = interaction;

  if (customId === "select_lider") {
    if (!interaction.isUserSelectMenu()) return;
    const selected = interaction.users.first();
    if (!selected) return;

    const clanActual = usuarioEnClan(selected.id);
    if (clanActual) {
      await interaction.reply({
        content: `❌ **${selected.displayName}** ya pertenece al clan **${clanActual}**.`,
        ephemeral: true,
      });
      return;
    }

    updatePending(user.id, { lider: selected });
    await interaction.reply({
      content: `👑 Líder fijado: **${selected.displayName}**`,
      ephemeral: true,
    });
    return;
  }

  if (customId === "select_miembros") {
    if (!interaction.isUserSelectMenu()) return;
    const pending = getPending(user.id);
    const selected = [...interaction.users.values()];

    for (const u of selected) {
      const clanActual = usuarioEnClan(u.id);
      if (clanActual) {
        await interaction.reply({
          content: `❌ **${u.displayName}** ya pertenece al clan **${clanActual}**.`,
          ephemeral: true,
        });
        return;
      }
    }

    updatePending(user.id, { miembros: selected });
    await interaction.reply({
      content: `👥 ${selected.length} miembro(s) seleccionado(s).`,
      ephemeral: true,
    });
    return;
  }
}
