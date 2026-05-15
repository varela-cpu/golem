import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { Command } from "../lib/types.js";

export const crear: Command = {
  data: new SlashCommandBuilder()
    .setName("crear")
    .setDescription("Crea un nuevo clan con roles y canales privados")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("nombre")
        .setDescription("Nombre del clan")
        .setRequired(true)
    )
    .addUserOption((opt) =>
      opt
        .setName("lider")
        .setDescription("Líder del clan")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("color")
        .setDescription("Color hex del clan (ej: FF5733 o #FF5733)")
        .setRequired(true)
    )
    .addUserOption((opt) =>
      opt.setName("miembro1").setDescription("Miembro 1 del clan")
    )
    .addUserOption((opt) =>
      opt.setName("miembro2").setDescription("Miembro 2 del clan")
    )
    .addUserOption((opt) =>
      opt.setName("miembro3").setDescription("Miembro 3 del clan")
    )
    .addUserOption((opt) =>
      opt.setName("miembro4").setDescription("Miembro 4 del clan")
    )
    .addUserOption((opt) =>
      opt.setName("miembro5").setDescription("Miembro 5 del clan")
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
    const liderUser = interaction.options.getUser("lider", true);
    const colorHex = interaction.options
      .getString("color", true)
      .replace("#", "");

    const miembrosOpcionales = ["miembro1", "miembro2", "miembro3", "miembro4", "miembro5"]
      .map((key) => interaction.options.getUser(key))
      .filter((u) => u !== null);

    const colorInt = parseInt(colorHex, 16);
    if (isNaN(colorInt)) {
      await interaction.reply({
        content: `❌ Color hex inválido: \`${colorHex}\`. Usa un formato como \`FF5733\` o \`#FF5733\`.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const guild = interaction.guild;

      await interaction.editReply(
        `⏳ Creando el clan **${nombreClan}**... esto puede tardar un poco.`
      );

      const rolClan = await guild.roles.create({
        name: nombreClan,
        color: colorInt,
        mentionable: true,
        reason: `Rol de clan: ${nombreClan}`,
      });

      const rolLider = await guild.roles.create({
        name: `${nombreClan}-lider`,
        color: colorInt,
        mentionable: true,
        reason: `Rol de líder del clan: ${nombreClan}`,
      });

      const liderMember = await guild.members.fetch(liderUser.id);
      await liderMember.roles.add([rolClan, rolLider]);

      const miembrosAgregados: GuildMember[] = [];
      for (const usuario of miembrosOpcionales) {
        try {
          const member = await guild.members.fetch(usuario!.id);
          await member.roles.add(rolClan);
          miembrosAgregados.push(member);
        } catch (err) {
          logger.warn({ err, userId: usuario!.id }, "No se pudo asignar rol a miembro");
        }
      }

      const overwrites = [
        {
          id: guild.roles.everyone.id,
          deny: ["ViewChannel" as const],
        },
        {
          id: rolClan.id,
          allow: ["ViewChannel" as const],
        },
      ];

      const categoria = await guild.channels.create({
        name: nombreClan,
        type: 4,
        permissionOverwrites: overwrites,
        reason: `Categoría del clan: ${nombreClan}`,
      });

      const overwritesAvisos = [
        {
          id: guild.roles.everyone.id,
          deny: ["ViewChannel" as const],
        },
        {
          id: rolClan.id,
          allow: ["ViewChannel" as const],
          deny: ["SendMessages" as const],
        },
        {
          id: rolLider.id,
          allow: ["ViewChannel" as const, "SendMessages" as const],
        },
      ];

      const canalAvisos = await guild.channels.create({
        name: "📢-avisos",
        type: 0,
        parent: categoria.id,
        permissionOverwrites: overwritesAvisos,
        reason: `Canal de avisos del clan: ${nombreClan}`,
      });

      const canalChat = await guild.channels.create({
        name: "💬-chat-clan",
        type: 0,
        parent: categoria.id,
        permissionOverwrites: overwrites,
        reason: `Canal de chat del clan: ${nombreClan}`,
      });

      const canalVoz = await guild.channels.create({
        name: "🔊-voz-clan",
        type: 2,
        parent: categoria.id,
        permissionOverwrites: overwrites,
        reason: `Canal de voz del clan: ${nombreClan}`,
      });

      logger.info(
        {
          guild: guild.id,
          clan: nombreClan,
          lider: liderUser.id,
          miembros: miembrosAgregados.length,
          channels: [canalAvisos.id, canalChat.id, canalVoz.id],
        },
        "Clan creado exitosamente"
      );

      const listaCanales = [
        `<#${canalAvisos.id}> — solo el líder escribe`,
        `<#${canalChat.id}> — chat general del clan`,
        `<#${canalVoz.id}> — canal de voz`,
      ].join("\n");

      await interaction.editReply(
        `✅ **¡Hecho!** El clan **${nombreClan}** ha sido creado.\n\n` +
          `👑 **Líder:** ${liderMember}\n` +
          `👥 **Miembros:** ${miembrosAgregados.length}\n` +
          `🎨 **Color:** #${colorHex.toUpperCase()}\n\n` +
          `📁 **Canales creados:**\n${listaCanales}`
      );
    } catch (err) {
      logger.error({ err }, "Error al crear el clan");
      await interaction.editReply(
        "❌ Ocurrió un error al crear el clan. Asegúrate de que el bot tenga los permisos necesarios (Gestionar roles, Gestionar canales)."
      );
    }
  },
};
