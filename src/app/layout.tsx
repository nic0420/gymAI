import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpotterApp — El sistema que le cuida la barra a tu gimnasio",
  description:
    "Control de acceso por DNI en milisegundos, cobros y arqueo de caja ciego, fichas médicas cifradas y rutinas. Software de gestión para gimnasios hecho en Argentina.",
  applicationName: "SpotterApp",
};

export const viewport: Viewport = {
  themeColor: "#0e0e0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-ink text-graphite-50 antialiased">{children}</body>
    </html>
  );
}
