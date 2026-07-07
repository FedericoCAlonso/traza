/**
 * Extrae el contenido interno limpio de un string SVG.
 * Elimina metadatos, defs, estilos inline, y elementos de Inkscape/Sodipodi.
 */
export function parseSvgFileContent(content: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'image/svg+xml');
    const svgNode = doc.querySelector('svg');
    if (svgNode) {
      const removeSelectors = [
        'metadata', 'defs', 'title', 'desc', 'style',
        '[id^="sodipodi"]', '[id^="inkscape"]'
      ];
      removeSelectors.forEach(sel => {
        svgNode.querySelectorAll(sel).forEach(el => el.remove());
      });
      return svgNode.innerHTML;
    }
  } catch {
    // fallback regex
    const match = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    if (match) return match[1];
  }
  return content;
}
