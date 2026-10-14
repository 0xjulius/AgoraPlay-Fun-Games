"use client";
import { useState, useEffect } from "react";
import Sidebar from "../components/SideBar";
import Chat from "../components/Chat";
import Header from "../components/Header";
import RouletteGame from "../components/RouletteGame";
import GoldDust from "../components/GoldDust";
import bgImage from "@/assets/bg2.png";

export default function RoulettePage() {
  const [mounted, setMounted] = useState(false);
  const [activeGame, setActiveGame] = useState("Roulette");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  
  // Keskitetty saldotila, joka synkronoi yläpalkin ja pelin välillä
  const [balance, setBalance] = useState(2000.00);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="fixed inset-0 w-full h-full flex flex-row overflow-hidden select-none"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Vasen sivupalkki (Kiinteä, täysi korkeus) */}
      <div className="h-full shrink-0 z-40 hidden md:block">
        <Sidebar 
          activeGame={activeGame} 
          onSelectGame={setActiveGame} 
          onOpenChat={() => setMobileChatOpen(true)}
        />
      </div>

      {/* Mobiilin alavalikko */}
      <div className="md:hidden">
        <Sidebar 
          activeGame={activeGame} 
          onSelectGame={setActiveGame} 
          onOpenChat={() => setMobileChatOpen(true)}
        />
      </div>

      {/* Keskialue: Kiinteä matala Header ylhäällä + Rullaava pelialue sen alla */}
      <div className="flex-1 relative flex flex-col h-full overflow-hidden">
        
        {/* Kasinon kiinteä yläpalkki */}
        <div className="shrink-0 z-30">
          <Header 
            balance={balance} 
            onDeposit={() => setBalance((prev) => prev + 100.00)} 
          />
        </div>

        {/* Pelialueen rullaava kontaineri headerin alapuolella */}
        <div className="flex-1 relative flex flex-col items-center justify-start overflow-y-auto pb-28 md:pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <GoldDust />

          <main className="w-full z-20 px-2 sm:px-4 pt-16 sm:pt-20">
            {activeGame === "Roulette" ? (
              <RouletteGame 
                mounted={mounted} 
                balance={balance}
                setBalance={setBalance}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-[#8C827A] font-serif text-xl">
                {activeGame} tulossa pian...
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Oikea sivupalkki / Chat */}
      <Chat mobileOpen={mobileChatOpen} onCloseMobile={() => setMobileChatOpen(false)} />
    </div>
  );
}