import { Request, Response, NextFunction } from "express";
import * as jose from "jose";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

let jwks: jose.JWTVerifyGetKey | null = null;

function getJwks() {
  if (!jwks) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const jwksUrl = new URL(
      "/auth/v1/.well-known/jwks.json",
      supabaseUrl
    );
    jwks = jose.createRemoteJWKSet(jwksUrl);
  }
  return jwks;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!process.env.SUPABASE_URL) {
    res.status(500).json({ error: { code: "config", message: "SUPABASE_URL is not set on the server" } });
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "unauthorized", message: "Missing or invalid Authorization header" } });
    return;
  }

  const token = header.slice(7);

  try {
    const { payload } = await jose.jwtVerify(token, getJwks(), {
      issuer: `${process.env.SUPABASE_URL.replace(/\/+$/, "")}/auth/v1`,
      audience: "authenticated",
    });

    const sub = payload.sub;
    if (!sub) {
      res.status(401).json({ error: { code: "unauthorized", message: "Token missing sub claim" } });
      return;
    }

    req.userId = sub as string;
    next();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("requireAuth:", detail);
    res.status(401).json({ error: { code: "unauthorized", message: "Invalid or expired token", detail } });
  }
}

export function requireWorkerSecret(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const secret = req.headers["x-worker-secret"];
  if (secret !== process.env.WORKER_SECRET) {
    res.status(403).json({ error: { code: "forbidden", message: "Invalid worker secret" } });
    return;
  }
  next();
}
