export function getSymbolSvgUrl(code: string): string {
  const cleaned = code.toUpperCase().replace(/[{}]/g, '').trim();
  const urlCode = encodeURIComponent(cleaned.replace(/\//g, ''));
  return `https://svgs.scryfall.io/card-symbols/${urlCode}.svg`;
}
