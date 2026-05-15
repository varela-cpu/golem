import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { setAdminChannel } from "../lib/data.js";
import { Command } from "../lib/types.js";

export const canal_staff: Command = {
  data: new SlashCommandBuilder()
    .setName("canal_staff")
    .setDescription("Configura este canal como receptor de solicitudes de clanes")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.channel) {
      await interaction.reply({ content: "❌ No se puede detectar el canal.", ephemeral: true });
      return;
    }
    setAdminChannel(interaction.channelId);
    await interaction.reply(`✅ Canal de solicitudes configurado en ${interaction.channel.toString()}`);
  },
};
