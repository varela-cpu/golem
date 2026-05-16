import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalSubmitInteraction,
  TextChannel,
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

export async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  // ── Approval-flow modal (name + color — creator IS the leader) ────────────
  if (interaction.customId === "modal_solicitud_clan") {
    const nombre = interaction.fields.getTextInputValue("nombre_clan").trim();
    const rawColor = interaction.fields.getTextInputValue("color_hex").trim().replace("#", "");

    if (clanExiste(nombre)) {
      await interaction.reply({ content: `❌ Ya existe un clan llamado **${nombre}**.`, ephemeral: true });
      return;
    }

    const clanActual = usuarioEnClan(interaction.user.id);
    if (clanActual) {
      await interaction.reply({ content: `❌ Ya perteneces al clan **${clanActual}**.`, ephemeral: true });
      return;
    }

    const colorInt = parseInt(rawColor, 16);
    const validColor = !isNaN(colorInt) && rawColor.length === 6;
    const finalColorInt = validColor ? colorInt : 0xffffff;
    const finalColorHex = validColor ? rawColor.toUpperCase() : "FFFFFF";

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
      lider_id: interaction.user.id,
      miembros_ids: [],
      guild_id: interaction.guildId ?? "",
    });

    const embed = new EmbedBuilder()
      .setTitle("📋 Nueva Solicitud de Clan")
      .setColor(finalColorInt)
      .addFields(
        { name: "Nombre", value: nombre, inline: true },
        { name: "Color", value: `#${finalColorHex}`, inline: true },
        { name: "Líder (creador)", value: `<@${interaction.user.id}>`, inline: true }
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`aprobar_clan:${solId}`)
        .setLabel("✅ Aprobar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`rechazar_clan:${solId}`)
        .setLabel("❌ Rechazar")
        .setStyle(ButtonStyle.Danger)
    );

    await adminChannel.send({ embeds: [embed], components: [row] });
    logger.info({ clan: nombre, lider: interaction.user.id, solId }, "Solicitud de clan enviada al staff");

    await interaction.reply({ content: "✅ Tu solicitud ha sido enviada al Staff. Espera la aprobación.", ephemeral: true });
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
