import { Collection } from "discord.js";
import { Command } from "../lib/types.js";
import { crear } from "./crear.js";
import { eliminar } from "./eliminar.js";
import { info } from "./info.js";

export const commands = new Collection<string, Command>();

for (const command of [crear, eliminar, info]) {
  commands.set(command.data.name, command);
}
