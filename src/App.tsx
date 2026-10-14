import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./components/SideBar";
import Chat from "./components/Chat";
import Header from "./components/Header";
import RouletteGame from "./components/RouletteGame";
import CrashGame from "./components/CrashGame";
import GoldDust from "./components/GoldDust";
import bgImage from "./assets/bg2.png";

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  
  // Yhteinen keskitetty saldo sovelluksen tasolla
  const [balance, setBalance] = useState(2000.00);

  const navigate = useNavigate();
  const location = useLocation();

  // Määritetään aktiivinen peli nykyisen URL-polun perusteella
  const activeGame = location.pathname.includes("crash") ? "Crash" : "Roulette";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelectGame = (game: string) => {
    if (game === "Crash") {
      navigate("/crash");
    } else if (game === "Roulette") {
      navigate("/");
    }
  };

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
          onSelectGame={handleSelectGame} 
          onOpenChat={() => setMobileChatOpen(true)}
        />
      </div>

      {/* Mobiilin alavalikko */}
      <div className="md:hidden">
        <Sidebar 
          activeGame={activeGame} 
          onSelectGame={handleSelectGame} 
          onOpenChat={() => setMobileChatOpen(true)}
        />
      </div>

      {/* Keskialue: Kiinteä matala Header ylhäällä + Rullaava pelialue sen alla */}
      <div className="flex-1 relative flex flex-col h-full overflow-hidden">
        
        {/* Kasinon kiinteä yläpalkki näyttää yhteistä saldoa */}
        <div className="shrink-0 z-30">
          <Header 
            balance={balance} 
            onDeposit={() => setBalance((prev) => prev + 100.00)} 
          />
        </div>

        {/* Pelialueen rullaava kontaineri headerin alapuolella */}
        <div className="flex-1 relative flex flex-col items-center justify-start overflow-y-auto pb-28 md:pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <GoldDust />

          {/* Reititys ruletin ja crash-pelin välillä */}
          <main className="w-full z-20 px-2 sm:px-4 pt-28 sm:pt-20">
            <Routes>
              <Route 
                path="/" 
                element={
                  <RouletteGame 
                    mounted={mounted} 
                    balance={balance}
                    setBalance={setBalance}
                  />
                } 
              />
              <Route 
                path="/crash" 
                element={
                  <CrashGame 
                    balance={balance}
                    setBalance={setBalance}
                  />
                } 
              />
            </Routes>
          </main>
        </div>
      </div>

      {/* Chat-komponentti (Kiinteä oikealla / mobiilissa modaali) */}
      <Chat mobileOpen={mobileChatOpen} onCloseMobile={() => setMobileChatOpen(false)} />
    </div>
  );
}