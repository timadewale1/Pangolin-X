import { NextResponse } from "next/server";

type OpenMeteoCurrent = {
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  surface_pressure?: number;
  pressure_msl?: number;
};

type OpenMeteoDaily = {
  time?: string[];
  weather_code?: number[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_sum?: number[];
  wind_speed_10m_max?: number[];
};

function weatherDescription(code?: number) {
  switch (code) {
    case 0:
      return "clear sky";
    case 1:
      return "mainly clear";
    case 2:
      return "partly cloudy";
    case 3:
      return "overcast";
    case 45:
    case 48:
      return "fog";
    case 51:
    case 53:
    case 55:
      return "drizzle";
    case 56:
    case 57:
      return "freezing drizzle";
    case 61:
    case 63:
    case 65:
      return "rain";
    case 66:
    case 67:
      return "freezing rain";
    case 71:
    case 73:
    case 75:
      return "snow";
    case 77:
      return "snow grains";
    case 80:
    case 81:
    case 82:
      return "showers";
    case 85:
    case 86:
      return "snow showers";
    case 95:
      return "thunderstorm";
    case 96:
    case 99:
      return "thunderstorm with hail";
    default:
      return "partly cloudy";
  }
}

function weatherMain(code?: number) {
  switch (code) {
    case 0:
    case 1:
      return "Clear";
    case 2:
    case 3:
      return "Clouds";
    case 45:
    case 48:
      return "Fog";
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return "Drizzle";
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return "Rain";
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return "Snow";
    case 95:
    case 96:
    case 99:
      return "Thunderstorm";
    default:
      return "Clouds";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    const requestedDays = Number(body.days || 1);
    const forecastDays = Math.max(1, Math.min(16, Number.isFinite(requestedDays) ? requestedDays : 1));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      timezone: "auto",
      forecast_days: String(forecastDays),
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data?.reason || data?.error || "Weather fetch failed" }, { status: res.status });
    }

    const current: OpenMeteoCurrent | null = data?.current ?? null;
    const daily: OpenMeteoDaily | null = data?.daily ?? null;

    const currentWeatherCode = current?.weather_code;
    const currentPayload = current
      ? {
          temp: current.temperature_2m ?? null,
          feels_like: current.apparent_temperature ?? current.temperature_2m ?? null,
          humidity: current.relative_humidity_2m ?? null,
          pressure: current.surface_pressure ?? current.pressure_msl ?? null,
          weather: [
            {
              description: weatherDescription(currentWeatherCode),
              main: weatherMain(currentWeatherCode),
              id: currentWeatherCode ?? undefined,
            },
          ],
          wind_speed: current.wind_speed_10m ?? null,
        }
      : null;

    const dailyTimes = Array.isArray(daily?.time) ? daily.time : [];
    const dailyForecast = dailyTimes.slice(0, forecastDays).map((time, index) => {
      const code = Array.isArray(daily?.weather_code) ? daily.weather_code[index] : undefined;
      return {
        dt: Math.floor(new Date(time).getTime() / 1000),
        temp: {
          min: Array.isArray(daily?.temperature_2m_min) ? daily.temperature_2m_min[index] : null,
          max: Array.isArray(daily?.temperature_2m_max) ? daily.temperature_2m_max[index] : null,
          day: Array.isArray(daily?.temperature_2m_max) ? daily.temperature_2m_max[index] : null,
          night: Array.isArray(daily?.temperature_2m_min) ? daily.temperature_2m_min[index] : null,
        },
        weather: [
          {
            description: weatherDescription(code),
            main: weatherMain(code),
            id: code,
          },
        ],
        humidity: null,
        pressure: null,
        wind_speed: Array.isArray(daily?.wind_speed_10m_max) ? daily.wind_speed_10m_max[index] : null,
        precipitation_sum: Array.isArray(daily?.precipitation_sum) ? daily.precipitation_sum[index] : null,
      };
    });

    return NextResponse.json({
      provider: "open-meteo",
      timezone: data?.timezone ?? "auto",
      lat,
      lon,
      current: currentPayload,
      main: currentPayload
        ? {
            temp: currentPayload.temp,
            feels_like: currentPayload.feels_like,
            humidity: currentPayload.humidity,
            pressure: currentPayload.pressure,
          }
        : null,
      weather: currentPayload?.weather ?? [],
      wind: currentPayload?.wind_speed !== null ? { speed: currentPayload?.wind_speed } : null,
      daily: dailyForecast,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Weather fetch failed" }, { status: 500 });
  }
}
