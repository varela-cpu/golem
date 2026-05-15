import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";
import { logger } from "./lib/logger.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  logger.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID environment variables");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

const commandData = [...commands.values()].map((cmd) => cmd.data.toJSON());

logger.info(`Registering ${commandData.length} slash commands globally...`);

try {
  await rest.put(Routes.applicationCommands(clientId), { body: commandData });
  logger.info("✅ Slash commands registered successfully!");
} catch (err) {
  logger.error({ err }, "Failed to register slash commands");
  process.exit(1);
}
