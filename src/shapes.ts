// A few built-in shapes so the tool is usable without your own SVG.
const wrap = (d: string, vb = '0 0 100 100') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><path fill="#000" d="${d}"/></svg>`;

export const SHAPES: Record<string, { label: string; svg: string }> = {
  heart: {
    label: 'Corazón',
    svg: wrap('M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C39 8 46 13 50 21 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88 Z'),
  },
  star: {
    label: 'Estrella',
    svg: wrap('M50 5 L61.8 36.6 L95.1 36.6 L68.2 56.4 L78.4 90 L50 70 L21.6 90 L31.8 56.4 L4.9 36.6 L38.2 36.6 Z'),
  },
  paw: {
    label: 'Huella',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="#000">
      <ellipse cx="50" cy="66" rx="24" ry="20"/>
      <ellipse cx="22" cy="40" rx="9" ry="12" transform="rotate(-20 22 40)"/>
      <ellipse cx="40" cy="22" rx="9" ry="12" transform="rotate(-6 40 22)"/>
      <ellipse cx="60" cy="22" rx="9" ry="12" transform="rotate(6 60 22)"/>
      <ellipse cx="78" cy="40" rx="9" ry="12" transform="rotate(20 78 40)"/></g></svg>`,
  },
  bolt: {
    label: 'Rayo',
    svg: wrap('M58 4 L18 56 L44 56 L36 96 L82 38 L54 38 Z'),
  },
  ring: {
    label: 'Donut (prueba huecos)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#111"/><circle cx="50" cy="50" r="18" fill="#fff"/></svg>`,
  },
};
