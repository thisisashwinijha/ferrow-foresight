'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlantContext } from './PlantContext';
import {
  Bot,
  X,
  Send,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import type { CopilotResponse } from '@/lib/copilotService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  cited_ids?: string[];
  follow_up_suggestions?: [string, string] | string[];
  timestamp: string;
}

export function PlantCopilotDrawer() {
  const pathname = usePathname();
  const { plantId } = usePlantContext();

  const [isOpen, setIsOpen] = useState(false);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Extract active entities from current pathname
  const activeMachineId = pathname.startsWith('/machines/') ? pathname.split('/')[2] : undefined;
  const activeAlertId = pathname.startsWith('/alerts/') ? pathname.split('/')[2] : undefined;
  const activeWorkOrderId = pathname.startsWith('/work-orders/') ? pathname.split('/')[2] : undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'copilot',
      text: `Hello! I am your Ferrow Foresight Plant Copilot for Plant ${plantId}. Ask me about machine health, risk explanations, scheduled work blockers, or spare parts shortages.`,
      cited_ids: activeMachineId ? [activeMachineId] : [],
      follow_up_suggestions: [
        activeMachineId ? `Why is ${activeMachineId} high risk?` : 'Why is P07-M03 high risk?',
        'What maintenance is due this week?',
      ],
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          context: {
            page: pathname,
            plant_id: plantId,
            machine_id: activeMachineId,
            alert_id: activeAlertId,
            work_order_id: activeWorkOrderId,
          },
        }),
      });

      if (!res.ok) throw new Error('Copilot response error');

      const data: CopilotResponse = await res.json();

      const copilotMsg: ChatMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        text: data.answer,
        cited_ids: data.cited_ids,
        follow_up_suggestions: data.follow_up_suggestions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'copilot',
          text: 'I encountered an error querying the plant telemetry service. Please try again.',
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getEntityLink = (id: string) => {
    if (id.startsWith('P07-M') || id.startsWith('P03-M') || id.startsWith('P12-M') || id.startsWith('P21-M')) {
      return `/machines/${id}`;
    }
    if (id.startsWith('AL-')) {
      return `/alerts`;
    }
    if (id.startsWith('WO-')) {
      return `/work-orders`;
    }
    if (id.startsWith('SP-') || id.includes('SP-')) {
      return `/spares`;
    }
    if (id.startsWith('P07-T') || id.startsWith('P03-T')) {
      return `/people`;
    }
    return null;
  };

  return (
    <>
      {/* Floating Copilot Toggle Button (Fixed Bottom-Right on every page) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 border border-indigo-400/30 backdrop-blur-md"
        aria-label="Toggle Plant Copilot"
      >
        <Bot className="w-4 h-4 text-white animate-bounce" />
        <span className="font-semibold tracking-wide">Plant Copilot</span>
        {activeMachineId && (
          <span className="px-1.5 py-0.5 rounded-full bg-indigo-800 text-[10px] font-mono text-indigo-200">
            {activeMachineId}
          </span>
        )}
      </button>

      {/* Slide-Over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between">
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span>Plant Copilot</span>
                        <span className="text-[10px] font-mono text-indigo-400 font-normal">v1.0</span>
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Operational intelligence • Plant {plantId}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Context Pill Banner */}
              <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Context:</span>
                  <span className="font-mono text-slate-300 font-medium">
                    {activeMachineId || activeWorkOrderId || activeAlertId || pathname}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Safety Guardrails Active</span>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-xl p-3.5 space-y-2 ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-xs shadow-sm'
                          : 'bg-slate-950/80 text-slate-200 rounded-bl-xs border border-slate-800'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                      {/* Cited IDs as Clickable Links */}
                      {msg.cited_ids && msg.cited_ids.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="text-slate-400">Referenced:</span>
                          {msg.cited_ids.map((id) => {
                            const link = getEntityLink(id);
                            return link ? (
                              <Link
                                key={id}
                                href={link}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-mono transition-colors border border-slate-700"
                              >
                                <span>{id}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </Link>
                            ) : (
                              <span
                                key={id}
                                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]"
                              >
                                {id}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                      {msg.timestamp}
                    </span>

                    {/* Follow-up suggestions chips */}
                    {msg.sender === 'copilot' &&
                      msg.follow_up_suggestions &&
                      msg.follow_up_suggestions.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5 w-full pl-2">
                          {msg.follow_up_suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSend(suggestion)}
                              className="text-left text-[11px] text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60 transition-colors flex items-center justify-between group"
                            >
                              <span>{suggestion}</span>
                              <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 w-fit">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    <span>Plant Copilot is analyzing telemetry...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/90 space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    placeholder="Ask about risk, blockers, schedule..."
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputQuestion.trim() || isLoading}
                    className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                  <span>Safety policy: Zero LOTO overrides</span>
                  <span>Prompt: copilot-v1.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
