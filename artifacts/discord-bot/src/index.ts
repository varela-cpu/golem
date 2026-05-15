import { Client, Events, GatewayIntentBits, Interaction } from "discord.js";
import { commands } from "./commands/index.js";
import { handleButton } from "./handlers/buttonHandler.js";
import { handleModal } from "./handlers/modalHandler.js";
import { handleSelect } from "./handlers/selectHandler.js";
import { logger } from "./lib/logger.js";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  logger.error("Missing DISCORD_TOKEN environment variable");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  logger.info(`✅ Bot conectado como ${readyClient.user.tag}`);
  logger.info(`Comandos disponibles: ${[...commands.keys()].join(", ")}`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) {
        logger.warn({ commandName: interaction.commandName }, "Unknown command");
        return;
      }
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModal(interaction);
      return;
    }

    if (interaction.isAnySelectMenu()) {
      await handleSelect(interaction);
      return;
    }
  } catch (err) {
    logger.error({ err }, "Unhandled interaction error");
    const reply = { content: "❌ Ocurrió un error inesperado.", ephemeral: true };
    try {
      if ("replied" in interaction && "deferred" in interaction) {
        const i = interaction as { replied: boolean; deferred: boolean; followUp: (r: typeof reply) => Promise<unknown>; reply: (r: typeof reply) => Promise<unknown> };
        if (i.replied || i.deferred) await i.followUp(reply);
        else await i.reply(reply);
      }
    } catch { /* ignore secondary error */ }
  }
});

client.login(token);
