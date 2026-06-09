import crypto from "node:crypto";
import { AppError } from "./errors";

export type UploadInput = {
  file: string;
  folder: string;
  publicId?: string;
};

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new AppError(500, `${name} is required for Cloudinary uploads`);
  return value;
};

function sign(params: Record<string, string | number>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

export async function uploadToCloudinary({ file, folder, publicId }: UploadInput) {
  if (/^https?:\/\//i.test(file)) {
    return { url: file, publicId: publicId ?? "" };
  }

  const cloudName = required("CLOUDINARY_CLOUD_NAME");
  const apiKey = required("CLOUDINARY_API_KEY");
  const apiSecret = required("CLOUDINARY_API_SECRET");
  const timestamp = Math.floor(Date.now() / 1000);
  const signedParams: Record<string, string | number> = { folder, timestamp };
  if (publicId) signedParams.public_id = publicId;

  const form = new FormData();
  form.set("file", file);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("folder", folder);
  if (publicId) form.set("public_id", publicId);
  form.set("signature", sign(signedParams, apiSecret));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AppError(502, `Cloudinary upload failed: ${text}`);
  }

  const json = (await res.json()) as { secure_url: string; public_id: string };
  return { url: json.secure_url, publicId: json.public_id };
}
