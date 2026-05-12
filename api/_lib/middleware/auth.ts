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
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "unauthorized", message: "Missing or invalid Authorization header" } });
    return;
  }

  const token = header.slice(7);

  try {
    const { payload } = await jose.jwtVerify(token, getJwks(), {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      audience: "authenticated",
    });

    const sub = payload.sub;
    if (!sub) {
      res.status(401).json({ error: { code: "unauthorized", message: "Token missing sub claim" } });
      return;
    }

    req.userId = sub;
    next();
  } catch {
    res.status(401).json({ error: { code: "unauthorized", message: "Invalid or expired token" } });
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
