import { toPng } from 'html-to-image';

export async function generateShareImage(elementId: string): Promise<string | null> {
  try {
    const node = document.getElementById(elementId);
    if (!node) return null;
    const dataUrl = await toPng(node, { quality: 0.95 });
    return dataUrl;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}
