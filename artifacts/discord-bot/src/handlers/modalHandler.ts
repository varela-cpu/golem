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
  if (isNaN(colorInt) || rawColor.length !== 6) {
    await interaction.reply({ content: "❌ Color inválido. Usa formato hex como `#FF0000` o `FF0000`.", ephemeral: true });
    return;
  }

  const clanActual = usuarioEnClan(interaction.user.id);
  if (clanActual) {
    await interaction.reply({ content: `❌ Ya perteneces al clan **${clanActual}**.`, ephemeral: true });
    return;
  }

  setPending(interaction.user.id, {
    nombre,
    colorInt,
    colorHex: rawColor,
    lider: null,
    miembros: [],
  });

  const liderRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("select_lider")
      .setPlaceholder("👑 Selecciona al LÍDER del clan")
      .setMinValues(1)
      .setMaxValues(1)
  );

  const miembrosRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("select_miembros")
      .setPlaceholder("👥 Selecciona los MIEMBROS (hasta 10)")
      .setMinValues(1)
      .setMaxValues(10)
  );

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("confirmar_clan")
      .setLabel("✅ CREAR CLAN AHORA")
      .setStyle(ButtonStyle.Success)
  );

  await interaction.reply({
    content: `Nombre y color aceptados para el clan **${nombre}** 🎨 \`#${rawColor.toUpperCase()}\`\n\nAhora selecciona el **líder** y los **miembros**, luego pulsa el botón.`,
    components: [liderRow, miembrosRow, buttonRow],
    ephemeral: true,
  });
}
