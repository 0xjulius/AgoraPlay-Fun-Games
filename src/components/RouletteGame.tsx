import { useState } from "react";
import { motion } from "framer-motion";
import GyreRoulette from "./GyreRoulette";
import CoinCanvas from "./CoinCanvas";
import LightningCanvas from "./LightningCanvas";

interface RouletteGameProps {
  mounted: boolean;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
}

export default function RouletteGame({
  mounted,
  balance,
  setBalance,
}: RouletteGameProps) {
  const [isDarkFlash, setIsDarkFlash] = useState(false);
  const [showLightning, setShowLightning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const triggerDarkFlash = () => {
    const audio = new Audio("/sounds/0.wav");
    audio.volume = 0.3;
    audio.play().catch((err) => console.error("Audio playback error:", err));

    setIsDarkFlash(true);
    setShowLightning(true);

    setTimeout(() => {
      setShowLightning(false);
    }, 600);

    setTimeout(() => {
      setIsDarkFlash(false);
    }, 1200);
  };

  return (
    <div className="w-full relative flex flex-col items-center justify-start pt-24 sm:pt-28">
      {/* Tummennuskerros nollavoitolla */}
      <div
        className={`fixed inset-0 bg-black/80 transition-opacity duration-300 pointer-events-none z-10 ${
          isDarkFlash ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Salama-efekti */}
      {showLightning && <LightningCanvas />}

      {/* 3D-kolikko/patsas kiinnitettynä pelikortin yläreunaan */}
      {mounted && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute -top-6 sm:-top-4 left-0 w-full z-35 pointer-events-none"
        >
          <CoinCanvas isHidden={isModalOpen} />
        </motion.div>
      )}

      {/* Varsinainen rulettipeli */}
      <main className="w-full z-20 px-2 sm:px-4">
        <GyreRoulette
          balance={balance}
          setBalance={setBalance}
          onZeroWin={triggerDarkFlash}
          onModalToggle={(isOpen) => setIsModalOpen(isOpen)}
        />
      </main>
    </div>
  );
}
