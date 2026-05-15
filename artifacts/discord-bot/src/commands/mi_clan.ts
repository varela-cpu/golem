import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { cargarClanes, usuarioEnClan } from "../lib/data.js";
import { Command } from "../lib/types.js";

export const mi_clan: Command = {
  data: new SlashCommandBuilder()
    .setName("mi_clan")
    .setDescription("Muestra a qué clan pertenece un usuario")
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Usuario a consultar (por defecto tú)")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const clanNombre = usuarioEnClan(target.id);

    if (!clanNombre) {
      await interaction.reply({
        content: `👤 **${target.displayName}** no pertenece a ningún clan.`,
        ephemeral: true,
      });
      return;
    }

    const db = cargarClanes();
    const clan = db[clanNombre];
    const esLider = target.id === clan.lider_id;

    const embed = new EmbedBuilder()
      .setTitle(`🏰 Clan: ${clanNombre}`)
      .setColor(0x5865f2)
      .setDescription(
        `👤 **${target.displayName}** pertenece al clan **${clanNombre}**\n` +
          `Rol: ${esLider ? "👑 Líder" : "👥 Miembro"}`
      )
      .addFields({ name: "Miembros totales", value: `${clan.miembros_ids.length + 1}`, inline: true })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
