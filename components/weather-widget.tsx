"use client";

import { useState, useEffect } from "react";
import { Wind, Eye } from "lucide-react";

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

interface WeatherWidgetProps {
  className?: string;
}

export function WeatherWidget({ className = "" }: WeatherWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isCelsius, setIsCelsius] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

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
      setIsVisible(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
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
          setError("Location access denied");
        } else {
          setError("Failed to get location");
        }
      }
    );
  };


  const convertTemperature = (temp: number): number => {
    return isCelsius ? Math.round(temp) : Math.round((temp * 9/5) + 32);
  };

  const getTemperatureUnit = (): string => {
    return isCelsius ? "°C" : "°F";
  };

  const getWeatherIcon = (code: number): string => {
    const weatherCodes: Record<number, string> = {
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
    return weatherCodes[code] || "🌤️";
  };


  // Auto-fetch weather on component mount if location is available
  useEffect(() => {
    if (navigator.geolocation && !weather && !loading && !error) {
      setIsVisible(true); // Show widget when attempting to get location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // Silently fail if user denies location, but keep widget visible
        }
      );
    }
  }, [weather, loading, error]);

  if (!isVisible && !loading && !error) {
    return (
      <div className={`${className}`} data-testid="weather-widget">
        <button
          onClick={requestLocation}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/50"
        >
          <Eye className="w-4 h-4" />
          <span>Weather</span>
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${className}`} data-testid="weather-widget">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
          <div className="animate-spin rounded-full h-3 w-3 border border-primary border-t-transparent"></div>
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`} data-testid="weather-widget">
        <button
          onClick={requestLocation}
          className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors px-3 py-2 rounded-lg hover:bg-destructive/10"
        >
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className={`${className}`} data-testid="weather-widget">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group">
        {/* Compact weather display */}
        <span className="text-lg">{getWeatherIcon(weather.current_weather.weathercode)}</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">
            {convertTemperature(weather.current_weather.temperature)}
          </span>
          <button
            onClick={() => setIsCelsius(!isCelsius)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-muted"
          >
            {getTemperatureUnit()}
          </button>
        </div>
        
        {/* Subtle wind indicator on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
            <Wind className="w-3 h-3" />
            <span>{weather.current_weather.windspeed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
