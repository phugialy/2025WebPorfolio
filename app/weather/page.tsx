"use client";

import { useState, useEffect, useCallback } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sunrise, Sunset } from "lucide-react";

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
    weathercode: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    time: string[];
  };
  hourly: {
    temperature_2m: number[];
    relativehumidity_2m: number[];
    weathercode: number[];
    precipitation: number[];
    time: string[];
  };
}

interface WeatherCache {
  weather: WeatherData;
  location: { lat: number; lon: number };
  timestamp: number;
}

const WEATHER_CACHE_KEY = "weather_cache";
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export default function WeatherPage() {
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isCelsius, setIsCelsius] = useState(true);

  const fetchWeather = useCallback(async (lat: number, lon: number, saveToCache = true) => {
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
      
      // Save to localStorage cache
      if (saveToCache) {
        const cache: WeatherCache = {
          weather: data,
          location: { lat, lon },
          timestamp: Date.now(),
        };
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load from cache or request new weather on mount
  useEffect(() => {
    const loadWeather = async () => {
      // Try to load from localStorage cache first
      const cachedData = localStorage.getItem(WEATHER_CACHE_KEY);
      
      if (cachedData) {
        try {
          const cache: WeatherCache = JSON.parse(cachedData);
          const now = Date.now();
          
          // Check if cache is still valid (within 10 minutes)
          if (now - cache.timestamp < CACHE_DURATION) {
            setWeather(cache.weather);
            setLocation(cache.location);
            setLoading(false);
            return;
          }
        } catch (err) {
          // Invalid cache, continue to fetch new data
          console.error("Failed to parse cached weather:", err);
        }
      }

      // No valid cache, try to get location and fetch fresh data
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            fetchWeather(position.coords.latitude, position.coords.longitude, true);
          },
          () => {
            // Location permission denied or failed, show button to request
            setLoading(false);
          }
        );
      } else {
        setLoading(false);
      }
    };

    loadWeather();
  }, [fetchWeather]);

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

  const getWeatherIcon = (code: number): string => {
    const weatherIcons: Record<number, string> = {
      0: "☀️", // Clear sky
      1: "☀️", // Mainly clear
      2: "⛅", // Partly cloudy
      3: "☁️", // Overcast
      45: "🌫️", // Foggy
      48: "🌫️", // Foggy
      51: "🌦️", // Light drizzle
      53: "🌦️", // Moderate drizzle
      55: "🌦️", // Dense drizzle
      61: "🌧️", // Slight rain
      63: "🌧️", // Moderate rain
      65: "🌧️", // Heavy rain
      71: "❄️", // Slight snow
      73: "❄️", // Moderate snow
      75: "❄️", // Heavy snow
      95: "⛈️", // Thunderstorm
    };
    return weatherIcons[code] || "🌤️";
  };

  const getTemperatureGradient = (temp: number): string => {
    // Temperature-based gradient (hot to cold)
    if (temp >= 35) {
      // Very hot - deep red/orange
      return "from-red-600 via-orange-500 to-red-600";
    } else if (temp >= 30) {
      // Hot - orange/red
      return "from-orange-500 via-red-400 to-orange-500";
    } else if (temp >= 25) {
      // Warm - orange/yellow
      return "from-orange-400 via-yellow-400 to-orange-400";
    } else if (temp >= 20) {
      // Mild - yellow
      return "from-yellow-400 via-orange-300 to-yellow-400";
    } else if (temp >= 15) {
      // Cool - yellow/green
      return "from-yellow-300 via-green-300 to-yellow-300";
    } else if (temp >= 10) {
      // Cold - blue/green
      return "from-blue-400 via-cyan-300 to-blue-400";
    } else if (temp >= 5) {
      // Very cold - blue
      return "from-blue-500 via-blue-400 to-blue-500";
    } else if (temp >= 0) {
      // Freezing - light blue
      return "from-blue-600 via-blue-300 to-blue-600";
    } else {
      // Extremely cold - deep blue
      return "from-blue-700 via-indigo-500 to-blue-700";
    }
  };

  const getWeatherGradient = (code: number, temp?: number): string => {
    // Use temperature-based gradient if available, otherwise fall back to weather condition
    if (temp !== undefined) {
      return getTemperatureGradient(temp);
    }
    
    // Fallback to weather-condition based gradients
    if (code === 0 || code === 1) {
      // Clear/mainly clear - sunny gradient
      return "from-yellow-400 via-orange-300 to-yellow-400";
    } else if (code === 2 || code === 3) {
      // Cloudy - gray gradient
      return "from-gray-400 via-gray-300 to-gray-400";
    } else if (code === 45 || code === 48) {
      // Foggy - pale gray gradient
      return "from-gray-300 via-gray-200 to-gray-300";
    } else if (code >= 51 && code <= 65) {
      // Rain - blue gradient
      return "from-blue-400 via-blue-300 to-blue-400";
    } else if (code >= 71 && code <= 75) {
      // Snow - light blue gradient
      return "from-blue-200 via-white to-blue-200";
    } else if (code === 95) {
      // Thunderstorm - dark blue/purple gradient
      return "from-purple-500 via-indigo-400 to-purple-500";
    }
    return "from-blue-400 via-blue-300 to-blue-400";
  };

  const convertTemp = (temp: number): number => {
    return isCelsius ? Math.round(temp) : Math.round((temp * 9/5) + 32);
  };

  const getTempUnit = (): string => {
    return isCelsius ? "°C" : "°F";
  };

  const getHumidity = (): number | null => {
    if (weather?.hourly?.relativehumidity_2m && weather.hourly.relativehumidity_2m.length > 0) {
      return Math.round(weather.hourly.relativehumidity_2m[0]);
    }
    return null;
  };

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8 flex items-center justify-between">
            <h1 className="font-display text-4xl md:text-5xl font-bold">Weather</h1>
            {/* Temperature Toggle Button */}
            {weather && (
              <div className="flex items-center gap-2 bg-muted/50 rounded-full p-1 border">
                <Button
                  onClick={() => setIsCelsius(true)}
                  variant={isCelsius ? "default" : "ghost"}
                  size="sm"
                  className="rounded-full"
                >
                  °C
                </Button>
                <Button
                  onClick={() => setIsCelsius(false)}
                  variant={!isCelsius ? "default" : "ghost"}
                  size="sm"
                  className="rounded-full"
                >
                  °F
                </Button>
              </div>
            )}
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
              {/* Current Weather - Hero Card */}
              <Card className="overflow-hidden border-0 shadow-xl">
                <div className={`bg-gradient-to-br ${getWeatherGradient(weather.current_weather.weathercode, weather.current_weather.temperature)}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white/90 text-2xl">Current Weather</CardTitle>
                        <CardDescription className="text-white/80 text-sm mt-1">
                          {location && `Location: ${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`}
                        </CardDescription>
                      </div>
                      <div className="text-7xl animate-bounce drop-shadow-lg">
                        {getWeatherIcon(weather.current_weather.weathercode)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-8">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-8xl font-bold text-white drop-shadow-lg">
                          {convertTemp(weather.current_weather.temperature)}{getTempUnit()}
                        </p>
                        <p className="text-white/90 text-lg font-medium mt-2 drop-shadow">
                          {getWeatherDescription(weather.current_weather.weathercode)}
                        </p>
                      </div>
                      <div className="text-right space-y-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                          <p className="text-white/80 text-xs uppercase tracking-wide mb-1">Wind Speed</p>
                          <p className="text-white text-3xl font-bold">
                            {weather.current_weather.windspeed} <span className="text-xl">km/h</span>
                          </p>
                        </div>
                        {getHumidity() !== null && (
                          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                            <p className="text-white/80 text-xs uppercase tracking-wide mb-1">Humidity</p>
                            <p className="text-white text-3xl font-bold">
                              {getHumidity()} <span className="text-xl">%</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* Hourly Forecast */}
              {weather.hourly?.temperature_2m && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">Hourly Forecast</CardTitle>
                    <CardDescription>Next 24 hours</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Scrollable Hour List */}
                    <div className="overflow-x-auto pb-2">
                      <div className="flex gap-4 min-w-max">
                        {weather.hourly.temperature_2m.slice(0, 24).map((temp, index) => {
                          const time = weather.hourly.time[index];
                          const weatherCode = weather.hourly.weathercode?.[index] || weather.current_weather.weathercode;
                          const precipitation = weather.hourly.precipitation?.[index] || 0;
                          const hour = new Date(time).getHours();
                          const isNow = index === 0;
                          
                          return (
                            <div
                              key={index}
                              className={`flex flex-col items-center gap-2 p-3 rounded-xl min-w-[80px] transition-all ${
                                isNow ? "bg-primary/10 border-2 border-primary" : "bg-muted/30"
                              }`}
                            >
                              <span className={`text-xs font-medium ${isNow ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                {isNow ? "Now" : hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                              </span>
                              <span className="text-2xl">
                                {getWeatherIcon(weatherCode)}
                              </span>
                              <span className="font-bold text-sm">
                                {convertTemp(temp)}{getTempUnit()}
                              </span>
                              {precipitation > 0 && (
                                <span className="text-xs text-blue-400">💧 {precipitation.toFixed(1)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Info Grid */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Sunrise/Sunset */}
                {weather.daily?.sunrise && weather.daily.sunrise[0] && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sunrise className="w-5 h-5 text-yellow-500" />
                        Sunrise & Sunset
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Sunrise</span>
                          <span className="font-semibold">
                            {new Date(weather.daily.sunrise[0]).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Sunset</span>
                          <span className="font-semibold">
                            {new Date(weather.daily.sunset[0]).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* UV Index */}
                {weather.daily?.uv_index_max && weather.daily.uv_index_max[0] !== undefined && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">UV Index</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div className="text-4xl font-bold">
                          {Math.round(weather.daily.uv_index_max[0])}
                        </div>
                        <div className="flex-1">
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                weather.daily.uv_index_max[0] < 3 ? "bg-green-500" :
                                weather.daily.uv_index_max[0] < 6 ? "bg-yellow-500" :
                                weather.daily.uv_index_max[0] < 8 ? "bg-orange-500" :
                                "bg-red-500"
                              }`}
                              style={{ width: `${Math.min((weather.daily.uv_index_max[0] / 11) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {weather.daily.uv_index_max[0] < 3 ? "Low" :
                             weather.daily.uv_index_max[0] < 6 ? "Moderate" :
                             weather.daily.uv_index_max[0] < 8 ? "High" : "Very High"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Today's High/Low */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Today's Range</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">High</span>
                        <span className="text-2xl font-bold text-red-500">
                          {convertTemp(weather.daily.temperature_2m_max[0])}{getTempUnit()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Low</span>
                        <span className="text-2xl font-bold text-blue-500">
                          {convertTemp(weather.daily.temperature_2m_min[0])}{getTempUnit()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 7-Day Forecast */}
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-2xl">7-Day Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {weather.daily.time.map((date, index) => {
                      const minTemp = convertTemp(weather.daily.temperature_2m_min[index]);
                      const maxTemp = convertTemp(weather.daily.temperature_2m_max[index]);
                      const weatherCode = weather.daily.weathercode?.[index] || weather.current_weather.weathercode;
                      const isToday = index === 0;
                      
                      return (
                        <div
                          key={date}
                          className={`flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-md ${
                            isToday ? "bg-primary/10 border-2 border-primary" : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-3xl">
                              {getWeatherIcon(weatherCode)}
                            </span>
                            <div>
                              <div className="font-semibold text-base">
                                {isToday ? "Today" : new Date(date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-medium text-muted-foreground w-12 text-right">
                              {minTemp}{getTempUnit()}
                            </span>
                            <div className="w-32 h-2 bg-gradient-to-r from-blue-400 via-cyan-300 to-red-400 rounded-full overflow-hidden relative">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-red-500 opacity-20"
                                style={{ width: `${((maxTemp + 20) / 60) * 100}%` }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                              </div>
                            </div>
                            <span className="text-lg font-bold w-12">
                              {maxTemp}{getTempUnit()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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

