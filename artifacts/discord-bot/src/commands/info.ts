import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../lib/types.js";

export const info: Command = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Muestra información sobre un clan")
    .addStringOption((opt) =>
      opt
        .setName("nombre")
        .setDescription("Nombre del clan")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ Este comando solo puede usarse dentro de un servidor.",
        ephemeral: true,
      });
      return;
    }

    const nombreClan = interaction.options.getString("nombre", true);
    await interaction.deferReply();

    const guild = interaction.guild;

    const rolClan = guild.roles.cache.find((r) => r.name === nombreClan);
    if (!rolClan) {
      await interaction.editReply(
        `❌ No se encontró ningún clan llamado **${nombreClan}**.`
      );
      return;
    }

    const rolLider = guild.roles.cache.find(
      (r) => r.name === `${nombreClan}-lider`
    );

    await guild.members.fetch();

    const miembros = guild.members.cache.filter((m) =>
      m.roles.cache.has(rolClan.id)
    );
    const lideres = rolLider
      ? guild.members.cache.filter((m) => m.roles.cache.has(rolLider.id))
      : null;

    const categoria = guild.channels.cache.find(
      (c) => c.type === 4 && c.name === nombreClan
    );

    const colorHex = rolClan.color.toString(16).padStart(6, "0").toUpperCase();

    const embed = new EmbedBuilder()
      .setTitle(`🏰 Clan: ${nombreClan}`)
      .setColor(rolClan.color)
      .addFields(
        {
          name: "👑 Líder(es)",
          value:
            lideres && lideres.size > 0
              ? lideres.map((m) => m.toString()).join(", ")
              : "Sin líder asignado",
          inline: true,
        },
        {
          name: "👥 Miembros",
          value: `${miembros.size}`,
          inline: true,
        },
        {
          name: "🎨 Color",
          value: `#${colorHex}`,
          inline: true,
        },
        {
          name: "📁 Categoría",
          value: categoria ? `✅ Existe` : "❌ No encontrada",
          inline: true,
        }
      )
      .setFooter({ text: `Servidor: ${guild.name}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
