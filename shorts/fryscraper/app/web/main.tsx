// Phone website: watch the short live (three.js in the browser, Remotion Player) and render it to an MP4 on the
// phone itself (Remotion web renderer: WebCodecs encode, nothing leaves the device).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player, PlayerRef } from "@remotion/player";
import { renderMediaOnWeb, getEncodableVideoCodecs } from "@remotion/web-renderer";
(globalThis as { FRY_BASE?: string }).FRY_BASE = new URL("./", location.href).href;
import { FryShort, FRY_FRAMES } from "../src/fry/Fry";
import "./style.css";

const FPS = 30;
type Quality = { label: string; scale: number; note: string };
const QUALITIES: Quality[] = [
  { label: "540p", scale: 0.5, note: "fastest" },
  { label: "720p", scale: 2 / 3, note: "balanced" },
  { label: "1080p", scale: 1, note: "full HD, slow" },
];
/** the best format this browser can encode: MP4/H.264 (iPhone, Android, desktop Chrome), else WebM/VP9 or VP8 */
const pickFormat = async (): Promise<{ container: "mp4" | "webm"; videoCodec: "h264" | "vp9" | "vp8"; ext: string } | null> => {
  try {
    const mp4 = await getEncodableVideoCodecs("mp4");
    if (mp4.includes("h264")) return { container: "mp4", videoCodec: "h264", ext: "mp4" };
    const webm = await getEncodableVideoCodecs("webm");
    if (webm.includes("vp9")) return { container: "webm", videoCodec: "vp9", ext: "webm" };
    if (webm.includes("vp8")) return { container: "webm", videoCodec: "vp8", ext: "webm" };
  } catch { /* no WebCodecs */ }
  return null;
};
const COMP = { id: "FryShort", component: FryShort, durationInFrames: FRY_FRAMES, fps: 30, width: 1080, height: 1920 };
/** test hook (Playwright): render a frame range, return the file size */
(window as unknown as { __fryTest?: unknown }).__fryTest = async (from: number, to: number, scale: number) => {
  const fmt = await pickFormat();
  if (!fmt) return "no encoder";
  const t0 = performance.now();
  const res = await renderMediaOnWeb({ composition: COMP, ...fmt, scale, licenseKey: "free-license", delayRenderTimeoutInMilliseconds: 900000, frameRange: [from, to], videoBitrate: "high" } as never);
  const blob = await res.getBlob();
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return { fmt, bytes: blob.size, ms: Math.round(performance.now() - t0), b64: btoa(bin) };
};
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const App: React.FC = () => {
  const player = useRef<PlayerRef>(null);
  const [q, setQ] = useState(1);
  const [state, setState] = useState<"idle" | "check" | "render" | "done" | "error">("idle");
  const [prog, setProg] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [ext, setExt] = useState("mp4");
  const blobRef = useRef<Blob | null>(null);
  const [saveMsg, setSaveMsg] = useState("");
  /** inside claude.ai the page offers the file through the viewer (downloads capability); elsewhere a plain link works */
  const [dl, setDl] = useState<null | { save: (r: { filename: string; data: Blob }) => Promise<{ status: string }> }>(null);
  useEffect(() => {
    const c = (window as unknown as { claude?: { use: (n: string) => Promise<unknown> } }).claude;
    c?.use("downloads").then((d) => setDl(d as never)).catch(() => {});
  }, []);
  const save = async () => {
    if (!dl || !blobRef.current) return;
    setSaveMsg("");
    try { const r = await dl.save({ filename: `skyscraper-cooked-a-car.${ext}`, data: blobRef.current }); setSaveMsg(r.status === "saved" ? "Saved to your device." : "Sent."); }
    catch (e) { const code = (e as { code?: string }).code; setSaveMsg(code === "declined" ? "Not saved." : code === "rate_limited" ? "A save prompt is already open." : "Saving isn't available here. Open the page in a browser to save it."); }
  };
  const abort = useRef<AbortController | null>(null);
  const started = useRef(0);
  const comp = useMemo(() => ({ id: "FryShort", component: FryShort, durationInFrames: FRY_FRAMES, fps: FPS, width: 1080, height: 1920 }), []);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const render = async () => {
    player.current?.pause();
    setState("check"); setMsg(""); setProg(0); setEta(null);
    try {
      const scale = QUALITIES[q].scale;
      const f = await pickFormat();
      if (!f) { setState("error"); setMsg("This browser can't encode video (no WebCodecs). Try Chrome on Android or Safari 17+ on iPhone."); return; }
      setExt(f.ext);
      abort.current = new AbortController();
      started.current = performance.now();
      setState("render");
      const res = await renderMediaOnWeb({
        composition: comp, container: f.container, videoCodec: f.videoCodec, scale, licenseKey: "free-license", delayRenderTimeoutInMilliseconds: 900000,
        signal: abort.current.signal, videoBitrate: "high",
        onProgress: (p: { progress: number }) => {
          setProg(p.progress);
          const el = (performance.now() - started.current) / 1000;
          if (p.progress > 0.02) setEta((el / p.progress) * (1 - p.progress));
        },
      } as never);
      const blob = await res.getBlob();
      blobRef.current = blob;
      setUrl(URL.createObjectURL(blob));
      setState("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") { setState("idle"); return; }
      setState("error"); setMsg(String((e as Error).message ?? e));
    }
  };

  return (
    <main>
      <header>
        <h1>The Skyscraper That Cooked a Car</h1>
        <p className="sub">A 63-second cartoon short about the London tower that melted a car in 2013. Press play to watch it live in 3D, or render it to a video file on this phone.</p>
      </header>
      <section className="stage">
        <Player ref={player} component={FryShort} durationInFrames={FRY_FRAMES} fps={FPS} compositionWidth={1080} compositionHeight={1920}
          controls style={{ width: "100%", aspectRatio: "9 / 16" }} acknowledgeRemotionLicense
          renderLoading={() => <div className="loading">Building London…</div>} />
      </section>
      <section className="card">
        <h2>Render the MP4 on this phone</h2>
        <div className="seg" role="radiogroup" aria-label="Quality">
          {QUALITIES.map((x, i) => (
            <button key={x.label} role="radio" aria-checked={q === i} className={q === i ? "on" : ""} disabled={state === "render" || state === "check"} onClick={() => setQ(i)}>
              <b>{x.label}</b><span>{x.note}</span>
            </button>
          ))}
        </div>
        {state !== "render" && state !== "check" && <button className="go" onClick={render}>{state === "done" ? "Render again" : "Render video"}</button>}
        {(state === "render" || state === "check") && (
          <div className="prog">
            <div className="bar"><i style={{ width: `${(prog * 100).toFixed(1)}%` }} /></div>
            <div className="row"><span>{state === "check" ? "Checking your browser…" : `${(prog * 100).toFixed(0)}% · frame ${Math.round(prog * FRY_FRAMES)} of ${FRY_FRAMES}`}</span>
              <span>{eta !== null ? `~${fmt(eta)} left` : ""}</span></div>
            <p className="hint">Keep this tab open and the screen on while it renders.</p>
            <button className="ghost" onClick={() => abort.current?.abort()}>Cancel</button>
          </div>
        )}
        {state === "done" && url && (
          <div className="done">
            <video src={url} controls playsInline />
            {dl ? <button className="go" onClick={save}>Save {ext.toUpperCase()} to this phone</button>
              : <a className="go" href={url} download={`skyscraper-cooked-a-car.${ext}`}>Save {ext.toUpperCase()}</a>}
            {saveMsg && <p className="hint">{saveMsg}</p>}
          </div>
        )}
        {state === "error" && <p className="err">{msg}</p>}
      </section>
      <footer>Made with three.js and Remotion. Story, characters and voice are original.</footer>
    </main>
  );
};
createRoot(document.getElementById("root")!).render(<App />);
