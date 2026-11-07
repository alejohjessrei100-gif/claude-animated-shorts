// One-word captions (user request 2026-11-07, matching their reference): heavy white sans with a thick black outline,
// centred a little below the middle of the frame, hard swap on every word onset (from the voice's words.json).
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import WORDS from "./words.json";

const FAMILY = "MontserratCap";
let fontP: Promise<void> | null = null;
const loadFont = () => {
  if (!fontP) {
    const ff = new FontFace(FAMILY, `url(${staticFile("fonts/montserrat-latin-800-normal.woff2")}) format("woff2")`, { weight: "800" });
    fontP = ff.load().then((f) => { document.fonts.add(f); });
  }
  return fontP;
};

type W = { word: string; start: number; end: number };
const LIST = (WORDS as W[]).map((w) => ({ ...w, text: w.word.replace(/[.,!?;:"]+$/g, "").replace(/^["]+/, "") }));
/** the word on screen at time t: from 1 frame before its onset until the next word's (last word holds to the end) */
const wordAt = (t: number, lead: number) => {
  let cur: (typeof LIST)[number] | null = null;
  for (const w of LIST) { if (t >= w.start - lead) cur = w; else break; }
  return cur;
};

export const Captions: React.FC = () => {
  const f = useCurrentFrame(), { fps, width } = useVideoConfig();
  const [handle] = useState(() => delayRender("caption font"));
  const [ready, setReady] = useState(false);
  useEffect(() => { loadFont().then(() => { setReady(true); continueRender(handle); }); }, [handle]);
  if (!ready) return null;
  const w = wordAt(f / fps, 1 / fps);
  if (!w) return null;
  const k = width / 1080; // every size is specified at 1080 wide
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div style={{
        position: "absolute", top: `${0.655 * 100}%`, width: "100%", textAlign: "center",
        fontFamily: FAMILY, fontWeight: 800, fontSize: 112 * k, lineHeight: 1, letterSpacing: -1 * k, color: "#ffffff",
        WebkitTextStroke: `${17 * k}px #000000`, paintOrder: "stroke fill",
        textShadow: `0 ${5 * k}px ${4 * k}px rgba(0,0,0,0.45)`,
        transform: "translateY(-50%)",
      }}>{w.text}</div>
    </AbsoluteFill>
  );
};
