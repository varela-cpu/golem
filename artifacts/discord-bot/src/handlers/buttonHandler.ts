import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { getPending } from "../lib/pending.js";
import { clanExiste, guardarClan, usuarioEnClan } from "../lib/data.js";

export async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const { customId, user, guild } = interaction;

  if (customId === "btn_crear_clan") {
    const modal = new ModalBuilder()
      .setCustomId("modal_clan_form")
      .setTitle("Registro de Nuevo Clan")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("nombre_clan")
            .setLabel("Nombre del Clan")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ej: Los Patata Caliente")
            .setMinLength(3)
            .setMaxLength(20)
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("color_hex")
            .setLabel("Color Hexadecimal")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ej: #FF0000")
            .setMinLength(6)
            .setMaxLength(7)
            .setRequired(true)
        )
      );
    await interaction.showModal(modal);
    return;
  }

  if (customId === "confirmar_clan") {
    const pending = getPending(user.id);
    if (!pending) {
      await interaction.reply({ content: "❌ Sesión expirada. Inicia el proceso de nuevo.", ephemeral: true });
      return;
    }
    if (!pending.lider) {
      await interaction.reply({ content: "❌ Debes seleccionar un líder primero.", ephemeral: true });
      return;
    }
    if (!guild) {
      await interaction.reply({ content: "❌ Este comando solo funciona en un servidor.", ephemeral: true });
      return;
    }

    await interaction.deferUpdate();

    try {
      const rolClan = await guild.roles.create({
        name: pending.nombre,
        color: pending.colorInt,
        mentionable: true,
        reason: `Clan: ${pending.nombre}`,
      });
      const rolLider = await guild.roles.create({
        name: `${pending.nombre}-Lider`,
        color: pending.colorInt,
        mentionable: true,
        reason: `Líder del clan: ${pending.nombre}`,
      });

      const liderMember = await guild.members.fetch(pending.lider.id);
      await liderMember.roles.add([rolClan, rolLider]);

      const miembrosAgregados = [];
      for (const u of pending.miembros) {
        try {
          const m = await guild.members.fetch(u.id);
          await m.roles.add(rolClan);
          miembrosAgregados.push(m);
        } catch {
          logger.warn({ userId: u.id }, "No se pudo asignar rol a miembro");
        }
      }

      const overwrites = [
        { id: guild.roles.everyone.id, deny: ["ViewChannel" as const] },
        { id: rolClan.id, allow: ["ViewChannel" as const] },
      ];
      const categoria = await guild.channels.create({
        name: pending.nombre,
        type: 4,
        permissionOverwrites: overwrites,
        reason: `Categoría del clan: ${pending.nombre}`,
      });

      const overwritesAvisos = [
        { id: guild.roles.everyone.id, deny: ["ViewChannel" as const] },
        { id: rolClan.id, allow: ["ViewChannel" as const], deny: ["SendMessages" as const] },
        { id: rolLider.id, allow: ["ViewChannel" as const, "SendMessages" as const] },
      ];
      await guild.channels.create({ name: "📢-avisos", type: 0, parent: categoria.id, permissionOverwrites: overwritesAvisos });
      await guild.channels.create({ name: "💬-chat-general", type: 0, parent: categoria.id, permissionOverwrites: overwrites });
      await guild.channels.create({ name: "🔊-voz-clan", type: 2, parent: categoria.id, permissionOverwrites: overwrites });

      guardarClan(pending.nombre, pending.lider.id, pending.miembros.map((m) => m.id));

      logger.info({ clan: pending.nombre, lider: pending.lider.id }, "Clan creado via formulario");

      await interaction.editReply({
        content:
          `✅ **¡Clan ${pending.nombre} creado con éxito!**\n\n` +
          `👑 **Líder:** ${liderMember}\n` +
          `👥 **Miembros:** ${miembrosAgregados.length}\n` +
          `🎨 **Color:** #${pending.colorHex.toUpperCase()}`,
        components: [],
      });
    } catch (err) {
      logger.error({ err }, "Error al crear clan via formulario");
      await interaction.editReply({
        content: "❌ Error al crear el clan. Asegúrate de que el bot tenga permisos de Gestionar roles y canales.",
        components: [],
      });
    }
    return;
  }
}
