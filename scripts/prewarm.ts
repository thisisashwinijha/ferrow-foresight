import fs from 'fs';
import path from 'path';
import { executeAgent } from '../lib/agents/agentRouter';
import { setCachedResponse } from '../lib/agents/cache';

// Load .env.local without external dependencies
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPrewarm() {
  console.log('=== Ferrow Foresight Pre-warm Cache Script ===');
  console.log('Running live triage for seeded alerts to store validated cached responses...\n');

  // Read seed data read-only
  const seedPath = path.resolve(process.cwd(), 'data', 'seed_data.json');
  if (!fs.existsSync(seedPath)) {
    console.error('seed_data.json not found');
    process.exit(1);
  }

  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const alerts = seed.alerts || [];
  const machines = seed.machines || [];
  const observations = seed.observations || [];
  const sensorReadings = seed.sensor_readings || [];

  console.log(`Found ${alerts.length} seeded alerts across ${machines.length} machines.\n`);

  let prewarmedCount = 0;

  for (let i = 0; i < alerts.length; i++) {
    const alert = alerts[i];
    const machine = machines.find((m: any) => m.id === alert.machine_id) || {
      id: alert.machine_id,
      name: `Machine ${alert.machine_id}`,
      line_id: 'P07-L1',
      criticality: 'B',
    };

    const machineObs = observations.find((o: any) => o.machine_id === alert.machine_id);
    const machineReadings = sensorReadings.filter((s: any) => s.machine_id === alert.machine_id);
    const latestReading = machineReadings[machineReadings.length - 1];

    console.log(
      `[${i + 1}/${alerts.length}] Pre-warming alert ${alert.id} (${alert.machine_id} - ${alert.failure_mode})...`
    );

    const triageContext = {
      machine,
      sensor: latestReading || {
        vibration_mm_s_now: 4.2,
        vibration_baseline: 1.8,
        vibration_7d_trend_pct: 25.0,
        temperature_c_now: 58.0,
        temperature_baseline: 48.0,
        data_quality: 'ok',
      },
      observation: machineObs
        ? {
            id: machineObs.id,
            note: machineObs.note,
            symptom_tags: machineObs.symptom_tags,
            technician_id: machineObs.technician_id,
          }
        : null,
      recent_history: [],
      spares: [],
      technicians_on_shift: [],
      production_windows: [],
    };

    try {
      const res = await executeAgent({
        agent: 'triage',
        forceProvider: 'direct',
        bypassRateLimit: true,
        interpreter_input: { observation: triageContext.observation },
        triage_context: triageContext,
        context: triageContext,
        machine_id: alert.machine_id,
        plant_id: alert.plant_id || 'P-07',
        trigger: 'prewarm',
      });

      if (res.data) {
        setCachedResponse(
          'triage',
          res.prompt_version || 'triage-v1.0',
          triageContext,
          res.data,
          res.provider,
          res.model
        );
        prewarmedCount++;
        console.log(`  -> Cached successfully (${res.provider} - ${res.model}) in ${res.latency_ms}ms`);
      } else {
        console.warn(`  -> Pre-warm warning: ${res.error || 'No data'}`);
      }
    } catch (err: any) {
      console.error(`  -> Failed to pre-warm alert ${alert.id}:`, err?.message || err);
    }

    // Inter-request delay to respect free-tier RPM
    await sleep(1500);
  }

  console.log(`\n=== Pre-warming Complete ===`);
  console.log(`Successfully pre-warmed ${prewarmedCount} of ${alerts.length} seeded alerts.`);
}

runPrewarm().catch((err) => {
  console.error('Prewarm failed:', err);
  process.exit(1);
});
