import { Font } from '@react-pdf/renderer';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Registra las fuentes de marca (Fraunces / Inter / JetBrains Mono) para el PDF
 * leyéndolas del filesystem empaquetado — sin descargas en runtime, que en
 * serverless (Vercel) podrían fallar y romper la generación del PDF.
 *
 * Los TTF viven en src/components/pdf/fonts y se incluyen en el bundle de la
 * función vía outputFileTracingIncludes (next.config.ts). Si por cualquier
 * motivo no están disponibles, BRAND_FONTS = false y el documento cae a
 * Helvetica sin romperse.
 */
const FONT_DIR = join(process.cwd(), 'src', 'components', 'pdf', 'fonts');
const f = (name: string) => join(FONT_DIR, name);

let registered = false;
export const BRAND_FONTS: boolean = (() => {
  try {
    const files = [
      'Inter-Regular.ttf', 'Inter-SemiBold.ttf', 'Inter-Bold.ttf',
      'Fraunces-Regular.ttf', 'Fraunces-SemiBold.ttf',
      'JetBrainsMono-Regular.ttf', 'JetBrainsMono-SemiBold.ttf',
    ];
    if (!files.every((name) => existsSync(f(name)))) return false;

    Font.register({
      family: 'Inter',
      fonts: [
        { src: f('Inter-Regular.ttf'), fontWeight: 400 },
        { src: f('Inter-SemiBold.ttf'), fontWeight: 600 },
        { src: f('Inter-Bold.ttf'), fontWeight: 700 },
      ],
    });
    Font.register({
      family: 'Fraunces',
      fonts: [
        { src: f('Fraunces-Regular.ttf'), fontWeight: 400 },
        { src: f('Fraunces-SemiBold.ttf'), fontWeight: 600 },
      ],
    });
    Font.register({
      family: 'JetBrainsMono',
      fonts: [
        { src: f('JetBrainsMono-Regular.ttf'), fontWeight: 400 },
        { src: f('JetBrainsMono-SemiBold.ttf'), fontWeight: 600 },
      ],
    });
    // Evita guiones de corte automáticos en cifras/palabras
    Font.registerHyphenationCallback((word) => [word]);
    registered = true;
    return true;
  } catch {
    return false;
  }
})();

// Familias resueltas: marca si se registraron, Helvetica si no.
export const FF = {
  display: registered ? 'Fraunces' : 'Helvetica-Bold',
  sans: registered ? 'Inter' : 'Helvetica',
  sansBold: registered ? 'Inter' : 'Helvetica-Bold',
  mono: registered ? 'JetBrainsMono' : 'Helvetica',
} as const;
