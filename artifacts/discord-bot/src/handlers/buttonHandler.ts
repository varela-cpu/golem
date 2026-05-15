import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  EmbedBuilder,
  ModalBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from "discord.js";
import {
  agregarMiembroAClan,
  clanExiste,
  eliminarClanData,
  eliminarSolicitud,
  getAdminChannel,
  getSolicitud,
  guardarClan,
  guardarSolicitud,
  usuarioEnClan,
} from "../lib/data.js";

import { logger } from "../lib/logger.js";
import { clearPending, clearPendingRequest, getPending, getPendingRequest, setPendingRequest } from "../lib/pending.js";

export async function handleButton(interaction: ButtonInteraction, client: Client): Promise<void> {
  const { customId, user, guild } = interaction;

  // ── "Pedir Creación de Clan" public button ──────────────────────────────
  if (customId === "btn_pedir_clan") {
    setPendingRequest(user.id, { lider: null, miembros: [] });

    const liderRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId("select_lider_req")
        .setPlaceholder("👑 Selecciona al Líder")
        .setMinValues(1)
        .setMaxValues(1)
    );
    const miembrosRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId("select_miembros_req")
        .setPlaceholder("👥 Selecciona Miembros (Mínimo 1)")
        .setMinValues(1)
        .setMaxValues(10)
    );
    const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_siguiente_req")
        .setLabel("Siguiente →")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: "Elige a los integrantes del clan:",
      components: [liderRow, miembrosRow, btnRow],
      ephemeral: true,
    });
    return;
  }

  // ── "Siguiente" — open the name/color modal ─────────────────────────────
  if (customId === "btn_siguiente_req") {
    const req = getPendingRequest(user.id);
    if (!req?.lider || req.miembros.length < 1) {
      await interaction.reply({
        content: "❌ Debes seleccionar un líder y al menos 1 miembro antes de continuar.",
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("modal_solicitud_clan")
      .setTitle("Solicitud de Creación de Clan")
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
            .setLabel("Color HEX")
            .setStyle(TextInputStyle.Short)
            .setValue("#FFFFFF")
            .setMinLength(4)
            .setMaxLength(7)
            .setRequired(false)
        )
      );

    await interaction.showModal(modal);
    return;
  }

  // ── Admin approves a clan request ────────────────────────────────────────
  if (customId.startsWith("aprobar_clan:")) {
    const solId = customId.split(":")[1];
    const sol = getSolicitud(solId);

    if (!sol) {
      await interaction.reply({ content: "❌ Solicitud no encontrada (puede haber expirado).", ephemeral: true });
      return;
    }

    const targetGuild = client.guilds.cache.get(sol.guild_id);
    if (!targetGuild) {
      await interaction.reply({ content: "❌ No se pudo encontrar el servidor.", ephemeral: true });
      return;
    }

    await interaction.deferUpdate();

    try {
      const rolClan = await targetGuild.roles.create({
        name: sol.nombre,
        color: sol.colorInt,
        mentionable: true,
        reason: `Clan aprobado: ${sol.nombre}`,
      });
      const rolLider = await targetGuild.roles.create({
        name: `${sol.nombre}-Lider`,
        color: sol.colorInt,
        mentionable: true,
        reason: `Líder del clan: ${sol.nombre}`,
      });

      try {
        const liderMember = await targetGuild.members.fetch(sol.lider_id);
        await liderMember.roles.add([rolClan, rolLider]);
      } catch {
        logger.warn({ userId: sol.lider_id }, "No se pudo asignar rol al líder");
      }

      const overwrites = [
        { id: targetGuild.roles.everyone.id, deny: ["ViewChannel" as const] },
        { id: rolClan.id, allow: ["ViewChannel" as const] },
      ];
      const categoria = await targetGuild.channels.create({
        name: sol.nombre,
        type: 4,
        permissionOverwrites: overwrites,
        reason: `Clan aprobado: ${sol.nombre}`,
      });
      await targetGuild.channels.create({
        name: "📢-avisos",
        type: 0,
        parent: categoria.id,
        permissionOverwrites: [
          { id: targetGuild.roles.everyone.id, deny: ["ViewChannel" as const] },
          { id: rolClan.id, allow: ["ViewChannel" as const], deny: ["SendMessages" as const] },
          { id: rolLider.id, allow: ["ViewChannel" as const, "SendMessages" as const] },
        ],
      });
      await targetGuild.channels.create({ name: "💬-chat-general", type: 0, parent: categoria.id, permissionOverwrites: overwrites });
      await targetGuild.channels.create({ name: "🔊-voz-clan", type: 2, parent: categoria.id, permissionOverwrites: overwrites });

      guardarClan(sol.nombre, sol.lider_id, [], rolClan.id, rolLider.id, categoria.id);
      eliminarSolicitud(solId);

      // Send DM invitations to selected members
      for (const mId of sol.miembros_ids) {
        try {
          const member = await targetGuild.members.fetch(mId);
          const inviteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`aceptar_invitacion:${sol.guild_id}:${sol.nombre}:${rolClan.id}`)
              .setLabel("Aceptar Invitación")
              .setStyle(ButtonStyle.Success)
          );
          await member.send({
            content: `Has sido invitado al clan **${sol.nombre}** en **${targetGuild.name}**. ¿Aceptas?`,
            components: [inviteRow],
          });
        } catch {
          logger.warn({ userId: mId }, "No se pudo enviar DM a miembro");
        }
      }

      logger.info({ clan: sol.nombre, lider: sol.lider_id }, "Clan aprobado y creado");

      await interaction.editReply({
        content: `✅ Clan **${sol.nombre}** creado. Los miembros han sido notificados por DM.`,
        components: [],
        embeds: [],
      });
    } catch (err) {
      logger.error({ err }, "Error al aprobar clan");
      await interaction.editReply({
        content: "❌ Error al crear el clan. Verifica los permisos del bot.",
        components: [],
        embeds: [],
      });
    }
    return;
  }

  // ── Member accepts DM invitation ─────────────────────────────────────────
  if (customId.startsWith("aceptar_invitacion:")) {
    const parts = customId.split(":");
    const guildId = parts[1];
    const clanNombre = parts[2];
    const rolId = parts[3];

    if (usuarioEnClan(user.id)) {
      await interaction.reply({ content: "❌ Ya perteneces a un clan.", ephemeral: true });
      return;
    }
    if (!clanExiste(clanNombre)) {
      await interaction.reply({ content: "❌ El clan ya no existe.", ephemeral: true });
      return;
    }

    const targetGuild = client.guilds.cache.get(guildId);
    if (!targetGuild) {
      await interaction.reply({ content: "❌ No se pudo encontrar el servidor.", ephemeral: true });
      return;
    }

    try {
      const member = await targetGuild.members.fetch(user.id);
      const rol = targetGuild.roles.cache.get(rolId);
      if (rol) await member.roles.add(rol);
      agregarMiembroAClan(clanNombre, user.id);

      logger.info({ clan: clanNombre, userId: user.id }, "Miembro aceptó invitación");
      await interaction.update({ content: `✅ ¡Te has unido al clan **${clanNombre}**!`, components: [] });
    } catch (err) {
      logger.error({ err }, "Error al aceptar invitación");
      await interaction.reply({ content: "❌ No se pudo completar la unión al clan.", ephemeral: true });
    }
    return;
  }

  // ── Direct creation confirm (existing flow via /setup old panel) ──────────
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
      const rolClan = await guild.roles.create({ name: pending.nombre, color: pending.colorInt, mentionable: true });
      const rolLider = await guild.roles.create({ name: `${pending.nombre}-Lider`, color: pending.colorInt, mentionable: true });

      const liderMember = await guild.members.fetch(pending.lider.id);
      await liderMember.roles.add([rolClan, rolLider]);
      for (const u of pending.miembros) {
        try { await (await guild.members.fetch(u.id)).roles.add(rolClan); } catch { /* skip */ }
      }

      const overwrites = [
        { id: guild.roles.everyone.id, deny: ["ViewChannel" as const] },
        { id: rolClan.id, allow: ["ViewChannel" as const] },
      ];
      const categoria = await guild.channels.create({ name: pending.nombre, type: 4, permissionOverwrites: overwrites });
      await guild.channels.create({
        name: "📢-avisos", type: 0, parent: categoria.id,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: ["ViewChannel" as const] },
          { id: rolClan.id, allow: ["ViewChannel" as const], deny: ["SendMessages" as const] },
          { id: rolLider.id, allow: ["ViewChannel" as const, "SendMessages" as const] },
        ],
      });
      await guild.channels.create({ name: "💬-chat-general", type: 0, parent: categoria.id, permissionOverwrites: overwrites });
      await guild.channels.create({ name: "🔊-voz-clan", type: 2, parent: categoria.id, permissionOverwrites: overwrites });

      guardarClan(pending.nombre, pending.lider.id, pending.miembros.map((m) => m.id), rolClan.id, rolLider.id, categoria.id);
      clearPending(user.id);

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
      await interaction.editReply({ content: "❌ Error al crear el clan.", components: [] });
    }
    return;
  }

  // ── Authentication button ─────────────────────────────────────────────────
  if (customId === "auth_btn") {
    const modal = new ModalBuilder()
      .setCustomId("modal_auth")
      .setTitle("Autenticación de Minecraft")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("mc_username")
            .setLabel("Tu nombre en Minecraft")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Escribe tu nombre exacto de Java/Bedrock...")
            .setMinLength(3)
            .setMaxLength(16)
            .setRequired(true)
        )
      );
    await interaction.showModal(modal);
    return;
  }

  // ── Borrar clan dropdown (triggered by /eliminar) ─────────────────────────
  // (handled in selectHandler for the StringSelectMenu)
}
