import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { cargarClanes, usuarioEnClan } from "../lib/data.js";
import { Command } from "../lib/types.js";

export const invitar: Command = {
  data: new SlashCommandBuilder()
    .setName("invitar")
    .setDescription("Invita a un usuario a tu clan (solo líderes)")
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Usuario a invitar").setRequired(true)
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
    if (db[clanNombre].lider_id !== interaction.user.id) {
      await interaction.reply({ content: "❌ Solo el líder puede invitar miembros.", ephemeral: true });
      return;
    }

    const target = interaction.options.getUser("usuario", true);

    if (target.id === interaction.user.id) {
      await interaction.reply({ content: "❌ No puedes invitarte a ti mismo.", ephemeral: true });
      return;
    }

    if (usuarioEnClan(target.id)) {
      await interaction.reply({ content: `❌ **${target.displayName}** ya pertenece a un clan.`, ephemeral: true });
      return;
    }

    const autenticadoRole = interaction.guild.roles.cache.find((r) => r.name === "Autenticado");
    if (autenticadoRole) {
      const targetMember = interaction.guild.members.cache.get(target.id) ?? await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!targetMember || !targetMember.roles.cache.has(autenticadoRole.id)) {
        await interaction.reply({ content: `❌ **${target.displayName}** no está autenticado en el servidor. Solo puedes invitar miembros con el rol **Autenticado**.`, ephemeral: true });
        return;
      }
    }

    const guildId = interaction.guild.id;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`aceptar_invitacion:${guildId}:${clanNombre}`)
        .setLabel("Aceptar Invitación")
        .setStyle(ButtonStyle.Success)
    );

    try {
      await target.send({
        content: `Has sido invitado al clan **${clanNombre}** en **${interaction.guild.name}**. ¿Aceptas?`,
        components: [row],
      });
      await interaction.reply({ content: `✅ Invitación enviada a **${target.displayName}**.`, ephemeral: true });
    } catch {
      await interaction.reply({
        content: `❌ No se pudo enviar el DM a **${target.displayName}**. Es posible que tenga los DMs desactivados.`,
        ephemeral: true,
      });
    }
  },
};
