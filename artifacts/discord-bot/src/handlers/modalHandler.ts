import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalSubmitInteraction,
  UserSelectMenuBuilder,
} from "discord.js";
import { clanExiste, usuarioEnClan } from "../lib/data.js";
import { setPending } from "../lib/pending.js";

export async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (interaction.customId !== "modal_clan_form") return;

  const nombre = interaction.fields.getTextInputValue("nombre_clan").trim();
  const rawColor = interaction.fields.getTextInputValue("color_hex").trim().replace("#", "");

  if (clanExiste(nombre)) {
    await interaction.reply({ content: `❌ Ya existe un clan llamado **${nombre}**.`, ephemeral: true });
    return;
  }

  const colorInt = parseInt(rawColor, 16);
  const validColor = !isNaN(colorInt) && rawColor.length === 6;
  const finalColorInt = validColor ? colorInt : 0x3498db;
  const finalColorHex = validColor ? rawColor : "3498DB";

  const clanActual = usuarioEnClan(interaction.user.id);
  if (clanActual) {
    await interaction.reply({ content: `❌ Ya perteneces al clan **${clanActual}**.`, ephemeral: true });
    return;
  }

  setPending(interaction.user.id, {
    nombre,
    colorInt: finalColorInt,
    colorHex: finalColorHex,
    lider: null,
    miembros: [],
  });

  const liderRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("select_lider")
      .setPlaceholder("👑 Selecciona al Líder")
      .setMinValues(1)
      .setMaxValues(1)
  );

  const miembrosRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("select_miembros")
      .setPlaceholder("👥 Selecciona Miembros (Mínimo 1)")
      .setMinValues(1)
      .setMaxValues(10)
  );

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("confirmar_clan")
      .setLabel("Finalizar Creación")
      .setStyle(ButtonStyle.Success)
  );

  await interaction.reply({
    content: `Selecciona al Líder y a los miembros para **${nombre}**`,
    components: [liderRow, miembrosRow, buttonRow],
    ephemeral: true,
  });
}
