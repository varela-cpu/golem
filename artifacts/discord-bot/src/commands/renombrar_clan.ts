import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from "discord.js";
import { cargarClanes, clanExiste, getAuthLogChannel, renombrarClan, usuarioEnClan } from "../lib/data.js";
import { logger } from "../lib/logger.js";
import { Command } from "../lib/types.js";

export const renombrar_clan: Command = {
  data: new SlashCommandBuilder()
    .setName("renombrar_clan")
    .setDescription("Cambia el nombre de tu clan (solo líderes)")
    .addStringOption((opt) =>
      opt
        .setName("nuevo_nombre")
        .setDescription("Nuevo nombre del clan (sin espacios, 3-25 caracteres)")
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(25)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Solo se puede usar en un servidor.", ephemeral: true });
      return;
    }

    const viejoNombre = usuarioEnClan(interaction.user.id);
    if (!viejoNombre) {
      await interaction.reply({ content: "❌ No perteneces a ningún clan.", ephemeral: true });
      return;
    }

    const db = cargarClanes();
    const clan = db[viejoNombre];
    if (clan.lider_id !== interaction.user.id) {
      await interaction.reply({ content: "❌ Solo el líder puede renombrar el clan.", ephemeral: true });
      return;
    }

    const nuevoNombre = interaction.options.getString("nuevo_nombre", true).trim();

    if (/\s/.test(nuevoNombre)) {
      await interaction.reply({ content: "❌ El nombre no puede contener espacios.", ephemeral: true });
      return;
    }

    if (clanExiste(nuevoNombre)) {
      await interaction.reply({ content: `❌ Ya existe un clan llamado **${nuevoNombre}**.`, ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    if (clan.activated) {
      const rolClan = interaction.guild.roles.cache.get(clan.rol_id);
      const rolLider = interaction.guild.roles.cache.get(clan.rol_lider_id);
      const categoria = interaction.guild.channels.cache.get(clan.cat_id);
      if (rolClan) await rolClan.edit({ name: nuevoNombre }).catch(() => null);
      if (rolLider) await rolLider.edit({ name: `${nuevoNombre}-Lider` }).catch(() => null);
      if (categoria) await categoria.edit({ name: nuevoNombre }).catch(() => null);
    }

    renombrarClan(viejoNombre, nuevoNombre);

    const logChannelId = getAuthLogChannel();
    if (logChannelId) {
      const logChannel = interaction.client.channels.cache.get(logChannelId);
      if (logChannel instanceof TextChannel) {
        await logChannel.send(`!c lp group "${viejoNombre}" meta setprefix "&#${clan.colorHex}&l[${nuevoNombre}]&r&f "`);
      }
    }

    await interaction.editReply({ content: `✅ Clan renombrado de **${viejoNombre}** a **${nuevoNombre}** correctamente.` });
    logger.info({ oldName: viejoNombre, newName: nuevoNombre }, "Clan renombrado");
  },
};
