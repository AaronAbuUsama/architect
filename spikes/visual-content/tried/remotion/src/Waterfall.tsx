import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from "remotion";

const SPANS = [
  { name: "allowance.spend", start: 0, end: 1, color: "#6ea8fe", depth: 0 },
  { name: "allowance.spend.load", start: 0.08, end: 0.3, color: "#b48cf2", depth: 1 },
  { name: "allowance.spend.record", start: 0.34, end: 0.8, color: "#b48cf2", depth: 1 },
  { name: "BATCH (commit)", start: 0.84, end: 0.97, color: "#4fd1c5", depth: 1 },
];

export const Waterfall = () => {
  const frame = useCurrentFrame();
  const cursor = interpolate(frame, [10, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: "#0f1117", fontFamily: "ui-monospace, monospace", color: "#e6e8ee", padding: 40 }}>
      <div style={{ fontSize: 22, fontFamily: "system-ui", fontWeight: 600, marginBottom: 30 }}>allowance.spend</div>
      {SPANS.map((s) => {
        const w = Math.max(0, Math.min(cursor, s.end) - s.start);
        return (
          <div key={s.name} style={{ display: "flex", alignItems: "center", height: 44 }}>
            <div style={{ width: 260, paddingLeft: s.depth * 18, fontSize: 14, opacity: cursor >= s.start ? 1 : 0.3 }}>{s.name}</div>
            <div style={{ position: "relative", flex: 1, height: 14 }}>
              <div style={{ position: "absolute", left: `${s.start * 100}%`, width: `${w * 100}%`, height: 14, borderRadius: 3, background: s.color }} />
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 300 + cursor * 620, top: 90, bottom: 60, width: 1.5, background: "#8b93a7" }} />
    </AbsoluteFill>
  );
};
