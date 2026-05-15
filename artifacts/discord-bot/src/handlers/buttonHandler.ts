import {
  ActionRowBuilder,
  ButtonInteraction,
  EmbedBuilder,
  ModalBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { guardarClan } from "../lib/data.js";
import { logger } from "../lib/logger.js";
import { clearPending, getPending } from "../lib/pending.js";

export async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const { customId, user, guild } = interaction;

  if (customId === "btn_crear_clan") {
    const modal = new ModalBuilder()
      .setCustomId("modal_clan_form")
      .setTitle("Registro de Clan")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("nombre_clan")
            .setLabel("Nombre del Clan")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ej: Los Constructores")
            .setMinLength(3)
            .setMaxLength(25)
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("color_hex")
            .setLabel("Color (HEX o dejar azul)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ej: #FF5733 o dejar azul")
            .setValue("#3498DB")
            .setMinLength(4)
            .setMaxLength(7)
            .setRequired(false)
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
    if (pending.miembros.length < 1) {
      await interaction.reply({ content: "❌ Necesitas seleccionar al menos 1 miembro.", ephemeral: true });
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

      for (const u of pending.miembros) {
        try {
          const m = await guild.members.fetch(u.id);
          await m.roles.add(rolClan);
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

      const chAvisos = await guild.channels.create({
        name: "avisos-clan",
        type: 0,
        parent: categoria.id,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: ["ViewChannel" as const] },
          { id: rolClan.id, allow: ["ViewChannel" as const], deny: ["SendMessages" as const] },
          { id: rolLider.id, allow: ["ViewChannel" as const, "SendMessages" as const] },
        ],
      });

      await guild.channels.create({ name: "chat-general", type: 0, parent: categoria.id, permissionOverwrites: overwrites });
      await guild.channels.create({ name: "Voz Clan", type: 2, parent: categoria.id, permissionOverwrites: overwrites });

      guardarClan(
        pending.nombre,
        pending.lider.id,
        pending.miembros.map((m) => m.id),
        rolClan.id,
        rolLider.id,
        categoria.id
      );

      clearPending(user.id);

      logger.info({ clan: pending.nombre, lider: pending.lider.id }, "Clan creado via formulario");

      const embed = new EmbedBuilder()
        .setTitle("NUEVO CLAN CREADO")
        .setColor(pending.colorInt)
        .addFields(
          { name: "Clan", value: pending.nombre, inline: true },
          { name: "Líder", value: `<@${pending.lider.id}>`, inline: true },
          { name: "Miembros", value: `${pending.miembros.length + 1} totales`, inline: true }
        );

      const channel = interaction.channel as TextChannel | null;
      await channel?.send({ embeds: [embed] });

      await interaction.editReply({ content: "¡Todo creado correctamente!", components: [] });
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
