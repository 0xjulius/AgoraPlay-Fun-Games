"import client";

import { useState, useEffect } from "react";
import { ShieldAlert, Sparkles } from "lucide-react";

interface WelcomeModalProps {
  onAccept?: () => void;
}

export default function WelcomeModal({ onAccept }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    // Tarkistetaanko onko käyttäjä jo hyväksynyt vastuuvapauslausekkeen tällä istunnolla
    const hasAccepted = sessionStorage.getItem("olympus_disclaimer_accepted");
    if (!hasAccepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    sessionStorage.setItem("olympus_disclaimer_accepted", "true");
    setIsOpen(false);
    onAccept?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-[#FAF6F0] border border-[#E2D6C3] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 text-[#2D2621]">
        
        {/* Otsikko ja kuvake */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 flex items-center justify-center text-amber-700 border border-[#D4AF37]/30 shrink-0">
            <ShieldAlert className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#2D2621] flex items-center gap-2">
              Portfolio Lab <span className="text-amber-600">✦</span>
            </h2>
            <p className="text-xs text-[#8C827A] uppercase tracking-wider font-medium">
              Entertainment Only / Vain viihdekäyttöön
            </p>
          </div>
        </div>

        {/* Tekstisisältö (Englanniksi ja Suomeksi) */}
        <div className="space-y-4 text-sm text-[#5C534B] leading-relaxed">
          {/* Englanti */}
          <div className="space-y-1">
            <p className="font-semibold text-[#2D2621]">English Disclaimer:</p>
            <p>
              This application is a <strong>portfolio demonstration project</strong> created for entertainment and educational purposes only. It does not involve real money gambling, payouts, or financial transactions. There are no real users of this application, and it is not a gambling service. All bets and outcomes are simulated for demonstration purposes.
            </p>
          </div>

          <div className="w-full h-[1px] bg-[#E2D6C3]" />

          {/* Suomi */}
          <div className="space-y-1">
            <p className="font-semibold text-[#2D2621]">Vastuuvapauslauseke (Suomi):</p>
            <p>
              Tämä sovellus on <strong>ohjelmistoportfolion esittelyprojekti</strong>, joka on tarkoitettu ainoastaan viihde- ja opiskelukäyttöön tekniseksi näytteeksi (web-kehitys, animaatiot ja pelilogiikka). Sivustolla ei ole oikeita käyttäjiä. Sivustolla ei voi pelata oikealla rahalla, eikä se ole rahapelisivusto.
            </p>
          </div>
        </div>

        {/* Hyväksymisnappi */}
        <button
          onClick={handleAccept}
          className="w-full py-3 px-6 rounded-2xl bg-[#D4AF37] hover:bg-[#C29F2F] text-white font-serif font-bold text-sm tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-white" />
          I Understand / Ymmärrän
        </button>

      </div>
    </div>
  );
}