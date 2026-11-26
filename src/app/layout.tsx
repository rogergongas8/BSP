import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// No `alternates.canonical` here on purpose: child metadata inherits it, so a root canonical
// would point every page at "/". Each public page declares its own.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    template: "%s | Miaustico BSP",
    default: "Miaustico BSP: practise the Spanish past tenses",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "miaustico",
    "bsp",
    "spanish past tenses",
    "indefinido",
    "imperfecto",
    "pretérito perfecto",
    "learn spanish",
    "aprender español",
  ],
  openGraph: {
    title: "Miaustico: practise the Spanish past tenses",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    alternateLocale: ["es_ES"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Miaustico: practise the Spanish past tenses",
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#2F54BA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
        <meta name="theme-color" content="#2F54BA" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
