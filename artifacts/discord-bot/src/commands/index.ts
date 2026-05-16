import { Collection } from "discord.js";
import { Command } from "../lib/types.js";
import { auth_staff } from "./auth_staff.js";
import { canal_staff } from "./canal_staff.js";
import { ceder_liderazgo } from "./ceder_liderazgo.js";
import { comand_chat } from "./comand_chat.js";
import { crear } from "./crear.js";
import { eliminar } from "./eliminar.js";
import { expulsar } from "./expulsar.js";
import { imagen } from "./imagen.js";
import { info } from "./info.js";
import { invitar } from "./invitar.js";
import { lista_clanes } from "./lista_clanes.js";
import { mi_clan } from "./mi_clan.js";
import { setup } from "./setup.js";
import { setup_auth } from "./setup_auth.js";

export const commands = new Collection<string, Command>();

for (const command of [
  crear, eliminar, info, setup, mi_clan, lista_clanes,
  canal_staff, invitar, expulsar, setup_auth, comand_chat,
  imagen, auth_staff, ceder_liderazgo,
]) {
  commands.set(command.data.name, command);
}
