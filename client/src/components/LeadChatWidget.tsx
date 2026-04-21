import { useEffect, useMemo, useState } from "react";
import { MessageCircle, X, Minus, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";

const GREETING: Message = {
  role: "assistant",
  content:
    "Hi! I'm AppraiseAI's assistant. Ask me anything about property tax appeals — or share your address and I'll line up a free analysis.",
};

const SUGGESTED = [
  "How much could I save?",
  "What's the 25% contingency fee?",
  "How long does an appeal take?",
  "Do you cover my state?",
];

const LS_KEY = "appraise.chatMessages";

// The widget is deliberately hidden on focused workflow pages so it
// doesn't get in the user's way mid-task.
const HIDDEN_ROUTES = [
  "/admin",
  "/appeal-workflow",
  "/report",
];

export default function LeadChatWidget() {
  const [location] = useLocation();
  const hidden = useMemo(
    () => HIDDEN_ROUTES.some((r) => location === r || location.startsWith(`${r}/`)),
    [location]
  );

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [GREETING];
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return [GREETING];
      const parsed = JSON.parse(raw) as Message[];
      if (!Array.isArray(parsed) || parsed.length === 0) return [GREETING];
      return parsed;
    } catch {
      return [GREETING];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      // storage unavailable — non-fatal
    }
  }, [messages]);

  const askMutation = trpc.chat.ask.useMutation();

  const handleSend = async (content: string) => {
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);

    // Only send user/assistant turns; the server owns the system prompt.
    const payload = next
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const res = await askMutation.mutateAsync({ messages: payload });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      if (res.leadCaptured) setLeadCaptured(true);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err?.message ||
            "Something went wrong. Please try again in a moment.",
        },
      ]);
    }
  };

  const resetConversation = () => {
    setMessages([GREETING]);
    setLeadCaptured(false);
    try {
      window.localStorage.removeItem(LS_KEY);
    } catch {
      // ignore
    }
  };

  if (hidden) return null;

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setMinimized(false);
        }}
        aria-label="Open chat"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-3 shadow-xl transition-transform hover:scale-105"
      >
        <MessageCircle size={20} />
        <span className="hidden sm:inline font-semibold">Ask AppraiseAI</span>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-[min(calc(100vw-2rem),400px)] rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden transition-all`}
      style={{ maxHeight: minimized ? "56px" : "min(600px, calc(100vh - 3rem))" }}
      role="dialog"
      aria-label="AppraiseAI chat"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#7C3AED] to-[#0D9488] text-white">
        <div className="flex items-center gap-2 font-semibold">
          <MessageCircle size={16} />
          AppraiseAI Assistant
          {leadCaptured && (
            <span
              title="Contact info received"
              className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5"
            >
              <CheckCircle2 size={12} /> Lead saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label={minimized ? "Expand chat" : "Minimize chat"}
            onClick={() => setMinimized((v) => !v)}
            className="p-1 rounded hover:bg-white/20"
          >
            <Minus size={14} />
          </button>
          <button
            aria-label="Close chat"
            onClick={() => {
              setOpen(false);
              setMinimized(false);
            }}
            className="p-1 rounded hover:bg-white/20"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="flex flex-col" style={{ height: "min(540px, calc(100vh - 6rem))" }}>
          <div className="flex-1 overflow-hidden">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSend}
              isLoading={askMutation.isPending}
              placeholder="Ask about appeals, savings, or share your address..."
              height="100%"
              emptyStateMessage="Ask about tax appeals"
              suggestedPrompts={SUGGESTED}
            />
          </div>

          <div className="px-3 py-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={resetConversation}
              className="hover:text-[#7C3AED] transition-colors"
            >
              Start over
            </button>
            <span>We never share your info.</span>
          </div>
        </div>
      )}
    </div>
  );
}
