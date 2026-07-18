import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weather",
  description:
    "A small location-aware weather tool from Phu Gia Ly, part of a practical software and automation portfolio.",
  alternates: {
    canonical: "/weather",
  },
};

export default function WeatherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
