import { Collection } from "discord.js";
import { Command } from "../lib/types.js";
import { crear } from "./crear.js";
import { eliminar } from "./eliminar.js";
import { info } from "./info.js";
import { lista_clanes } from "./lista_clanes.js";
import { mi_clan } from "./mi_clan.js";
import { setup } from "./setup.js";

export const commands = new Collection<string, Command>();

for (const command of [crear, eliminar, info, setup, mi_clan, lista_clanes]) {
  commands.set(command.data.name, command);
}
