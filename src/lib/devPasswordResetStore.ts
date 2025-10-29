type ResetEntry = {
  email: string;
  expiresAt: number; // epoch ms
  createdAt: number; // epoch ms
};

const store = new Map<string, ResetEntry>();

function now() {
  return Date.now();
}

export function putResetTokenDev(token: string, email: string, expiresIso: string) {
  const expiresAt = Date.parse(expiresIso);
  store.set(token, { email, expiresAt, createdAt: now() });
}

export function getResetTokenDev(token: string): ResetEntry | null {
  const entry = store.get(token) || null;
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < now()) {
    store.delete(token);
    return null;
  }
  return entry;
}

export function clearResetTokenDev(token: string) {
  store.delete(token);
}

export function purgeExpiredDev() {
  const t = now();
  for (const [k, v] of store.entries()) {
    if (v.expiresAt && v.expiresAt < t) store.delete(k);
  }
}