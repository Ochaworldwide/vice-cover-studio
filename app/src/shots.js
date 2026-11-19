// Fixed scenes for screenshots, driven by the URL query:
//   ?shot=cover&size=landscape&photo=pier&caption=Vice%20Heat&layout=hero&grade=sunset
//     renders ONLY the finished cover, filling the window exactly.
//   ?shot=editor&photo=boulevard&caption=... shows the editor with photos loaded.
// Extra knobs: photos=pier,boulevard,pier assigns a sample per panel, subtitle=...,
// letter=vice|chrome|neon picks the lettering style. window.__shotReady is set once
// the scene has loaded its photos and painted twice.

const SAMPLE_NAMES = ['pier', 'boulevard'];

/** Parses the current URL query into a shot config, or returns null when there is no ?shot=. */
export function parseShotQuery() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('shot');
  if (!mode) return null;
  const photo = q.get('photo') ?? 'pier';
  const photosParam = q.get('photos');
  const photos = photosParam
    ? photosParam.split(',').map((s) => s.trim()).filter((s) => SAMPLE_NAMES.includes(s))
    : [photo];
  return {
    mode,
    size: q.get('size') ?? 'square',
    layout: q.get('layout') ?? 'hero',
    grade: q.get('grade') ?? 'sunset',
    letterStyle: q.get('letter') ?? 'vice',
    caption: q.get('caption') ?? 'Vice Heat',
    subtitle: q.get('subtitle') ?? 'One night in the neon city',
    photos: photos.length ? photos : ['pier'],
  };
}

/** Sets window.__shotReady after two animation frames, so a screenshot sees the painted cover. */
export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
