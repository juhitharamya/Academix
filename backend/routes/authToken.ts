import crypto from "node:crypto";
import type express from "express";

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

type TokenPayloadV1 = {
  v: 1;
  faculty_id: string;
  role: string;
  exp_ms: number;
};

function getSecret() {
  return String(process.env.AUTH_SECRET || "").trim() || "dev-insecure-secret";
}

export function issueAuthToken(payload: { faculty_id: string; role: string }, ttlMs = 1000 * 60 * 60 * 12) {
  const body: TokenPayloadV1 = {
    v: 1,
    faculty_id: String(payload.faculty_id || "").trim(),
    role: String(payload.role || "").trim().toUpperCase(),
    exp_ms: Date.now() + ttlMs,
  };

  const b64 = base64UrlEncode(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", getSecret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function readAuthTokenFromRequest(req: express.Request) {
  const raw = String(req.header("authorization") || "");
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

export function verifyAuthToken(token: string) {
  const raw = String(token || "").trim();
  if (!raw) return { ok: false as const, status: 401, error: "Missing token" };

  const parts = raw.split(".");
  if (parts.length !== 2) return { ok: false as const, status: 401, error: "Invalid token format" };

  const [b64, sig] = parts;
  const expected = crypto.createHmac("sha256", getSecret()).update(b64).digest("base64url");
  if (!timingSafeEqual(sig, expected)) return { ok: false as const, status: 401, error: "Invalid token signature" };

  let payload: TokenPayloadV1;
  try {
    payload = JSON.parse(base64UrlDecode(b64)) as TokenPayloadV1;
  } catch {
    return { ok: false as const, status: 401, error: "Invalid token payload" };
  }

  if (!payload || payload.v !== 1) return { ok: false as const, status: 401, error: "Unsupported token version" };
  if (!payload.faculty_id) return { ok: false as const, status: 401, error: "Invalid token payload" };
  if (!payload.exp_ms || !Number.isFinite(payload.exp_ms)) return { ok: false as const, status: 401, error: "Invalid token payload" };
  if (Date.now() > payload.exp_ms) return { ok: false as const, status: 401, error: "Token expired" };

  return { ok: true as const, payload };
}

