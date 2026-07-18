import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/auth/session-provider";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { SiteFooter } from "@/components/site-footer";

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
    default: "Phu Gia Ly | Practical AI & Automation Notes",
    template: "%s | Phu Gia Ly",
  },
  description:
    "Practical AI, automation, and software systems notes from Phu Gia Ly. Field-tested views on agents, workflow design, backend systems, and human review.",
  applicationName: "Phu Gia Ly",
  keywords: [
    "Phu Gia Ly",
    "Phugialy",
    "AI automation",
    "AI systems",
    "workflow automation",
    "software engineering",
    "agentic workflows",
    "technical writing",
  ],
  authors: [{ name: "Phu Gia Ly" }],
  creator: "Phu Gia Ly",
  alternates: {
    canonical: "/",
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      { rel: "icon", url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { rel: "icon", url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.phugialy.com",
    siteName: "Phu Gia Ly",
    title: "Phu Gia Ly | Practical AI & Automation Notes",
    description:
      "Field-tested notes on AI systems, automation decisions, backend workflows, and the human review layer that keeps software useful.",
    images: [
      {
        url: "/brand/phugialy-social-card.png",
        width: 1200,
        height: 630,
        alt: "Phu Gia Ly Practical AI Automation Systems",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Phu Gia Ly | Practical AI & Automation Notes",
    description:
      "Practical notes on AI systems, workflow automation, backend software, and human review.",
    images: ["/brand/phugialy-social-card.png"],
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
      <body className={`${inter.variable} ${newsreader.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <ConvexClientProvider>
              {children}
              <SiteFooter />
            </ConvexClientProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
