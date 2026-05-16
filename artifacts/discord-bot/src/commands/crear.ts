import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { getAuthLogChannel, getMcUsername, guardarClan } from "../lib/data.js";
import { logger } from "../lib/logger.js";
import { Command } from "../lib/types.js";

export const crear: Command = {
  data: new SlashCommandBuilder()
    .setName("crear")
    .setDescription("Crea un nuevo clan con roles y canales privados")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt.setName("nombre").setDescription("Nombre del clan (máx. 25 caracteres)").setRequired(true).setMaxLength(25)
    )
    .addUserOption((opt) =>
      opt.setName("lider").setDescription("Líder del clan").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("color").setDescription("Color hex del clan (ej: #FF5733) — por defecto azul")
    )
    .addUserOption((opt) => opt.setName("miembro1").setDescription("Miembro 1 del clan"))
    .addUserOption((opt) => opt.setName("miembro2").setDescription("Miembro 2 del clan"))
    .addUserOption((opt) => opt.setName("miembro3").setDescription("Miembro 3 del clan"))
    .addUserOption((opt) => opt.setName("miembro4").setDescription("Miembro 4 del clan"))
    .addUserOption((opt) => opt.setName("miembro5").setDescription("Miembro 5 del clan")),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "❌ Este comando solo puede usarse dentro de un servidor.", ephemeral: true });
      return;
    }

    const nombreClan = interaction.options.getString("nombre", true);
    const liderUser = interaction.options.getUser("lider", true);
    const rawColor = (interaction.options.getString("color") ?? "").replace("#", "");

    const colorInt = parseInt(rawColor, 16);
    const validColor = rawColor.length === 6 && !isNaN(colorInt);
    const finalColorInt = validColor ? colorInt : 0x3498db;
    const finalColorHex = validColor ? rawColor.toUpperCase() : "3498DB";

    const miembrosOpcionales = ["miembro1", "miembro2", "miembro3", "miembro4", "miembro5"]
      .map((key) => interaction.options.getUser(key))
      .filter((u) => u !== null);

    await interaction.deferReply({ ephemeral: true });

    try {
      const guild = interaction.guild;

      const rolClan = await guild.roles.create({
        name: nombreClan,
        color: finalColorInt,
        mentionable: true,
        reason: `Clan: ${nombreClan}`,
      });
      const rolLider = await guild.roles.create({
        name: `${nombreClan}-Lider`,
        color: finalColorInt,
        mentionable: true,
        reason: `Líder del clan: ${nombreClan}`,
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
        { id: guild.roles.everyone.id, deny: ["ViewChannel" as const] },
        { id: rolClan.id, allow: ["ViewChannel" as const] },
      ];

      const categoria = await guild.channels.create({
        name: nombreClan,
        type: 4,
        permissionOverwrites: overwrites,
        reason: `Categoría del clan: ${nombreClan}`,
      });

      await guild.channels.create({
        name: "avisos-clan",
        type: 0,
        parent: categoria.id,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: ["ViewChannel" as const] },
          { id: rolClan.id, allow: ["ViewChannel" as const], deny: ["SendMessages" as const] },
          { id: rolLider.id, allow: ["ViewChannel" as const, "SendMessages" as const] },
        ],
      });
      await guild.channels.create({ name: "chat-general", type: 0, parent: categoria.id, permissionOverwrites: overwrites });
      await guild.channels.create({ name: "Voz Clan", type: 2, parent: categoria.id, permissionOverwrites: overwrites });

      guardarClan(nombreClan, liderUser.id, miembrosAgregados.map((m) => m.id), rolClan.id, rolLider.id, categoria.id, finalColorInt, finalColorHex, true);

      const logChannelId = getAuthLogChannel();
      if (logChannelId) {
        const logChannel = interaction.client.channels.cache.get(logChannelId) as TextChannel | undefined;
        if (logChannel) {
          await logChannel.send(`!c lp creategroup ${nombreClan}`);
          await logChannel.send(`!c lp group ${nombreClan} meta setprefix "&#${finalColorHex}[${nombreClan}] "`);
          const liderMc = getMcUsername(liderUser.id) ?? liderUser.username;
          await logChannel.send(`!c lp user ${liderMc} parent add ${nombreClan}`);
          for (const m of miembrosAgregados) {
            const mc = getMcUsername(m.id) ?? m.user.username;
            await logChannel.send(`!c lp user ${mc} parent add ${nombreClan}`);
          }
        }
      }

      logger.info({ guild: guild.id, clan: nombreClan, lider: liderUser.id }, "Clan creado via slash command");

      const embed = new EmbedBuilder()
        .setTitle("NUEVO CLAN CREADO")
        .setColor(finalColorInt)
        .addFields(
          { name: "Clan", value: nombreClan, inline: true },
          { name: "Líder", value: `<@${liderUser.id}>`, inline: true },
          { name: "Miembros", value: `${miembrosAgregados.length + 1} totales`, inline: true }
        );

      const channel = interaction.channel as TextChannel | null;
      await channel?.send({ embeds: [embed] });

      await interaction.editReply("¡Clan creado correctamente!");
    } catch (err) {
      logger.error({ err }, "Error al crear el clan");
      await interaction.editReply(
        "❌ Ocurrió un error al crear el clan. Asegúrate de que el bot tenga los permisos necesarios (Gestionar roles, Gestionar canales)."
      );
    }
  },
};
