'use client';

import { useState, useEffect } from 'react';

export interface LiveReading {
  machineId: string;
  vibration_mm_s: number;
  temperature_c: number;
  data_quality: 'ok' | 'dropout' | 'spike';
  sparkline: number[];
}

type Subscriber = (readings: Record<string, LiveReading>) => void;

class TelemetrySimulator {
  private static instance: TelemetrySimulator;
  private readings: Record<string, LiveReading> = {};
  private subscribers: Set<Subscriber> = new Set();
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {
    // Only run in browser
    if (typeof window !== 'undefined') {
      this.start();
    }
  }

  public static getInstance(): TelemetrySimulator {
    if (!TelemetrySimulator.instance) {
      TelemetrySimulator.instance = new TelemetrySimulator();
    }
    return TelemetrySimulator.instance;
  }

  public registerMachine(
    machineId: string,
    initialVibration: number,
    initialTemp: number,
    hasSensors: boolean
  ) {
    if (!hasSensors) return;
    if (this.readings[machineId]) return;

    const isOffline = machineId === 'P07-M18';
    const points = Array.from({ length: 8 }, (_, i) => {
      const noise = (Math.random() - 0.5) * 0.1;
      return Number((initialVibration + noise).toFixed(2));
    });

    this.readings[machineId] = {
      machineId,
      vibration_mm_s: initialVibration,
      temperature_c: initialTemp,
      data_quality: isOffline ? 'dropout' : 'ok',
      sparkline: points,
    };
  }

  public subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    callback(this.readings);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getReading(machineId: string): LiveReading | undefined {
    return this.readings[machineId];
  }

  private start() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.tick();
    }, 3000);
  }

  private tick() {
    const updated: Record<string, LiveReading> = {};

    for (const [id, reading] of Object.entries(this.readings)) {
      // P07-M18 stays offline
      if (id === 'P07-M18' || reading.data_quality === 'dropout') {
        updated[id] = reading;
        continue;
      }

      let newVib = reading.vibration_mm_s;
      let newTemp = reading.temperature_c;

      // Pilot machine P07-M03 keeps rising
      if (id === 'P07-M03') {
        newVib += 0.03 + Math.random() * 0.02; // slow progressive rise
        newTemp += 0.05 + Math.random() * 0.05;
      }
      // Shadow plant degrading machines continue rising
      else if (id === 'P03-M10' || id === 'P12-M05' || id === 'P21-M09') {
        newVib += 0.02 + Math.random() * 0.02;
        newTemp += 0.04 + Math.random() * 0.04;
      }
      // Normal machines oscillate with small noise
      else {
        const deltaVib = (Math.random() - 0.49) * 0.06;
        newVib = Math.max(0.5, newVib + deltaVib);
        const deltaTemp = (Math.random() - 0.49) * 0.12;
        newTemp = Math.max(20, newTemp + deltaTemp);
      }

      newVib = Number(newVib.toFixed(2));
      newTemp = Number(newTemp.toFixed(1));

      const newSparkline = [...reading.sparkline.slice(1), newVib];

      updated[id] = {
        ...reading,
        vibration_mm_s: newVib,
        temperature_c: newTemp,
        sparkline: newSparkline,
      };
    }

    this.readings = updated;
    this.subscribers.forEach((cb) => cb(this.readings));
  }
}

export const simulator = TelemetrySimulator.getInstance();

export function useMachineTelemetry(
  machineId: string,
  initialVibration: number,
  initialTemp: number,
  hasSensors: boolean
) {
  useEffect(() => {
    simulator.registerMachine(machineId, initialVibration, initialTemp, hasSensors);
  }, [machineId, initialVibration, initialTemp, hasSensors]);

  const [reading, setReading] = useState<LiveReading | undefined>(() =>
    simulator.getReading(machineId)
  );

  useEffect(() => {
    const unsubscribe = simulator.subscribe((readings) => {
      if (readings[machineId]) {
        setReading(readings[machineId]);
      }
    });
    return unsubscribe;
  }, [machineId]);

  return (
    reading || {
      machineId,
      vibration_mm_s: initialVibration,
      temperature_c: initialTemp,
      data_quality: machineId === 'P07-M18' ? ('dropout' as const) : ('ok' as const),
      sparkline: [initialVibration],
    }
  );
}
