import { User } from "discord.js";

export interface PendingClan {
  nombre: string;
  colorInt: number;
  colorHex: string;
  lider: User | null;
  miembros: User[];
}

const pending = new Map<string, PendingClan>();

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
