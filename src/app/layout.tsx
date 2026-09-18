import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymAI - Enterprise Gym Management SaaS",
  description: "Plataforma SaaS Integral para la Gestión de Gimnasios con Arquitectura de Alta Seguridad y Concurrencia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-gym-900 text-slate-100 antialiased selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
