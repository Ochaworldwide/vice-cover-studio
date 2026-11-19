// Vice Panels rendering engine: multi-panel poster layouts with angled white dividers,
// canvas colour grades, and bold condensed poster lettering. Everything is drawn with
// plain Canvas 2D — no libraries, no fonts to load, no network.

/** Export sizes, in pixels. */
export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  landscape: { w: 1920, h: 1080, label: 'Landscape 1920 × 1080' },
};

/**
 * Layout presets. Each returns panel polygons in unit space (0..1 on both axes);
 * neighbouring panels share an edge, and the white divider is stroked over the seams.
 */
export const LAYOUTS = {
  hero: {
    label: 'Hero + Stack',
    panels: () => [
      [[0, 0], [0.6, 0], [0.5, 1], [0, 1]],
      [[0.6, 0], [1, 0], [1, 0.52], [0.548, 0.52]],
      [[0.548, 0.52], [1, 0.52], [1, 1], [0.5, 1]],
    ],
  },
  strips: {
    label: 'Vice Strips',
    panels: () => [
      [[0, 0], [0.28, 0], [0.22, 1], [0, 1]],
      [[0.28, 0], [0.53, 0], [0.47, 1], [0.22, 1]],
      [[0.53, 0], [0.78, 0], [0.72, 1], [0.47, 1]],
      [[0.78, 0], [1, 0], [1, 1], [0.72, 1]],
    ],
  },
  grid: {
    label: 'Grid Collage',
    panels: () => [
      [[0, 0], [0.52, 0], [0.5, 0.5], [0, 0.5]],
      [[0.52, 0], [1, 0], [1, 0.5], [0.5, 0.5]],
      [[0, 0.5], [0.5, 0.5], [0.48, 1], [0, 1]],
      [[0.5, 0.5], [1, 0.5], [1, 1], [0.48, 1]],
    ],
  },
  slash: {
    label: 'Diagonal Slash',
    panels: () => [
      [[0, 0], [1, 0], [1, 0.3], [0, 0.52]],
      [[0, 0.52], [1, 0.3], [1, 0.62], [0, 0.84]],
      [[0, 0.84], [1, 0.62], [1, 1], [0, 1]],
    ],
  },
};

/** Colour grades: a canvas filter for the photo plus overlay washes painted inside each panel. */
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.32) contrast(1.06) brightness(1.03)',
    washes: [
      [0, 'rgba(255, 64, 150, 0.20)'],
      [0.45, 'rgba(255, 90, 120, 0.02)'],
      [1, 'rgba(255, 116, 32, 0.42)'],
    ],
    sky: '#3a1140',
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.5) contrast(1.14) brightness(0.99)',
    washes: [
      [0, 'rgba(0, 229, 255, 0.22)'],
      [0.5, 'rgba(20, 0, 60, 0.05)'],
      [1, 'rgba(255, 43, 179, 0.40)'],
    ],
    sky: '#081a33',
  },
  golden: {
    label: 'Golden Hour',
    filter: 'saturate(1.18) sepia(0.32) contrast(1.05) brightness(1.06)',
    washes: [
      [0, 'rgba(255, 196, 64, 0.16)'],
      [0.55, 'rgba(255, 140, 40, 0.03)'],
      [1, 'rgba(146, 58, 16, 0.38)'],
    ],
    sky: '#40260d',
  },
  chrome: {
    label: 'Midnight Chrome',
    filter: 'saturate(0.72) contrast(1.18) brightness(0.97)',
    washes: [
      [0, 'rgba(148, 197, 255, 0.20)'],
      [0.5, 'rgba(10, 16, 40, 0.06)'],
      [1, 'rgba(2, 6, 24, 0.52)'],
    ],
    sky: '#0a1024',
  },
};

/** Lettering colour styles for the main caption. */
export const LETTER_STYLES = {
  vice: {
    label: 'Vice Pink',
    stops: [[0, '#ffffff'], [0.55, '#ffd9ef'], [1, '#ff5da2']],
    stroke: '#23082f',
    glow: 'rgba(255, 45, 150, 0.55)',
  },
  chrome: {
    label: 'Chrome Gold',
    stops: [[0, '#fffbe8'], [0.35, '#ffe9a3'], [0.62, '#d99a16'], [0.85, '#fff3c4'], [1, '#b97e0e']],
    stroke: '#241503',
    glow: 'rgba(255, 190, 40, 0.45)',
  },
  neon: {
    label: 'Neon Ice',
    stops: [[0, '#ffffff'], [0.5, '#c9fbff'], [1, '#39d5f0']],
    stroke: '#04222e',
    glow: 'rgba(0, 229, 255, 0.65)',
  },
};

const POSTER_FONT = '"Arial Narrow", "Liberation Sans Narrow", Impact, "Franklin Gothic Medium", sans-serif';

function tracePolygon(ctx, poly, w, h) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * w, y * h);
    else ctx.lineTo(x * w, y * h);
  });
  ctx.closePath();
}

/** Point-in-polygon hit test, in unit space. */
export function panelAt(layoutKey, ux, uy) {
  const polys = LAYOUTS[layoutKey].panels();
  for (let i = polys.length - 1; i >= 0; i--) {
    const poly = polys[i];
    let inside = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [ax, ay] = poly[a];
      const [bx, by] = poly[b];
      if ((ay > uy) !== (by > uy) && ux < ((bx - ax) * (uy - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}

function drawPanelPhoto(ctx, poly, w, h, slot, grade) {
  tracePolygon(ctx, poly, w, h);
  ctx.save();
  ctx.clip();
  const xs = poly.map((p) => p[0] * w);
  const ys = poly.map((p) => p[1] * h);
  const bx = Math.min(...xs);
  const by = Math.min(...ys);
  const bw = Math.max(...xs) - bx;
  const bh = Math.max(...ys) - by;
  const img = slot && slot.img;
  if (img) {
    const zoom = slot.zoom || 1;
    const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const cx = bx + bw / 2 + (slot.ox || 0) * bw * 0.35;
    let cy = by + bh / 2 + (slot.oy || 0) * bh * 0.35;
    // A wide, short panel along the top centre-crops a portrait or square photo onto its
    // middle (all torsos, no faces), so until the user drags it, anchor that photo near
    // its top. Wide panels lower down keep the centre crop, which frames them better.
    if (!slot.oy && by === 0 && bw > bh * 1.7) cy = by - ph * 0.08 + ph / 2;
    try { ctx.filter = grade.filter; } catch { /* older engines ignore filters */ }
    ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
    try { ctx.filter = 'none'; } catch { /* ignore */ }
  } else {
    const fill = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    fill.addColorStop(0, '#4b2158');
    fill.addColorStop(1, '#170a2a');
    ctx.fillStyle = fill;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = `700 ${Math.max(14, bw * 0.07)}px ${POSTER_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', bx + bw / 2, by + bh / 2);
  }
  // Grade wash, a vignette and a top sheen, all clipped to the panel.
  const wash = ctx.createLinearGradient(0, by, 0, by + bh);
  for (const [at, colour] of grade.washes) wash.addColorStop(at, colour);
  ctx.fillStyle = wash;
  ctx.fillRect(bx, by, bw, bh);
  const sheen = ctx.createLinearGradient(0, by, 0, by + bh * 0.4);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(bx, by, bw, bh);
  const vig = ctx.createRadialGradient(
    bx + bw / 2, by + bh / 2, Math.min(bw, bh) * 0.35,
    bx + bw / 2, by + bh / 2, Math.max(bw, bh) * 0.85,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();
}

function splitLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [text];
  let best = [text];
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const widest = Math.max(ctx.measureText(lines[0]).width, ctx.measureText(lines[1]).width);
    if (widest <= maxWidth) { best = lines; break; }
  }
  return best;
}

function drawLettering(ctx, w, h, state) {
  const caption = (state.caption || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const style = LETTER_STYLES[state.letterStyle] || LETTER_STYLES.vice;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // A scrim so the lettering reads over any photo.
  const scrimH = h * (subtitle ? 0.38 : 0.26);
  const scrim = ctx.createLinearGradient(0, h - scrimH, 0, h);
  scrim.addColorStop(0, 'rgba(8, 2, 18, 0)');
  scrim.addColorStop(1, 'rgba(8, 2, 18, 0.62)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h - scrimH, w, scrimH);

  let baseline = h - h * 0.045;
  if (caption) {
    let size = h * 0.115;
    ctx.font = `900 ${size}px ${POSTER_FONT}`;
    try { ctx.letterSpacing = `${size * 0.02}px`; } catch { /* ignore */ }
    let lines = splitLines(ctx, caption, w * 0.92);
    const widest = () => Math.max(...lines.map((l) => ctx.measureText(l).width));
    while (widest() > w * 0.92 && size > 16) {
      size *= 0.94;
      ctx.font = `900 ${size}px ${POSTER_FONT}`;
      lines = splitLines(ctx, caption, w * 0.92);
    }
    const lineHeight = size * 0.98;
    const top = baseline - lineHeight * (lines.length - 1);
    lines.forEach((line, i) => {
      const y = top + i * lineHeight;
      const grad = ctx.createLinearGradient(0, y - size, 0, y);
      for (const [at, colour] of style.stops) grad.addColorStop(at, colour);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = size * 0.17;
      ctx.shadowColor = style.glow;
      ctx.shadowBlur = size * 0.32;
      ctx.shadowOffsetY = size * 0.05;
      ctx.strokeText(line, w / 2, y);
      ctx.shadowBlur = 0;
      ctx.fillStyle = grad;
      ctx.fillText(line, w / 2, y);
    });
    // The subtitle sits clear above the caption's cap height, never across its glyphs.
    baseline = top - size * 1.02;
  }
  if (subtitle) {
    let size = h * 0.030;
    const spacedWidth = () => ctx.measureText(subtitle).width + size * 0.55 * Math.max(0, subtitle.length - 1);
    ctx.font = `700 ${size}px ${POSTER_FONT}`;
    while (spacedWidth() > w * 0.9 && size > 10) {
      size *= 0.93;
      ctx.font = `700 ${size}px ${POSTER_FONT}`;
    }
    try { ctx.letterSpacing = `${size * 0.55}px`; } catch { /* ignore */ }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10, 2, 20, 0.9)';
    ctx.lineWidth = size * 0.22;
    ctx.strokeText(subtitle, w / 2, baseline);
    ctx.fillStyle = '#ffe9f6';
    ctx.fillText(subtitle, w / 2, baseline);
    // Flanking rules beside the subtitle.
    const tw = ctx.measureText(subtitle).width + size * 0.55 * subtitle.length;
    ctx.strokeStyle = 'rgba(255, 233, 246, 0.85)';
    ctx.lineWidth = Math.max(2, size * 0.09);
    const y = baseline - size * 0.35;
    const gap = size * 0.7;
    ctx.beginPath();
    ctx.moveTo(Math.max(w * 0.04, w / 2 - tw / 2 - gap - w * 0.09), y);
    ctx.lineTo(w / 2 - tw / 2 - gap, y);
    ctx.moveTo(w / 2 + tw / 2 + gap, y);
    ctx.lineTo(Math.min(w * 0.96, w / 2 + tw / 2 + gap + w * 0.09), y);
    ctx.stroke();
  }
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }

  // Masthead tag, top centre: the studio's own mark, drawn fresh — no borrowed logos.
  const tag = 'VICE PANELS';
  const tSize = h * 0.026;
  ctx.font = `800 ${tSize}px ${POSTER_FONT}`;
  try { ctx.letterSpacing = `${tSize * 0.4}px`; } catch { /* ignore */ }
  const tw = ctx.measureText(tag).width + tSize * 0.4 * tag.length;
  const padX = tSize * 0.9;
  const tagW = tw + padX * 2;
  const tagH = tSize * 1.9;
  const tagX = w / 2 - tagW / 2;
  const tagY = h * 0.028;
  ctx.fillStyle = 'rgba(10, 2, 20, 0.72)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(2, h * 0.0022);
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, tagH / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, w / 2, tagY + tagH / 2 + tSize * 0.05);
  ctx.textBaseline = 'alphabetic';
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
}

/**
 * Draws the whole cover described by `state` onto `canvas`.
 * state: { layout, grade, caption, subtitle, letterStyle, panels: [{img, zoom, ox, oy}], selected }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.fillStyle = grade.sky;
  ctx.fillRect(0, 0, w, h);
  const polys = LAYOUTS[state.layout].panels();
  polys.forEach((poly, i) => drawPanelPhoto(ctx, poly, w, h, state.panels[i], grade));

  // Angled white dividers over the seams, then a fine dark keyline inside each panel.
  const divider = Math.max(5, w * 0.0075);
  for (const poly of polys) {
    tracePolygon(ctx, poly, w, h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = divider;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  for (const poly of polys) {
    tracePolygon(ctx, poly, w, h);
    ctx.strokeStyle = 'rgba(10, 2, 20, 0.20)';
    ctx.lineWidth = Math.max(1.5, divider * 0.18);
    ctx.stroke();
  }
  // Outer frame.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = divider * 1.15;
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);

  // Selection ring in the editor (never on a clean cover render).
  if (state.showSelection && state.selected >= 0 && polys[state.selected]) {
    tracePolygon(ctx, polys[state.selected], w, h);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.setLineDash([18, 12]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawLettering(ctx, w, h, state);
}
