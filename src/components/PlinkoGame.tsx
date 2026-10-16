"use client";

import { useState, useRef, useEffect } from "react";
import { ShieldCheck, Layers, Info } from "lucide-react";
import DemoWalletModal from "../components/DemoWalletModal";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
} from "framer-motion";

type Risk = "low" | "medium" | "high";
type Mode = "manual" | "auto";

interface PlinkoGameProps {
  mounted?: boolean;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  onModalToggle?: (isOpen: boolean) => void;
}

interface Ball {
  id: number;
  rows: number;
  bin: number;
  mult: number;
  bet: number;
  start: number;
  stages: { x: number; y: number }[];
  r: number;
  hop: number;
  settled: boolean;
  settledAt: number;
}

interface FloatText {
  id: number;
  x: number;
  y: number;
  text: string;
  win: boolean;
  ts: number;
}

interface ResultItem {
  id: number;
  mult: number;
  profit: number;
}

const MIN_ROWS = 8;
const MAX_ROWS = 16;
const STEP_MS = 230;
const AUTO_DELAY_MS = 550;
const MAX_RESULTS = 8;

const VB_W = 700;
const VB_H = 560;
const MARGIN_X = 30;
const TOP = 44;
const BIN_H = 34;
const BOTTOM_PAD = 18;

// Clean multipliers ensuring exact dollar/cent outcomes (e.g. $10.00 * 1.2 = $12.00)
const HALF_PAYTABLE: Record<Risk, Record<number, number[]>> = {
  low: {
    8: [6.0, 2.5, 1.2, 0.9, 0.6],
    9: [7.5, 3.0, 1.8, 1.0, 0.6],
    10: [10.0, 3.5, 2.0, 1.2, 0.8, 0.6],
    11: [12.0, 4.2, 2.2, 1.3, 0.9, 0.6],
    12: [14.0, 5.0, 2.5, 1.4, 1.0, 0.7, 0.6],
    13: [16.0, 6.0, 3.0, 1.6, 1.1, 0.8, 0.6],
    14: [18.0, 7.2, 3.5, 1.8, 1.2, 0.9, 0.7, 0.6],
    15: [22.0, 8.5, 4.0, 2.0, 1.3, 1.0, 0.8, 0.6],
    16: [25.0, 10.0, 4.8, 2.2, 1.4, 1.1, 0.9, 0.7, 0.6],
  },
  medium: {
    8: [15.0, 5.0, 1.8, 0.8, 0.5],
    9: [20.0, 6.5, 2.2, 1.0, 0.5],
    10: [25.0, 8.0, 2.8, 1.3, 0.8, 0.5],
    11: [32.0, 10.0, 3.6, 1.5, 0.9, 0.5],
    12: [40.0, 13.0, 4.8, 1.8, 1.0, 0.6, 0.4],
    13: [55.0, 18.0, 6.2, 2.4, 1.2, 0.7, 0.4],
    14: [70.0, 24.0, 8.0, 3.0, 1.5, 0.8, 0.5, 0.4],
    15: [100.0, 32.0, 11.0, 4.2, 1.9, 1.0, 0.5, 0.4],
    16: [140.0, 45.0, 15.0, 6.0, 2.5, 1.2, 0.6, 0.5, 0.4],
  },
  high: {
    8: [40.0, 7.0, 1.5, 0.6, 0.3],
    9: [60.0, 10.0, 2.0, 0.8, 0.3],
    10: [95.0, 14.0, 2.8, 1.1, 0.5, 0.3],
    11: [140.0, 20.0, 4.0, 1.4, 0.7, 0.3],
    12: [200.0, 30.0, 6.0, 1.8, 0.8, 0.4, 0.3],
    13: [350.0, 48.0, 9.5, 2.5, 1.1, 0.5, 0.3],
    14: [550.0, 75.0, 14.0, 3.5, 1.4, 0.7, 0.4, 0.3],
    15: [850.0, 120.0, 24.0, 5.5, 2.0, 0.8, 0.4, 0.3],
    16: [1400.0, 200.0, 40.0, 9.0, 2.8, 1.1, 0.5, 0.4, 0.3],
  },
};

const TIERS = [
  { min: 20, from: "#10B981", to: "#047857", text: "#FFFFFF" },
  { min: 5, from: "#34D399", to: "#059669", text: "#FFFFFF" },
  { min: 2, from: "#F6B04A", to: "#E8861C", text: "#2D2621" },
  { min: 1, from: "#EBCB6B", to: "#D4AF37", text: "#2D2621" },
  { min: 0, from: "#4A433E", to: "#24201D", text: "#FFFFFF" },
];

function tierIndex(m: number): number {
  const idx = TIERS.findIndex((t) => m >= t.min);
  return idx === -1 ? TIERS.length - 1 : idx;
}

function getMultipliers(risk: Risk, rows: number): number[] {
  const half = HALF_PAYTABLE[risk][rows];
  const mirrored =
    rows % 2 === 0 ? half.slice(0, -1).reverse() : [...half].reverse();
  return [...half, ...mirrored];
}

function fmtMult(m: number): string {
  return Number.isInteger(m) ? String(m) : m.toFixed(1);
}

function fmtCurrency(n: number): string {
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function geometry(rows: number) {
  const sp = (VB_W - 2 * MARGIN_X) / (rows + 1);
  const binTop = VB_H - BOTTOM_PAD - BIN_H;
  const lastPegY = binTop - 22;
  const rs = (lastPegY - TOP) / (rows - 1);
  const pegR = Math.min(4.2, Math.max(2.4, sp * 0.085));
  const ballR = Math.min(8, sp * 0.22);
  return { sp, rs, pegR, ballR, binTop, cx: VB_W / 2 };
}

function playSound(src: string) {
  const audio = new Audio(src);
  audio.play().catch(() => {});
}

function AnimatedBalance({ value }: { value: number }) {
  const count = useMotionValue(value);
  const [displayValue, setDisplayValue] = useState(fmtCurrency(value));

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(fmtCurrency(latest));
      },
    });

    return () => controls.stop();
  }, [value, count]);

  return <span>{displayValue}</span>;
}

export default function PlinkoGame({
  balance,
  setBalance,
  onModalToggle,
}: PlinkoGameProps) {
  const [isWalletOpen, setIsWalletOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<Mode>("manual");
  const [betAmount, setBetAmount] = useState<string>("10.00");
  const [risk, setRisk] = useState<Risk>("medium");
  const [rows, setRows] = useState<number>(12);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [betError, setBetError] = useState<boolean>(false);

  const [autoCount, setAutoCount] = useState<string>("10");
  const [autoRunning, setAutoRunning] = useState<boolean>(false);
  const autoLeftRef = useRef<number>(0);

  const ballsRef = useRef<Ball[]>([]);
  const hitsRef = useRef<Record<number, number>>({});
  const floatsRef = useRef<FloatText[]>([]);
  const idRef = useRef<number>(0);
  const nowRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const loopRef = useRef<(now: number) => void>(() => {});
  const dropBallRef = useRef<() => boolean>(() => false);
  const [, forceFrame] = useState<number>(0);

  const g = geometry(rows);
  const multipliers = getMultipliers(risk, rows);

  const isLocked = ballsRef.current.length > 0;

  useEffect(() => {
    onModalToggle?.(isWalletOpen);
  }, [isWalletOpen, onModalToggle]);

  useEffect(() => {
    if (!betError) return;
    const id = window.setTimeout(() => setBetError(false), 550);
    return () => window.clearTimeout(id);
  }, [betError]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function ensureLoop() {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame((t) => loopRef.current(t));
  }

  function settleBall(ball: Ball, now: number) {
    const payout = ball.bet * ball.mult;
    const profit = payout - ball.bet;

    setBalance((prev) => prev + payout);
    if (profit > 0) playSound("/sounds/win.wav");

    hitsRef.current[ball.bin] = now;

    const gg = geometry(ball.rows);
    floatsRef.current.push({
      id: ++idRef.current,
      x: gg.cx + (ball.bin - ball.rows / 2) * gg.sp,
      y: gg.binTop - 12,
      text:
        payout >= 0.005
          ? `+${fmtCurrency(payout)}`
          : `-${fmtCurrency(Math.abs(payout))}`,
      win: profit > 0,
      ts: now,
    });

    setResults((prev) =>
      [{ id: ++idRef.current, mult: ball.mult, profit }, ...prev].slice(
        0,
        MAX_RESULTS,
      ),
    );
  }

  function loop(now: number) {
    nowRef.current = now;

    ballsRef.current = ballsRef.current.filter((ball) => {
      const total = (ball.rows + 1) * STEP_MS;
      if (!ball.settled && now - ball.start >= total) {
        ball.settled = true;
        ball.settledAt = now;
        settleBall(ball, now);
      }
      return !(ball.settled && now - ball.settledAt > 220);
    });

    floatsRef.current = floatsRef.current.filter((f) => now - f.ts < 1000);
    const hitsActive = Object.values(hitsRef.current).some(
      (ts) => now - ts < 280,
    );

    forceFrame((f) => f + 1);

    if (
      ballsRef.current.length > 0 ||
      floatsRef.current.length > 0 ||
      hitsActive
    ) {
      rafRef.current = requestAnimationFrame((t) => loopRef.current(t));
    } else {
      rafRef.current = null;
    }
  }

  function dropBall(): boolean {
    const amount = Number.parseFloat(betAmount);

    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) {
      setBetError(true);
      return false;
    }

    playSound("/sounds/drop.wav");
    setBalance((prev) => prev - amount);

    const bytes = new Uint8Array(rows);
    crypto.getRandomValues(bytes);
    const bits = Array.from(bytes, (v) => v & 1);
    const bin = bits.reduce((a, b) => a + b, 0);

    const geo = geometry(rows);
    const stages: { x: number; y: number }[] = [];
    let rights = 0;
    for (let j = 0; j <= rows; j++) {
      if (j > 0) rights += bits[j - 1];
      stages.push({
        x: geo.cx + ((2 * rights - j) * geo.sp) / 2,
        y:
          j < rows
            ? TOP + j * geo.rs - geo.pegR - geo.ballR * 0.9
            : geo.binTop - geo.ballR,
      });
    }

    ballsRef.current = [
      ...ballsRef.current,
      {
        id: ++idRef.current,
        rows,
        bin,
        mult: multipliers[bin],
        bet: amount,
        start: performance.now(),
        stages,
        r: geo.ballR,
        hop: geo.rs * 0.2,
        settled: false,
        settledAt: 0,
      },
    ];

    ensureLoop();
    forceFrame((f) => f + 1);
    return true;
  }

  useEffect(() => {
    loopRef.current = loop;
    dropBallRef.current = dropBall;
  });

  useEffect(() => {
    if (!autoRunning) return;

    const id = window.setInterval(() => {
      const ok = dropBallRef.current();
      if (!ok) {
        setAutoRunning(false);
        return;
      }
      if (Number.isFinite(autoLeftRef.current)) {
        autoLeftRef.current -= 1;
        if (autoLeftRef.current <= 0) setAutoRunning(false);
      }
    }, AUTO_DELAY_MS);

    return () => window.clearInterval(id);
  }, [autoRunning]);

  function startAuto() {
    const n = Math.floor(Number.parseFloat(autoCount));
    autoLeftRef.current = Number.isFinite(n) && n > 0 ? n : Infinity;

    const ok = dropBallRef.current();
    if (!ok) return;

    if (Number.isFinite(autoLeftRef.current)) {
      autoLeftRef.current -= 1;
      if (autoLeftRef.current <= 0) return;
    }
    setAutoRunning(true);
  }

  function handleMainButton() {
    if (mode === "manual") {
      dropBall();
    } else if (autoRunning) {
      setAutoRunning(false);
    } else {
      startAuto();
    }
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setAutoRunning(false);
    setMode(next);
  }

  function scaleBet(mult: number) {
    if (isLocked) return;
    const current = Number.parseFloat(betAmount) || 0;
    setBetAmount(Math.max(0.01, current * mult).toFixed(2));
  }

  function addBet(amount: number) {
    if (isLocked) return;
    const current = Number.parseFloat(betAmount) || 0;
    setBetAmount((current + amount).toFixed(2));
  }

  function clearBet() {
    if (isLocked) return;
    setBetAmount("0.00");
  }

  function maxBet() {
    if (isLocked) return;
    setBetAmount(balance.toFixed(2));
  }

  const now = nowRef.current || performance.now();

  const pegs: { key: string; x: number; y: number }[] = [];
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < i + 3; k++) {
      pegs.push({
        key: `${i}-${k}`,
        x: g.cx + (k - (i + 2) / 2) * g.sp,
        y: TOP + i * g.rs,
      });
    }
  }

  function ballPosition(ball: Ball) {
    const elapsed = Math.max(0, now - ball.start);
    const total = (ball.rows + 1) * STEP_MS;
    const last = ball.stages[ball.rows];

    if (elapsed >= total) {
      return {
        x: last.x,
        y: last.y,
        opacity: ball.settled
          ? Math.max(0, 1 - (now - ball.settledAt) / 220)
          : 1,
      };
    }

    const s = Math.floor(elapsed / STEP_MS);
    const t = (elapsed - s * STEP_MS) / STEP_MS;
    const from = s === 0 ? { x: g.cx, y: -ball.r * 2 } : ball.stages[s - 1];
    const to = ball.stages[s];

    const x = from.x + (to.x - from.x) * t;
    const hop = s === 0 ? 0 : ball.hop * Math.sin(Math.PI * t);
    const y = from.y + (to.y - from.y) * t * t - hop;
    return { x, y, opacity: 1 };
  }

  const binW = g.sp - 4;
  const fontSize = rows >= 15 ? 10 : rows >= 13 ? 11 : 13;

  const mainLabel =
    mode === "manual"
      ? "Place bet"
      : autoRunning
        ? "Stop Autobet"
        : "Start Autobet";

  const actionButton = (
    <button
      onClick={handleMainButton}
      className={`w-full py-3.5 px-2 text-white font-serif font-bold text-sm sm:text-base rounded-2xl shadow-lg border cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap leading-tight ${
        autoRunning
          ? "bg-gradient-to-r from-rose-700 via-rose-600 to-rose-800 hover:from-rose-600 hover:to-rose-700 border-rose-400/50"
          : "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-500 hover:to-amber-600 border-amber-400/50"
      }`}
    >
      {mainLabel}
    </button>
  );

  return (
    <div className="w-full relative flex flex-col items-center justify-start sm:pt-4">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 select-none pb-12 font-sans text-[#2D2621] px-2 sm:px-4">
        <div className="relative rounded-3xl p-3 sm:p-8 border border-[#EADFCF] bg-[#FAF6F0]/20 backdrop-blur shadow-[0_20px_50px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(255,255,255,0.8)] transition-all">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight flex items-center gap-2 text-[#2D2621]">
                Plinko
                <span className="text-amber-500 text-xl font-normal">✦</span>
              </h1>
              <p className="text-xs sm:text-sm mt-1 text-[#8C827A]">
                Drop the ball. Let the pegs decide.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsWalletOpen(true)}
              className="group flex items-center gap-3 bg-[#F0E8DC] hover:bg-[#EAE0D0] px-4 py-2.5 rounded-2xl border border-[#E2D6C3] shadow-inner transition-colors cursor-pointer active:scale-[0.98]"
            >
              <div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-right text-[#8C827A]">
                  Balance
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#2D2621]">
                  <AnimatedBalance value={balance} />
                </div>
              </div>

              <div className="w-9 h-9 rounded-xl bg-[#FAF6F0] flex items-center justify-center border border-[#E2D6C3] shadow-sm text-amber-700 group-hover:scale-105 transition-transform pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3" />
                </svg>
              </div>
            </button>
          </div>

          {/* Game Layout */}
          <div className="flex flex-col lg:grid lg:grid-cols-[320px_1fr] gap-4 mb-6">
            <div className="order-1 lg:order-2 flex flex-col gap-4">
              <div className="rounded-2xl border border-[#E2D6C3] bg-[#EFE8DC] shadow-[inset_0_2px_6px_rgba(0,0,0,0.05)] p-3 sm:p-4 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-2 min-h-[30px]">
                  <span className="text-xs font-semibold text-stone-400 flex-none">
                    Last drops
                  </span>
                  <div className="flex items-center gap-1.5 justify-end overflow-hidden">
                    <AnimatePresence initial={false}>
                      {results.map((r, index) => {
                        const tier = TIERS[tierIndex(r.mult)];
                        return (
                          <motion.div
                            key={r.id}
                            initial={
                              index === 0 ? { opacity: 0, scale: 0.2 } : false
                            }
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 25,
                            }}
                            title={`${r.profit >= 0 ? "+" : "-"}${fmtCurrency(Math.abs(r.profit))}`}
                            className="flex-none rounded-md px-1.5 py-1 text-[11px] font-bold font-mono shadow-sm"
                            style={{
                              background: `linear-gradient(to bottom, ${tier.from}, ${tier.to})`,
                              color: tier.text,
                            }}
                          >
                            {fmtMult(r.mult)}x
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>

                <svg
                  viewBox={`0 0 ${VB_W} ${VB_H}`}
                  className="w-full h-auto select-none"
                  role="img"
                  aria-label="Plinko board"
                >
                  <defs>
                    {TIERS.map((t, i) => (
                      <linearGradient
                        key={i}
                        id={`plinko-bin-${i}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={t.from} />
                        <stop offset="100%" stopColor={t.to} />
                      </linearGradient>
                    ))}
                    <radialGradient id="plinko-peg" cx="35%" cy="35%" r="70%">
                      <stop offset="0%" stopColor="#F3E5AB" />
                      <stop offset="100%" stopColor="#A9803A" />
                    </radialGradient>
                    <radialGradient id="plinko-ball" cx="35%" cy="35%" r="70%">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="45%" stopColor="#FDE68A" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </radialGradient>
                  </defs>

                  {pegs.map((p) => (
                    <g key={p.key}>
                      <circle
                        cx={p.x}
                        cy={p.y + 1.2}
                        r={g.pegR}
                        fill="rgba(0,0,0,0.12)"
                      />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={g.pegR}
                        fill="url(#plinko-peg)"
                      />
                    </g>
                  ))}

                  {ballsRef.current.map((ball) => {
                    const pos = ballPosition(ball);
                    return (
                      <circle
                        key={ball.id}
                        cx={pos.x}
                        cy={pos.y}
                        r={ball.r}
                        fill="url(#plinko-ball)"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        opacity={pos.opacity}
                        style={{
                          filter:
                            "drop-shadow(0 2px 4px rgba(180,120,20,0.55))",
                        }}
                      />
                    );
                  })}

                  {multipliers.map((m, k) => {
                    const tier = TIERS[tierIndex(m)];
                    const hitAt = hitsRef.current[k];
                    const p = hitAt
                      ? Math.min(1, Math.max(0, (now - hitAt) / 260))
                      : 1;
                    const dip = hitAt && p < 1 ? 7 * Math.sin(Math.PI * p) : 0;
                    const x = g.cx + (k - rows / 2) * g.sp - binW / 2;
                    return (
                      <g key={k} transform={`translate(0 ${dip.toFixed(2)})`}>
                        <rect
                          x={x}
                          y={g.binTop}
                          width={binW}
                          height={BIN_H}
                          rx={7}
                          fill={`url(#plinko-bin-${tierIndex(m)})`}
                          stroke="rgba(255,255,255,0.35)"
                          strokeWidth="1"
                        />
                        {hitAt && p < 1 && (
                          <rect
                            x={x}
                            y={g.binTop}
                            width={binW}
                            height={BIN_H}
                            rx={7}
                            fill="#FFFFFF"
                            opacity={0.45 * (1 - p)}
                          />
                        )}
                        <text
                          x={x + binW / 2}
                          y={g.binTop + BIN_H / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={fontSize}
                          fontWeight="800"
                          fill={tier.text}
                          fontFamily="ui-monospace, monospace"
                        >
                          {fmtMult(m)}x
                        </text>
                      </g>
                    );
                  })}

                  {floatsRef.current.map((f) => {
                    const p = Math.min(1, (now - f.ts) / 1000);
                    return (
                      <text
                        key={f.id}
                        x={f.x}
                        y={f.y - 34 * p}
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="800"
                        fill={f.win ? "#059669" : "#E11D48"}
                        stroke="#FAF6F0"
                        strokeWidth="3"
                        paintOrder="stroke"
                        opacity={1 - p * p}
                        fontFamily="ui-monospace, monospace"
                      >
                        {f.text}
                      </text>
                    );
                  })}
                </svg>
              </div>

              <div className="block lg:hidden">{actionButton}</div>
            </div>

            {/* CONTROLS */}
            <div className="order-2 lg:order-1 rounded-2xl p-3 sm:p-4 border border-[#E5DAC8] bg-[#F4EFE6] flex flex-col gap-4">
              <div className="flex p-1 bg-[#F4EBE1] rounded-2xl border border-[#E2D6C3]">
                {(["manual", "auto"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`flex-1 py-2 text-xs font-serif font-bold rounded-xl transition-all cursor-pointer capitalize ${
                      mode === m
                        ? "bg-[#FAF6F0] text-amber-900 shadow-sm border border-[#E2D6C3]"
                        : "text-[#8C827A] hover:text-[#2D2621]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold px-1 text-[#8C827A]">
                  Bet Amount
                </div>
                <div
                  className={`flex items-center rounded-xl px-3 bg-[#FAF6F0] border border-[#E2D6C3] shadow-inner justify-between ${
                    betError ? "flash-error" : ""
                  }`}
                >
                  <div className="flex items-center flex-1 mr-2">
                    <span className="text-sm font-semibold mr-1 text-[#8C827A]">
                      $
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={betAmount}
                      disabled={isLocked}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="gyre-num bg-transparent outline-none py-2 w-full text-base font-bold font-mono text-[#2D2621] disabled:opacity-60"
                    />
                  </div>
                  <button
                    onClick={clearBet}
                    disabled={isLocked}
                    className="text-xs font-semibold text-[#8C827A] hover:text-[#2D2621] px-2 py-1 rounded-lg hover:bg-[#E2D6C3]/40 transition-colors disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "+1", action: () => addBet(1) },
                    { label: "+5", action: () => addBet(5) },
                    { label: "+10", action: () => addBet(10) },
                    { label: "+100", action: () => addBet(100) },
                    { label: "1/2", action: () => scaleBet(0.5) },
                    { label: "X2", action: () => scaleBet(2) },
                    { label: "MAX", action: maxBet },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      disabled={isLocked}
                      className={`gyre-btn px-2 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 shadow-sm text-center disabled:opacity-40 ${
                        btn.label === "MAX" ? "col-span-2" : ""
                      }`}
                      onClick={btn.action}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold px-1 text-[#8C827A]">
                  Risk
                </div>
                <div className="flex p-1 bg-[#F4EBE1] rounded-xl border border-[#E2D6C3]">
                  {(["low", "medium", "high"] as Risk[]).map((r) => (
                    <button
                      key={r}
                      disabled={isLocked}
                      onClick={() => setRisk(r)}
                      className={`flex-1 py-1.5 text-xs font-serif font-bold rounded-lg transition-all capitalize disabled:opacity-40 ${
                        risk === r
                          ? "bg-[#FAF6F0] text-amber-900 shadow-sm border border-[#E2D6C3]"
                          : "text-[#8C827A] hover:text-[#2D2621]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-[#8C827A]">
                    Number of Rows
                  </span>
                  <span className="text-sm font-bold font-mono text-[#2D2621]">
                    {rows}
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_ROWS}
                  max={MAX_ROWS}
                  step={1}
                  value={rows}
                  disabled={isLocked}
                  onChange={(e) => setRows(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer disabled:opacity-40"
                />
              </div>

              {mode === "auto" && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold px-1 text-[#8C827A]">
                    Number of Bets{" "}
                    <span className="font-normal">(0 = endless)</span>
                  </div>
                  <div className="flex items-center rounded-xl px-3 bg-[#FAF6F0] border border-[#E2D6C3] shadow-inner">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={autoCount}
                      disabled={autoRunning}
                      onChange={(e) => setAutoCount(e.target.value)}
                      className="gyre-num bg-transparent outline-none py-2 w-full text-base font-bold font-mono text-[#2D2621] disabled:opacity-60"
                    />
                  </div>
                </div>
              )}

              <div className="hidden lg:block">{actionButton}</div>
            </div>
          </div>

          {/* Footer Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#E5DAC8] text-xs">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#EFE8DC] text-amber-800">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-stone-800">8–16 Rows</div>
                <div className="text-[10px] text-stone-500">
                  Low, medium and high risk
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#EFE8DC] text-amber-800">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-stone-800">Provably Random</div>
                <div className="text-[10px] text-stone-500">
                  Unbiased CSPRNG Engine
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsWalletOpen(true)}
              className="flex items-center gap-2 text-left p-2 rounded-xl hover:bg-[#EFE8DC]/60 transition-colors group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-[#EFE8DC] text-amber-800 group-hover:bg-amber-100 transition-colors">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-stone-800 group-hover:text-amber-800 transition-colors">
                  Disclaimer
                </div>
                <div className="text-[10px] text-stone-500">
                  For Entertainment Only
                </div>
              </div>
            </button>
          </div>
        </div>

        <p className="text-[11px] mt-4 text-center text-stone-500">
          Plinko is a simulated entertainment application using non-monetary
          demo credits. No real money gambling or rewards are offered.
        </p>

        <DemoWalletModal
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
        />
      </div>
    </div>
  );
}
