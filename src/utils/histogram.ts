export interface HistogramBin {
  binStart: number;
  binEnd: number;
  midpoint: number;
  count: number;
  positive: boolean; // true if the bin's midpoint is >= 0
}

/** Fixed-width-bin histogram (not density) — count of observations per bin. */
export function buildHistogram(values: number[], binCount = 28): HistogramBin[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return [{ binStart: min, binEnd: min, midpoint: min, count: values.length, positive: min >= 0 }];
  }

  const width = (max - min) / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
    const binStart = min + i * width;
    const binEnd = binStart + width;
    return { binStart, binEnd, midpoint: (binStart + binEnd) / 2, count: 0, positive: binStart + binEnd >= 0 };
  });

  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  }

  return bins;
}
