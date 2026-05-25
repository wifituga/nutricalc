import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
config({ path: '.env.local' });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Exact code U3 in BD
const { data: u3DB } = await s.from('foods').select('id, code, name').eq('code', 'U3');
console.log('Foods.code = "U3":', u3DB);

// U3 measures in source JSON
const raw = JSON.parse(readFileSync('data/medidas_caseras.json', 'utf-8'));
const u3Measures = raw.filter(m => m.tpca_code === 'U3');
console.log('U3 in measures JSON (first 2):', u3Measures.slice(0, 2));
console.log('Codes around U3 in JSON:', [...new Set(raw.filter(m => m.tpca_code?.startsWith('U')).map(m => m.tpca_code))].sort());

// Verify the exact comparison happens in seed
const { data: allCodes } = await s.from('foods').select('code');
const codeSet = new Set((allCodes || []).map(f => f.code));
console.log('\nU3 in codeSet?', codeSet.has('U3'));
console.log('Type of code U3 in BD:', typeof u3DB?.[0]?.code, JSON.stringify(u3DB?.[0]?.code));
console.log('Type of tpca_code in measures:', typeof u3Measures[0]?.tpca_code, JSON.stringify(u3Measures[0]?.tpca_code));
