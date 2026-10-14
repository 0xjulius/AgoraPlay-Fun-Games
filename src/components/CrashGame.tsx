import { useState, useEffect, useRef } from "react";
import { History, Banknote, CheckCircle2, Sparkles } from "lucide-react";
import crashBg from "../assets/crash-bg.png";
import LiveBetsHistory from "./LiveBetsHistory";
import type { LiveBetItem } from "./LiveBetsHistory";

interface CrashGameProps {
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
}

interface HistoryItem {
  id: string;
  multiplier: number;
  crashed: boolean;
}

export default function CrashGame({ balance, setBalance }: CrashGameProps) {
  const [gameMode, setGameMode] = useState<"manual" | "autobet">("manual");
  const [betAmount, setBetAmount] = useState<string>("100.00");
  const [autoCashOut, setAutoCashOut] = useState<string>("");
  const [hasBet, setHasBet] = useState<boolean>(false);
  const [cashedOut, setCashedOut] = useState<boolean>(false);

  const [cashOutMultiplier, setCashOutMultiplier] = useState<number>(0);
  const [cashOutWinAmount, setCashOutWinAmount] = useState<number>(0);

  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [crashPoint, setCrashPoint] = useState<number>(1.0);
  const [status, setStatus] = useState<"waiting" | "flying" | "crashed">(
    "waiting",
  );
  const [countdown, setCountdown] = useState<number>(3.0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Live-vedot ja aktiivinen välilehti
  const [liveBets, setLiveBets] = useState<LiveBetItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");

  const hasBetRef = useRef(hasBet);
  const cashedOutRef = useRef(cashedOut);
  const autoCashOutRef = useRef(autoCashOut);
  const pointsRef = useRef<{ t: number; m: number }[]>([]);
  const botTargetsRef = useRef<{ id: string; target: number }[]>([]);

  useEffect(() => {
    hasBetRef.current = hasBet;
    cashedOutRef.current = cashedOut;
    autoCashOutRef.current = autoCashOut;
  }, [hasBet, cashedOut, autoCashOut]);

  const [history, setHistory] = useState<HistoryItem[]>([
    { id: "1", multiplier: 2.45, crashed: true },
    { id: "2", multiplier: 8.97, crashed: true },
    { id: "3", multiplier: 1.84, crashed: true },
    { id: "4", multiplier: 3.4, crashed: true },
    { id: "5", multiplier: 1.49, crashed: true },
    { id: "6", multiplier: 5.1, crashed: true },
  ]);

  const playBetSound = () => {
    const audio = new Audio("/sounds/bet.wav");
    audio.play().catch((err) => console.error("Audio playback error:", err));
  };

  const generateBalancedCrashPoint = (): number => {
    const TEST_MODE_TARGET = 0;
    if (TEST_MODE_TARGET) {
      return TEST_MODE_TARGET;
    }

    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const randomValue = array[0] / 4294967296;

    const houseEdge = 0.02;
    if (randomValue < 0.01) {
      return 1.0;
    }

    const calculated = 1.05 + (1 / (1 - randomValue * (1 - houseEdge))) * 0.8;
    const point = Math.max(1.1, Number(calculated.toFixed(2)));
    return Math.min(point, 200.0);
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;
    const botTimeouts: ReturnType<typeof setTimeout>[] = [];

    if (status === "waiting") {
      const secureCrash = generateBalancedCrashPoint();
      setCrashPoint(secureCrash);
      pointsRef.current = [];
      setElapsedSeconds(0);
      setLiveBets([]); // Tyhjennetään lista kierroksen alussa

      setCountdown(3.0);
      const startTime = Date.now();

      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, 3.0 - elapsed);
        setCountdown(Number(remaining.toFixed(1)));
      }, 100);

      // Jos pelaaja on jo asettanut panoksen ennen kierroksen alkua, lisätään se HETI ensimmäisenä listalle
      if (hasBetRef.current) {
        setLiveBets([
          {
            id: `user-bet-${Date.now()}`,
            username: "You",
            amount: parseFloat(betAmount),
            multiplier: null,
            payout: null,
            status: "playing",
            isUser: true,
          },
        ]);
      }

      // --- LUODAAN BOTIT PORRASTETUSTI ODOTUSTILAN AIKANA ---
      const botNames = [
        "ZeusMaster", "Athena99", "Ares_God", "Hermes_Fast", "Poseidon7",
        "Hera_Queen", "Apollo_Sun", "Artemis_Hunt", "Chronos", "OlympusKing",
        "Midas_Touch", "Spartan300", "Minotaur", "Pegasus", "Hades_Under",
      ];
      const count = Math.floor(Math.random() * 4) + 5;
      const shuffled = [...botNames].sort(() => 0.5 - Math.random());
      const allTargets: { id: string; target: number }[] = [];
      const generatedBots: LiveBetItem[] = [];

      for (let i = 0; i < count; i++) {
        const id = `bot-${i}-${Date.now()}`;
        const target = Number((1.1 + Math.pow(Math.random(), 2) * 12).toFixed(2));
        allTargets.push({ id, target });
        generatedBots.push({
          id,
          username: shuffled[i],
          amount: Math.floor(Math.random() * 95) + 5,
          multiplier: null,
          payout: null,
          status: "playing",
          isUser: false,
        });
      }
      botTargetsRef.current = allTargets;

      // Porrastetaan bottien lisäys niin, että oma veto pysyy aina listan kärjessä
      generatedBots.forEach((bot, idx) => {
        const delay = 300 + Math.floor((idx / generatedBots.length) * 1800) + Math.random() * 200;
        const t = setTimeout(() => {
          setLiveBets((prev) => {
            // Varmistetaan, että oma veto pysyy aina indeksissä 0, jos se on olemassa
            const userBet = prev.find((b) => b.isUser);
            const otherBets = prev.filter((b) => !b.isUser);
            const updatedOthers = [...otherBets, bot];
            return userBet ? [userBet, ...updatedOthers] : updatedOthers;
          });
        }, delay);
        botTimeouts.push(t);
      });

      timer = setTimeout(() => {
        clearInterval(interval);
        setCurrentMultiplier(1.0);
        setStatus("flying");
      }, 3000);
    } else if (status === "flying") {
      let virtualElapsed = 0;
      let realElapsed = 0;
      let lastTime = Date.now();
      let currentMultVal = 1.0;
      pointsRef.current = [{ t: 0, m: 1 }];

      interval = setInterval(() => {
        const now = Date.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        realElapsed += delta;
        setElapsedSeconds(realElapsed);

        let speedFactor = 1.0;
        if (currentMultVal >= 30) {
          speedFactor = 2.2;
        } else if (currentMultVal >= 20) {
          speedFactor = 1.7;
        } else if (currentMultVal >= 10) {
          speedFactor = 1.35;
        }

        virtualElapsed += delta * speedFactor;

        const newMult = Number(
          (
            1.0 +
            0.15 * virtualElapsed +
            0.035 * Math.pow(virtualElapsed, 2.1)
          ).toFixed(2),
        );
        currentMultVal = newMult;

        setLiveBets((prev) => {
          let hasChanges = false;
          const updated = prev.map((bet): LiveBetItem => {
            if (bet.status !== "playing") return bet;
            if (bet.isUser) return bet;

            const botTarget = botTargetsRef.current.find(
              (b) => b.id === bet.id,
            );
            const target = botTarget ? botTarget.target : 2.0;

            if (newMult >= target) {
              hasChanges = true;
              return {
                ...bet,
                multiplier: target,
                payout: Number((bet.amount * target).toFixed(2)),
                status: "won" as const,
              };
            }
            return bet;
          });

          return hasChanges ? updated : prev;
        });

        const pts = pointsRef.current;
        const lastPt = pts[pts.length - 1];
        const reached = Math.min(newMult, crashPoint);
        if (
          !lastPt ||
          realElapsed - lastPt.t >= 0.05 ||
          newMult >= crashPoint
        ) {
          pts.push({ t: realElapsed, m: reached });
        }

        if (
          hasBetRef.current &&
          !cashedOutRef.current &&
          autoCashOutRef.current !== "" &&
          Number(autoCashOutRef.current) > 0 &&
          newMult >= Number(autoCashOutRef.current)
        ) {
          handleCashOut(Number(autoCashOutRef.current));
        }

        if (newMult >= crashPoint) {
          setCurrentMultiplier(crashPoint);
          setStatus("crashed");
          clearInterval(interval);

          setHistory((prev) => [
            {
              id: Date.now().toString(),
              multiplier: crashPoint,
              crashed: true,
            },
            ...prev.slice(0, 11),
          ]);

          setLiveBets((prev) =>
            prev.map((bet): LiveBetItem => {
              if (bet.status === "playing") {
                return { ...bet, status: "lost" as const };
              }
              return bet;
            }),
          );

          setTimeout(() => {
            setHasBet(false);
            setCashedOut(false);
            setCashOutMultiplier(0);
            setCashOutWinAmount(0);
            setStatus("waiting");
          }, 3000);
        } else {
          setCurrentMultiplier(newMult);
        }
      }, 30);

      return () => clearInterval(interval);
    }

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      botTimeouts.forEach((t) => clearTimeout(t));
    };
  }, [status]);

  const handlePlaceBet = () => {
    const amount = parseFloat(betAmount);
    if (
      isNaN(amount) ||
      amount <= 0 ||
      amount > balance ||
      status !== "waiting"
    )
      return;

    playBetSound();
    setBalance((prev) => prev - amount);
    setHasBet(true);
    setCashedOut(false);

    // Lisätään tai siirretään oma veto heti listan kärkeen (ensimmäiseksi)
    setLiveBets((prev) => {
      const userBet: LiveBetItem = {
        id: `user-bet-${Date.now()}`,
        username: "You",
        amount: amount,
        multiplier: null,
        payout: null,
        status: "playing",
        isUser: true,
      };
      const otherBets = prev.filter((b) => !b.isUser);
      return [userBet, ...otherBets];
    });
  };

  const handleCashOut = (mult: number) => {
    if (!hasBetRef.current || cashedOutRef.current || status !== "flying")
      return;
    const amount = parseFloat(betAmount);
    const winAmount = amount * mult;

    setBalance((prev) => prev + winAmount);
    setCashOutMultiplier(mult);
    setCashOutWinAmount(winAmount);
    setCashedOut(true);

    setLiveBets((prev) =>
      prev.map((bet): LiveBetItem => {
        if (bet.isUser && bet.status === "playing") {
          return {
            ...bet,
            multiplier: mult,
            payout: winAmount,
            status: "won" as const,
          };
        }
        return bet;
      }),
    );
  };

  const clearBet = () => {
    if (hasBet) return;
    setBetAmount("0.00");
  };

  const addBet = (val: number) => {
    if (hasBet) return;
    const current = parseFloat(betAmount) || 0;
    setBetAmount((current + val).toFixed(2));
  };

  const scaleBet = (factor: number) => {
    if (hasBet) return;
    const current = parseFloat(betAmount) || 0;
    setBetAmount(Math.max(0, current * factor).toFixed(2));
  };

  const maxBet = () => {
    if (hasBet) return;
    setBetAmount(balance.toFixed(2));
  };

  const getBadgeStyle = (mult: number) => {
    if (mult >= 2.0) {
      return "bg-emerald-600 text-white font-extrabold shadow-md border border-emerald-400/60";
    } else if (mult >= 1.5) {
      return "bg-[#6E655F] text-white font-extrabold shadow-md border border-[#8C827A]/60";
    } else {
      return "bg-rose-700 text-white font-extrabold shadow-md border border-rose-500/60";
    }
  };

  const isRunning = status === "flying" || status === "crashed";
  const displayMult = isRunning ? currentMultiplier : 1;
  const viewMax = Math.max(3, displayMult * 1.5);

  const maxMarks =
    displayMult < 2
      ? 2
      : Math.min(9, 3 + Math.floor(Math.log10(displayMult) * 4));

  const pickStep = (max: number) => {
    const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
    for (const st of steps) {
      if (Math.floor(max / st) <= maxMarks) return st;
    }
    return 500;
  };
  const step = pickStep(viewMax);

  const scaleMarks: number[] = [1];
  for (let v = step; v <= viewMax; v += step) {
    if (v > 1) scaleMarks.push(v);
  }

  const yFrac = (m: number) =>
    Math.min(1, Math.max(0, (m - 1) / (viewMax - 1)));

  const xMaxSeconds = Math.max(8, elapsedSeconds * 1.25);
  const xFrac = (t: number) => Math.min(1, t / xMaxSeconds);

  const points = pointsRef.current;
  const pathD = points
    .map(
      (pt, i) =>
        `${i === 0 ? "M" : "L"} ${(xFrac(pt.t) * 100).toFixed(2)} ${((1 - yFrac(pt.m)) * 100).toFixed(2)}`,
    )
    .join(" ");

  const ballX = xFrac(elapsedSeconds) * 100;
  const ballY = (1 - yFrac(currentMultiplier)) * 100;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 select-none pb-12">
      {/* 1. MULTIPLIER HISTORY */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 px-3 bg-[#FAF6F0]/90 backdrop-blur-md rounded-2xl border border-[#E2D6C3] shadow-md [&::-webkit-scrollbar]:hidden">
        <div className="p-1.5 rounded-xl bg-[#D4AF37]/15 text-amber-800 shrink-0">
          <History className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          {history.map((h, index) => (
            <span
              key={h.id}
              className={`px-3 py-1.5 rounded-xl text-xs font-serif shadow-sm shrink-0 transition-all duration-500 transform animate-in fade-in slide-in-from-top-2 ${getBadgeStyle(h.multiplier)}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              x{h.multiplier.toFixed(2)}
            </span>
          ))}
        </div>
      </div>

      {/* 2. MAIN LAYOUT */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4">
        {/* RIGHT PANEL (CHART & FLIGHT) */}
        <div className="order-1 lg:order-2 lg:col-span-8 bg-[#1A1614] rounded-3xl border border-[#D4AF37]/40 p-6 shadow-2xl shadow-[inset_0_0_30px_rgba(255,255,255,0.35)] relative overflow-hidden flex flex-col items-center justify-center min-h-[440px]">
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url(${crashBg})` }}
          />

          {(status === "waiting" || status === "crashed") && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] transition-opacity duration-500 pointer-events-none" />
          )}

          {status === "flying" && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(26,22,20,0.35)_0%,_transparent_75%)] pointer-events-none" />
          )}

          {/* PLOT-ALUE */}
          <div className="absolute left-16 right-24 top-16 bottom-16 pointer-events-none z-10">
            {scaleMarks.map((mark) => (
              <div
                key={`grid-${mark}`}
                className="absolute left-0 right-0 border-t border-dashed border-[#FAF6F0]/15"
                style={{ top: `${(1 - yFrac(mark)) * 100}%` }}
              />
            ))}

            {(status === "flying" || status === "crashed") &&
              points.length > 1 && (
                <svg
                  className="absolute inset-0 w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                >
                  <path
                    d={pathD}
                    fill="none"
                    stroke={status === "crashed" ? "#F43F5E" : "#F59E0B"}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    className="filter drop-shadow-[0_0_6px_rgba(245,158,11,0.8)] opacity-90"
                  />
                </svg>
              )}

            {status === "flying" && (
              <div
                className="absolute flex items-center justify-center"
                style={{
                  left: `${ballX}%`,
                  top: `${ballY}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute -inset-2 rounded-full bg-amber-400/50 blur-md animate-ping" />
                  <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-200 shadow-[0_0_12px_rgba(245,158,11,1)] border border-white" />
                </div>
              </div>
            )}
          </div>

          {/* KESKIMERKKI */}
          <div className="z-25 flex flex-col items-center justify-center">
            {status === "waiting" && (
              <div className="flex flex-col items-center gap-2 animate-pulse drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                <span className="text-amber-300 font-serif text-sm tracking-widest uppercase font-bold drop-shadow">
                  Next Ascent Begins Soon
                </span>
                <span className="text-[#FAF6F0] font-serif text-5xl sm:text-6xl font-extrabold text-amber-200 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                  {countdown.toFixed(1)}s
                </span>
              </div>
            )}

            {status === "flying" && (
              <div className="flex flex-col items-center text-center drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
                <span className="text-[#FAF6F0] font-serif text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-[0_0_30px_rgba(212,175,55,0.9)]">
                  {currentMultiplier.toFixed(2)}x
                </span>
                {hasBet && !cashedOut && (
                  <span className="mt-2 text-emerald-300 font-serif text-base font-bold tracking-wide animate-pulse drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                    Potential Win: ${" "}
                    {(Number(betAmount) * currentMultiplier).toFixed(2)}
                  </span>
                )}
                {cashedOut && (
                  <span className="mt-2 text-amber-300 font-serif text-base font-bold tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                    Successfully cashed out! Ascent continues...
                  </span>
                )}
              </div>
            )}

            {status === "crashed" && (
              <div className="flex flex-col items-center gap-2 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                <span className="text-rose-400 font-serif text-sm tracking-widest uppercase font-extrabold drop-shadow">
                  Ascent Crashed!
                </span>
                <span className="text-rose-300 font-serif text-5xl sm:text-6xl font-extrabold drop-shadow-[0_0_25px_rgba(244,63,94,0.9)]">
                  {currentMultiplier.toFixed(2)}x
                </span>
              </div>
            )}
          </div>

          {/* Oikean reunan asteikko */}
          <div className="absolute right-6 top-16 bottom-16 w-16 pointer-events-none z-10 font-mono text-xs font-bold text-[#FAF6F0] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {scaleMarks.map((mark) => (
              <div
                key={mark}
                className="absolute left-0 right-0 text-right pr-2 animate-in fade-in duration-500"
                style={{
                  top: `${(1 - yFrac(mark)) * 100}%`,
                  transform: "translateY(-50%)",
                }}
              >
                x{mark}
              </div>
            ))}
          </div>

          {/* Ajanlasku alhaalla */}
          <div className="absolute bottom-4 left-16 right-16 flex justify-between text-xs text-[#FAF6F0] font-mono pointer-events-none border-t border-[#FAF6F0]/40 pt-2 z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-bold">
            <span>0.0s</span>
            <span>{(xMaxSeconds * 0.5).toFixed(1)}s</span>
            <span>{xMaxSeconds.toFixed(1)}s</span>
          </div>
        </div>

        {/* LEFT PANEL (CONTROLS) */}
        <div className="order-2 lg:order-1 lg:col-span-4 bg-[#FAF6F0]/95 backdrop-blur-md rounded-3xl border border-[#E2D6C3] p-5 shadow-xl flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            {/* Manual / Autobet tabs */}
            <div className="flex p-1 bg-[#F4EBE1] rounded-2xl border border-[#E2D6C3]">
              <button
                onClick={() => setGameMode("manual")}
                className={`flex-1 py-2 text-xs font-serif font-bold rounded-xl transition-all cursor-pointer ${
                  gameMode === "manual"
                    ? "bg-[#FAF6F0] text-amber-900 shadow-sm border border-[#E2D6C3]"
                    : "text-[#8C827A] hover:text-[#2D2621]"
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => setGameMode("autobet")}
                className={`flex-1 py-2 text-xs font-serif font-bold rounded-xl transition-all cursor-pointer ${
                  gameMode === "autobet"
                    ? "bg-[#FAF6F0] text-amber-900 shadow-sm border border-[#E2D6C3]"
                    : "text-[#8C827A] hover:text-[#2D2621]"
                }`}
              >
                Autobet
              </button>
            </div>

            {/* Bet Amount Control Bar */}
            <div className="rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2.5 border border-[#E5DAC8] bg-[#F4EFE6]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold px-1 text-[#8C827A]">
                  Bet Amount
                </div>
                <button
                  onClick={clearBet}
                  disabled={hasBet}
                  className="text-xs font-semibold text-[#8C827A] hover:text-[#2D2621] px-2 py-1 rounded-lg hover:bg-[#E2D6C3]/40 transition-colors sm:hidden disabled:opacity-50"
                >
                  Clear
                </button>
              </div>

              <div className="flex items-center flex-1 rounded-xl px-3 bg-[#FAF6F0] border border-[#E2D6C3] shadow-inner justify-between">
                <div className="flex items-center flex-1 mr-2">
                  <span className="text-base font-semibold mr-1 text-[#8C827A]">
                    $
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={betAmount}
                    disabled={hasBet}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="gyre-num bg-transparent outline-none py-2 w-full text-lg font-bold font-mono text-[#2D2621]"
                  />
                </div>

                <button
                  onClick={clearBet}
                  disabled={hasBet}
                  className="text-xs font-semibold text-[#8C827A] hover:text-[#2D2621] px-2 py-1 rounded-lg hover:bg-[#E2D6C3]/40 transition-colors hidden sm:block disabled:opacity-50"
                >
                  Clear
                </button>
              </div>

              {/* Quick Adjustment Buttons */}
              <div className="grid grid-cols-7 gap-1">
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
                    disabled={hasBet}
                    className={`gyre-btn py-1.5 px-0.5 rounded-lg text-[10px] sm:text-xs font-bold border transition-all active:scale-95 shadow-xs text-center cursor-pointer disabled:opacity-50 truncate ${
                      btn.label === "MAX"
                        ? "bg-gradient-to-r from-[#D4AF37]/30 to-[#D4AF37]/50 border-[#D4AF37]/70 font-extrabold text-amber-950"
                        : ""
                    }`}
                    onClick={btn.action}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Cash Out */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-[#8C827A] font-medium px-1">
                Auto cash out
              </span>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 2.00"
                  value={autoCashOut}
                  onChange={(e) => setAutoCashOut(e.target.value)}
                  className="w-full bg-[#F4EBE1]/70 border border-[#E2D6C3] focus:border-[#D4AF37] text-[#2D2621] rounded-xl px-3.5 py-2.5 text-base font-serif font-bold focus:outline-none shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div>
            {!hasBet ? (
              <button
                onClick={handlePlaceBet}
                disabled={status !== "waiting"}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-serif font-bold text-base rounded-2xl shadow-lg border border-amber-400/50 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "waiting"
                  ? `Place Bet (${countdown.toFixed(1)}s)`
                  : "Waiting for round..."}
              </button>
            ) : status === "waiting" && hasBet ? (
              <button
                disabled
                className="w-full py-4 bg-gradient-to-r from-[#D4AF37]/20 via-[#F3E5AB]/40 to-[#D4AF37]/20 border border-[#D4AF37]/60 text-amber-950 font-serif rounded-2xl shadow-inner cursor-default flex flex-col items-center justify-center gap-1"
              >
                <div className="flex items-center gap-1.5 text-xs tracking-wider uppercase font-bold text-amber-800">
                  <CheckCircle2 className="w-4 h-4 text-amber-700" />
                  <span>Bet Placed</span>
                </div>
                <span className="text-xl sm:text-2xl font-extrabold text-amber-950 tracking-tight">
                  {Number(betAmount).toFixed(2)} USD
                </span>
                <span className="text-xs font-semibold text-amber-900">
                  Starts in {countdown.toFixed(1)}s
                </span>
              </button>
            ) : !cashedOut && status === "flying" ? (
              <button
                onClick={() => handleCashOut(currentMultiplier)}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 text-white font-serif font-bold text-base rounded-2xl shadow-xl border border-emerald-400/50 cursor-pointer transition-all active:scale-[0.98] flex flex-col items-center justify-center"
              >
                <span className="tracking-wider uppercase text-xs font-extrabold">
                  CASH OUT
                </span>
                <span className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
                  <Banknote className="w-5 h-5" />
                  {(Number(betAmount) * currentMultiplier).toFixed(2)} USD
                </span>
              </button>
            ) : cashedOut ? (
              <button
                disabled
                className="w-full py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 border-2 border-[#D4AF37] text-amber-950 font-serif rounded-2xl shadow-[0_0_25px_rgba(212,175,55,0.4)] cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden"
              >
                <span className="text-white text-xl select-none drop-shadow">
                  🌿
                </span>
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-extrabold text-amber-950 drop-shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-100" />
                    <span>Cashed Out x{cashOutMultiplier.toFixed(2)}</span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    +{cashOutWinAmount.toFixed(2)} USD
                  </span>
                </div>
                <span className="text-white text-xl select-none scale-x-[-1] drop-shadow">
                  🌿
                </span>
              </button>
            ) : (
              <button
                disabled
                className="w-full py-4 bg-rose-900/20 border border-rose-600/40 text-rose-900 font-serif font-bold rounded-2xl cursor-not-allowed flex flex-col items-center justify-center gap-0.5"
              >
                <span className="text-xs uppercase tracking-wider font-bold text-rose-700">
                  Round Ended
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-rose-800 tracking-tight">
                  -{Number(betAmount).toFixed(2)} USD
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. LIVE BETS -KOMPONENTTI PELIN ALAPUOLELLA */}
      <LiveBetsHistory
        bets={liveBets}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}