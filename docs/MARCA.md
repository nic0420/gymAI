# SpotterApp — Guía de marca

**Nombre:** SpotterApp (abreviado: Spotter). El *spotter* es quien te cuida la barra en el press de banca: el sistema cubre al gimnasio para que el dueño se ocupe de entrenar a su gente.

**Tagline:** *Alguien te tiene que cuidar la barra.*

**Tono:** firme, directo y cercano. Español rioplatense ("vos", "pedí", "arrancás"), sin jerga técnica frente al cliente.

## Logo
Cuadrado amarillo ácido con una barra olímpica y un chevron que la empuja hacia arriba (el spotter). Componente: `src/components/brand/SpotterLogo.tsx` · favicon: `src/app/icon.svg`.

## Color
| Token | Hex | Uso |
|---|---|---|
| ink / graphite-950 | `#0E0E0C` | Fondo principal y texto sobre el acento |
| graphite-900 | `#181816` | Superficies |
| graphite-700 | `#393934` | Bordes |
| graphite-50 | `#F6F6F1` | Texto principal |
| volt-400 | `#E8FF3A` | Acento de marca: CTA, pestaña activa, foco |
| signal go | `#3BD67F` | Semáforo verde / éxito |
| signal warn | `#F5A524` | Semáforo amarillo / aviso |
| signal stop | `#F2555A` | Semáforo rojo / error |

El acento amarillo nunca se usa para estados del semáforo, así el verde/amarillo/rojo del molinete siempre se lee sin ambigüedad. El texto sobre amarillo va siempre en `ink`.

## Tipografía
- **Barlow Condensed** 700–800, mayúsculas: títulos.
- **Barlow** 400–700: texto.
- **JetBrains Mono**: DNI, montos, etiquetas técnicas (`.label-industrial`).

## Detalles de identidad
- Cinta de señalización (`.hazard-stripe`) como remate en la landing, el kiosco y los modales.
- Fondo de grilla técnica (`.bg-plate`) en el hero.
- Radios secos (6–10 px), bordes finos, sin glassmorphism ni degradados.
