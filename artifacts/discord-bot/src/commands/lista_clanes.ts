import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { cargarClanes } from "../lib/data.js";
import { Command } from "../lib/types.js";

export const lista_clanes: Command = {
  data: new SlashCommandBuilder()
    .setName("lista_clanes")
    .setDescription("Muestra todos los clanes registrados"),

  async execute(interaction: ChatInputCommandInteraction) {
    const db = cargarClanes();
    const nombres = Object.keys(db);

    if (nombres.length === 0) {
      await interaction.reply({ content: "⚠️ No hay clanes registrados todavía.", ephemeral: true });
      return;
    }

    const lineas = nombres.map((name) => {
      const clan = db[name];
      const total = clan.miembros_ids.length + 1;
      return `• **${name}** — ${total} miembro(s)`;
    });

    const embed = new EmbedBuilder()
      .setTitle("🏰 Clanes Registrados")
      .setColor(0x5865f2)
      .setDescription(lineas.join("\n"))
      .setFooter({ text: `Total: ${nombres.length} clan(es)` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
