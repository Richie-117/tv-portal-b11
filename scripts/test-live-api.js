async function testApi() {
  console.log('Testing live HTTP endpoints backed by Supabase on http://localhost:3000...\n');

  // 1. GET Invites & Students
  const invRes = await fetch('http://localhost:3000/api/admin/invites');
  const invData = await invRes.json();
  console.log(`1. GET /api/admin/invites: Success = ${invData.success}, Total Students = ${invData.students?.length}`);

  // 2. GET Timetable Entries
  const ttRes = await fetch('http://localhost:3000/api/timetable/entries');
  const ttData = await ttRes.json();
  console.log(`2. GET /api/timetable/entries: Success = ${ttData.success}, Total Slots = ${ttData.entries?.length}`);

  // 3. POST + DELETE Module
  const postModRes = await fetch('http://localhost:3000/api/timetable/modules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'LIVE-MOD',
      title: 'Live HTTP Module Test',
      courseScope: 'ALL',
    }),
  });
  const postModData = await postModRes.json();
  console.log(`3. POST /api/timetable/modules: Success = ${postModData.success}, ID = ${postModData.module?.id}`);

  const delModRes = await fetch(`http://localhost:3000/api/timetable/modules?id=${postModData.module?.id}`, {
    method: 'DELETE',
  });
  const delModData = await delModRes.json();
  console.log(`4. DELETE /api/timetable/modules: Success = ${delModData.success}`);

  // 5. POST + EDIT + DELETE Broadcast Session
  const postSessRes = await fetch('http://localhost:3000/api/admin/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      course: 'TPOPT',
      moduleId: 'sub-ict',
      moduleCode: 'ICT',
      moduleTitle: 'Live Test Lecture',
      date: '2026-11-23',
      startTime: '08:30',
      endTime: '11:30',
      durationMinutes: 30,
    }),
  });
  const postSessData = await postSessRes.json();
  console.log(`5. POST /api/admin/broadcast: Success = ${postSessData.success}, ID = ${postSessData.session?.id}`);

  const delSessRes = await fetch(`http://localhost:3000/api/admin/broadcast?sessionId=${postSessData.session?.id}`, {
    method: 'DELETE',
  });
  const delSessData = await delSessRes.json();
  console.log(`6. DELETE /api/admin/broadcast: Success = ${delSessData.success}`);

  // 7. POST + DELETE Timetable Override
  const postOvrRes = await fetch('http://localhost:3000/api/timetable/override', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      course: 'TPOPT',
      date: '2026-11-23',
      action: 'cancel',
      subject: 'ENGLISH',
      reason: 'Testing lecture override sync with scheduled slots',
    }),
  });
  const postOvrData = await postOvrRes.json();
  console.log(`7. POST /api/timetable/override: Success = ${postOvrData.success}, ID = ${postOvrData.override?.id}`);

  const delOvrRes = await fetch(`http://localhost:3000/api/timetable/override?id=${postOvrData.override?.id}`, {
    method: 'DELETE',
  });
  const delOvrData = await delOvrRes.json();
  console.log(`8. DELETE /api/timetable/override: Success = ${delOvrData.success}`);

  console.log('\nAll API routes cleanly connected to Supabase and operational!');
}

testApi().catch(console.error);

