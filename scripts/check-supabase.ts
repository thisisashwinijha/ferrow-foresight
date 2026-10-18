import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local manually
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment configuration check:');
console.log('NEXT_PUBLIC_SUPABASE_URL set:', Boolean(supabaseUrl));
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY set:', Boolean(anonKey));
console.log('SUPABASE_SERVICE_ROLE_KEY set:', Boolean(serviceKey));

async function runCheck() {
  if (!supabaseUrl) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
    return;
  }

  // 1. Query plants table with Anon Key
  console.log('\n--- 1. Querying "plants" table with Anon Key ---');
  if (!anonKey) {
    console.log('Anon key is missing in environment.');
  } else {
    try {
      const anonClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
        global: { headers: { apikey: anonKey } },
      });
      const { data, error, status, statusText } = await anonClient.from('plants').select('*').limit(3);
      if (error) {
        console.error('Anon client query to "plants" failed:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status,
          statusText,
        });
      } else {
        console.log(`Anon client query SUCCESS: fetched ${data?.length} plant(s) (Status ${status})`);
      }
    } catch (e: any) {
      console.error('Anon client exception querying "plants":', e.message || e);
    }
  }

  // 2. Query plants table with Service Role Key
  console.log('\n--- 2. Querying "plants" table with Service Role Key ---');
  if (!serviceKey) {
    console.log('Service key is missing in environment.');
  } else {
    try {
      const adminClient = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
      });
      const { data, error, status, statusText } = await adminClient.from('plants').select('*').limit(3);
      if (error) {
        console.error('Service client query to "plants" failed:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status,
          statusText,
        });
      } else {
        console.log(`Service client query SUCCESS: fetched ${data?.length} plant(s) (Status ${status})`);
      }
    } catch (e: any) {
      console.error('Service client exception querying "plants":', e.message || e);
    }
  }

  // 3. Query all tables across the schema
  const tables = [
    'plants',
    'lines',
    'machines',
    'technicians',
    'certifications',
    'technician_skills',
    'spares',
    'production_schedule',
    'sensor_readings',
    'maintenance_log',
    'kpi_snapshots',
    'pm_plan',
    'observations',
    'knowledge_library',
    'alerts',
    'work_orders',
    'agent_runs'
  ];

  console.log('\n--- 3. Verifying all 17 tables in schema.sql ---');
  const anonClient = createClient(supabaseUrl, anonKey!, {
    auth: { persistSession: false },
    global: { headers: { apikey: anonKey! } },
  });

  for (const t of tables) {
    try {
      const { data, error, status } = await anonClient.from(t).select('*').limit(1);
      if (error) {
        console.error(`[ANON FAIL] Table "${t}" (status ${status}):`, error.message, error.details || '');
      } else {
        console.log(`[ANON OK] Table "${t}": ${data?.length} row(s) returned`);
      }
    } catch (e: any) {
      console.error(`[ANON EXCEPTION] Table "${t}":`, e.message);
    }
  }

  console.log('\n=========================================');
  console.log('Testing all tables with Service Key...');
  console.log('=========================================');
  const adminClient = createClient(supabaseUrl, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const t of tables) {
    try {
      const { data, error, status } = await adminClient.from(t).select('*').limit(1);
      if (error) {
        console.error(`[SERVICE FAIL] Table "${t}" (status ${status}):`, error.message, error.details || '');
      } else {
        console.log(`[SERVICE OK] Table "${t}": ${data?.length} row(s) returned`);
      }
    } catch (e: any) {
      console.error(`[SERVICE EXCEPTION] Table "${t}":`, e.message);
    }
  }
}

runCheck().then(() => {
  console.log('\nCheck complete.');
}).catch((err) => {
  console.error('Check failed with uncaught error:', err);
});
