import { NextRequest, NextResponse } from "next/server";
import { CACHE_DURATIONS } from "@/lib/metrics";

export const runtime = "edge";

interface WeatherData {
  current_weather: {
    temperature: number;
    windspeed: number;
    weathercode: number;
    time: string;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    time: string[];
  };
}

/**
 * Weather API endpoint
 * Fetches weather data from Open-Meteo API
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  // Validate inputs
  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Missing latitude or longitude" },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: "Invalid latitude or longitude" },
      { status: 400 }
    );
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json(
      { error: "Latitude or longitude out of range" },
      { status: 400 }
    );
  }

  try {
    // Fetch from Open-Meteo API (no key required)
    const apiUrl = new URL("https://api.open-meteo.com/v1/forecast");
    apiUrl.searchParams.set("latitude", latitude.toString());
    apiUrl.searchParams.set("longitude", longitude.toString());
    apiUrl.searchParams.set("current_weather", "true");
    apiUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
    apiUrl.searchParams.set("timezone", "auto");

    const response = await fetch(apiUrl.toString(), {
      next: { revalidate: CACHE_DURATIONS.weather },
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data: WeatherData = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_DURATIONS.weather}, stale-while-revalidate`,
      },
    });
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}

