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
  activarClan,
  agregarMiembroAClan,
  cargarClanes,
  clanExiste,
  eliminarClanData,
  eliminarSolicitud,
  eliminarSolicitudAuth,
  getAdminChannel,
  getAuthLogChannel,
  getMcUsername,
  getSolicitud,
  getSolicitudAuth,
  guardarClan,
  guardarSolicitud,
  setMcUsername,
  usuarioEnClan,
} from "../lib/data.js";

import { logger } from "../lib/logger.js";
import { clearPending, clearPendingRequest, getPending, getPendingRequest, setPendingRequest } from "../lib/pending.js";

export async function handleButton(interaction: ButtonInteraction, client: Client): Promise<void> {
  const { customId, user, guild } = interaction;

  // ── "Pedir Creación de Clan" public button — select members first ─────────
  if (customId === "btn_pedir_clan") {
    const clanActual = usuarioEnClan(user.id);
    if (clanActual) {
      await interaction.reply({ content: `❌ Ya perteneces al clan **${clanActual}**.`, ephemeral: true });
      return;
    }

    setPendingRequest(user.id, { lider: null, miembros: [] });

    const miembrosRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId("select_miembros_req")
        .setPlaceholder("👥 Selecciona los miembros del clan (mínimo 1)")
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
      content: "Selecciona los miembros que formarán parte de tu clan (tú serás el líder automáticamente):",
      components: [miembrosRow, btnRow],
      ephemeral: true,
    });
    return;
  }

  // ── "Siguiente" — open the name/color modal ──────────────────────────────
  if (customId === "btn_siguiente_req") {
    const req = getPendingRequest(user.id);
    if (!req || req.miembros.length < 1) {
      await interaction.reply({ content: "❌ Debes seleccionar al menos 1 miembro antes de continuar.", ephemeral: true });
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
            .setLabel("Color HEX (opcional)")
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

    guardarClan(sol.nombre, sol.lider_id, [], "", "", "", sol.colorInt, sol.colorHex, false);
    eliminarSolicitud(solId);

    const logChannelId = getAuthLogChannel();
    if (logChannelId) {
      const logChannel = client.channels.cache.get(logChannelId) as TextChannel | undefined;
      if (logChannel) {
        await logChannel.send(`!c lp creategroup ${sol.nombre}`);
        await logChannel.send(`!c lp group ${sol.nombre} meta setprefix "&#${sol.colorHex}[${sol.nombre}] "`);
      }
    }

    // Send DM invitations to selected members (NOT to the leader)
    for (const mId of sol.miembros_ids) {
      try {
        const member = await targetGuild.members.fetch(mId);
        const inviteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`aceptar_invitacion:${sol.guild_id}:${sol.nombre}`)
            .setLabel("Aceptar Invitación")
            .setStyle(ButtonStyle.Success)
        );
        await member.send({
          content: `¡Has sido invitado al clan **${sol.nombre}** en **${targetGuild.name}**! ¿Aceptas unirte?`,
          components: [inviteRow],
        });
      } catch {
        logger.warn({ userId: mId }, "No se pudo enviar DM a miembro invitado");
      }
    }

    logger.info({ clan: sol.nombre, lider: sol.lider_id, miembros: sol.miembros_ids.length }, "Clan aprobado — invitaciones enviadas");

    await interaction.editReply({
      content: `✅ Clan **${sol.nombre}** aprobado. Se enviaron invitaciones a ${sol.miembros_ids.length} miembro(s).`,
      components: [],
      embeds: [],
    });
    return;
  }

  // ── Admin rejects a clan request ─────────────────────────────────────────
  if (customId.startsWith("rechazar_clan:")) {
    const solId = customId.split(":")[1];
    const sol = getSolicitud(solId);
    if (!sol) {
      await interaction.reply({ content: "❌ Solicitud no encontrada.", ephemeral: true });
      return;
    }

    eliminarSolicitud(solId);

    try {
      const targetGuild = client.guilds.cache.get(sol.guild_id);
      if (targetGuild) {
        const lider = await targetGuild.members.fetch(sol.lider_id);
        await lider.send(`❌ Tu solicitud para crear el clan **${sol.nombre}** ha sido rechazada por el staff.`);
      }
    } catch { /* skip */ }

    await interaction.update({
      content: `❌ Solicitud del clan **${sol.nombre}** rechazada.`,
      components: [],
      embeds: [],
    });
    return;
  }

  // ── Member accepts DM invitation ─────────────────────────────────────────
  if (customId.startsWith("aceptar_invitacion:")) {
    const parts = customId.split(":");
    const guildId = parts[1];
    const clanNombre = parts[2];

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

    const clanes = cargarClanes();
    const clan = clanes[clanNombre];
    if (!clan) {
      await interaction.reply({ content: "❌ El clan ya no existe.", ephemeral: true });
      return;
    }

    try {
      const logChannelId = getAuthLogChannel();
      const logChannel = logChannelId ? (client.channels.cache.get(logChannelId) as TextChannel | undefined) : undefined;
      const memberMc = getMcUsername(user.id) ?? user.username;

      if (!clan.activated) {
        // First member — create Discord roles + channels and activate clan
        const rolClan = await targetGuild.roles.create({
          name: clanNombre,
          color: clan.colorInt,
          mentionable: true,
          reason: `Clan activado: ${clanNombre}`,
        });
        const rolLider = await targetGuild.roles.create({
          name: `${clanNombre}-Lider`,
          color: clan.colorInt,
          mentionable: true,
          reason: `Líder del clan: ${clanNombre}`,
        });

        const overwrites = [
          { id: targetGuild.roles.everyone.id, deny: ["ViewChannel" as const] },
          { id: rolClan.id, allow: ["ViewChannel" as const] },
        ];
        const categoria = await targetGuild.channels.create({
          name: clanNombre,
          type: 4,
          permissionOverwrites: overwrites,
          reason: `Clan activado: ${clanNombre}`,
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

        try {
          const liderMember = await targetGuild.members.fetch(clan.lider_id);
          await liderMember.roles.add([rolClan, rolLider]);
        } catch {
          logger.warn({ userId: clan.lider_id }, "No se pudo asignar rol al líder en activación");
        }

        const memberDiscord = await targetGuild.members.fetch(user.id);
        await memberDiscord.roles.add(rolClan);

        activarClan(clanNombre, rolClan.id, rolLider.id, categoria.id);
        agregarMiembroAClan(clanNombre, user.id);

        const liderMc = getMcUsername(clan.lider_id) ?? clan.lider_id;
        if (logChannel) {
          await logChannel.send(`!c lp user ${liderMc} parent add ${clanNombre}`);
          await logChannel.send(`!c lp user ${memberMc} parent add ${clanNombre}`);
        }

        try {
          const lider = await targetGuild.members.fetch(clan.lider_id);
          await lider.send(`🎉 ¡Tu clan **${clanNombre}** ya está activo! **${user.username}** aceptó la invitación y los canales han sido creados.`);
        } catch { /* skip */ }

        logger.info({ clan: clanNombre, userId: user.id }, "Clan activado por primer miembro");
        await interaction.update({ content: `✅ ¡Te has unido al clan **${clanNombre}**! Los canales acaban de ser creados.`, components: [] });
      } else {
        // Subsequent member — clan already active
        const memberDiscord = await targetGuild.members.fetch(user.id);
        const rol = targetGuild.roles.cache.get(clan.rol_id);
        if (rol) await memberDiscord.roles.add(rol);
        agregarMiembroAClan(clanNombre, user.id);

        if (logChannel) {
          await logChannel.send(`!c lp user ${memberMc} parent add ${clanNombre}`);
        }

        logger.info({ clan: clanNombre, userId: user.id }, "Miembro aceptó invitación");
        await interaction.update({ content: `✅ ¡Te has unido al clan **${clanNombre}**!`, components: [] });
      }
    } catch (err) {
      logger.error({ err }, "Error al aceptar invitación");
      await interaction.reply({ content: "❌ No se pudo completar la unión al clan.", ephemeral: true });
    }
    return;
  }

  // ── Direct creation confirm (admin flow via old panel) ────────────────────
  if (customId === "confirmar_clan") {
    const pending = getPending(user.id);
    if (!pending) {
      await interaction.reply({ content: "❌ Sesión expirada. Inicia el proceso de nuevo.", ephemeral: true });
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

      const liderId = pending.lider?.id ?? user.id;
      const liderMember = await guild.members.fetch(liderId);
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

      guardarClan(pending.nombre, liderId, pending.miembros.map((m) => m.id), rolClan.id, rolLider.id, categoria.id, pending.colorInt, pending.colorHex, true);
      clearPending(user.id);

      const logChannelId = getAuthLogChannel();
      if (logChannelId) {
        const logChannel = client.channels.cache.get(logChannelId) as TextChannel | undefined;
        if (logChannel) {
          await logChannel.send(`!c lp creategroup ${pending.nombre}`);
          await logChannel.send(`!c lp group ${pending.nombre} meta setprefix "&#${pending.colorHex}[${pending.nombre}] "`);
          const liderMc = getMcUsername(liderId) ?? liderId;
          await logChannel.send(`!c lp user ${liderMc} parent add ${pending.nombre}`);
          for (const u of pending.miembros) {
            const mc = getMcUsername(u.id) ?? u.username;
            await logChannel.send(`!c lp user ${mc} parent add ${pending.nombre}`);
          }
        }
      }

      const embed = new EmbedBuilder()
        .setTitle("NUEVO CLAN CREADO")
        .setColor(pending.colorInt)
        .addFields(
          { name: "Clan", value: pending.nombre, inline: true },
          { name: "Líder", value: `<@${liderId}>`, inline: true },
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
            .setLabel("Tu nombre en Minecraft (Java)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ej: Steve123 (solo Java Edition)")
            .setMinLength(3)
            .setMaxLength(16)
            .setRequired(true)
        )
      );
    await interaction.showModal(modal);
    return;
  }

  // ── Auth approve ──────────────────────────────────────────────────────────
  if (customId.startsWith("auth_approve:")) {
    const targetUserId = customId.split(":")[1];
    if (!interaction.guild) return;

    const solicitud = getSolicitudAuth(targetUserId);
    if (!solicitud) {
      await interaction.reply({ content: "❌ No se encontró la solicitud (puede que ya haya sido procesada).", ephemeral: true });
      return;
    }

    const autenticadoRole = interaction.guild.roles.cache.find((r) => r.name === "Autenticado");
    if (!autenticadoRole) {
      await interaction.reply({ content: "❌ No existe el rol **Autenticado** en el servidor.", ephemeral: true });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(targetUserId);
      await member.roles.add(autenticadoRole);
    } catch (err) {
      logger.error({ err }, "No se pudo asignar rol Autenticado en aprobación");
      await interaction.reply({ content: "❌ No se pudo asignar el rol. Verifica los permisos del bot.", ephemeral: true });
      return;
    }

    setMcUsername(targetUserId, solicitud.mcUsername);

    const logChannelId = getAuthLogChannel();
    if (logChannelId) {
      const logChannel = client.channels.cache.get(logChannelId) as TextChannel | undefined;
      await logChannel?.send(`!c whitelist add ${solicitud.mcUsername}`);
    }

    eliminarSolicitudAuth(targetUserId);
    logger.info({ targetUserId, mcUsername: solicitud.mcUsername }, "Auth aprobada");

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ Solicitud aprobada")
          .setColor(0x2ecc71)
          .addFields(
            { name: "Usuario Discord", value: `<@${targetUserId}>`, inline: true },
            { name: "Nombre Minecraft (Java)", value: `\`${solicitud.mcUsername}\``, inline: true },
            { name: "Aprobado por", value: `${interaction.user}`, inline: true }
          )
          .setTimestamp(),
      ],
      components: [],
    });
    return;
  }

  // ── Auth reject ───────────────────────────────────────────────────────────
  if (customId.startsWith("auth_reject:")) {
    const targetUserId = customId.split(":")[1];

    const solicitud = getSolicitudAuth(targetUserId);
    if (!solicitud) {
      await interaction.reply({ content: "❌ No se encontró la solicitud (puede que ya haya sido procesada).", ephemeral: true });
      return;
    }

    eliminarSolicitudAuth(targetUserId);
    logger.info({ targetUserId }, "Auth rechazada");

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle("❌ Solicitud rechazada")
          .setColor(0xe74c3c)
          .addFields(
            { name: "Usuario Discord", value: `<@${targetUserId}>`, inline: true },
            { name: "Nombre Minecraft (Java)", value: `\`${solicitud.mcUsername}\``, inline: true },
            { name: "Rechazado por", value: `${interaction.user}`, inline: true }
          )
          .setTimestamp(),
      ],
      components: [],
    });
    return;
  }

  // ── Borrar clan dropdown (triggered by /eliminar) ─────────────────────────
  // (handled in selectHandler for the StringSelectMenu)
}
