"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

export default function WeatherPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }

      const data = await response.json();
      setWeather(data);
      setLocation({ lat, lon });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setError("Location access denied. Please enable location permissions.");
        } else {
          setError("Failed to get your location. Please try again.");
        }
      }
    );
  };

  const getWeatherDescription = (code: number): string => {
    const weatherCodes: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Foggy",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      95: "Thunderstorm",
    };
    return weatherCodes[code] || "Unknown";
  };

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12 text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Weather</h1>
            <p className="text-xl text-muted-foreground">
              Get real-time weather information based on your location
            </p>
          </header>

          {!weather && !loading && !error && (
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Check the Weather</CardTitle>
                <CardDescription>
                  Allow location access to see weather information for your area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={requestLocation} size="lg">
                  Get My Weather
                </Button>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card className="text-center">
              <CardContent className="py-12">
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded w-48 mx-auto mb-4"></div>
                  <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
                </div>
                <p className="text-muted-foreground mt-4">Detecting location...</p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={requestLocation} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {weather && (
            <div className="space-y-6">
              {/* Current Weather */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Weather</CardTitle>
                  <CardDescription>
                    {location && `Location: ${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-6xl font-bold">
                        {Math.round(weather.current_weather.temperature)}°C
                      </p>
                      <p className="text-muted-foreground mt-2">
                        {getWeatherDescription(weather.current_weather.weathercode)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Wind Speed</p>
                      <p className="text-2xl font-semibold">
                        {weather.current_weather.windspeed} km/h
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 7-Day Forecast */}
              <Card>
                <CardHeader>
                  <CardTitle>7-Day Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {weather.daily.time.map((date, index) => (
                      <div
                        key={date}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                      >
                        <span className="font-medium">
                          {new Date(date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            {Math.round(weather.daily.temperature_2m_min[index])}°
                          </span>
                          <div className="w-24 h-2 bg-gradient-to-r from-blue-400 to-red-400 rounded-full" />
                          <span className="font-semibold">
                            {Math.round(weather.daily.temperature_2m_max[index])}°
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="text-center">
                <Button onClick={requestLocation} variant="outline">
                  Refresh Weather
                </Button>
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Weather data provided by Open-Meteo API</p>
          </div>
        </div>
      </main>
    </>
  );
}

