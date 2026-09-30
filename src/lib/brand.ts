/**
 * Datos de marca y contacto comercial de SpotterApp.
 * Configurables por entorno para no tener que tocar código.
 */
export const BRAND = {
  name: "SpotterApp",
  shortName: "Spotter",
  tagline: "Alguien te tiene que cuidar la barra.",
  // Número de ventas en formato internacional sin "+" (ej: 5493425550100).
  salesWhatsapp: process.env.NEXT_PUBLIC_SALES_WHATSAPP || "5493425550100",
  company: "Litoral.dev",
};

export function salesWhatsappLink(message: string): string {
  return `https://wa.me/${BRAND.salesWhatsapp}?text=${encodeURIComponent(message)}`;
}
