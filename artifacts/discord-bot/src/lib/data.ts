import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../../data/clanes.json");

export interface ClanData {
  lider_id: string;
  miembros_ids: string[];
  rol_id: string;
  rol_lider_id: string;
  cat_id: string;
}

export interface ClanesStore {
  [nombre: string]: ClanData;
}

function ensureFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "{}", "utf-8");
}

export function cargarClanes(): ClanesStore {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as ClanesStore;
}

export function guardarClan(
  nombre: string,
  liderId: string,
  miembrosIds: string[],
  rolId: string,
  rolLiderId: string,
  catId: string
): void {
  const data = cargarClanes();
  data[nombre] = { lider_id: liderId, miembros_ids: miembrosIds, rol_id: rolId, rol_lider_id: rolLiderId, cat_id: catId };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function eliminarClanData(nombre: string): ClanData | null {
  const data = cargarClanes();
  if (!data[nombre]) return null;
  const clan = data[nombre];
  delete data[nombre];
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  return clan;
}

export function usuarioEnClan(userId: string): string | null {
  const data = cargarClanes();
  for (const [nombre, info] of Object.entries(data)) {
    if (userId === info.lider_id || info.miembros_ids.includes(userId)) return nombre;
  }
  return null;
}

export function clanExiste(nombre: string): boolean {
  return nombre in cargarClanes();
}
