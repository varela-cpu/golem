import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalSubmitInteraction,
  TextChannel,
  UserSelectMenuBuilder,
} from "discord.js";

import {
  clanExiste,
  getAdminChannel,
  getAuthStaffChannel,
  guardarSolicitud,
  guardarSolicitudAuth,
  usuarioEnClan,
} from "../lib/data.js";
import { logger } from "../lib/logger.js";
import { clearPendingRequest, getPendingRequest, setPending } from "../lib/pending.js";

export async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  // ── Approval-flow modal (name + color, comes after member selection) ─────
  if (interaction.customId === "modal_solicitud_clan") {
    const nombre = interaction.fields.getTextInputValue("nombre_clan").trim();
    const rawColor = interaction.fields.getTextInputValue("color_hex").trim().replace("#", "");

    if (clanExiste(nombre)) {
      await interaction.reply({ content: `❌ Ya existe un clan llamado **${nombre}**.`, ephemeral: true });
      return;
    }

    const colorInt = parseInt(rawColor, 16);
    const validColor = !isNaN(colorInt) && rawColor.length === 6;
    const finalColorInt = validColor ? colorInt : 0xffffff;
    const finalColorHex = validColor ? rawColor : "FFFFFF";

    const req = getPendingRequest(interaction.user.id);
    if (!req?.lider || req.miembros.length < 1) {
      await interaction.reply({ content: "❌ Sesión expirada. Inicia el proceso de nuevo.", ephemeral: true });
      return;
    }

    const adminChannelId = getAdminChannel();
    if (!adminChannelId) {
      await interaction.reply({
        content: "❌ El staff no ha configurado el canal de solicitudes. Pídele a un admin que use `/canal_staff`.",
        ephemeral: true,
      });
      return;
    }

    const adminChannel = interaction.client.channels.cache.get(adminChannelId) as TextChannel | undefined;
    if (!adminChannel) {
      await interaction.reply({ content: "❌ No se puede acceder al canal de solicitudes.", ephemeral: true });
      return;
    }

    const solId = `${Date.now()}_${interaction.user.id}`;
    guardarSolicitud(solId, {
      nombre,
      colorInt: finalColorInt,
      colorHex: finalColorHex,
      lider_id: req.lider.id,
      miembros_ids: req.miembros.map((m) => m.id),
      guild_id: interaction.guildId ?? "",
    });

    clearPendingRequest(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle("📋 Nueva Solicitud de Clan")
      .setColor(finalColorInt)
      .addFields(
        { name: "Nombre", value: nombre, inline: true },
        { name: "Color", value: `#${finalColorHex.toUpperCase()}`, inline: true },
        { name: "Líder", value: `<@${req.lider.id}>`, inline: true },
        { name: "Miembros solicitados", value: `${req.miembros.length} personas`, inline: true },
        { name: "Solicitado por", value: `<@${interaction.user.id}>`, inline: true }
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`aprobar_clan:${solId}`)
        .setLabel("✅ Aprobar")
        .setStyle(ButtonStyle.Success)
    );

    await adminChannel.send({ embeds: [embed], components: [row] });
    logger.info({ clan: nombre, lider: req.lider.id, solId }, "Solicitud de clan enviada al staff");

    await interaction.reply({ content: "✅ Tu solicitud ha sido enviada al Staff. Espera la aprobación.", ephemeral: true });
    return;
  }

  // ── Direct creation modal (old flow, triggered from btn_crear_clan) ───────
  if (interaction.customId === "modal_clan_form") {
    const nombre = interaction.fields.getTextInputValue("nombre_clan").trim();
    const rawColor = interaction.fields.getTextInputValue("color_hex").trim().replace("#", "");

    if (clanExiste(nombre)) {
      await interaction.reply({ content: `❌ Ya existe un clan llamado **${nombre}**.`, ephemeral: true });
      return;
    }

    const colorInt = parseInt(rawColor, 16);
    const validColor = !isNaN(colorInt) && rawColor.length === 6;
    const finalColorInt = validColor ? colorInt : 0x3498db;
    const finalColorHex = validColor ? rawColor : "3498DB";

    const clanActual = usuarioEnClan(interaction.user.id);
    if (clanActual) {
      await interaction.reply({ content: `❌ Ya perteneces al clan **${clanActual}**.`, ephemeral: true });
      return;
    }

    setPending(interaction.user.id, { nombre, colorInt: finalColorInt, colorHex: finalColorHex, lider: null, miembros: [] });

    const liderRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder().setCustomId("select_lider").setPlaceholder("👑 Selecciona al Líder").setMinValues(1).setMaxValues(1)
    );
    const miembrosRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder().setCustomId("select_miembros").setPlaceholder("👥 Selecciona Miembros (Mínimo 1)").setMinValues(1).setMaxValues(10)
    );
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("confirmar_clan").setLabel("Finalizar Creación").setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ content: `Selecciona al Líder y a los miembros para **${nombre}**`, components: [liderRow, miembrosRow, buttonRow], ephemeral: true });
    return;
  }

  // ── Minecraft authentication modal ───────────────────────────────────────
  if (interaction.customId === "modal_auth") {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Solo se puede usar en un servidor.", ephemeral: true });
      return;
    }

    const mcUsername = interaction.fields.getTextInputValue("mc_username").trim();

    const staffChannelId = getAuthStaffChannel();
    if (!staffChannelId) {
      await interaction.reply({
        content: "❌ Error: El canal de staff no ha sido configurado. Pide a un admin que use `/auth-staff`.",
        ephemeral: true,
      });
      return;
    }

    guardarSolicitudAuth(interaction.user.id, {
      userId: interaction.user.id,
      mcUsername,
      guildId: interaction.guild.id,
    });

    const staffChannel = interaction.client.channels.cache.get(staffChannelId) as TextChannel | undefined;
    if (!staffChannel) {
      await interaction.reply({ content: "❌ No se pudo encontrar el canal de staff.", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🔔 Nueva solicitud de autenticación")
      .setColor(0xe67e22)
      .addFields(
        { name: "Usuario Discord", value: `${interaction.user}`, inline: true },
        { name: "Nombre en Minecraft (Java)", value: `\`${mcUsername}\``, inline: true }
      )
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`auth_approve:${interaction.user.id}`)
        .setLabel("Aceptar")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId(`auth_reject:${interaction.user.id}`)
        .setLabel("Rechazar")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌")
    );

    await staffChannel.send({ embeds: [embed], components: [row] });

    logger.info({ userId: interaction.user.id, mcUsername }, "Solicitud de auth enviada a staff");
    await interaction.reply({
      content: `✅ Tu solicitud fue enviada. Un administrador la revisará pronto y te dará acceso.`,
      ephemeral: true,
    });
    return;
  }
}
