// Phone website: watch the short live (three.js in the browser, Remotion Player) and render it to an MP4 on the
// phone itself (Remotion web renderer: WebCodecs encode, nothing leaves the device).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player, PlayerRef } from "@remotion/player";
import { renderMediaOnWeb, canRenderMediaOnWeb } from "@remotion/web-renderer";
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
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const App: React.FC = () => {
  const player = useRef<PlayerRef>(null);
  const [q, setQ] = useState(1);
  const [state, setState] = useState<"idle" | "check" | "render" | "done" | "error">("idle");
  const [prog, setProg] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const started = useRef(0);
  const comp = useMemo(() => ({ id: "FryShort", component: FryShort, durationInFrames: FRY_FRAMES, fps: FPS, width: 1080, height: 1920 }), []);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const render = async () => {
    player.current?.pause();
    setState("check"); setMsg(""); setProg(0); setEta(null);
    try {
      const scale = QUALITIES[q].scale;
      const can = await canRenderMediaOnWeb({ width: Math.round(1080 * scale), height: Math.round(1920 * scale), container: "mp4", videoCodec: "h264" } as never);
      if (!can.canRender) {
        setState("error"); setMsg(can.issues.map((i) => i.message).join(" ") || "This browser can't encode video. Try Chrome or Safari 17+.");
        return;
      }
      abort.current = new AbortController();
      started.current = performance.now();
      setState("render");
      const res = await renderMediaOnWeb({
        composition: comp, container: "mp4", videoCodec: "h264", scale, licenseKey: "free-license",
        signal: abort.current.signal, videoBitrate: "high",
        onProgress: (p: { progress: number }) => {
          setProg(p.progress);
          const el = (performance.now() - started.current) / 1000;
          if (p.progress > 0.02) setEta((el / p.progress) * (1 - p.progress));
        },
      } as never);
      const blob = await res.getBlob();
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
        <p className="sub">A 63-second cartoon short. It plays live in your browser and renders to a video on your phone.</p>
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
            <a className="go" href={url} download="skyscraper-cooked-a-car.mp4">Save MP4</a>
          </div>
        )}
        {state === "error" && <p className="err">{msg}</p>}
      </section>
      <footer>Made with three.js and Remotion. Story, characters and voice are original.</footer>
    </main>
  );
};
createRoot(document.getElementById("root")!).render(<App />);
