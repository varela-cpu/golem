import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { setAuthLogChannel } from "../lib/data.js";
import { Command } from "../lib/types.js";

export const comand_chat: Command = {
  data: new SlashCommandBuilder()
    .setName("comand_chat")
    .setDescription("Configura este canal para recibir los logs de autenticación de Minecraft")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.channel) {
      await interaction.reply({ content: "❌ No se puede detectar el canal.", ephemeral: true });
      return;
    }
    setAuthLogChannel(interaction.channelId);
    await interaction.reply(`✅ Los nombres de la Whitelist se enviarán a ${interaction.channel.toString()}`);
  },
};
