import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { setAuthStaffChannel } from "../lib/data.js";
import { Command } from "../lib/types.js";

export const auth_staff: Command = {
  data: new SlashCommandBuilder()
    .setName("auth-staff")
    .setDescription("Configura este canal para recibir las solicitudes de autenticación pendientes de aprobación")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.channel) {
      await interaction.reply({ content: "❌ No se puede detectar el canal.", ephemeral: true });
      return;
    }
    setAuthStaffChannel(interaction.channelId);
    await interaction.reply(`✅ Las solicitudes de autenticación llegarán a ${interaction.channel.toString()} para que los admins las aprueben.`);
  },
};
