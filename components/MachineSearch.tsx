'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Cpu, Wrench } from 'lucide-react';
import { Machine } from '@/lib/types';
import { usePlantContext } from './PlantContext';

interface MachineSearchProps {
  machines: Machine[];
  isOpen: boolean;
  onClose: () => void;
}

export function MachineSearch({ machines, isOpen, onClose }: MachineSearchProps) {
  const router = useRouter();
  const { plantId, lineId } = usePlantContext();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open through external state
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = machines.filter(
    (m) =>
      m.id.toLowerCase().includes(query.toLowerCase()) ||
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.type.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (machineId: string) => {
    onClose();
    router.push(`/machines/${machineId}?plant=${plantId}&line=${lineId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-ink/40 backdrop-blur-[2px]">
      <div className="bg-surface border border-line rounded-panel shadow-2xl w-full max-w-xl overflow-hidden mx-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center px-3 py-2 border-b border-line gap-2">
          <Search className="w-4 h-4 text-ink-muted" />
          <input
            autoFocus
            type="text"
            placeholder="Search machine ID or name (e.g. P07-M03, Gearbox)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-btn hover:bg-surface-2 text-ink-muted hover:text-ink"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-line/40 p-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-ink-muted">
              No machine found matching &ldquo;{query}&rdquo; in current plant.
            </div>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => handleSelect(m.id)}
                className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-2 rounded-btn transition-colors group"
              >
                <div className="flex items-center gap-2">
                  {m.has_sensors ? (
                    <Cpu className="w-3.5 h-3.5 text-ink-muted" />
                  ) : (
                    <Wrench className="w-3.5 h-3.5 text-ink-muted" />
                  )}
                  <div>
                    <span className="font-mono font-medium text-ink">{m.id}</span>
                    <span className="mx-1.5 text-line">|</span>
                    <span className="text-ink font-normal">{m.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-ink-muted uppercase">{m.line_id}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      m.criticality === 'A'
                        ? 'bg-ink/10 text-ink'
                        : 'bg-surface-2 text-ink-muted'
                    }`}
                  >
                    Crit {m.criticality}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-3 py-1.5 bg-surface-2 border-t border-line text-[10px] text-ink-muted flex justify-between">
          <span>Esc to close</span>
          <span>Tabular search ({machines.length} plant assets)</span>
        </div>
      </div>
    </div>
  );
}
