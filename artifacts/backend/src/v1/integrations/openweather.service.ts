import { AppError } from "../shared/errors";

export async function fetchOpenWeather(lat: number, lon: number) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new AppError(500, "OPENWEATHER_API_KEY is not configured", "OPENWEATHER_CONFIG_MISSING");
  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", apiKey);
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new AppError(502, `OpenWeather request failed: ${JSON.stringify(json)}`, "OPENWEATHER_FAILED");
  return json as {
    list: Array<{ main: { temp: number; humidity: number }; pop?: number; weather?: Array<{ description: string }>; dt_txt: string }>;
  };
}
