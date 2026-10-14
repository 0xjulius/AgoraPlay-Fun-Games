import { useState, useEffect } from "react";
import { 
  CircleDollarSign, 
  Rocket, 
  RefreshCw, 
  Triangle, 
  Dices, 
  Gem, 
  Bomb,
  ChevronLeft,
  ChevronRight,
  MessageSquare
} from "lucide-react";

interface SidebarProps {
  activeGame?: string;
  onSelectGame?: (game: string) => void;
  onOpenChat?: () => void;
}

const navItems = [
  { name: "Roulette", icon: CircleDollarSign },
  { name: "Crash", icon: Rocket },
  { name: "Duels", icon: RefreshCw },
  { name: "Plinko", icon: Triangle },
  { name: "Dice", icon: Dices },
  { name: "Towers", icon: Gem },
  { name: "Mines", icon: Bomb },
];

export default function Sidebar({ activeGame = "Roulette", onSelectGame, onOpenChat }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Pakotetaan collapsed-tila automaattisesti, jos näyttö on riittävän kapea (esim. alle 1280px / lg)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    // Tarkistetaan heti alussa
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <aside className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FAF6F0]/95 backdrop-blur-md border-t border-[#E2D6C3] flex items-center justify-around p-2 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeGame === item.name;

          return (
            <button
              key={item.name}
              onClick={() => onSelectGame?.(item.name)}
              className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                isActive
                  ? "bg-[#D4AF37]/20 text-[#8C6D18] border border-[#D4AF37]/40 shadow-inner"
                  : "text-[#8C827A] hover:text-[#2D2621]"
              }`}
              title={item.name}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[#D4AF37]" : "text-[#8C827A]"}`} />
            </button>
          );
        })}

        <button
          onClick={onOpenChat}
          className="p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center text-[#8C827A] hover:text-[#2D2621] bg-[#D4AF37]/10 border border-[#D4AF37]/30"
          title="Avaa chat"
        >
          <MessageSquare className="w-5 h-5 text-amber-700" />
        </button>
      </aside>

      {/* Desktop Collapsible Sidebar */}
      <aside 
        className={`hidden md:flex flex-col bg-[#FAF6F0]/90 backdrop-blur-md border-r border-[#E2D6C3] select-none shrink-0 shadow-sm z-40 transition-all duration-300 h-full ${
          isCollapsed ? "w-20 p-3" : "w-64 p-4"
        }`}
      >
        <div className="flex items-center justify-between mb-6 px-2 pt-2">
          {!isCollapsed && (
            <span className="font-serif font-bold text-lg tracking-wide text-[#2D2621]">
              Lobby <span className="text-amber-600">✦</span>
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-[#F0E8DC]/80 hover:bg-[#E2D6C3] text-[#2D2621] transition-all cursor-pointer mx-auto md:mx-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeGame === item.name;

            return (
              <button
                key={item.name}
                onClick={() => onSelectGame?.(item.name)}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl font-medium text-sm transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#D4AF37]/15 text-[#8C6D18] border border-[#D4AF37]/40 shadow-inner font-bold"
                    : "text-[#8C827A] hover:text-[#2D2621] hover:bg-[#F0E8DC]/60 border border-transparent"
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-[#D4AF37]" : "text-[#8C827A]"}`} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}