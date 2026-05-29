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
  colorInt: number;
  colorHex: string;
  activated: boolean;
}

export interface SolicitudData {
  nombre: string;
  colorInt: number;
  colorHex: string;
  lider_id: string;
  miembros_ids: string[];
  guild_id: string;
}

export interface AuthSolicitudData {
  userId: string;
  mcUsername: string;
  guildId: string;
}

export interface ClanesStore {
  [nombre: string]: ClanData;
}

interface DB {
  clanes: ClanesStore;
  admin_channel: string | null;
  auth_log_channel: string | null;
  auth_staff_channel: string | null;
  auth_image_url: string | null;
  mc_usernames: { [userId: string]: string };
  solicitudes: { [id: string]: SolicitudData };
  solicitudes_auth: { [userId: string]: AuthSolicitudData };
}

function ensureFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ clanes: {}, admin_channel: null, auth_log_channel: null, auth_staff_channel: null, auth_image_url: null, mc_usernames: {}, solicitudes: {}, solicitudes_auth: {} }, null, 2),
      "utf-8"
    );
  }
}

function loadDB(): DB {
  ensureFile();
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as DB;
  if (!raw.solicitudes_auth) raw.solicitudes_auth = {};
  if (!raw.mc_usernames) raw.mc_usernames = {};
  if (raw.auth_staff_channel === undefined) raw.auth_staff_channel = null;
  if (raw.auth_image_url === undefined) raw.auth_image_url = null;
  for (const clan of Object.values(raw.clanes)) {
    if (clan.activated === undefined) clan.activated = true;
    if (clan.colorInt === undefined) clan.colorInt = 0xffffff;
    if (clan.colorHex === undefined) clan.colorHex = "FFFFFF";
  }
  return raw;
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
  catId: string,
  colorInt = 0xffffff,
  colorHex = "FFFFFF",
  activated = true
): void {
  const db = loadDB();
  db.clanes[nombre] = { lider_id: liderId, miembros_ids: miembrosIds, rol_id: rolId, rol_lider_id: rolLiderId, cat_id: catId, colorInt, colorHex, activated };
  saveDB(db);
}

export function activarClan(nombre: string, rolId: string, rolLiderId: string, catId: string): void {
  const db = loadDB();
  if (db.clanes[nombre]) {
    db.clanes[nombre].rol_id = rolId;
    db.clanes[nombre].rol_lider_id = rolLiderId;
    db.clanes[nombre].cat_id = catId;
    db.clanes[nombre].activated = true;
    saveDB(db);
  }
}

export function cederLiderazgo(clanNombre: string, nuevoLiderId: string): void {
  const db = loadDB();
  if (db.clanes[clanNombre]) {
    db.clanes[clanNombre].lider_id = nuevoLiderId;
    saveDB(db);
  }
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

export function renombrarClan(oldName: string, newName: string): void {
  const db = loadDB();
  if (!db.clanes[oldName]) return;
  db.clanes[newName] = db.clanes[oldName];
  delete db.clanes[oldName];
  saveDB(db);
}

export function actualizarColorClan(nombre: string, colorInt: number, colorHex: string): void {
  const db = loadDB();
  if (db.clanes[nombre]) {
    db.clanes[nombre].colorInt = colorInt;
    db.clanes[nombre].colorHex = colorHex;
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

export function getAuthStaffChannel(): string | null {
  return loadDB().auth_staff_channel ?? null;
}

export function setAuthStaffChannel(channelId: string): void {
  const db = loadDB();
  db.auth_staff_channel = channelId;
  saveDB(db);
}

export function getAuthImageUrl(): string | null {
  return loadDB().auth_image_url ?? null;
}

export function setAuthImageUrl(url: string): void {
  const db = loadDB();
  db.auth_image_url = url;
  saveDB(db);
}

export function getMcUsername(userId: string): string | null {
  return loadDB().mc_usernames[userId] ?? null;
}

export function setMcUsername(userId: string, mcUsername: string): void {
  const db = loadDB();
  db.mc_usernames[userId] = mcUsername;
  saveDB(db);
}

export function guardarSolicitudAuth(userId: string, data: AuthSolicitudData): void {
  const db = loadDB();
  db.solicitudes_auth[userId] = data;
  saveDB(db);
}

export function getSolicitudAuth(userId: string): AuthSolicitudData | null {
  return loadDB().solicitudes_auth[userId] ?? null;
}

export function eliminarSolicitudAuth(userId: string): void {
  const db = loadDB();
  delete db.solicitudes_auth[userId];
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
