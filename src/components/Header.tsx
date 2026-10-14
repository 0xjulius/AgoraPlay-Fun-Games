import { Coins, PlusCircle, Bell, User, Crown } from "lucide-react";

interface HeaderProps {
  balance?: number;
  onDeposit?: () => void;
}

export default function Header({ balance = 1250.50, onDeposit }: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 h-16 bg-[#FAF6F0]/85 backdrop-blur-md border-b border-[#E2D6C3] px-4 sm:px-6 flex items-center justify-between select-none shadow-xs">
      
      {/* Vasen reuna: Logo / Brändi */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#AA7C11] flex items-center justify-center text-[#FAF6F0] font-serif font-bold text-lg shadow-inner border border-[#F3E5AB]">
          ✦
        </div>
        <div>
          <h1 className="font-serif font-bold text-sm sm:text-base tracking-wider text-[#2D2621] leading-tight">
            OLYMPUS <span className="text-amber-600 font-normal text-xs">CASINO</span>
          </h1>
          <div className="flex items-center gap-1 text-[9px] text-[#8C827A] font-medium tracking-wide">
            <Crown className="w-2.5 h-2.5 text-amber-600" />
            <span>VIP LOUNGE</span>
          </div>
        </div>
      </div>

      {/* Oikea reuna: Saldo, talletus ja profiili */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        
        {/* Saldo-laatikko */}
        <div className="flex items-center gap-2 bg-[#F4EBE1]/90 border border-[#E2D6C3] px-3 py-1.5 rounded-xl shadow-inner">
          <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <div className="flex flex-col text-right">
            <span className="text-[9px] text-[#8C827A] font-semibold leading-none uppercase tracking-wider">Saldo</span>
            <span className="text-xs sm:text-sm font-bold text-[#2D2621] font-mono tracking-tight">
              {balance.toLocaleString("fi-FI", { minimumFractionDigits: 2 })} €
            </span>
          </div>
        </div>

        {/* Talleta-painike */}
        <button
          onClick={onDeposit}
          className="flex items-center gap-1.5 bg-gradient-to-r from-[#D4AF37] to-[#C59B27] hover:from-[#E2BE48] hover:to-[#D4AF37] text-[#2D2621] font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm border border-[#F3E5AB] transition-all cursor-pointer active:scale-95"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#2D2621]" />
          <span className="hidden sm:inline">Talleta</span>
        </button>

        {/* Ilmoitukset */}
        <button 
          className="p-2 rounded-xl bg-[#F0E8DC]/80 hover:bg-[#E2D6C3] text-[#2D2621] transition-all cursor-pointer border border-[#E2D6C3] shadow-xs relative"
          title="Ilmoitukset"
        >
          <Bell className="w-3.5 h-3.5 text-[#4A423C]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
        </button>

        {/* Profiili */}
        <div className="flex items-center pl-1.5 border-l border-[#E2D6C3]">
          <div className="w-9 h-9 rounded-xl bg-[#F0E8DC] border border-[#D4AF37]/50 flex items-center justify-center text-[#2D2621] font-bold shadow-xs cursor-pointer hover:bg-[#E2D6C3] transition-all">
            <User className="w-4 h-4 text-amber-800" />
          </div>
        </div>

      </div>
    </header>
  );
}