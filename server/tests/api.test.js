/**
 * End-to-end API checks. Needs a seeded database and a running server:
 *   npm run seed && npm start        (terminal 1)
 *   npm run test:api                 (terminal 2)
 * Creates its own records and deletes them again at the end.
 */
const BASE = process.env.API_URL || 'http://localhost:5000/api';
const PASSWORD = 'Password123!';
let pass = 0; let fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass += 1; console.log(`  ok    ${name}`); } else { fail += 1; console.log(`  FAIL  ${name} ${extra}`); } };

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch { /* not json */ }
  return { status: res.status, data };
}
const login = async (email) => (await call('POST', '/auth/login', { body: { email, password: PASSWORD } })).data.token;
const tz = process.env.APP_TIMEZONE || 'Asia/Manila';
const dayStr = (n) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(Date.now() + n * 86400000));

(async () => {
  const student = await login('miguel.santos@student.uniassist.edu');
  const student2 = await login('bianca.reyes@student.uniassist.edu');
  const faculty = await login('ramon.delacruz@uniassist.edu');
  const admin = await login('admin@uniassist.edu');
  const S = { token: student }; const S2 = { token: student2 }; const F = { token: faculty }; const A = { token: admin };
  const cleanup = [];

  console.log('\nAuth and errors');
  check('login returns tokens', Boolean(student && faculty && admin));
  check('no token -> 401 JSON', (await call('GET', '/tasks')).status === 401);
  check('wrong password -> 401', (await call('POST', '/auth/login', { body: { email: 'admin@uniassist.edu', password: 'nope' } })).status === 401);
  let r = await call('GET', '/nope');
  check('unknown route -> 404 JSON { message }', r.status === 404 && typeof r.data.message === 'string');
  r = await call('GET', '/tasks/not-an-id', S);
  check('malformed id -> 400 with clear message', r.status === 400 && /not a valid identifier/.test(r.data.message), JSON.stringify(r.data));
  r = await call('GET', '/tasks/64b000000000000000000000', S);
  check('missing resource -> 404 JSON', r.status === 404 && r.data.message === 'Task not found');
  check('student blocked from admin users list -> 403', (await call('GET', '/users', S)).status === 403);
  check('student blocked from analytics -> 403', (await call('GET', '/dashboard/analytics', S)).status === 403);
  check('route order: /tasks/statistics not captured by /:id', (await call('GET', '/tasks/statistics', S)).status === 200);

  console.log('\nTasks and deadline logic');
  const before = (await call('GET', '/tasks/statistics', S)).data;
  r = await call('POST', '/tasks', { ...S, body: { title: 'x', subject: '' } });
  check('validation errors -> 400', r.status === 400, JSON.stringify(r.data));
  r = await call('POST', '/tasks', { ...S, body: { title: 'API test overdue task', subject: 'TEST', dueDate: new Date(Date.now() - 2 * 86400000), priority: 'high' } });
  const overdueId = r.data._id;
  check('create task -> 201', r.status === 201);
  check('past due + pending -> overdue', r.data.effectiveStatus === 'overdue' && r.data.deadlineLabel === 'Overdue');
  let stats = (await call('GET', '/tasks/statistics', S)).data;
  check('statistics update after create', stats.total === before.total + 1 && stats.overdue === before.overdue + 1);
  check('status=overdue filter includes it', (await call('GET', '/tasks?status=overdue', S)).data.some((t) => t._id === overdueId));
  r = await call('PUT', `/tasks/${overdueId}`, { ...S, body: { status: 'completed' } });
  check('completed task is not overdue', r.data.effectiveStatus === 'completed' && r.data.completedAt);
  stats = (await call('GET', '/tasks/statistics', S)).data;
  check('statistics update after completion', stats.overdue === before.overdue && stats.completed === before.completed + 1);
  r = await call('POST', '/tasks', { ...S, body: { title: 'API test tomorrow task', subject: 'TEST', dueDate: new Date(Date.now() + 86400000), priority: 'low' } });
  const tomorrowId = r.data._id;
  check('due tomorrow label', r.data.deadlineLabel === 'Due tomorrow', r.data.deadlineLabel);
  check('upcoming endpoint lists it', (await call('GET', '/tasks/upcoming?days=2', S)).data.some((t) => t._id === tomorrowId));
  check('cannot store "overdue" directly -> 400', (await call('PUT', `/tasks/${tomorrowId}`, { ...S, body: { status: 'overdue' } })).status === 400);
  check("other student cannot read someone else's task -> 403", (await call('GET', `/tasks/${tomorrowId}`, S2)).status === 403);
  r = await call('GET', '/tasks?sort=priority', S);
  const ranks = r.data.map((t) => ({ high: 0, medium: 1, low: 2 }[t.priority]));
  check('sort by priority', ranks.every((v, i) => i === 0 || ranks[i - 1] <= v));
  check('delete task -> 200', (await call('DELETE', `/tasks/${overdueId}`, S)).status === 200 && (await call('DELETE', `/tasks/${tomorrowId}`, S)).status === 200);
  check('statistics back to baseline', JSON.stringify((await call('GET', '/tasks/statistics', S)).data) === JSON.stringify(before));

  console.log('\nSchedules and overlap detection');
  r = await call('POST', '/schedules', { ...S, body: { courseCode: 'TST100', courseName: 'Overlap Test', instructor: 'T', room: 'R', day: 'Monday', startTime: '09:00', endTime: '11:00' } });
  check('overlapping class rejected (409)', r.status === 409, JSON.stringify(r.data));
  r = await call('POST', '/schedules', { ...S, body: { courseCode: 'TST100', courseName: 'Bad Range', instructor: 'T', room: 'R', day: 'Monday', startTime: '12:00', endTime: '11:00' } });
  check('end before start rejected (400)', r.status === 400);
  r = await call('POST', '/schedules', { ...S, body: { courseCode: 'TST100', courseName: 'Back to back', instructor: 'T', room: 'R', day: 'Monday', startTime: '10:00', endTime: '11:00' } });
  check('back-to-back class allowed (201)', r.status === 201, JSON.stringify(r.data));
  const schedId = r.data._id;
  check('editing a class does not conflict with itself', (await call('PUT', `/schedules/${schedId}`, { ...S, body: { room: 'R2', endTime: '11:30' } })).status === 200);
  check('editing into another class rejected', (await call('PUT', `/schedules/${schedId}`, { ...S, body: { startTime: '09:30' } })).status === 409);
  r = await call('GET', '/schedules/conflicts?day=Monday&startTime=09:00&endTime=10:30', S);
  check('conflicts endpoint reports clash', r.status === 200 && r.data.hasConflict === true);
  await call('DELETE', `/schedules/${schedId}`, S);

  console.log('\nService requests and status workflow');
  r = await call('POST', '/service-requests', { ...S, body: { category: 'IT Support', title: 'API test request', description: 'Created by the automated API test.', priority: 'medium' } });
  const reqId = r.data._id;
  check('create request -> 201 pending', r.status === 201 && r.data.status === 'pending');
  r = await call('PATCH', `/service-requests/${reqId}/status`, { ...F, body: { status: 'completed' } });
  check('pending -> completed rejected (400)', r.status === 400 && /Invalid status transition/.test(r.data.message), JSON.stringify(r.data));
  check('student cannot move to processing (403)', (await call('PATCH', `/service-requests/${reqId}/status`, { ...S, body: { status: 'processing' } })).status === 403);
  check('status cannot be changed through PUT (400)', (await call('PUT', `/service-requests/${reqId}`, { ...S, body: { status: 'completed' } })).status === 400);
  for (const st of ['processing', 'ready', 'completed']) {
    r = await call('PATCH', `/service-requests/${reqId}/status`, { ...F, body: { status: st, note: `test ${st}` } });
    check(`valid transition -> ${st}`, r.status === 200 && r.data.status === st);
  }
  check('completedAt set and history recorded', Boolean(r.data.completedAt) && r.data.history.length === 4);
  check('completed is final (400)', (await call('PATCH', `/service-requests/${reqId}/status`, { ...F, body: { status: 'processing' } })).status === 400);
  check('unknown status (400)', (await call('PATCH', `/service-requests/${reqId}/status`, { ...F, body: { status: 'banana' } })).status === 400);
  check('filter by status+category', (await call('GET', '/service-requests?status=completed&category=IT%20Support', F)).data.some((x) => x._id === reqId));
  check('request statistics', (await call('GET', '/service-requests/statistics', F)).data.byStatus.completed >= 1);
  await call('DELETE', `/service-requests/${reqId}`, A);

  console.log('\nAppointments');
  const staffList = (await call('GET', '/users/staff', S)).data;
  const staff = staffList.find((u) => u.name.includes('Paolo'));
  const date = dayStr(20);
  r = await call('POST', '/appointments', { ...S, body: { department: 'Guidance', staff: staff._id, date, startTime: '10:00', endTime: '11:00', purpose: 'API test appointment' } });
  check('book available slot -> 201', r.status === 201, JSON.stringify(r.data));
  const apptId = r.data._id; cleanup.push(['/appointments/', apptId]);
  r = await call('POST', '/appointments', { ...S2, body: { department: 'Guidance', staff: staff._id, date, startTime: '10:30', endTime: '11:30', purpose: 'Overlapping attempt' } });
  check('overlapping appointment rejected (409)', r.status === 409, JSON.stringify(r.data));
  r = await call('POST', '/appointments', { ...S2, body: { department: 'Guidance', staff: staff._id, date, startTime: '09:00', endTime: '11:30', purpose: 'Enclosing interval attempt' } });
  check('enclosing interval rejected (409)', r.status === 409);
  r = await call('POST', '/appointments', { ...S2, body: { department: 'Guidance', staff: staff._id, date, startTime: '11:00', endTime: '11:30', purpose: 'Adjacent slot is fine' } });
  check('adjacent slot allowed (201)', r.status === 201); cleanup.push(['/appointments/', r.data._id]);
  check('past date rejected (400)', (await call('POST', '/appointments', { ...S, body: { department: 'Guidance', staff: staff._id, date: dayStr(-2), startTime: '10:00', endTime: '11:00', purpose: 'Past date attempt' } })).status === 400);
  check('invalid date rejected (400)', (await call('POST', '/appointments', { ...S, body: { department: 'Guidance', staff: staff._id, date: '2030-02-31', startTime: '10:00', endTime: '11:00', purpose: 'Invalid date attempt' } })).status === 400);
  check('end before start rejected (400)', (await call('POST', '/appointments', { ...S, body: { department: 'Guidance', staff: staff._id, date, startTime: '15:00', endTime: '14:00', purpose: 'Bad range attempt' } })).status === 400);
  r = await call('GET', `/appointments/availability?staff=${staff._id}&date=${date}`, S);
  check('availability hides booked slots', r.status === 200 && r.data.booked.length === 2 && !r.data.freeSlots.some((s) => s.startTime === '10:00' || s.startTime === '10:30' || s.startTime === '11:00') && r.data.freeSlots.some((s) => s.startTime === '09:00'));
  check('reschedule within own slot works', (await call('PUT', `/appointments/${apptId}`, { ...S, body: { startTime: '10:15', endTime: '11:00' } })).status === 200);
  // 10 simultaneous requests for one free slot: exactly one may win
  const race = await Promise.all(Array.from({ length: 10 }, (_, i) => call('POST', '/appointments', { ...(i % 2 ? S : S2), body: { department: 'Guidance', staff: staff._id, date, startTime: '14:00', endTime: '15:00', purpose: `Concurrent booking ${i}` } })));
  const won = race.filter((x) => x.status === 201);
  won.forEach((w) => cleanup.push(['/appointments/', w.data._id]));
  check(`10 concurrent bookings -> exactly 1 created (got ${won.length})`, won.length === 1 && race.filter((x) => x.status === 409).length === 9);
  check('cancel frees the slot', (await call('PATCH', `/appointments/${apptId}/cancel`, S)).data.status === 'cancelled');
  r = await call('POST', '/appointments', { ...S2, body: { department: 'Guidance', staff: staff._id, date, startTime: '10:00', endTime: '11:00', purpose: 'Rebooking freed slot' } });
  check('freed slot can be rebooked (201)', r.status === 201); cleanup.push(['/appointments/', r.data._id]);
  check('staff can complete; student cannot', (await call('PATCH', `/appointments/${r.data._id}/complete`, S2)).status === 403 && (await call('PATCH', `/appointments/${r.data._id}/complete`, F)).data.status === 'completed');

  console.log('\nFacility reservations');
  const rb = { facility: 'Study Room C', date, startTime: '13:00', endTime: '15:00', purpose: 'API test reservation' };
  r = await call('POST', '/reservations', { ...S, body: rb });
  check('reserve facility -> 201', r.status === 201, JSON.stringify(r.data)); const resId = r.data._id; cleanup.push(['/reservations/', resId]);
  check('overlapping reservation rejected (409)', (await call('POST', '/reservations', { ...S2, body: { ...rb, startTime: '14:00', endTime: '16:00' } })).status === 409);
  r = await call('POST', '/reservations', { ...S2, body: { ...rb, facility: 'Study Room B' } });
  check('same time, different facility allowed', r.status === 201); cleanup.push(['/reservations/', r.data._id]);
  r = await call('GET', `/reservations/availability?date=${date}&facility=Study%20Room%20C&startTime=14:00&endTime=16:00`, S);
  check('availability says unavailable', r.data.facilities[0].available === false && r.data.facilities[0].booked.length === 1);
  check('edit to overlapping-free time ok', (await call('PUT', `/reservations/${resId}`, { ...S, body: { startTime: '13:30', endTime: '15:30' } })).status === 200);
  const race2 = await Promise.all(Array.from({ length: 8 }, (_, i) => call('POST', '/reservations', { ...(i % 2 ? S : S2), body: { ...rb, facility: 'Fitness Gym', startTime: '08:00', endTime: '09:00' } })));
  race2.filter((x) => x.status === 201).forEach((w) => cleanup.push(['/reservations/', w.data._id]));
  check(`8 concurrent reservations -> exactly 1 created (got ${race2.filter((x) => x.status === 201).length})`, race2.filter((x) => x.status === 201).length === 1);

  console.log('\nEvents and capacity');
  r = await call('POST', '/events', { ...S, body: {} });
  check('student cannot create events (403)', r.status === 403);
  r = await call('POST', '/events', { ...A, body: { title: 'API test event', description: 'Capacity test event.', location: 'Room 1', date, startTime: '09:00', endTime: '10:00', category: 'Other', capacity: 3 } });
  const evId = r.data._id;
  check('create event -> 201, 3 slots left', r.status === 201 && r.data.remainingSlots === 3);
  check('register -> 201', (await call('POST', `/events/${evId}/register`, S)).status === 201);
  check('duplicate registration rejected (409)', (await call('POST', `/events/${evId}/register`, S)).status === 409);
  r = await call('GET', `/events/${evId}/availability`, S);
  check('remaining slots = capacity - registrations', r.data.remainingSlots === 2 && r.data.registeredCount === 1 && r.data.isRegistered === true);
  // 6 different users race for the 2 remaining seats
  const others = ['bianca.reyes', 'carlo.aquino', 'denise.garcia', 'ethan.ramos', 'francesca.lim', 'gabriel.torres'];
  const tokens = await Promise.all(others.map((n) => login(`${n}@student.uniassist.edu`)));
  const regs = await Promise.all(tokens.map((token) => call('POST', `/events/${evId}/register`, { token })));
  check(`6 concurrent registrations for 2 seats -> exactly 2 succeed (got ${regs.filter((x) => x.status === 201).length})`, regs.filter((x) => x.status === 201).length === 2);
  r = await call('GET', `/events/${evId}/availability`, S);
  check('event is full, never over capacity', r.data.isFull && r.data.registeredCount === 3 && r.data.remainingSlots === 0);
  check('capacity cannot drop below registrations (400)', (await call('PUT', `/events/${evId}`, { ...A, body: { capacity: 2 } })).status === 400);
  check('unregister frees a slot', (await call('DELETE', `/events/${evId}/register`, S)).data.remainingSlots === 1);
  check('event statistics', (await call('GET', '/events/statistics', A)).data.total >= 11);
  await call('DELETE', `/events/${evId}`, A);

  console.log('\nAnnouncements, dashboard, search');
  r = await call('GET', '/announcements/active');
  check('public active feed only has active items', r.status === 200 && r.data.length > 0 && r.data.every((a) => a.state === 'active'));
  check('students never receive expired announcements', (await call('GET', '/announcements?state=expired', S)).data.every((a) => a.state === 'active'));
  r = await call('GET', '/announcements', A);
  const states = new Set(r.data.map((a) => a.state));
  check('staff see upcoming, active and expired', states.has('upcoming') && states.has('active') && states.has('expired'));
  check('expiry before publish rejected (400)', (await call('POST', '/announcements', { ...A, body: { title: 'Bad dates test', content: 'Expiry precedes publish.', category: 'General', publishDate: new Date(), expiryDate: new Date(Date.now() - 1000) } })).status === 400);
  r = await call('GET', '/dashboard/statistics', S);
  check('dashboard aggregates', r.status === 200 && Array.isArray(r.data.todayClasses) && typeof r.data.tasks.overdue === 'number' && r.data.activeAnnouncements.length > 0 && r.data.upcomingEvents.length > 0);
  check('dashboard task numbers match task statistics', r.data.tasks.total === before.total && r.data.tasks.overdue === before.overdue);
  r = await call('GET', '/dashboard/analytics', A);
  check('analytics for admin', r.status === 200 && r.data.users.byRole.student === 15 && r.data.users.byRole.faculty === 3);
  r = await call('GET', '/search?q=web', S);
  check('search across collections', r.status === 200 && r.data.total > 0 && r.data.results.events.length > 0);
  check('search needs 2+ characters (400)', (await call('GET', '/search?q=a', S)).status === 400);

  console.log('\nUsers (admin)');
  r = await call('POST', '/users', { ...A, body: { name: 'Temp User', email: 'temp.user@uniassist.edu', password: 'Password123!', role: 'student' } });
  check('admin creates user -> 201, password hidden', r.status === 201 && r.data.password === undefined);
  const uid = r.data._id;
  check('duplicate email rejected (409)', (await call('POST', '/users', { ...A, body: { name: 'Temp User', email: 'temp.user@uniassist.edu', password: 'Password123!' } })).status === 409);
  check('update user role', (await call('PUT', `/users/${uid}`, { ...A, body: { role: 'faculty' } })).data.role === 'faculty');
  check('delete user', (await call('DELETE', `/users/${uid}`, A)).status === 200);

  for (const [p, id] of cleanup) await call('DELETE', p + id, A);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
