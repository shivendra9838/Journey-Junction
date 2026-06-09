import React, { useState, useRef, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { useUser } from "../context/UserContext";
import { useLocation } from "wouter";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
}

export function SupportWidget() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hi! I'm Shivendra, your Journey Junction support guide. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasSentInquiry, setHasSentInquiry] = useState(false);
  
  const { user } = useUser();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-support-chat", handleOpen);
    return () => window.removeEventListener("open-support-chat", handleOpen);
  }, []);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    const newMessages: ChatMessage[] = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    // Send to Admin Inquiry (only first message)
    if (!hasSentInquiry) {
      try {
        await apiFetch("/v1/inquiries", {
          method: "POST",
          body: JSON.stringify({
            name: (user?.name || "Guest User").padEnd(2, " "),
            phone: "0000000000",
            email: user?.email || "guest@journeyjunction.com",
            destination: "Support Chat",
            travelDates: "N/A",
            message: userText.length < 5 ? userText.padEnd(5, " ") : userText
          })
        });
        setHasSentInquiry(true);
      } catch (err) {
        console.error("Failed to send inquiry to admin", err);
      }
    }

    // Get Gemini response
    try {
      const res = await apiFetch<{ reply: string }>("/v1/support/chat", {
        method: "POST",
        body: JSON.stringify({ message: userText, history: messages.slice(1) }) // skip the greeting
      });
      setMessages([...newMessages, { role: "bot", text: res.reply }]);
    } catch (err) {
      setMessages([...newMessages, { role: "bot", text: "I'm sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && !location.startsWith("/admin") && (
          <button
            onClick={() => setIsOpen(true)}
            className="bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 transition-transform hover:scale-105 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
        )}

        {isOpen && (
          <div className="bg-white rounded-2xl shadow-2xl w-[350px] max-w-[calc(100vw-2rem)] flex flex-col h-[500px] border border-stone-100 overflow-hidden">
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                  S
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === "user" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white border border-stone-200 text-stone-800 rounded-tl-sm shadow-sm"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-stone-200 p-3 rounded-2xl rounded-tl-sm shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 bg-white border-t border-stone-100">
              <div className="flex gap-2 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask Shivendra..."
                  className="flex-1 bg-stone-100 border-transparent rounded-full px-4 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="bg-indigo-600 text-white rounded-full p-2 w-9 h-9 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-indigo-700"
                >
                  <svg className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
