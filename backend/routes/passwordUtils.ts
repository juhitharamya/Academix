import crypto from "crypto";

const KEYLEN = 64;

export function hashPassword(password: string) {
  const pw = String(password || "");
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(pw, salt, KEYLEN);
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string) {
  const pw = String(password || "");
  const s = String(stored || "");

  // Backward compatibility: previously stored plaintext.
  if (!s.includes("$")) return s === pw;

  if (s.startsWith("scrypt$")) {
    const parts = s.split("$");
    if (parts.length !== 3) return false;
    const salt = Buffer.from(parts[1], "base64");
    const expected = Buffer.from(parts[2], "base64");
    const actual = crypto.scryptSync(pw, salt, expected.length);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  }

  // Unknown format: safest fallback is strict equality.
  return s === pw;
}

