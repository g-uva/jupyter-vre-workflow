// Downsample: pick every Nth point to reduce chart density
export function downSample<T>(data: T[], maxPoints = 250): T[] {
  if (data.length <= maxPoints) {
    return data;
  }
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, idx) => idx % step === 0);
}

export const parseData = (data: [number, string][]) =>
  data.map(([timestamp, value]: [number, string]) => ({
    date: new Date(timestamp * 1000), // Convert to JS Date (ms)
    value: Number(value)
  }));

export function shortNumber(num: number, digits = 3): string {
  if (num === null || num === undefined) {
    return '';
  }

  const units = [
    { value: 1e12, symbol: 'T' },
    { value: 1e9, symbol: 'B' },
    { value: 1e6, symbol: 'M' },
    { value: 1e3, symbol: 'K' }
  ];
  for (const unit of units) {
    if (Math.abs(num) >= unit.value) {
      return (
        (num / unit.value).toFixed(digits).replace(/\.0+$/, '') + unit.symbol
      );
    }
  }
  return num.toString();
}
