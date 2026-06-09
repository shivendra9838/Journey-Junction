import { AppError } from "./errors";

export function param(value: string | string[] | undefined, name: string) {
  if (!value || Array.isArray(value)) throw new AppError(400, `${name} parameter is required`);
  return value;
}
