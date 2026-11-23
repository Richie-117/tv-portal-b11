const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envStr = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envStr.split('\n').forEach(l => {
  const eq = l.indexOf('=');
  if (eq > 0) {
    const k = l.substring(0, eq).trim();
    let v = l.substring(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    env[k] = v;
  }
});

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await s.from('checkin_sessions').select('*');
  console.log('Error:', error);
  console.log('Count in Supabase checkin_sessions:', data ? data.length : 0);
  if (data) {
    data.forEach(x => {
      console.log('Session:', x.id, x.module_title, x.checkin_status, x.session_status, x.date);
    });
  }

  const db = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'db.json'), 'utf8'));
  console.log('\nCount in db.json checkinSessions:', db.checkinSessions ? db.checkinSessions.length : 0);
  if (db.checkinSessions) {
    db.checkinSessions.forEach(x => {
      console.log('Local Session:', x.id, x.moduleTitle, x.checkinStatus, x.sessionStatus, x.date);
    });
  }
}

main().catch(console.error);

