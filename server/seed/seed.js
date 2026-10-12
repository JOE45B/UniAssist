/**
 * Repeatable demo seed:  npm run seed
 * Clears the UniAssist collections and re-inserts a fresh, consistent data set, so
 * running it twice never produces duplicates. All people and records are fictional.
 * Dates are generated relative to "today" so the demo always has overdue, due-today,
 * upcoming, active and expired examples.
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Task = require('../models/Task');
const ServiceRequest = require('../models/ServiceRequest');
const Appointment = require('../models/Appointment');
const Reservation = require('../models/Reservation');
const Announcement = require('../models/Announcement');
const Event = require('../models/Event');
const SlotLock = require('../models/SlotLock');
const locks = require('../services/lockService');
const { FACILITIES } = require('../utils/constants');
const { todayStr, addDays } = require('../utils/time');

const PASSWORD = 'Password123!';
const HOUR = 3600000;
const DAY = 24 * HOUR;
const at = (days, hours = 0) => new Date(Date.now() + days * DAY + hours * HOUR);
const day = (n) => addDays(todayStr(), n);

async function seed() {
  await connectDB();
  const models = [User, Schedule, Task, ServiceRequest, Appointment, Reservation, Announcement, Event, SlotLock];
  await Promise.all(models.map((m) => m.init()));
  await Promise.all(models.map((m) => m.deleteMany({})));

  // ---- Users: 1 admin, 3 faculty/staff, 15 students -------------------------------
  const admin = await User.create({ name: 'Andrea Villanueva', email: 'admin@uniassist.edu', password: PASSWORD, role: 'admin', idNumber: 'ADM-0001', department: 'IT Services' });
  const staff = await User.create([
    { name: 'Prof. Ramon Dela Cruz', email: 'ramon.delacruz@uniassist.edu', password: PASSWORD, role: 'faculty', idNumber: 'FAC-1001', department: 'Academic Advising' },
    { name: 'Ms. Liza Navarro', email: 'liza.navarro@uniassist.edu', password: PASSWORD, role: 'faculty', idNumber: 'FAC-1002', department: 'Registrar' },
    { name: 'Mr. Paolo Mendoza', email: 'paolo.mendoza@uniassist.edu', password: PASSWORD, role: 'faculty', idNumber: 'FAC-1003', department: 'Guidance' },
  ]);
  const names = ['Miguel Santos', 'Bianca Reyes', 'Carlo Aquino', 'Denise Garcia', 'Ethan Ramos', 'Francesca Lim', 'Gabriel Torres', 'Hannah Castillo', 'Ivan Bautista', 'Julia Fernandez', 'Kenneth Pascual', 'Lara Domingo', 'Marco Salazar', 'Nicole Ventura', 'Oliver Tan'];
  const programs = ['BS Information Technology', 'BS Computer Science', 'BS Business Administration', 'BS Psychology', 'BS Civil Engineering'];
  const students = await User.create(names.map((name, i) => ({
    name, email: `${name.toLowerCase().replace(/\s+/g, '.')}@student.uniassist.edu`, password: PASSWORD, role: 'student',
    idNumber: `2023-${String(1001 + i)}`, program: programs[i % programs.length], yearLevel: (i % 4) + 1,
  })));
  const [s1, s2, s3, s4, s5, s6] = students;

  // ---- Schedules (20) --------------------------------------------------------------
  const cls = (user, courseCode, courseName, instructor, room, d, startTime, endTime) => ({ user: user._id, courseCode, courseName, instructor, room, day: d, startTime, endTime });
  await Schedule.create([
    cls(s1, 'ITE301', 'Advanced Web Programming', 'Prof. Ramon Dela Cruz', 'Lab 402', 'Monday', '08:00', '10:00'),
    cls(s1, 'ITE305', 'Mobile Application Development', 'Prof. Ana Soriano', 'Lab 404', 'Monday', '13:00', '15:00'),
    cls(s1, 'ITE310', 'Systems Administration', 'Prof. Jerome Uy', 'Lab 301', 'Tuesday', '09:00', '11:00'),
    cls(s1, 'GEC107', 'Ethics', 'Prof. Clarisse Ong', 'Room 210', 'Tuesday', '14:00', '15:30'),
    cls(s1, 'ITE301', 'Advanced Web Programming', 'Prof. Ramon Dela Cruz', 'Lab 402', 'Wednesday', '08:00', '10:00'),
    cls(s1, 'ITE315', 'Computer Networking 2', 'Prof. Dennis Yap', 'Lab 303', 'Wednesday', '10:30', '12:30'),
    cls(s1, 'ENT201', 'Technopreneurship', 'Prof. Marivic Chua', 'Room 215', 'Thursday', '13:00', '14:30'),
    cls(s1, 'ITE310', 'Systems Administration', 'Prof. Jerome Uy', 'Lab 301', 'Friday', '09:00', '11:00'),
    cls(s1, 'PED104', 'Team Sports', 'Coach Rico Javier', 'Covered Court', 'Saturday', '07:30', '09:30'),
    cls(s1, 'NST102', 'NSTP Community Immersion', 'Mr. Paolo Mendoza', 'Room 101', 'Sunday', '09:00', '11:00'),
    cls(s2, 'CSC201', 'Data Structures', 'Prof. Ana Soriano', 'Lab 401', 'Monday', '10:00', '12:00'),
    cls(s2, 'MAT203', 'Discrete Mathematics', 'Prof. Clarisse Ong', 'Room 212', 'Wednesday', '13:00', '14:30'),
    cls(s3, 'BUS110', 'Principles of Marketing', 'Prof. Marivic Chua', 'Room 220', 'Tuesday', '08:00', '09:30'),
    cls(s3, 'ACC101', 'Financial Accounting', 'Prof. Henry Co', 'Room 221', 'Thursday', '10:00', '12:00'),
    cls(s4, 'PSY205', 'Developmental Psychology', 'Mr. Paolo Mendoza', 'Room 305', 'Monday', '09:00', '10:30'),
    cls(s4, 'PSY210', 'Psychological Statistics', 'Prof. Clarisse Ong', 'Room 306', 'Friday', '13:00', '15:00'),
    cls(s5, 'CEN220', 'Mechanics of Materials', 'Prof. Dennis Yap', 'Room 110', 'Tuesday', '10:00', '12:00'),
    cls(s5, 'CEN230', 'Surveying', 'Prof. Henry Co', 'Field Lab', 'Thursday', '07:30', '10:30'),
    cls(s6, 'ITE301', 'Advanced Web Programming', 'Prof. Ramon Dela Cruz', 'Lab 402', 'Monday', '08:00', '10:00'),
    cls(s6, 'GEC107', 'Ethics', 'Prof. Clarisse Ong', 'Room 210', 'Tuesday', '14:00', '15:30'),
  ]);

  // ---- Tasks (25): pending, completed and overdue cases ------------------------------
  const task = (user, title, subject, dueDate, priority, status = 'pending', description = '') => ({ user: user._id, title, subject, dueDate, priority, status, description, completedAt: status === 'completed' ? at(-1) : null });
  await Task.create([
    task(s1, 'Submit REST API documentation', 'ITE301', at(-3), 'high', 'pending', 'Endpoint table with sample requests and responses.'),
    task(s1, 'Network subnetting worksheet', 'ITE315', at(-1), 'medium', 'pending', 'Worksheet 4, items 1-20.'),
    task(s1, 'Ethics reflection paper', 'GEC107', at(-6), 'low', 'pending', '800 words on a workplace dilemma.'),
    task(s1, 'Fix dashboard loading states', 'ITE301', at(0, 5), 'high', 'pending', 'Add retry and empty states to every page.'),
    task(s1, 'Linux user management lab', 'ITE310', at(1, 2), 'medium', 'pending', 'Create groups, sudoers and password policy.'),
    task(s1, 'Business model canvas draft', 'ENT201', at(2), 'medium', 'pending'),
    task(s1, 'Mobile app wireframes', 'ITE305', at(3), 'high', 'pending', 'Low-fidelity screens for the five main flows.'),
    task(s1, 'Group final project demo rehearsal', 'ITE301', at(6), 'high', 'pending'),
    task(s1, 'Review for networking midterm', 'ITE315', at(9), 'medium', 'pending'),
    task(s1, 'Pitch deck for technopreneurship', 'ENT201', at(14), 'low', 'pending'),
    task(s1, 'Set up Express server and routes', 'ITE301', at(-8), 'high', 'completed'),
    task(s1, 'Design MongoDB schemas', 'ITE301', at(-5), 'high', 'completed'),
    task(s1, 'Install Ubuntu Server VM', 'ITE310', at(-10), 'medium', 'completed'),
    task(s2, 'Linked list implementation', 'CSC201', at(-2), 'high', 'pending'),
    task(s2, 'Proof by induction problem set', 'MAT203', at(2), 'medium', 'pending'),
    task(s2, 'Binary tree traversal quiz review', 'CSC201', at(5), 'low', 'pending'),
    task(s2, 'Graph theory reading notes', 'MAT203', at(-4), 'low', 'completed'),
    task(s3, 'Marketing plan outline', 'BUS110', at(1), 'high', 'pending'),
    task(s3, 'Journal entries exercise', 'ACC101', at(-1), 'medium', 'pending'),
    task(s3, 'Case study: local coffee brand', 'BUS110', at(-7), 'medium', 'completed'),
    task(s4, 'Developmental stages infographic', 'PSY205', at(4), 'medium', 'pending'),
    task(s4, 'SPSS exercise 3', 'PSY210', at(0, 6), 'high', 'pending'),
    task(s5, 'Stress-strain lab report', 'CEN220', at(-2), 'high', 'pending'),
    task(s5, 'Traverse computation plate', 'CEN230', at(7), 'medium', 'pending'),
    task(s6, 'React form validation activity', 'ITE301', at(3), 'medium', 'completed'),
  ]);

  // ---- Service requests (15) in varied statuses, each with a legal history ---------------
  const PATHS = {
    pending: ['pending'], processing: ['pending', 'processing'], ready: ['pending', 'processing', 'ready'],
    completed: ['pending', 'processing', 'ready', 'completed'], rejected: ['pending', 'rejected'], cancelled: ['pending', 'cancelled'],
  };
  const NOTES = { pending: 'Request submitted', processing: 'Being processed by the office', ready: 'Ready for pick-up / release', completed: 'Request fulfilled', rejected: 'Incomplete requirements', cancelled: 'Cancelled by student' };
  const request = (user, category, title, description, priority, status, daysAgo, dueIn) => {
    const submittedAt = at(-daysAgo);
    const path = PATHS[status];
    const history = path.map((st, i) => ({ status: st, note: NOTES[st], changedBy: st === 'pending' || st === 'cancelled' ? user._id : staff[1]._id, at: new Date(submittedAt.getTime() + i * 1.5 * DAY > Date.now() ? Date.now() - (path.length - i) * HOUR : submittedAt.getTime() + i * 1.5 * DAY) }));
    return { user: user._id, category, title, description, priority, status, submittedAt, dueDate: dueIn === null ? null : at(dueIn), completedAt: status === 'completed' ? history[history.length - 1].at : null, history };
  };
  await ServiceRequest.create([
    request(s1, 'Document Request', 'Transcript of Records for internship', 'I need two certified copies of my TOR for my internship application next month.', 'high', 'processing', 4, 3),
    request(s1, 'ID Concern', 'Replacement for damaged school ID', 'My ID card chip no longer scans at the gate turnstile and library entrance.', 'medium', 'ready', 9, 1),
    request(s1, 'IT Support', 'Cannot log in to the student portal', 'The portal says my account is locked after I reset my password yesterday.', 'high', 'pending', 1, 2),
    request(s1, 'Enrollment', 'Add ITE320 to my enrolled subjects', 'Requesting to add ITE320 section B since the prerequisite has now been credited.', 'medium', 'completed', 20, -12),
    request(s1, 'Registrar', 'Correction of middle name on records', 'My middle name is misspelled on my registration form and class cards.', 'low', 'cancelled', 15, null),
    request(s2, 'Document Request', 'Certificate of Enrollment', 'Needed for my scholarship renewal requirements this semester.', 'medium', 'completed', 12, -6),
    request(s2, 'Technical Support', 'Projector not working in Lab 401', 'The ceiling projector in Lab 401 shows a blue screen on every input.', 'medium', 'processing', 2, -1),
    request(s3, 'Student Affairs', 'Organization accreditation follow-up', 'Following up the accreditation papers our org submitted three weeks ago.', 'low', 'pending', 3, 7),
    request(s3, 'Registrar', 'Request for grade completion form', 'I need the completion form for my INC grade in ACC101 last term.', 'high', 'ready', 6, 0.5),
    request(s4, 'Enrollment', 'Late enrollment appeal', 'I was unable to enroll on time because of a medical emergency in my family.', 'high', 'rejected', 18, null),
    request(s4, 'IT Support', 'Campus Wi-Fi keeps disconnecting', 'The Wi-Fi in the 3rd floor psychology wing drops every few minutes.', 'medium', 'pending', 0.5, 5),
    request(s5, 'Document Request', 'Good moral certificate', 'For my application to the engineering student exchange program.', 'medium', 'processing', 5, -2),
    request(s5, 'Other', 'Lost and found: scientific calculator', 'I left my Casio calculator in Room 110 after the Tuesday morning class.', 'low', 'completed', 25, null),
    request(s6, 'ID Concern', 'Update photo on school ID', 'Requesting a new ID photo since the current one is from first year.', 'low', 'pending', 2, 10),
    request(students[6], 'Student Affairs', 'Permit for outreach activity', 'Requesting an activity permit for our weekend community outreach.', 'medium', 'cancelled', 8, null),
  ]);

  // ---- Appointments (10) and reservations (10). Active future bookings also get slot locks.
  const book = async (Model, resource, data) => {
    const doc = await Model.create(data);
    if (['scheduled', 'confirmed'].includes(data.status) && data.date >= todayStr()) await locks.acquire(resource, data.date, data.startTime, data.endTime, doc._id);
    return doc;
  };
  const appt = (user, st, department, d, startTime, endTime, purpose, status = 'scheduled') => book(Appointment, `staff:${st._id}`, { user: user._id, staff: st._id, department, date: day(d), startTime, endTime, purpose, status });
  await appt(s1, staff[0], 'Academic Advising', 1, '09:00', '09:30', 'Consultation about capstone project scope');
  await appt(s1, staff[1], 'Registrar', 3, '10:00', '10:30', 'Follow up on transcript request');
  await appt(s2, staff[0], 'Academic Advising', 1, '10:00', '10:30', 'Subject sequencing for next term');
  await appt(s3, staff[2], 'Guidance', 2, '14:00', '15:00', 'Career counselling session');
  await appt(s4, staff[2], 'Guidance', 4, '09:00', '10:00', 'Study habits and time management');
  await appt(s5, staff[1], 'Registrar', 5, '13:00', '13:30', 'Shifting of program inquiry');
  await appt(s1, staff[2], 'Guidance', -6, '10:00', '11:00', 'Initial guidance interview', 'completed');
  await appt(s6, staff[0], 'Academic Advising', -3, '15:00', '15:30', 'Grade consultation', 'completed');
  await appt(s2, staff[1], 'Registrar', 2, '11:00', '11:30', 'Records verification', 'cancelled');
  await appt(s3, admin, 'IT Services', -1, '09:00', '09:30', 'Portal account recovery', 'cancelled');

  const type = (name) => FACILITIES.find((f) => f.name === name).type;
  const res = (user, facility, d, startTime, endTime, purpose, status = 'confirmed') => book(Reservation, `facility:${facility}`, { user: user._id, facility, facilityType: type(facility), date: day(d), startTime, endTime, purpose, status });
  await res(s1, 'Study Room A', 1, '13:00', '15:00', 'Group study for networking midterm');
  await res(s1, 'Computer Lab 1', 4, '15:00', '17:00', 'Final project integration testing');
  await res(s2, 'Study Room A', 1, '15:00', '16:30', 'Data structures peer tutoring');
  await res(s3, 'Meeting Room 301', 2, '10:00', '11:30', 'Marketing org officers meeting');
  await res(s4, 'Library Discussion Room 1', 3, '09:00', '11:00', 'Thesis literature review session');
  await res(s5, 'Covered Court', 6, '16:00', '18:00', 'Engineering week basketball practice');
  await res(s6, 'Computer Lab 2', 2, '13:00', '15:00', 'React workshop practice run');
  await res(s1, 'Study Room B', -4, '10:00', '12:00', 'Capstone planning', 'completed');
  await res(s3, 'Fitness Gym', -2, '17:00', '18:00', 'PE make-up session', 'completed');
  await res(s2, 'Meeting Room 302', 5, '14:00', '15:00', 'Org meeting (moved online)', 'cancelled');

  // ---- Announcements (10): 6 active, 2 upcoming, 2 expired ------------------------------
  const ann = (title, content, category, priority, publishIn, expireIn) => ({ title, content, category, priority, publishDate: at(publishIn), expiryDate: at(expireIn), createdBy: admin._id });
  await Announcement.create([
    ann('Midterm examination schedule released', 'The midterm examination schedule for all colleges is now posted. Check your room assignments and bring your school ID and exam permit.', 'Academic', 'high', -2, 12),
    ann('Enrollment for next term opens soon', 'Online enrollment for continuing students opens on the 1st. Settle outstanding balances and complete your course evaluations beforehand.', 'Administrative', 'high', -1, 20),
    ann('Library extends hours during exam week', 'The main library will stay open until 9:00 PM from Monday to Saturday for the duration of the midterm period.', 'Facilities', 'medium', -3, 10),
    ann('Campus Wi-Fi maintenance this weekend', 'Network services will be intermittent on Saturday from 10 PM to 2 AM while core switches are upgraded.', 'Facilities', 'medium', -1, 4),
    ann('Call for volunteers: community outreach', 'The Student Affairs Office is looking for 40 volunteers for the coastal clean-up. Sign up through the Events page.', 'Events', 'low', -5, 9),
    ann('Updated ID validation procedure', 'ID validation is now done at the Registrar window 3. Bring your registration form for the current term.', 'General', 'low', -7, 30),
    ann('Scholarship application period', 'Applications for academic and athletic scholarships open next week. Requirements will be listed at the Student Affairs Office.', 'Academic', 'medium', 3, 25),
    ann('Foundation week class suspensions', 'Classes will be suspended on selected afternoons during Foundation Week. The detailed schedule follows.', 'Events', 'medium', 6, 15),
    ann('Typhoon advisory: classes suspended', 'Classes at all levels were suspended due to the typhoon signal. Regular classes have since resumed.', 'Emergency', 'high', -12, -9),
    ann('Deadline for adding and dropping subjects', 'The add/drop period for this term has ended. Late requests are no longer accepted by the Registrar.', 'Administrative', 'medium', -30, -14),
  ]);

  // ---- Events (10) with different capacities and registration levels --------------------
  const ev = (title, description, location, d, startTime, endTime, category, capacity, attendees) => ({ title, description, location, date: day(d), startTime, endTime, category, capacity, registrations: attendees.map((u) => u._id), createdBy: admin._id });
  await Event.create([
    ev('Web Development Bootcamp: React and Express', 'A hands-on full-stack workshop covering REST APIs, React forms and deployment basics.', 'Computer Lab 1', 3, '13:00', '17:00', 'Seminar', 40, students.slice(1, 9)),
    ev('Career Fair: Tech and Business', 'Meet recruiters from partner companies and bring printed copies of your resume.', 'Covered Court', 7, '09:00', '16:00', 'Career', 300, students.slice(2, 14)),
    ev('Resume Writing Clinic', 'Small-group coaching on resumes and cover letters with the Guidance Office.', 'Meeting Room 301', 2, '10:00', '12:00', 'Career', 5, students.slice(1, 6)), // full
    ev('Intramurals Opening Ceremony', 'Parade of colleges, torch lighting and the first basketball exhibition game.', 'Covered Court', 10, '08:00', '11:00', 'Sports', 500, students.slice(0, 10)),
    ev('Research Colloquium', 'Undergraduate thesis presentations across all colleges with invited panelists.', 'Auditorium', 14, '08:30', '15:00', 'Academic', 120, students.slice(3, 8)),
    ev('Cultural Night: Himig at Sayaw', 'An evening of music and dance performances by student organizations.', 'Auditorium', 5, '18:00', '21:00', 'Cultural', 200, students.slice(4, 15)),
    ev('Student Org Leadership Summit', 'Planning, budgeting and event-management training for organization officers.', 'Meeting Room 302', 4, '09:00', '15:00', 'Organization', 16, students.slice(1, 15)), // 14 of 16
    ev('Cybersecurity Awareness Talk', 'Phishing, password hygiene and staying safe on campus networks.', 'Computer Lab 2', 1, '15:00', '17:00', 'Seminar', 40, students.slice(5, 9)),
    ev('Freshmen Orientation Recap', 'A recap session on student services, offices and campus facilities.', 'Auditorium', -9, '09:00', '11:00', 'Academic', 150, students.slice(8, 15)),
    ev('Blood Donation Drive', 'In partnership with the local Red Cross chapter. Walk-ins welcome while slots last.', 'University Clinic', -3, '08:00', '12:00', 'Other', 60, students.slice(0, 6)),
  ]);

  const counts = {};
  for (const m of models) counts[m.modelName] = await m.countDocuments();
  console.log('Seed complete:', counts);
  console.log(`\nDemo logins (password for every account: ${PASSWORD})`);
  console.log(`  Admin   : ${admin.email}`);
  console.log(`  Faculty : ${staff[0].email}`);
  console.log(`  Student : ${s1.email}`);
  await mongoose.disconnect();
}

seed().catch(async (err) => { console.error('Seed failed:', err.message); await mongoose.disconnect().catch(() => {}); process.exit(1); });
