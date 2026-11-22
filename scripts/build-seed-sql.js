const fs = require('fs');
const db = JSON.parse(fs.readFileSync('D:/TV-B11/data/db.json', 'utf8'));

let sql = '-- =============================================================================\n';
sql += '-- TV B11 Mobile-First Academic Portal — Migration 003: Seed Data\n';
sql += '-- =============================================================================\n\n';

sql += 'INSERT INTO public.courses (id, name) VALUES\n';
sql += db.courses.map(c => `  ('${c.id}', '${c.name.replace(/'/g, "''")}')`).join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';

sql += 'INSERT INTO public.academic_modules (id, code, title, course_scope, stage, sort_order, is_active) VALUES\n';
sql += db.modules.map(m => `  ('${m.id}', '${m.code}', '${m.title.replace(/'/g, "''")}', '${m.courseScope}', '${m.stage}', ${m.sortOrder}, true)`).join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';

sql += 'INSERT INTO public.students (id, student_number, index_suffix, full_name, course, is_active) VALUES\n';
sql += db.students.map(s => `  ('${s.id}', '${s.studentNumber}', '${s.indexSuffix}', '${s.fullName.replace(/'/g, "''")}', '${s.course}', true)`).join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';

sql += 'INSERT INTO public.timetable_entries (id, course, day_of_week, start_time, end_time, subject, student_group, slot_type, sort_order) VALUES\n';
sql += db.timetableEntries.map(t => `  ('${t.id}', '${t.course}', '${t.dayOfWeek}', '${t.startTime}', '${t.endTime}', '${(t.subject || '').replace(/'/g, "''")}', '${(t.studentGroup || '').replace(/'/g, "''")}', '${t.slotType}', ${t.sortOrder})`).join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n';

fs.mkdirSync('D:/TV-B11/supabase/migrations', { recursive: true });
fs.writeFileSync('D:/TV-B11/supabase/migrations/003_seed_data.sql', sql, 'utf8');
console.log('Successfully written D:/TV-B11/supabase/migrations/003_seed_data.sql');

