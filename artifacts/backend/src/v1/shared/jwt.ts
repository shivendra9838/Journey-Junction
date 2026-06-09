import crypto from "node:crypto";
import { AppError } from "./errors";

export type JwtPurpose = "access" | "refresh";

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  type: JwtPurpose;
};

type EncodedJwtPayload = JwtPayload & {
  iat: number;
  exp: number;
};

const base64Url = (input: string | Buffer) =>
  Buffer.from(input).toString("base64url");

const accessSecret = () => process.env.JWT_ACCESS_SECRET ?? process.env.SESSION_SECRET;
const refreshSecret = () => process.env.JWT_REFRESH_SECRET ?? process.env.SESSION_SECRET;

export const accessTtlSeconds = () => Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 15 * 60);
export const refreshTtlDays = () => Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);

export function randomToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signJwt(payload: JwtPayload, expiresInSeconds: number, secret = accessSecret()) {
  if (!secret) throw new AppError(500, "JWT secret is not configured");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body: EncodedJwtPayload = { ...payload, iat: now, exp: now + expiresInSeconds };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(body))}`;
  const signature = crypto.createHmac("sha256", secret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

export function verifyJwt(token: string, expectedType: JwtPurpose, secret = accessSecret()) {
  if (!secret) throw new AppError(500, "JWT secret is not configured");

  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new AppError(401, "Invalid token");
  }

  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expected = crypto.createHmac("sha256", secret).update(unsigned).digest("base64url");
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !crypto.timingSafeEqual(actual, wanted)) {
    throw new AppError(401, "Invalid token");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as EncodedJwtPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new AppError(401, "Token expired");
  if (payload.type !== expectedType) throw new AppError(401, "Invalid token type");
  return payload;
}

export function signAccessToken(payload: Omit<JwtPayload, "type">) {
  return signJwt({ ...payload, type: "access" }, accessTtlSeconds(), accessSecret());
}

export function signRefreshJwt(payload: Omit<JwtPayload, "type">) {
  return signJwt(
    { ...payload, type: "refresh" },
    refreshTtlDays() * 24 * 60 * 60,
    refreshSecret(),
  );
}

export function verifyRefreshJwt(token: string) {
  return verifyJwt(token, "refresh", refreshSecret());
}
