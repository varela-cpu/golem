import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { cargarClanes, eliminarMiembroDeClan, getAuthLogChannel, getMcUsername, usuarioEnClan } from "../lib/data.js";
import { logger } from "../lib/logger.js";
import { Command } from "../lib/types.js";

export const expulsar: Command = {
  data: new SlashCommandBuilder()
    .setName("expulsar")
    .setDescription("Expulsa a un miembro de tu clan (solo líderes)")
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Miembro a expulsar").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Solo se puede usar en un servidor.", ephemeral: true });
      return;
    }

    const clanNombre = usuarioEnClan(interaction.user.id);
    if (!clanNombre) {
      await interaction.reply({ content: "❌ No perteneces a ningún clan.", ephemeral: true });
      return;
    }

    const db = cargarClanes();
    const clan = db[clanNombre];

    if (clan.lider_id !== interaction.user.id) {
      await interaction.reply({ content: "❌ Solo el líder puede expulsar miembros.", ephemeral: true });
      return;
    }

    const target = interaction.options.getUser("usuario", true);

    if (!clan.miembros_ids.includes(target.id)) {
      await interaction.reply({ content: `❌ **${target.displayName}** no es miembro de tu clan.`, ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const member = await interaction.guild.members.fetch(target.id);
      const rol = interaction.guild.roles.cache.get(clan.rol_id);
      if (rol) await member.roles.remove(rol);

      eliminarMiembroDeClan(clanNombre, target.id);

      const logChannelId = getAuthLogChannel();
      if (logChannelId) {
        const logChannel = interaction.client.channels.cache.get(logChannelId) as TextChannel | undefined;
        if (logChannel) {
          const memberMc = getMcUsername(target.id) ?? target.username;
          await logChannel.send(`!c lp user ${memberMc} parent remove ${clanNombre}`);
        }
      }

      logger.info({ clan: clanNombre, expelled: target.id }, "Miembro expulsado");
      await interaction.editReply(`✅ **${target.displayName}** ha sido expulsado del clan **${clanNombre}**.`);
    } catch (err) {
      logger.error({ err }, "Error al expulsar miembro");
      await interaction.editReply("❌ No se pudo expulsar al miembro. Verifica los permisos del bot.");
    }
  },
};
