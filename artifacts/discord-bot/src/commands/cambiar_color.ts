import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from "discord.js";
import { actualizarColorClan, cargarClanes, getAuthLogChannel, usuarioEnClan } from "../lib/data.js";
import { logger } from "../lib/logger.js";
import { Command } from "../lib/types.js";

export const cambiar_color: Command = {
  data: new SlashCommandBuilder()
    .setName("cambiar_color")
    .setDescription("Cambia el color de tu clan (solo líderes)")
    .addStringOption((opt) =>
      opt.setName("color").setDescription("Color HEX (ej: FF5733 o #FF5733)").setRequired(true).setMaxLength(7)
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
      await interaction.reply({ content: "❌ Solo el líder puede cambiar el color.", ephemeral: true });
      return;
    }

    const rawColor = interaction.options.getString("color", true).replace("#", "").toUpperCase();
    const colorInt = parseInt(rawColor, 16);
    if (rawColor.length !== 6 || isNaN(colorInt)) {
      await interaction.reply({ content: "❌ Color HEX inválido. Usa formato como `#FF5733` o `FF5733`.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    if (clan.activated) {
      const rolClan = interaction.guild.roles.cache.get(clan.rol_id);
      const rolLider = interaction.guild.roles.cache.get(clan.rol_lider_id);
      if (rolClan) await rolClan.edit({ color: colorInt }).catch(() => null);
      if (rolLider) await rolLider.edit({ color: colorInt }).catch(() => null);
    }

    actualizarColorClan(clanNombre, colorInt, rawColor);

    const logChannelId = getAuthLogChannel();
    if (logChannelId) {
      const logChannel = interaction.client.channels.cache.get(logChannelId);
      if (logChannel instanceof TextChannel) {
        await logChannel.send(`!c lp group "${clanNombre}" meta setprefix "&#${rawColor}&l[${clanNombre}]&r&f "`);
      }
    }

    await interaction.editReply({ content: `✅ Color del clan **${clanNombre}** actualizado a **#${rawColor}**.` });
    logger.info({ clan: clanNombre, color: rawColor }, "Color de clan actualizado");
  },
};
