import { useEffect, useMemo, useRef, useState } from "react";

type Aspect = "9:16" | "1:1" | "16:9";
type Theme = "Cyber" | "Minimal" | "Neon" | "Magazine";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function aspectToSize(aspect: Aspect) {
  // 社媒常用尺寸（可按需调整）
  if (aspect === "9:16") return { w: 1080, h: 1920 };
  if (aspect === "1:1") return { w: 1080, h: 1080 };
  return { w: 1920, h: 1080 };
}

function themeBg(theme: Theme) {
  switch (theme) {
    case "Cyber":
      return { a: "#070A1A", b: "#1B2A6B", c: "#00E5FF" };
    case "Minimal":
      return { a: "#0A0A0A", b: "#1A1A1A", c: "#FFFFFF" };
    case "Neon":
      return { a: "#090018", b: "#2B007A", c: "#FF2BD6" };
    case "Magazine":
      return { a: "#0B0B0B", b: "#222222", c: "#FFDD00" };
  }
}

function drawPoster(params: {
  canvas: HTMLCanvasElement;
  aspect: Aspect;
  theme: Theme;
  title: string;
  subtitle: string;
  footer: string;
  seed: number;
}) {
  const { canvas, aspect, theme, title, subtitle, footer, seed } = params;
  const { w, h } = aspectToSize(aspect);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { a, b, c } = themeBg(theme);

  // 背景渐变
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, a);
  g.addColorStop(0.5, b);
  g.addColorStop(1, "#000000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // “流行感”网格/噪点/霓虹线条（纯 canvas，无依赖）
  ctx.save();
  ctx.globalAlpha = theme === "Minimal" ? 0.08 : 0.14;
  ctx.strokeStyle = "#FFFFFF";
  const step = Math.round(Math.min(w, h) / 18);
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  // 随机光斑
  const rand = mulberry32(seed);
  for (let i = 0; i < 9; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = (0.06 + rand() * 0.12) * Math.min(w, h);
    const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
    gg.addColorStop(0, hexA(c, 0.28));
    gg.addColorStop(1, hexA(c, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, w, h);
  }

  // 主卡片
  const pad = Math.round(Math.min(w, h) * 0.06);
  const cardW = w - pad * 2;
  const cardH = h - pad * 2;
  roundRect(ctx, pad, pad, cardW, cardH, Math.round(pad * 0.6));
  ctx.fillStyle = theme === "Minimal" ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.45)";
  ctx.fill();
  ctx.strokeStyle = theme === "Minimal" ? "rgba(255,255,255,0.14)" : hexA(c, 0.28);
  ctx.lineWidth = Math.max(2, Math.round(pad * 0.06));
  ctx.stroke();

  // 标题排版
  const titleSize = clamp(Math.round(Math.min(w, h) * 0.085), 56, 112);
  const subSize = clamp(Math.round(titleSize * 0.42), 22, 48);
  const footerSize = clamp(Math.round(titleSize * 0.26), 16, 32);
  const left = pad + Math.round(pad * 0.9);
  const top = pad + Math.round(pad * 0.9);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // 主题强调条
  ctx.fillStyle = hexA(c, theme === "Magazine" ? 0.9 : 0.65);
  ctx.fillRect(left, top, Math.round(cardW * 0.28), Math.max(10, Math.round(titleSize * 0.18)));

  // 文字阴影
  ctx.shadowColor = hexA(c, 0.55);
  ctx.shadowBlur = theme === "Minimal" ? 0 : Math.round(titleSize * 0.35);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${titleSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  const titleLines = wrapText(ctx, title || "输入一句话，生成海报", cardW - Math.round(pad * 1.6));
  let y = top + Math.round(titleSize * 0.52);
  for (const line of titleLines.slice(0, 4)) {
    ctx.fillText(line, left, y);
    y += Math.round(titleSize * 1.12);
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.font = `600 ${subSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  const subLines = wrapText(
    ctx,
    subtitle || "赛博/极简/霓虹/杂志风 · 一键导出PNG",
    cardW - Math.round(pad * 1.6)
  );
  y += Math.round(subSize * 0.4);
  for (const line of subLines.slice(0, 3)) {
    ctx.fillText(line, left, y);
    y += Math.round(subSize * 1.35);
  }

  // 页脚信息
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `600 ${footerSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  const foot = footer || "Powered by ESA Pages · EdgePoster";
  ctx.fillText(foot, left, pad + cardH - Math.round(pad * 1.2));

  // 右下角装饰
  const decoW = Math.round(cardW * 0.34);
  const decoH = Math.round(decoW * 0.34);
  ctx.fillStyle = hexA(c, 0.25);
  roundRect(ctx, pad + cardW - decoW - Math.round(pad * 0.9), pad + cardH - decoH - Math.round(pad * 1.8), decoW, decoH, Math.round(decoH * 0.4));
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const chars = [...text];
  const lines: string[] = [];
  let line = "";
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexA(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function downloadPng(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [theme, setTheme] = useState<Theme>("Cyber");
  const [title, setTitle] = useState("边缘海报生成器：一键出图");
  const [subtitle, setSubtitle] = useState("适配社媒比例 · 模板化排版 · PNG导出");
  const [footer, setFooter] = useState("本项目由阿里云ESA提供加速、计算和保护");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));

  const size = useMemo(() => aspectToSize(aspect), [aspect]);

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawPoster({ canvas, aspect, theme, title, subtitle, footer, seed });
  };

  const randomize = () => {
    setSeed(Math.floor(Math.random() * 1e9));
    // 下一帧再画，确保 state 已更新
    requestAnimationFrame(render);
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    render();
    downloadPng(canvas, `EdgePoster_${aspect}_${theme}.png`);
  };

  // 初次渲染与参数变化时重绘（轻量：只画一张）
  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect, theme, title, subtitle, footer, seed]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80">
              <span className="font-semibold text-white">EdgePoster</span>
              <span className="text-white/50">·</span>
              <span>边缘海报生成器</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
              输入一句话，生成热门风格海报并一键导出
            </h1>
            <p className="mt-2 text-white/70">
              内置多风格模板（赛博/极简/霓虹/杂志风），适配 9:16 / 1:1 / 16:9，纯前端即可运行。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={randomize}
              className="rounded-xl bg-white px-4 py-2 font-semibold text-zinc-900 hover:bg-white/90"
            >
              随机风格
            </button>
            <button
              onClick={exportPng}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-semibold text-white hover:bg-white/10"
            >
              导出 PNG
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white/80">海报参数</div>

              <div className="mt-4 grid gap-4">
                <div>
                  <div className="text-xs font-semibold text-white/60">比例</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["9:16", "1:1", "16:9"] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => setAspect(a)}
                        className={[
                          "rounded-xl px-3 py-2 text-sm font-semibold",
                          a === aspect ? "bg-white text-zinc-900" : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                        ].join(" ")}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-white/60">主题</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["Cyber", "Minimal", "Neon", "Magazine"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={[
                          "rounded-xl px-3 py-2 text-sm font-semibold",
                          t === theme ? "bg-white text-zinc-900" : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                        ].join(" ")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-white/60">主标题</div>
                  <textarea
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/25"
                    placeholder="例如：新品上线｜限时 48 小时"
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-white/60">副标题</div>
                  <textarea
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    rows={2}
                    className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/25"
                    placeholder="例如：低至 5 折 · 进店领券"
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-white/60">页脚</div>
                  <input
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/25"
                    placeholder="例如：你的品牌名 / 活动时间 / 二维码提示"
                  />
                </div>

              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white/80">预览</div>
                <div className="text-xs text-white/60">
                  画布尺寸：{size.w}×{size.h}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-3">
                <div className="mx-auto w-full max-w-[720px]">
                  <div className="relative w-full">
                    <canvas
                      ref={canvasRef}
                      className="h-auto w-full rounded-xl"
                      style={{ aspectRatio: `${size.w} / ${size.h}` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/55">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">纯前端：部署即用</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">支持 ESA Pages 边缘缓存</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-xs text-white/45">
          <p>注意：导出 PNG 为本地生成，不上传图片。</p>
        </div>
      </div>
    </div>
  );
}

