import { createHash } from 'crypto';

/** Same scheme as apps/web parentAuth hashPin (SHA-256 of sujia-parent:PIN). */
export function hashParentPinSha256(pin: string): string {
  return createHash('sha256').update(`sujia-parent:${pin}`, 'utf8').digest('hex');
}

/** Fallback used by web when crypto.subtle is unavailable. */
export function hashParentPinSimple(pin: string): string {
  let h = 0;
  const s = `sujia-parent:${pin}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `simple:${h}`;
}

/** Match stored parentPinHash whether client used subtle SHA-256 or simple fallback. */
export function hashParentPinCandidates(pin: string): string[] {
  return [hashParentPinSha256(pin), hashParentPinSimple(pin)];
}

export function pinMatchesStoredHash(pin: string, storedHash: string): boolean {
  return hashParentPinCandidates(pin).includes(storedHash);
}
