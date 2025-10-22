import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weather",
  description: "Real-time weather information based on your location",
};

export default function WeatherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
