import type { PrintRenderer } from './engine';

export class PlaceholderRenderer implements PrintRenderer {
  async render(payload: string): Promise<Uint8Array[]> {
    const encoded = new TextEncoder().encode(payload);
    return [encoded];
  }
}
