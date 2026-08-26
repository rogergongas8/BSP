import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.miaustico.com"),
  title: {
    template: "%s | Miaustico BSP",
    default: "Miaustico BSP - Aprende Español",
  },
  description: "Plataforma de aprendizaje de español interactivo. Practica y mejora tu nivel de español.",
  keywords: ["miaustico", "bsp", "aprender español", "learn spanish", "spanish app"],
  openGraph: {
    title: "Miaustico BSP",
    description: "Plataforma de aprendizaje de español.",
    url: "https://www.miaustico.com",
    siteName: "Miaustico",
    locale: "es_ES",
    type: "website",
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
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
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
