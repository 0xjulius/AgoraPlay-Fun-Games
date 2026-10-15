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

const MY_BETS_STORAGE_KEY = "crashgame:myBets";
const MY_BETS_MAX = 50;

// Lataa omat vedot localStoragesta. Kesken jääneet ("playing") vedot merkitään hävityiksi,
// koska kierros on päättynyt sivun sulkeutuessa.
const loadMyBets = (): LiveBetItem[] => {
  try {
    const raw = localStorage.getItem(MY_BETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (b): b is LiveBetItem =>
          !!b && typeof b.id === "string" && typeof b.amount === "number",
      )
      .map((b) =>
        b.status === "playing" ? { ...b, status: "lost" as const } : b,
      )
      .slice(0, MY_BETS_MAX);
  } catch {
    return [];
  }
};

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
  // Omien vetojen historia, tallennetaan localStorageen
  const [myBets, setMyBets] = useState<LiveBetItem[]>(loadMyBets);

  const hasBetRef = useRef(hasBet);
  const cashedOutRef = useRef(cashedOut);
  const autoCashOutRef = useRef(autoCashOut);
  const pointsRef = useRef<{ t: number; m: number }[]>([]);
  const botTargetsRef = useRef<{ id: string; target: number }[]>([]);

  // Plot-alueen koko pikseleinä, jotta käyrä ja pallo piirretään vääristymättä
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotSize, setPlotSize] = useState({ w: 0, h: 0 });
  // Hiiren alla oleva cashout-merkki (tooltipin näyttämiseen)
  const [hoveredCashout, setHoveredCashout] = useState<string | null>(null);
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setPlotSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Päivitä oman vedon tila historiaan (lisäys vedon alkaessa, päivitys voitossa/häviössä)
  useEffect(() => {
    const userBet = liveBets.find((b) => b.isUser);
    if (!userBet) return;
    setMyBets((prev) => {
      const idx = prev.findIndex((b) => b.id === userBet.id);
      if (idx === -1) return [userBet, ...prev].slice(0, MY_BETS_MAX);
      const old = prev[idx];
      if (
        old.status === userBet.status &&
        old.multiplier === userBet.multiplier &&
        old.payout === userBet.payout
      ) {
        return prev;
      }
      const next = [...prev];
      next[idx] = userBet;
      return next;
    });
  }, [liveBets]);

  // Tallenna historia localStorageen aina kun se muuttuu
  useEffect(() => {
    try {
      localStorage.setItem(MY_BETS_STORAGE_KEY, JSON.stringify(myBets));
    } catch {
      // localStorage ei käytössä (esim. yksityinen selaus) -> jatketaan ilman tallennusta
    }
  }, [myBets]);

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

  const playWinSound = () => {
    const audio = new Audio("/sounds/win.wav");
    audio.play().catch((err) => console.error("Audio playback error:", err));
  };

  const generateBalancedCrashPoint = (): number => {
    const TEST_MODE_TARGET = 0;
    if (TEST_MODE_TARGET) {
      return TEST_MODE_TARGET;
    }

    // Tasainen satunnaisluku väliltä [0, 1) (53 bitin tarkkuus)
    const array = new Uint32Array(2);
    window.crypto.getRandomValues(array);
    const r = (array[0] * 2097152 + (array[1] >>> 11)) / 9007199254740992;

    // Klassinen crash-jakauma: P(kerroin >= m) = (1 - houseEdge) / m
    //  - ~3 % kierroksista kaatuu heti (1.00x)
    //  - ~50 % kaatuu alle 2x
    //  - ~19 % yltää yli 5x, ~10 % yli 10x, ~1 % yli 100x
    // Jakaumalla on "paksu häntä", joten kertoimet vaihtelevat paljon eikä ole mitään
    // minimiä, jonka yläpuolella pysyttäisiin (aiempi kaava antoi lähes aina yli 1.86x).
    const houseEdge = 0.03;
    const raw = (1 - houseEdge) / (1 - r);
    const point = Math.floor(raw * 100) / 100;
    return Math.max(point, 1.0);
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
      setLiveBets([]);

      setCountdown(3.0);
      const startTime = Date.now();

      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, 3.0 - elapsed);
        setCountdown(Number(remaining.toFixed(1)));
      }, 100);

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
            placedAt: Date.now(),
          },
        ]);
      }

      const botNames = [
        "ZeusMaster",
        "Athena99",
        "Ares_God",
        "Hermes_Fast",
        "Poseidon7",
        "Hera_Queen",
        "Apollo_Sun",
        "Artemis_Hunt",
        "Chronos",
        "OlympusKing",
        "Midas_Touch",
        "Spartan300",
        "Minotaur",
        "Pegasus",
        "Hades_Under",
      ];
      const count = Math.floor(Math.random() * 4) + 5;
      const shuffled = [...botNames].sort(() => 0.5 - Math.random());
      const allTargets: { id: string; target: number }[] = [];
      const generatedBots: LiveBetItem[] = [];

      for (let i = 0; i < count; i++) {
        const id = `bot-${i}-${Date.now()}`;
        const target = Number(
          (1.1 + Math.pow(Math.random(), 2) * 12).toFixed(2),
        );
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

      generatedBots.forEach((bot, idx) => {
        const delay =
          300 +
          Math.floor((idx / generatedBots.length) * 1800) +
          Math.random() * 200;
        const t = setTimeout(() => {
          setLiveBets((prev) => {
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
        if (currentMultVal >= 2000) {
          speedFactor = 8.0;
        } else if (currentMultVal >= 500) {
          speedFactor = 5.0;
        } else if (currentMultVal >= 100) {
          speedFactor = 3.0;
        } else if (currentMultVal >= 30) {
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

            if (newMult >= target && target <= crashPoint) {
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
          newMult >= Number(autoCashOutRef.current) &&
          Number(autoCashOutRef.current) <= crashPoint
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

    setLiveBets((prev) => {
      const userBet: LiveBetItem = {
        id: `user-bet-${Date.now()}`,
        username: "You",
        amount: amount,
        multiplier: null,
        payout: null,
        status: "playing",
        isUser: true,
        placedAt: Date.now(),
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

    playWinSound();
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
    // 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, ... (ei ylärajaa)
    for (let mag = 1; ; mag *= 10) {
      for (const base of [1, 2, 5]) {
        const st = base * mag;
        if (Math.floor(max / st) <= maxMarks) return st;
      }
    }
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

  // ---- KÄYRÄ JA PALLO (pikselikoordinaatit) ----
  const { w: pw, h: ph } = plotSize;
  const LABEL_COL = 56; // oikean reunan numerosarakkeen leveys, katkoviiva päättyy tähän

  const toPx = (t: number, m: number) => ({
    x: xFrac(t) * pw,
    y: (1 - yFrac(m)) * ph,
  });

  // Harvennetaan pisteet (max ~160), jotta SVG pysyy kevyenä pitkälläkin kierroksella
  const rawPoints = pointsRef.current;
  const stride = Math.max(1, Math.ceil(rawPoints.length / 160));
  const curvePts = rawPoints
    .filter((_, i) => i % stride === 0)
    .map((pt) => toPx(pt.t, pt.m));
  // Viimeinen piste on aina pallon oikea sijainti, jolloin käyrä yltää täsmälleen palloon
  const head = toPx(elapsedSeconds, currentMultiplier);
  curvePts.push(head);

  // Pehmennetty käyrä (neliölliset Bézier-käyrät pisteiden välipisteiden kautta)
  const f = (n: number) => n.toFixed(1);
  let linePath = "";
  if (curvePts.length > 1) {
    linePath = `M ${f(curvePts[0].x)} ${f(curvePts[0].y)}`;
    for (let i = 1; i < curvePts.length - 1; i++) {
      const mx = (curvePts[i].x + curvePts[i + 1].x) / 2;
      const my = (curvePts[i].y + curvePts[i + 1].y) / 2;
      linePath += ` Q ${f(curvePts[i].x)} ${f(curvePts[i].y)} ${f(mx)} ${f(my)}`;
    }
    linePath += ` L ${f(head.x)} ${f(head.y)}`;
  }
  const areaPath = linePath
    ? `${linePath} L ${f(head.x)} ${f(ph)} L ${f(curvePts[0].x)} ${f(ph)} Z`
    : "";

  // ---- CASHOUT-MERKINNÄT KÄYRÄLLÄ ----
  // Cashoutin ajankohta haetaan käyrän pisteistä kertoimen perusteella (kerroin kasvaa
  // aina ajan funktiona), joten merkintä osuu täsmälleen käyrälle eikä vaadi lisätietoa vedolle.
  const timeline = [...rawPoints, { t: elapsedSeconds, m: currentMultiplier }];
  const timeAtMultiplier = (m: number): number => {
    if (m <= timeline[0].m) return timeline[0].t;
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i].m >= m) {
        const a = timeline[i - 1];
        const b = timeline[i];
        const span = b.m - a.m;
        return span <= 0 ? b.t : a.t + ((m - a.m) / span) * (b.t - a.t);
      }
    }
    return timeline[timeline.length - 1].t;
  };

  const cashoutMarkers =
    isRunning && pw > 0 && ph > 0
      ? liveBets
          .filter((b) => b.status === "won" && b.multiplier && b.payout)
          .map((b) => {
            const mult = b.multiplier as number;
            return {
              id: b.id,
              isUser: !!b.isUser,
              username: b.username,
              amount: b.amount,
              multiplier: mult,
              payout: b.payout as number,
              ...toPx(timeAtMultiplier(mult), mult),
            };
          })
      : [];
  // Kaikkien merkkien summat näytetään. Vierekkäiset summat porrastetaan kahdelle
  // korkeudelle (vasemmalta oikealle), jotta tekstit eivät mene päällekkäin.
  const labelRow = new Map(
    [...cashoutMarkers]
      .sort((a, b) => a.x - b.x)
      .map((c, i) => [c.id, i % 2] as const),
  );

  const isCrashed = status === "crashed";
  const accent = isCrashed ? "#F43F5E" : "#F59E0B";
  const ballY = (1 - yFrac(currentMultiplier)) * 100;

  // Toimintopainike
  const renderActionButton = () => {
    if (!hasBet) {
      return (
        <button
          onClick={handlePlaceBet}
          disabled={status !== "waiting"}
          className="w-full py-3.5 px-2 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 enabled:hover:from-amber-500 enabled:hover:to-amber-600 text-white font-serif font-bold text-sm sm:text-base rounded-2xl shadow-lg border border-amber-400/50 cursor-pointer transition-all active:scale-[0.98] disabled:from-amber-700 disabled:via-amber-700 disabled:to-amber-800 disabled:border-amber-600 disabled:cursor-not-allowed whitespace-nowrap leading-tight"
        >
          {status === "waiting"
            ? `Place Bet (${countdown.toFixed(1)}s)`
            : "Waiting for round..."}
        </button>
      );
    }
    if (status === "waiting" && hasBet) {
      return (
        <button
          disabled
          className="w-full py-4 bg-gradient-to-r from-[#F3E5AB] via-[#FBF3D5] to-[#F3E5AB] border border-[#D4AF37] text-amber-950 font-serif rounded-2xl shadow-inner cursor-default flex flex-col items-center justify-center gap-1"
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
      );
    }
    if (!cashedOut && status === "flying") {
      return (
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
      );
    }
    if (cashedOut) {
      return (
        <button
          disabled
          className="w-full py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 border-2 border-[#D4AF37] text-amber-950 font-serif rounded-2xl shadow-[0_0_25px_rgba(212,175,55,0.4)] cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden"
        >
          <span className="text-white text-xl select-none drop-shadow">🌿</span>
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
      );
    }
    return (
      <button
        disabled
        className="w-full py-4 bg-rose-100 border border-rose-400 text-rose-900 font-serif font-bold rounded-2xl cursor-not-allowed flex flex-col items-center justify-center gap-0.5"
      >
        <span className="text-xs uppercase tracking-wider font-bold text-rose-800">
          Round Ended
        </span>
        <span className="text-xl sm:text-2xl font-extrabold text-rose-900 tracking-tight">
          -{Number(betAmount).toFixed(2)} USD
        </span>
      </button>
    );
  };

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

      {/* 2. MAIN LAYOUT - Käytetään lg: grid-cols-12 breakpointtia */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4">
        {/* RIGHT PANEL (CHART & FLIGHT) */}
        <div className="order-1 lg:order-2 lg:col-span-8 bg-[#1A1614] rounded-3xl border border-[#D4AF37]/40 p-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[440px]">
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

          {/* PLOT-ALUE: käyrä, täyttö ja pallo yhdessä SVG:ssä (pikselikoordinaatit) */}
          <div
            ref={plotRef}
            className="absolute left-16 right-6 top-16 bottom-16 pointer-events-none z-10"
          >
            {isRunning && linePath && pw > 0 && ph > 0 && (
              <svg
                className="absolute inset-0 overflow-visible"
                width={pw}
                height={ph}
                viewBox={`0 0 ${pw} ${ph}`}
              >
                <defs>
                  {/* Viiva vaalenee alusta kohti palloa */}
                  <linearGradient
                    id="crash-line-grad"
                    gradientUnits="userSpaceOnUse"
                    x1={curvePts[0].x}
                    y1="0"
                    x2={head.x}
                    y2="0"
                  >
                    <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={isCrashed ? "#FDA4AF" : "#FDE68A"} stopOpacity="1" />
                  </linearGradient>
                  {/* Käyrän alapuolen täyttö */}
                  <linearGradient id="crash-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={accent} stopOpacity="0" />
                  </linearGradient>
                  <radialGradient id="crash-ball-grad" cx="35%" cy="35%" r="70%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="45%" stopColor={isCrashed ? "#FDA4AF" : "#FDE68A"} />
                    <stop offset="100%" stopColor={accent} />
                  </radialGradient>
                </defs>

                <path d={areaPath} fill="url(#crash-area-grad)" />

                {/* Vaakaviiva pallosta oikean reunan kerroinmerkkiin */}
                {head.x < pw - LABEL_COL && (
                  <line
                    x1={head.x}
                    y1={head.y}
                    x2={pw - LABEL_COL}
                    y2={head.y}
                    stroke={accent}
                    strokeOpacity="0.7"
                    strokeWidth="1.5"
                    strokeDasharray="2 5"
                    strokeLinecap="round"
                  />
                )}

                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#crash-line-grad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
                />

                {/* Pelaajien cashoutit käyrällä */}
                {cashoutMarkers.map((c) => (
                  <g
                    key={c.id}
                    transform={`translate(${f(c.x)} ${f(c.y)})`}
                    style={{ pointerEvents: "all", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredCashout(c.id)}
                    onMouseLeave={() =>
                      setHoveredCashout((cur) => (cur === c.id ? null : cur))
                    }
                  >
                    {/* Näkymätön, merkkiä isompi osuma-alue hoverille */}
                    <circle r="15" fill="transparent" />
                    <g
                      style={{
                        transform: hoveredCashout === c.id ? "scale(1.25)" : "scale(1)",
                        transition: "transform 120ms ease-out",
                      }}
                    >
                    <g>
                      <animateTransform
                        attributeName="transform"
                        type="scale"
                        from="0"
                        to="1"
                        dur="0.25s"
                        fill="freeze"
                      />
                      {c.isUser ? (
                        <>
                          <circle
                            r="11"
                            fill="url(#crash-ball-grad)"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            style={{ filter: "drop-shadow(0 0 6px #F59E0B)" }}
                          />
                          <text
                            textAnchor="middle"
                            dy="2.5"
                            fontSize="7"
                            fontWeight="800"
                            fill="#1A1614"
                            fontFamily="ui-monospace, monospace"
                          >
                            YOU
                          </text>
                        </>
                      ) : (
                        <>
                          <circle
                            r="9"
                            fill="#1A1614"
                            fillOpacity="0.85"
                            stroke="#D4AF37"
                            strokeOpacity="0.8"
                            strokeWidth="1.5"
                          />
                          <circle cy="-2.5" r="2.6" fill="#FAF6F0" />
                          <path d="M -4.8 5.2 a4.8 4 0 0 1 9.6 0 z" fill="#FAF6F0" />
                        </>
                      )}
                    </g>
                    </g>
                    <text
                        pointerEvents="none"
                        y={c.isUser ? -18 : labelRow.get(c.id) === 0 ? -15 : -28}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="800"
                        fill={c.isUser ? "#FDE68A" : "#6EE7B7"}
                        stroke="rgba(0,0,0,0.65)"
                        strokeWidth="3"
                        paintOrder="stroke"
                        fontFamily="ui-monospace, monospace"
                      >
                        ${c.payout.toFixed(2)}
                      </text>
                  </g>
                ))}

                {/* Pallo / räjähdys */}
                <g transform={`translate(${f(head.x)} ${f(head.y)})`}>
                  {!isCrashed ? (
                    <>
                      <circle r="10" fill={accent} opacity="0.3">
                        <animate attributeName="r" values="8;22;8" dur="1.6s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.4;0;0.4" dur="1.6s" repeatCount="indefinite" />
                      </circle>
                      <circle
                        r="7"
                        fill="url(#crash-ball-grad)"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        style={{ filter: `drop-shadow(0 0 8px ${accent})` }}
                      />
                    </>
                  ) : (
                    <>
                      <circle r="6" fill="none" stroke={accent} strokeWidth="3">
                        <animate attributeName="r" from="6" to="34" dur="0.7s" fill="freeze" />
                        <animate attributeName="opacity" from="1" to="0" dur="0.7s" fill="freeze" />
                      </circle>
                      <circle
                        r="6"
                        fill={accent}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        style={{ filter: `drop-shadow(0 0 10px ${accent})` }}
                      />
                    </>
                  )}
                </g>
              </svg>
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

          {/* Asteikko: katkoviiva + numero samassa rivissä, jolloin ne ovat aina samalla tasolla.
              Ei transitiota, jotta rivit eivät jää jälkeen kun asteikko skaalautuu. */}
          <div className="absolute left-16 right-6 top-16 bottom-16 pointer-events-none z-10">
            {scaleMarks.map((mark) => (
              <div
                key={mark}
                className="absolute left-0 right-0 flex items-center gap-2 transition-none"
                style={{
                  top: `${(1 - yFrac(mark)) * 100}%`,
                  transform: "translateY(-50%)",
                }}
              >
                <div className="flex-1 border-t border-dashed border-[#FAF6F0]/50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                <span className="w-12 text-right pr-2 font-mono text-xs font-bold text-[#FAF6F0] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  x{mark}
                </span>
              </div>
            ))}

            {/* Nykyisen kertoimen merkki pallon korkeudella */}
            {isRunning && (
              <div
                className="absolute right-0 transition-none"
                style={{ top: `${ballY}%`, transform: "translateY(-50%)" }}
              >
                <span
                  className={`block px-1.5 py-0.5 rounded-md font-mono text-[11px] font-extrabold shadow-lg ${
                    isCrashed ? "bg-rose-500 text-white" : "bg-amber-400 text-[#1A1614]"
                  }`}
                >
                  {currentMultiplier.toFixed(2)}x
                </span>
              </div>
            )}
          </div>

          {/* TOOLTIP: hoverattavan cashout-merkin tiedot */}
          <div className="absolute left-16 right-6 top-16 bottom-16 pointer-events-none z-40">
            {(() => {
              const m = cashoutMarkers.find((c) => c.id === hoveredCashout);
              if (!m) return null;
              const profit = m.payout - m.amount;
              const showAbove = m.y > ph * 0.55;
              return (
                <div
                  className="absolute w-44 rounded-xl border border-[#D4AF37]/50 bg-[#1A1614]/95 px-3 py-2.5 text-xs font-serif text-[#FAF6F0] shadow-2xl backdrop-blur-sm animate-in fade-in duration-150"
                  style={{
                    left: Math.min(Math.max(m.x, 88), Math.max(88, pw - 88)),
                    top: m.y,
                    transform: showAbove
                      ? "translate(-50%, calc(-100% - 46px))"
                      : "translate(-50%, 20px)",
                  }}
                >
                  <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-[#D4AF37]/30 font-bold text-amber-300 truncate">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    {m.username}
                    {m.isUser && " (You)"}
                  </div>
                  <div className="flex flex-col gap-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#FAF6F0]/60">Bet</span>
                      <span className="font-bold">${m.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#FAF6F0]/60">Cash out</span>
                      <span className="font-bold text-emerald-300">{m.multiplier.toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#FAF6F0]/60">Payout</span>
                      <span className="font-bold">${m.payout.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#FAF6F0]/60">Profit</span>
                      <span className="font-bold text-emerald-300">+${profit.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Ajanlasku alhaalla */}
          <div className="absolute bottom-4 left-16 right-16 flex justify-between text-xs text-[#FAF6F0] font-mono pointer-events-none border-t border-[#FAF6F0]/40 pt-2 z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-bold">
            <span>0.0s</span>
            <span>{(xMaxSeconds * 0.5).toFixed(1)}s</span>
            <span>{xMaxSeconds.toFixed(1)}s</span>
          </div>
        </div>

        {/* MOBIILIN / TABLETIN TOIMINTOPAINIKE HETI PELIN ALAPUOLELLA (Alle lg-näyttöjen) */}
        <div className="block lg:hidden order-1 w-full">
          {renderActionButton()}
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

              {/* Quick Adjustment Buttons - Korjattu pakotettu 2-rivinen grid */}
              <div className="grid grid-cols-4 gap-1 pt-1">
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
                    className={`gyre-btn py-1.5 px-0.5 rounded-lg text-xs font-bold border transition-all active:scale-95 shadow-xs text-center cursor-pointer disabled:opacity-50 whitespace-nowrap min-w-0 ${
                      btn.label === "MAX"
                        ? "bg-gradient-to-r from-[#D4AF37]/30 to-[#D4AF37]/50 border-[#D4AF37]/70 font-extrabold text-amber-950 col-span-2"
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

          {/* DESKTOP-NÄKYMÄN TOIMINTOPAINIKE (Vain lg-näytöistä ylöspäin) */}
          <div className="hidden lg:block">{renderActionButton()}</div>
        </div>
      </div>

      {/* 3. LIVE BETS -KOMPONENTTI PELIN ALAPUOLELLA */}
      <LiveBetsHistory
        bets={activeTab === "my" ? myBets : liveBets}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}