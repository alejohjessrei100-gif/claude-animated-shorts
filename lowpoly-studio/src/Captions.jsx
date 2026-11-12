// Captions are drawn at the low render resolution with antialiasing thresholded away, then scaled up like the picture.
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import '@fontsource/vt323';
import '@fontsource/archivo-black';

const YELLOW = [255, 214, 40];
const WHITE = [255, 255, 255];

const fonts = () => Promise.all([document.fonts.load('16px "VT323"'), document.fonts.load('21px "Archivo Black"')]);

function wrap(g, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function spec(c, W, H, k) {
  if (c.kind === 'word') return {font: `${Math.round(21 * k)}px "Archivo Black"`, top: (c.y === 'high' ? 0.13 : 0.72) * H, step: 24 * k, radius: 2, strike: 0};
  if (c.kind === 'title') return {font: `${Math.round(24 * k)}px "VT323"`, top: 0.11 * H, step: 22 * k, radius: 1, strike: 0};
  return {font: `${Math.round(16 * k)}px "VT323"`, top: 0.19 * H, step: 14 * k, radius: 1, strike: 0};
}

function paint(canvas, captions, W, H) {
  const g = canvas.getContext('2d', {willReadFrequently: true});
  g.clearRect(0, 0, W, H);
  if (!captions.length) return;
  const k = Math.min(W, H) / 270;
  const out = g.createImageData(W, H);
  for (const c of captions) {
    const {font, top, step, radius, strike} = spec(c, W, H, k);
    g.clearRect(0, 0, W, H);
    g.font = font;
    g.textBaseline = 'top';
    g.fillStyle = '#fff';
    wrap(g, c.text, W - 24).forEach((line, n) => {
      const x = Math.round((W - g.measureText(line).width) / 2);
      for (let dx = 0; dx <= strike; dx++) g.fillText(line, x + dx, Math.round(top + n * step));
    });
    const a = g.getImageData(0, 0, W, H).data;
    const solid = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) solid[i] = a[i * 4 + 3] > 96 ? 1 : 0;
    const colour = c.hi ? YELLOW : WHITE;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = (y * W + x) * 4;
        if (solid[y * W + x]) {
          out.data.set([...colour, 255], p);
          continue;
        }
        let edge = false;
        for (let dy = -radius; dy <= radius && !edge; dy++) {
          for (let dx = -radius; dx <= radius && !edge; dx++) {
            const X = x + dx;
            const Y = y + dy;
            if (X >= 0 && Y >= 0 && X < W && Y < H && solid[Y * W + X]) edge = true;
          }
        }
        if (edge && !out.data[p + 3]) out.data.set([0, 0, 0, 255], p);
      }
    }
  }
  g.putImageData(out, 0, 0);
}

export const Captions = ({timeline, frame}) => {
  const canvas = useRef(null);
  const [handle] = useState(() => delayRender('Loading caption fonts'));
  const [ready, setReady] = useState(false);
  const {width: W, height: H} = timeline;

  useEffect(() => {
    fonts().then(() => setReady(true));
  }, []);

  useLayoutEffect(() => {
    if (ready) paint(canvas.current, timeline.captions.filter((c) => frame >= c.from && frame < c.to), W, H);
  }, [ready, frame, timeline, W, H]);

  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);

  return <canvas ref={canvas} width={W} height={H} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated'}} />;
};
