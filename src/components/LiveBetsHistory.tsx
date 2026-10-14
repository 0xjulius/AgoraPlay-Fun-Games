import { Ticket, Users, User } from "lucide-react";

export interface LiveBetItem {
  id: string;
  username: string;
  amount: number;
  multiplier: number | null;
  payout: number | null;
  status: "playing" | "won" | "lost";
  isUser?: boolean;
}

interface LiveBetsHistoryProps {
  bets: LiveBetItem[];
  activeTab: "all" | "my";
  setActiveTab: (tab: "all" | "my") => void;
}

export default function LiveBetsHistory({
  bets,
  activeTab,
  setActiveTab,
}: LiveBetsHistoryProps) {
  // Suodatetaan vedot välilehden mukaan
  const filteredBets = activeTab === "my" ? bets.filter((b) => b.isUser) : bets;

  // Järjestetään vedot: oma betti aina ensimmäisenä, muut suuruusjärjestyksessä (korkein panos ensin)
  const displayedBets = [...filteredBets].sort((a, b) => {
    if (a.isUser) return -1;
    if (b.isUser) return 1;
    return b.amount - a.amount;
  });

  return (
    <div className="w-full bg-[#FAF6F0]/95 backdrop-blur-md rounded-3xl border border-[#E2D6C3] p-5 shadow-xl flex flex-col gap-4 mt-2">
      
      {/* Yläpalkki ja välilehdet */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#E2D6C3]/60 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-amber-800">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-amber-950 text-base">Live Bets</h3>
            <p className="text-xs text-[#8C827A]">Active players and wagers in this ascent round</p>
          </div>
        </div>

        {/* Välilehtivalinta */}
        <div className="flex p-1 bg-[#F4EBE1] rounded-xl border border-[#E2D6C3]">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-[#FAF6F0] text-amber-900 shadow-sm border border-[#E2D6C3]"
                : "text-[#8C827A] hover:text-[#2D2621]"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Bets</span>
          </button>
          <button
            onClick={() => setActiveTab("my")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "my"
                ? "bg-[#FAF6F0] text-amber-900 shadow-sm border border-[#E2D6C3]"
                : "text-[#8C827A] hover:text-[#2D2621]"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Bets</span>
          </button>
        </div>
      </div>

      {/* Kiinteän korkeuden ja scrollbarin sisältävä alue */}
      <div className="h-[360px] flex flex-col overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#F4EFE6] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/80">
        
        {/* Kiinteät sarakeotsikot */}
        <div className="grid grid-cols-4 px-3 py-2 text-[11px] font-serif font-bold text-[#8C827A] uppercase tracking-wider border-b border-[#E2D6C3]/40 sticky top-0 bg-[#FAF6F0] backdrop-blur-sm z-10">
          <span>User</span>
          <span className="text-center">Bet ($)</span>
          <span className="text-center">Cash Out</span>
          <span className="text-right">Profit</span>
        </div>

        {displayedBets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-[#8C827A] font-serif">
            {activeTab === "my" 
              ? "You haven't placed a bet in this round yet." 
              : "Waiting for players to join the round..."}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[#E2D6C3]/30">
            {displayedBets.map((bet, index) => (
              <div
                key={bet.id}
                className={`grid grid-cols-4 items-center px-3 py-3 text-xs font-serif transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards ${
                  bet.isUser 
                    ? "bg-[#FFF9E6]/90 font-semibold" 
                    : "hover:bg-[#F4EBE1]/40"
                }`}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Käyttäjänimi */}
                <span className={`font-bold truncate flex items-center gap-1.5 ${bet.isUser ? "text-amber-900" : "text-amber-950"}`}>
                  <span className="w-2 h-2 rounded-full bg-amber-500/80 shrink-0" />
                  {bet.username} {bet.isUser && "(You)"}
                </span>

                {/* Panos */}
                <span className="text-center font-mono font-semibold text-[#2D2621]">
                  ${bet.amount.toFixed(2)}
                </span>

                {/* Cash Out / Kerroin */}
                <div className="text-center">
                  {bet.status === "won" && bet.multiplier ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600/15 text-emerald-800 font-bold font-mono text-[11px] border border-emerald-500/30">
                      {bet.multiplier.toFixed(2)}x
                    </span>
                  ) : bet.status === "lost" ? (
                    <span className="text-rose-600 font-semibold text-[11px]">Crashed</span>
                  ) : (
                    <span className="text-amber-700/80 animate-pulse text-[11px] font-semibold">In flight...</span>
                  )}
                </div>

                {/* Voitto / Tappio */}
                <div className="text-right font-mono font-bold">
                  {bet.status === "won" && bet.payout ? (
                    <span className="text-emerald-700">
                      +${(bet.payout - bet.amount).toFixed(2)}
                    </span>
                  ) : bet.status === "lost" ? (
                    <span className="text-rose-700">-${bet.amount.toFixed(2)}</span>
                  ) : (
                    <span className="text-[#8C827A]">-</span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}