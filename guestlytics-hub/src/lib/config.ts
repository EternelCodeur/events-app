// Utilitaire simple pour parser une valeur entière positive avec un fallback
function parsePositiveInt(raw: string | number | undefined | null, fallback: number): number {
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

// Dimensions de la modale de signature
export const SIGNATURE_MODAL_WIDTH = parsePositiveInt(
  import.meta.env?.VITE_SIGNATURE_MODAL_WIDTH,
  520,
);

export const SIGNATURE_MODAL_HEIGHT = parsePositiveInt(
  import.meta.env?.VITE_SIGNATURE_MODAL_HEIGHT,
  480,
);

// Dimensions du canvas de signature
export const SIGNATURE_CANVAS_WIDTH = parsePositiveInt(
  import.meta.env?.VITE_SIGNATURE_CANVAS_WIDTH,
  450,
);

export const SIGNATURE_CANVAS_HEIGHT = parsePositiveInt(
  import.meta.env?.VITE_SIGNATURE_CANVAS_HEIGHT,
  240,
);
