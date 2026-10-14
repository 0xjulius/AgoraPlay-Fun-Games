import { Ticket, CheckCircle2, XCircle } from "lucide-react";

export interface UserBetItem {
  id: string;
  amount: number;
  multiplier: number;
  payout: number;
  status: "won" | "lost";
  time: string;
}

interface MyBetsHistoryProps {
  bets: UserBetItem[];
}

export default function MyBetsHistory({ bets }: MyBetsHistoryProps) {
  return (
    <div className="w-full bg-[#FAF6F0]/95 backdrop-blur-md rounded-3xl border border-[#E2D6C3] p-5 shadow-xl flex flex-col gap-4 mt-4">
      
      {/* Otsikko */}
      <div className="flex items-center justify-between border-b border-[#E2D6C3]/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-amber-800">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-amber-950 text-base">My Betting History</h3>
            <p className="text-xs text-[#8C827A]">Your personal divine wagers and outcomes</p>
          </div>
        </div>
      </div>

      {/* Vetolista / Taulukko */}
      {bets.length === 0 ? (
        <div className="text-center py-8 text-xs text-[#8C827A] font-serif">
          No bets placed yet in this session. Place a bet to see your history here!
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/40 [&::-webkit-scrollbar-thumb]:rounded-full">
          {bets.map((bet) => (
            <div
              key={bet.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#F4EFE6] border border-[#E5DAC8] shadow-xs text-xs font-serif"
            >
              <div className="flex items-center gap-3">
                {bet.status === "won" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-amber-950">
                    ${bet.amount.toFixed(2)} USD
                  </div>
                  <div className="text-[10px] text-[#8C827A] font-mono">
                    {bet.time}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-[#8C827A] text-[10px]">Multiplier</div>
                  <div className="font-bold font-mono text-amber-900">x{bet.multiplier.toFixed(2)}</div>
                </div>

                <div className="text-right min-w-[80px]">
                  <div className="text-[#8C827A] text-[10px]">Payout</div>
                  <div className={`font-bold font-mono ${bet.status === "won" ? "text-emerald-700" : "text-rose-700"}`}>
                    {bet.status === "won" ? `+$${bet.payout.toFixed(2)}` : `-$${bet.amount.toFixed(2)}`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}