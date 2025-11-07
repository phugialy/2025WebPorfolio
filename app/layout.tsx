import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/auth/session-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com"),
  title: {
    default: "Phu Gia Ly — Portfolio",
    template: "%s | Phu Gia Ly",
  },
  description: "Portfolio and blog of Phu Gia Ly — Software Engineer specializing in modern web development.",
  keywords: ["portfolio", "web development", "software engineer", "next.js", "react"],
  authors: [{ name: "Phu Gia Ly" }],
  creator: "Phu Gia Ly",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.phugialy.com",
    siteName: "Phu Gia Ly Portfolio",
    title: "Phu Gia Ly — Portfolio",
    description: "Portfolio and blog of Phu Gia Ly — Software Engineer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Phu Gia Ly — Portfolio",
    description: "Portfolio and blog of Phu Gia Ly — Software Engineer",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${newsreader.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
