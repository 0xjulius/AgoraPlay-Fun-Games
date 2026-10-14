import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, ChevronRight, ChevronLeft, Users, X, ChevronDown } from "lucide-react";
import { mockChatMessages, type ChatMessage } from "../data/mockData";

interface ChatProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Chat({ mobileOpen = false, onCloseMobile }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages.slice(0, 5));
  const [inputText, setInputText] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIndexRef = useRef(5);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, mobileOpen]);

  // Ajastin, joka kiertää mockChatMessages-viestit alusta uudelleen loppuun päästyään
  useEffect(() => {
    const interval = setInterval(() => {
      const currentIndex = messageIndexRef.current;
      const nextMsg = mockChatMessages[currentIndex % mockChatMessages.length];
      
      const freshMsg: ChatMessage = {
        ...nextMsg,
        id: `${Date.now()}-${currentIndex}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, freshMsg]);
      messageIndexRef.current = currentIndex + 1;
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: "Sinä",
      avatar: "👑",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      role: "vip",
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
  };

  const chatContent = (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-3 text-xs group animate-chat-in">
            <span className="text-lg leading-none p-1.5 bg-[#F0E8DC] rounded-xl shrink-0 border border-[#E2D6C3]/60 shadow-xs">
              {msg.avatar}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className={`font-bold tracking-wide truncate ${
                    msg.role === "mod"
                      ? "text-emerald-700"
                      : msg.role === "vip"
                      ? "text-amber-700"
                      : "text-[#2D2621]"
                  }`}
                >
                  {msg.user}
                </span>
                <span className="text-[10px] text-[#8C827A] font-medium shrink-0">{msg.time}</span>
              </div>
              <p className="text-[#4A423C] break-words leading-relaxed bg-[#F4EBE1]/70 px-3 py-2 rounded-2xl border border-[#E2D6C3]/50 shadow-xs">
                {msg.text}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-3.5 border-t border-[#E2D6C3] bg-[#FAF6F0]">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Kirjoita viesti..."
            className="w-full bg-[#F4EBE1]/70 border border-[#E2D6C3] focus:border-[#D4AF37] text-[#2D2621] placeholder-[#8C827A] rounded-xl pl-3.5 pr-10 py-2.5 text-xs focus:outline-none shadow-inner transition-colors"
          />
          <button
            type="submit"
            className="absolute right-2 p-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-amber-800 rounded-lg transition-all cursor-pointer shadow-xs"
            title="Lähetä viesti"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </>
  );

  const roomButton = (
    <button
      type="button"
      onClick={() => {}}
      className="w-full flex items-center justify-between bg-[#F0E8DC] hover:bg-[#EAE0D0] text-[#2D2621] px-3 py-2 rounded-xl border border-[#E2D6C3] shadow-xs transition-colors cursor-default"
      title="Aktiivinen huone"
    >
      <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
        <span>Finnish Room</span>
        <span className="text-sm">🇫🇮</span>
      </div>
      <ChevronDown className="w-4 h-4 text-[#8C827A]" />
    </button>
  );

  return (
    <>
      {/* Desktopin kiinteä sivupalkki-chat */}
      <aside
        className={`hidden lg:flex flex-col bg-[#FAF6F0]/95 backdrop-blur-md border-l border-[#E2D6C3] select-none shrink-0 shadow-2xl z-40 transition-all duration-300 h-full ${
          isCollapsed ? "w-20" : "w-80"
        }`}
      >
        <div className="p-3.5 border-b border-[#E2D6C3] bg-[#F4EBE1]/60">
          {!isCollapsed ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-[#D4AF37]/15 text-amber-700 border border-[#D4AF37]/30 shadow-inner">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[#2D2621] font-serif font-bold text-sm">
                      <span>Lobby Chat</span>
                      <span className="text-amber-600">✦</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[#8C827A]">
                      <Users className="w-3 h-3 text-emerald-600" />
                      <span>142 pelaajaa paikalla</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-1.5 rounded-xl bg-[#EFE4D4] hover:bg-[#E2D6C3] text-[#2D2621] transition-all cursor-pointer shadow-sm"
                  title="Pienennä chat"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {roomButton}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-2 rounded-xl bg-[#EFE4D4] hover:bg-[#E2D6C3] text-[#2D2621] transition-all cursor-pointer shadow-sm"
                title="Laajenna chat"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-amber-700">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        {!isCollapsed && chatContent}
      </aside>

      {/* Mobiilin chat-modaali */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end lg:hidden animate-fade-in">
          <div className="w-full sm:w-80 h-full bg-[#FAF6F0] shadow-2xl relative flex flex-col border-l border-[#E2D6C3]">
            <div className="p-4 border-b border-[#E2D6C3] bg-[#F4EBE1]/80">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-[#D4AF37]/15 text-amber-700 border border-[#D4AF37]/30 shadow-inner">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[#2D2621] font-serif font-bold text-sm">
                        <span>Lobby Chat</span>
                        <span className="text-amber-600">✦</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[#8C827A]">
                        <Users className="w-3 h-3 text-emerald-600" />
                        <span>142 pelaajaa paikalla</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onCloseMobile}
                    className="p-2 rounded-xl bg-[#EFE4D4] hover:bg-[#E2D6C3] text-[#2D2621] transition-all cursor-pointer shadow-sm"
                    title="Sulje chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {roomButton}
              </div>
            </div>

            {chatContent}
          </div>
        </div>
      )}
    </>
  );
}