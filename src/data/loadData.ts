import type { DailyBar, IndexMeta, IndexRegistry } from "../types";

// Vite base path handling: import.meta.env.BASE_URL is "/" in dev and the
// configured `base` (e.g. "/horizon-dashboard/") in a GitHub Pages build.
const dataUrl = (path: string) => `${import.meta.env.BASE_URL}data/${path}`;

export async function loadIndexRegistry(): Promise<IndexMeta[]> {
  const res = await fetch(dataUrl("index-registry.json"));
  if (!res.ok) throw new Error(`Failed to load index registry: ${res.status}`);
  const registry: IndexRegistry = await res.json();
  return registry.indices;
}

export async function loadIndexBars(meta: IndexMeta): Promise<DailyBar[]> {
  const res = await fetch(dataUrl(meta.dataFile));
  if (!res.ok) throw new Error(`Failed to load data for ${meta.id}: ${res.status}`);
  const bars: DailyBar[] = await res.json();
  // Defensive: ensure ascending date order and no duplicate dates, since the
  // rolling-window engine indexes by array position.
  const seen = new Set<string>();
  const deduped = bars.filter((b) => {
    if (seen.has(b.date)) return false;
    seen.add(b.date);
    return true;
  });
  deduped.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return deduped;
}
