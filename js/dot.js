// ============================================================================
// Tipografia em matriz de pontos (inspirada no Ndot do Nothing OS).
// Cada glifo é um bitmap 5x7 descrito em binário; o texto vira um <svg> de
// círculos, opcionalmente com a grade apagada visível ao fundo.
// ============================================================================

const G = {
  '0': '01110/10001/10011/10101/11001/10001/01110',
  '1': '00100/01100/00100/00100/00100/00100/01110',
  '2': '01110/10001/00001/00010/00100/01000/11111',
  '3': '11111/00010/00100/00010/00001/10001/01110',
  '4': '00010/00110/01010/10010/11111/00010/00010',
  '5': '11111/10000/11110/00001/00001/10001/01110',
  '6': '00110/01000/10000/11110/10001/10001/01110',
  '7': '11111/00001/00010/00100/01000/01000/01000',
  '8': '01110/10001/10001/01110/10001/10001/01110',
  '9': '01110/10001/10001/01111/00001/00010/01100',
  A: '01110/10001/10001/11111/10001/10001/10001',
  B: '11110/10001/10001/11110/10001/10001/11110',
  C: '01110/10001/10000/10000/10000/10001/01110',
  D: '11100/10010/10001/10001/10001/10010/11100',
  E: '11111/10000/10000/11110/10000/10000/11111',
  F: '11111/10000/10000/11110/10000/10000/10000',
  G: '01110/10001/10000/10111/10001/10001/01111',
  H: '10001/10001/10001/11111/10001/10001/10001',
  I: '01110/00100/00100/00100/00100/00100/01110',
  J: '00111/00010/00010/00010/00010/10010/01100',
  K: '10001/10010/10100/11000/10100/10010/10001',
  L: '10000/10000/10000/10000/10000/10000/11111',
  M: '10001/11011/10101/10101/10001/10001/10001',
  N: '10001/11001/11001/10101/10011/10011/10001',
  O: '01110/10001/10001/10001/10001/10001/01110',
  P: '11110/10001/10001/11110/10000/10000/10000',
  Q: '01110/10001/10001/10001/10101/10010/01101',
  R: '11110/10001/10001/11110/10100/10010/10001',
  S: '01111/10000/10000/01110/00001/00001/11110',
  T: '11111/00100/00100/00100/00100/00100/00100',
  U: '10001/10001/10001/10001/10001/10001/01110',
  V: '10001/10001/10001/10001/10001/01010/00100',
  W: '10001/10001/10001/10101/10101/10101/01010',
  X: '10001/10001/01010/00100/01010/10001/10001',
  Y: '10001/10001/01010/00100/00100/00100/00100',
  Z: '11111/00001/00010/00100/01000/10000/11111',
  ':': '0/0/1/0/1/0/0',
  '.': '0/0/0/0/0/0/1',
  ',': '0/0/0/0/0/1/1',
  '-': '000/000/000/111/000/000/000',
  '+': '000/000/010/111/010/000/000',
  '/': '00001/00010/00010/00100/01000/01000/10000',
  '%': '10001/00010/00010/00100/01000/01000/10001',
  '?': '01110/10001/00001/00010/00100/00000/00100',
  '!': '1/1/1/1/1/0/1',
  '(': '01/10/10/10/10/10/01',
  ')': '10/01/01/01/01/01/10',
  '·': '0/0/0/1/0/0/0',
  '×': '000/000/101/010/101/000/000',
  '°': '110/101/110/000/000/000/000',
  ' ': '000/000/000/000/000/000/000',
};

const ROWS = 7;

// Sem acentos e em maiúsculas — a matriz 5x7 não comporta diacríticos
const norm = s => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Gera o SVG de um texto em matriz de pontos.
 * @param {string} text
 * @param {object} o
 * @param {number} o.h      altura desejada em px (padrão 28)
 * @param {boolean} o.ghost desenha a grade apagada atrás (visual "display")
 * @param {string} o.color  cor dos pontos acesos (padrão currentColor)
 * @param {string} o.cls    classes extras no <svg>
 */
export function dotSvg(text, o = {}) {
  const { h = 28, ghost = false, color = 'currentColor', cls = '', gap = 0.55, space = 1.6 } = o;
  const d = 1;                       // diâmetro do ponto na escala interna
  const pitch = d + gap;
  const on = [], off = [];
  let x = 0;

  for (const ch of norm(text)) {
    const g = G[ch] || G[' '];
    const rows = g.split('/');
    const w = rows[0].length;
    rows.forEach((row, r) => {
      [...row].forEach((bit, c) => {
        const cx = +(x + c * pitch + d / 2).toFixed(3);
        const cy = +(r * pitch + d / 2).toFixed(3);
        (bit === '1' ? on : off).push(`<circle cx="${cx}" cy="${cy}" r="${d / 2}"/>`);
      });
    });
    x += w * pitch + space;
  }

  const vw = Math.max(d, x - space);
  const vh = ROWS * pitch - gap;
  const scale = h / vh;
  const w = Math.max(1, Math.round(vw * scale));
  return `<svg class="dots ${cls}" width="${w}" height="${Math.round(h)}" viewBox="0 0 ${vw.toFixed(3)} ${vh.toFixed(3)}" fill="${color}" aria-label="${norm(text)}" role="img">`
    + (ghost ? `<g opacity=".13">${off.join('')}</g>` : '')
    + `<g>${on.join('')}</g></svg>`;
}

/** Largura aproximada (px) que dotSvg vai ocupar — útil para layout. */
export function dotWidth(text, h = 28) {
  const gap = 0.55, space = 1.6, d = 1, pitch = d + gap;
  let x = 0;
  for (const ch of norm(text)) {
    const g = G[ch] || G[' '];
    x += g.split('/')[0].length * pitch + space;
  }
  return Math.round(Math.max(d, x - space) * (h / (ROWS * pitch - gap)));
}
