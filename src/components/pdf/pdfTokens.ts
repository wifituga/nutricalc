/**
 * Espejo de los CSS vars del sistema v2 para @react-pdf/renderer.
 * react-pdf NO usa Tailwind ni CSS vars → estas constantes son la única
 * fuente de verdad de color/espaciado dentro del PDF. Mantener sincronizado
 * con globals.css :root.
 */
export const PDF = {
  // superficies
  paper: '#f6f3ec',
  paperWarm: '#ece4d6',
  surface: '#fffdf8',
  surfaceSunk: '#efe9dd',
  rule: '#ddd6c7',
  ruleStrong: '#c5bca8',
  // tinta
  ink: '#1a1815',
  inkSoft: '#524d44',
  inkFaint: '#837b6d',
  // marca
  accent: '#6b4423',
  accentDeep: '#4d3017',
  accentSoft: '#efe4d6',
  // semáforo
  cDef: '#a8341c',
  cLow: '#b07000',
  cOk: '#2d6a3e',
  // radios
  rSm: 4,
  rMd: 6,
  rLg: 8,
} as const;
