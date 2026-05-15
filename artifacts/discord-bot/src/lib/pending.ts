import { User } from "discord.js";

export interface PendingClan {
  nombre: string;
  colorInt: number;
  colorHex: string;
  lider: User | null;
  miembros: User[];
}

export interface PendingRequest {
  lider: User | null;
  miembros: User[];
}

const pending = new Map<string, PendingClan>();
const pendingRequests = new Map<string, PendingRequest>();

export function setPending(userId: string, data: PendingClan): void {
  pending.set(userId, data);
}

export function getPending(userId: string): PendingClan | undefined {
  return pending.get(userId);
}

export function updatePending(userId: string, partial: Partial<PendingClan>): void {
  const current = pending.get(userId);
  if (current) pending.set(userId, { ...current, ...partial });
}

export function clearPending(userId: string): void {
  pending.delete(userId);
}

export function setPendingRequest(userId: string, data: PendingRequest): void {
  pendingRequests.set(userId, data);
}

export function getPendingRequest(userId: string): PendingRequest | undefined {
  return pendingRequests.get(userId);
}

export function updatePendingRequest(userId: string, partial: Partial<PendingRequest>): void {
  const current = pendingRequests.get(userId);
  if (current) pendingRequests.set(userId, { ...current, ...partial });
  else pendingRequests.set(userId, { lider: null, miembros: [], ...partial });
}

export function clearPendingRequest(userId: string): void {
  pendingRequests.delete(userId);
}
