import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../../data/clanes_v2.json");

export interface ClanData {
  lider_id: string;
  miembros_ids: string[];
  rol_id: string;
  rol_lider_id: string;
  cat_id: string;
}

export interface SolicitudData {
  nombre: string;
  colorInt: number;
  colorHex: string;
  lider_id: string;
  miembros_ids: string[];
  guild_id: string;
}

export interface ClanesStore {
  [nombre: string]: ClanData;
}

interface DB {
  clanes: ClanesStore;
  admin_channel: string | null;
  auth_log_channel: string | null;
  solicitudes: { [id: string]: SolicitudData };
}

function ensureFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ clanes: {}, admin_channel: null, auth_log_channel: null, solicitudes: {} }, null, 2), "utf-8");
  }
}

function loadDB(): DB {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as DB;
}

function saveDB(db: DB): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export function cargarClanes(): ClanesStore {
  return loadDB().clanes;
}

export function guardarClan(
  nombre: string,
  liderId: string,
  miembrosIds: string[],
  rolId: string,
  rolLiderId: string,
  catId: string
): void {
  const db = loadDB();
  db.clanes[nombre] = { lider_id: liderId, miembros_ids: miembrosIds, rol_id: rolId, rol_lider_id: rolLiderId, cat_id: catId };
  saveDB(db);
}

export function agregarMiembroAClan(nombre: string, userId: string): void {
  const db = loadDB();
  if (db.clanes[nombre] && !db.clanes[nombre].miembros_ids.includes(userId)) {
    db.clanes[nombre].miembros_ids.push(userId);
    saveDB(db);
  }
}

export function eliminarMiembroDeClan(nombre: string, userId: string): void {
  const db = loadDB();
  if (db.clanes[nombre]) {
    db.clanes[nombre].miembros_ids = db.clanes[nombre].miembros_ids.filter((id) => id !== userId);
    saveDB(db);
  }
}

export function eliminarClanData(nombre: string): ClanData | null {
  const db = loadDB();
  if (!db.clanes[nombre]) return null;
  const clan = db.clanes[nombre];
  delete db.clanes[nombre];
  saveDB(db);
  return clan;
}

export function usuarioEnClan(userId: string): string | null {
  const db = loadDB();
  for (const [nombre, info] of Object.entries(db.clanes)) {
    if (userId === info.lider_id || info.miembros_ids.includes(userId)) return nombre;
  }
  return null;
}

export function clanExiste(nombre: string): boolean {
  return nombre in loadDB().clanes;
}

export function getAdminChannel(): string | null {
  return loadDB().admin_channel;
}

export function setAdminChannel(channelId: string): void {
  const db = loadDB();
  db.admin_channel = channelId;
  saveDB(db);
}

export function getAuthLogChannel(): string | null {
  return loadDB().auth_log_channel ?? null;
}

export function setAuthLogChannel(channelId: string): void {
  const db = loadDB();
  db.auth_log_channel = channelId;
  saveDB(db);
}

export function guardarSolicitud(id: string, data: SolicitudData): void {
  const db = loadDB();
  db.solicitudes[id] = data;
  saveDB(db);
}

export function getSolicitud(id: string): SolicitudData | null {
  return loadDB().solicitudes[id] ?? null;
}

export function eliminarSolicitud(id: string): void {
  const db = loadDB();
  delete db.solicitudes[id];
  saveDB(db);
}
