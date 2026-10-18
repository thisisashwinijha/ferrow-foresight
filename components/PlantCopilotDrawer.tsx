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
  ExternalLink,
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

function getPageName(pathname: string): string {
  if (pathname === '/' || pathname === '/control-room') return 'Control Room';
  if (pathname.startsWith('/machines/')) return `Machine ${pathname.split('/')[2]}`;
  if (pathname.startsWith('/alerts')) return 'Alerts';
  if (pathname.startsWith('/work-orders')) return 'Work orders';
  if (pathname.startsWith('/planning')) return 'Planning';
  if (pathname.startsWith('/production')) return 'Production';
  if (pathname.startsWith('/spares')) return 'Spares';
  if (pathname.startsWith('/people')) return 'People';
  if (pathname.startsWith('/kpis')) return 'KPIs';
  if (pathname.startsWith('/capture')) return 'Capture';
  if (pathname.startsWith('/agent')) return 'Agent console';
  if (pathname.startsWith('/about')) return 'About';
  return 'Control Room';
}

function getPlantCity(plantId: string): string {
  const p = (plantId || '').toUpperCase();
  if (p === 'P-07' || p.includes('PUNE')) return 'Pune';
  if (p === 'P-03' || p.includes('STUTTGART')) return 'Stuttgart';
  if (p === 'P-12' || p.includes('DETROIT')) return 'Detroit';
  if (p === 'P-21' || p.includes('NAGOYA')) return 'Nagoya';
  return 'Pune';
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

  const pageLabel = getPageName(pathname);
  const plantCity = getPlantCity(plantId);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'copilot',
      text: `Hello! I am your Ferrow Foresight Plant Copilot for ${plantCity}. Ask me about machine health, risk explanations, scheduled work blockers, or spare parts.`,
      cited_ids: activeMachineId ? [activeMachineId] : [],
      follow_up_suggestions: [
        activeMachineId ? `Why is ${activeMachineId} high risk?` : 'Why is P07-M03 high risk?',
        'Can we skip LOTO on P07-M03?',
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
        follow_up_suggestions: (data.follow_up_suggestions || []).slice(0, 2),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'copilot',
          text: 'I encountered an error querying the plant service. Please try again.',
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
      {/* Floating Copilot Toggle Button (Only floating button on screen) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 border border-indigo-400/30"
        aria-label="Toggle Plant Copilot"
      >
        <Bot className="w-4 h-4 text-white" />
        <span className="font-semibold tracking-wide">Plant Copilot</span>
        {activeMachineId && (
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono text-white">
            {activeMachineId}
          </span>
        )}
      </button>

      {/* Slide-Over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-surface border-l border-line shadow-2xl flex flex-col justify-between">
              {/* Drawer Header */}
              <div className="p-4 border-b border-line bg-surface flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-agent-bg text-agent border border-agent-border">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink">Plant Copilot</h2>
                    <p className="text-xs text-ink-muted">
                      {pageLabel} · {plantCity}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
                  aria-label="Close copilot"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-canvas/40">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl p-3.5 space-y-2 ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                          : 'bg-surface text-ink rounded-bl-xs border border-line shadow-2xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                      {/* Cited IDs as Clickable Links */}
                      {msg.cited_ids && msg.cited_ids.length > 0 && (
                        <div className="pt-2 border-t border-line/60 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="text-ink-muted">Cited:</span>
                          {msg.cited_ids.map((id) => {
                            const link = getEntityLink(id);
                            return link ? (
                              <Link
                                key={id}
                                href={link}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-2 hover:bg-line text-agent font-mono text-[11px] font-medium border border-line transition-colors"
                              >
                                <span>{id}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </Link>
                            ) : (
                              <span
                                key={id}
                                className="px-2 py-0.5 rounded-md bg-surface-2 text-ink-muted font-mono text-[10px] border border-line"
                              >
                                {id}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-ink-muted mt-1 px-1">
                      {msg.timestamp}
                    </span>

                    {/* Follow-up suggestions chips (max 2) */}
                    {msg.sender === 'copilot' &&
                      msg.follow_up_suggestions &&
                      msg.follow_up_suggestions.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5 w-full pl-2">
                          {msg.follow_up_suggestions.slice(0, 2).map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSend(suggestion)}
                              className="text-left text-xs text-ink hover:text-agent bg-surface hover:bg-surface-2 px-3 py-2 rounded-lg border border-line hover:border-agent/30 transition-colors flex items-center justify-between group shadow-2xs"
                            >
                              <span>{suggestion}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-agent transition-colors shrink-0 ml-1" />
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-ink-muted bg-surface p-3 rounded-lg border border-line w-fit shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-agent animate-spin" />
                    <span>Analyzing telemetry...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area (No footer lines) */}
              <div className="p-3 border-t border-line bg-surface">
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
                    placeholder="Ask about risk, blockers, schedule, spares..."
                    className="flex-1 bg-surface-2 border border-line rounded-lg px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-agent focus:ring-1 focus:ring-agent"
                  />
                  <button
                    type="submit"
                    disabled={!inputQuestion.trim() || isLoading}
                    className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                    aria-label="Send query"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
