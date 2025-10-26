import crypto from 'crypto';

const COOKIE_PREFIX = 'set_pass_ok_';

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.PASSCODE_GRANT_SECRET;
  if (!secret) throw new Error('Signing secret missing (set NEXTAUTH_SECRET)');
  return secret;
}

export function grantCookieName(setId: string) {
  return `${COOKIE_PREFIX}${setId}`;
}

export function createGrantValue(setId: string, expiresAt?: string | null) {
  const exp = expiresAt ? new Date(expiresAt).getTime() : null;
  const payload = `${setId}.${exp ?? ''}`;
  const hmac = crypto.createHmac('sha256', getSecret());
  hmac.update(payload);
  const sig = hmac.digest('hex');
  return `${setId}.${exp ?? ''}.${sig}`;
}

export function verifyGrantValue(value: string, setId: string): { ok: boolean; expired: boolean } {
  try {
    const parts = value.split('.');
    if (parts.length < 3) return { ok: false, expired: false };
    const [id, expStr, sig] = [parts[0], parts[1], parts.slice(2).join('.')];
    if (id !== setId) return { ok: false, expired: false };
    const payload = `${id}.${expStr}`;
    const hmac = crypto.createHmac('sha256', getSecret());
    hmac.update(payload);
    const expected = hmac.digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return { ok: false, expired: false };
    }
    if (expStr) {
      const exp = Number(expStr);
      if (Number.isFinite(exp) && Date.now() > exp) return { ok: false, expired: true };
    }
    return { ok: true, expired: false };
  } catch {
    return { ok: false, expired: false };
  }
}

