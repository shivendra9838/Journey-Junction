import fs from "fs";
import path from "path";

export function loadRootEnv() {
  let envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    envPath = path.resolve(process.cwd(), "../../.env");
  }
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
