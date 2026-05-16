import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { cargarClanes, cederLiderazgo, usuarioEnClan } from "../lib/data.js";
import { logger } from "../lib/logger.js";
import { Command } from "../lib/types.js";

export const ceder_liderazgo: Command = {
  data: new SlashCommandBuilder()
    .setName("ceder_liderazgo")
    .setDescription("Cede el liderazgo de tu clan a otro miembro")
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Miembro al que cederás el liderazgo").setRequired(true)
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
      await interaction.reply({ content: "❌ Solo el líder puede ceder el liderazgo.", ephemeral: true });
      return;
    }

    const target = interaction.options.getUser("usuario", true);

    if (target.id === interaction.user.id) {
      await interaction.reply({ content: "❌ No puedes cederte el liderazgo a ti mismo.", ephemeral: true });
      return;
    }

    if (!clan.miembros_ids.includes(target.id)) {
      await interaction.reply({ content: `❌ **${target.displayName}** no es miembro de tu clan.`, ephemeral: true });
      return;
    }

    if (!clan.activated) {
      await interaction.reply({ content: "❌ El clan aún no está activo.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const rolLider = interaction.guild.roles.cache.get(clan.rol_lider_id);
      if (rolLider) {
        const exLider = await interaction.guild.members.fetch(interaction.user.id);
        const nuevoLider = await interaction.guild.members.fetch(target.id);
        await exLider.roles.remove(rolLider);
        await nuevoLider.roles.add(rolLider);
      }

      cederLiderazgo(clanNombre, target.id);

      logger.info({ clan: clanNombre, oldLider: interaction.user.id, newLider: target.id }, "Liderazgo cedido");
      await interaction.editReply(`✅ Has cedido el liderazgo del clan **${clanNombre}** a **${target.displayName}**.`);
    } catch (err) {
      logger.error({ err }, "Error al ceder liderazgo");
      await interaction.editReply("❌ No se pudo ceder el liderazgo. Verifica los permisos del bot.");
    }
  },
};
