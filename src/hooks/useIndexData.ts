import { useEffect, useState } from "react";
import type { DailyBar, IndexMeta } from "../types";
import { loadIndexBars, loadIndexRegistry } from "../data/loadData";

// Module-level cache: avoid re-fetching/re-parsing a multi-MB JSON file every
// time the user switches horizons or toggles a chart option.
const barsCache = new Map<string, DailyBar[]>();
let registryPromise: Promise<IndexMeta[]> | null = null;

export function useIndexRegistry() {
  const [indices, setIndices] = useState<IndexMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!registryPromise) registryPromise = loadIndexRegistry();
    registryPromise
      .then((data) => {
        if (!cancelled) setIndices(data);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { indices, error, loading: !indices && !error };
}

export function useIndexBars(meta: IndexMeta | null) {
  const [bars, setBars] = useState<DailyBar[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meta) return;
    setBars(null);
    setError(null);

    const cached = barsCache.get(meta.id);
    if (cached) {
      setBars(cached);
      return;
    }

    let cancelled = false;
    loadIndexBars(meta)
      .then((data) => {
        barsCache.set(meta.id, data);
        if (!cancelled) setBars(data);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [meta]);

  return { bars, error, loading: !!meta && !bars && !error };
}
