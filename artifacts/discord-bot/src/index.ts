import { Client, Events, GatewayIntentBits, Interaction } from "discord.js";
import { commands } from "./commands/index.js";
import { logger } from "./lib/logger.js";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  logger.error("Missing DISCORD_TOKEN environment variable");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  logger.info(`✅ Bot conectado como ${readyClient.user.tag}`);
  logger.info(`Comandos disponibles: ${[...commands.keys()].join(", ")}`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    logger.warn({ commandName: interaction.commandName }, "Unknown command");
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    logger.error({ err, commandName: interaction.commandName }, "Error executing command");
    const reply = {
      content: "❌ Hubo un error al ejecutar este comando.",
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

client.login(token);
