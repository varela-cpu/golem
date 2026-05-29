import {
  ChatInputCommandInteraction,
  PollLayoutType,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { cargarClanes, usuarioEnClan } from "../lib/data.js";
import { logger } from "../lib/logger.js";
import { Command } from "../lib/types.js";

export const encuesta: Command = {
  data: new SlashCommandBuilder()
    .setName("encuesta")
    .setDescription("Crea una encuesta en este canal (solo líderes de clan)")
    .addStringOption((opt) =>
      opt.setName("pregunta").setDescription("Pregunta de la encuesta").setRequired(true).setMaxLength(300)
    )
    .addStringOption((opt) =>
      opt.setName("opcion1").setDescription("Opción 1").setRequired(true).setMaxLength(55)
    )
    .addStringOption((opt) =>
      opt.setName("opcion2").setDescription("Opción 2").setRequired(true).setMaxLength(55)
    )
    .addStringOption((opt) =>
      opt.setName("opcion3").setDescription("Opción 3 (opcional)").setRequired(false).setMaxLength(55)
    )
    .addStringOption((opt) =>
      opt.setName("opcion4").setDescription("Opción 4 (opcional)").setRequired(false).setMaxLength(55)
    )
    .addStringOption((opt) =>
      opt.setName("opcion5").setDescription("Opción 5 (opcional)").setRequired(false).setMaxLength(55)
    )
    .addIntegerOption((opt) =>
      opt.setName("duracion").setDescription("Duración en horas (1-168, por defecto 24)").setMinValue(1).setMaxValue(168).setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.channel) {
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
      await interaction.reply({ content: "❌ Solo el líder puede crear encuestas.", ephemeral: true });
      return;
    }

    const pregunta = interaction.options.getString("pregunta", true);
    const duracion = interaction.options.getInteger("duracion") ?? 24;

    const answers = (
      [
        interaction.options.getString("opcion1", true),
        interaction.options.getString("opcion2", true),
        interaction.options.getString("opcion3"),
        interaction.options.getString("opcion4"),
        interaction.options.getString("opcion5"),
      ] as (string | null)[]
    )
      .filter((o): o is string => o !== null)
      .map((text) => ({ text }));

    try {
      const channel = interaction.channel as TextChannel;
      await channel.send({
        poll: {
          question: { text: pregunta },
          answers,
          duration: duracion,
          allowMultiselect: false,
          layoutType: PollLayoutType.Default,
        },
      });
      await interaction.reply({ content: "✅ Encuesta creada en este canal.", ephemeral: true });
      logger.info({ clan: clanNombre, pregunta }, "Encuesta creada");
    } catch (err) {
      logger.error({ err }, "Error al crear encuesta");
      await interaction.reply({
        content: "❌ No se pudo crear la encuesta. Asegúrate de usarlo dentro de un canal de texto del clan.",
        ephemeral: true,
      });
    }
  },
};
