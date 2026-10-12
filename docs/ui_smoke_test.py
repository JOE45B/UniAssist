import sys, re
from playwright.sync_api import sync_playwright
BASE='http://localhost:5173'; SHOTS=sys.argv[1]
ok=0; bad=0
def check(name, cond, extra=''):
    global ok,bad
    if cond: ok+=1; print('  ok   ',name)
    else: bad+=1; print('  FAIL ',name, extra)
ACCOUNTS = {'Student': 'miguel.santos@student.uniassist.edu', 'Faculty': 'ramon.delacruz@uniassist.edu', 'Admin': 'admin@uniassist.edu'}

def fill_login(page, label):
    page.fill('input[name=email]', ACCOUNTS[label]); page.fill('input[name=password]', 'Password123!')

def login(page, label):
    page.goto(BASE+'/login'); fill_login(page, label); page.get_by_role('button', name='Sign in').click(); page.wait_for_selector('button[aria-label="Sign out"]', state='attached'); page.goto(BASE+'/dashboard')
def overflow(page): return page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':1440,'height':900}); page=ctx.new_page()
    errors=[]
    page.on('console', lambda m: errors.append(m.text) if m.type=='error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    print('Landing'); page.goto(BASE+'/'); page.wait_for_selector('text=Happening on campus')
    check('headline', page.get_by_role('heading', name=re.compile('Everything You Need')).is_visible())
    page.wait_for_selector('text=Active announcements'); page.wait_for_timeout(800)
    check('live previews loaded from API', page.locator('text=Midterm examination schedule released').count()>0 and page.locator('text=left').count()>0)
    page.screenshot(path=SHOTS+'/01-landing.png', full_page=True)
    page.get_by_role('link', name='About').first.click(); check('about route', page.get_by_role('heading', name=re.compile('campus assistant')).is_visible())
    page.goto(BASE+'/tasks'); page.wait_for_url('**/login'); check('protected route redirects to login', True)
    page.get_by_role('button', name='Sign in').click()
    check('login validation messages', page.locator('text=Enter a valid email address').is_visible() and page.locator('text=Enter your password').is_visible())
    page.fill('input[type=email]','admin@uniassist.edu'); page.fill('input[type=password]','wrongpass'); page.get_by_role('button', name='Sign in').click()
    page.wait_for_selector('text=Incorrect email or password'); check('server login error shown', True)
    errors.clear()
    print('Student'); fill_login(page, 'Student'); page.get_by_role('button', name='Sign in').click(); page.wait_for_url('**/tasks'); check('after login, returned to the page first requested', True); page.goto(BASE+'/dashboard')
    page.wait_for_selector('text=Today’s classes'); check('dashboard loads from API', page.locator('text=Recent activity').is_visible())
    
    page.screenshot(path=SHOTS+'/02-dashboard.png', full_page=True)
    # tasks
    page.goto(BASE+'/tasks'); page.wait_for_selector('text=Submit REST API documentation')
    overdue_before=page.locator('.card:has-text("Overdue") p.text-2xl').first.inner_text()
    page.get_by_role('button', name='New task').click(); page.fill('input[name=title]','x'); page.get_by_role('button', name='Create task').click()
    check('task field validation', page.locator('text=Title must be at least 3 characters').is_visible() and page.locator('text=Enter the subject').is_visible())
    page.fill('input[name=title]','Playwright UI task'); page.fill('input[name=subject]','QA101'); page.fill('input[name=dueDate]','2020-01-01T10:00'); page.get_by_role('button', name='Create task').click()
    page.wait_for_selector('text=Task created'); row=page.locator('li.card', has_text='Playwright UI task')
    row.wait_for(); check('created task shows Overdue label', row.locator('text=Overdue').count()>0)
    page.wait_for_timeout(500); overdue_after=page.locator('.card:has-text("Overdue") p.text-2xl').first.inner_text()
    check('overdue stat updated after create (%s -> %s)'%(overdue_before,overdue_after), int(overdue_after)==int(overdue_before)+1)
    row.get_by_role('button', name=re.compile('Mark .* as completed')).click(); page.wait_for_selector('text=Task completed'); page.wait_for_timeout(500)
    row=page.locator('li.card', has_text='Playwright UI task'); check('completed task not overdue', row.locator('text=Completed').count()>0 and row.locator('text=Overdue').count()==0)
    row.get_by_role('button', name='Edit').click(); page.fill('input[name=title]','Playwright UI task edited'); page.get_by_role('button', name='Save changes').click(); page.wait_for_selector('text=Task updated')
    row=page.locator('li.card', has_text='Playwright UI task edited'); row.get_by_role('button', name='Delete').click(); page.get_by_role('dialog').get_by_role('button', name='Delete').click()
    page.wait_for_selector('text=Task deleted'); page.wait_for_timeout(400); check('edit + delete with confirmation', page.locator('text=Playwright UI task edited').count()==0)
    page.select_option('select[aria-label="Filter by status"]','overdue'); page.wait_for_timeout(600); check('status filter', page.locator('li.card').count()==3, str(page.locator('li.card').count()))
    page.screenshot(path=SHOTS+'/03-tasks.png', full_page=True)
    # schedule conflict
    page.goto(BASE+'/schedule'); page.wait_for_selector('text=Advanced Web Programming'); page.get_by_role('button', name='Add class').click()
    page.fill('input[name=courseCode]','TST1'); page.fill('input[name=room]','R1'); page.fill('input[name=courseName]','Clash'); page.fill('input[name=instructor]','Someone'); page.fill('input[name=startTime]','09:00'); page.fill('input[name=endTime]','10:30')
    page.get_by_role('button', name='Add class').last.click(); page.wait_for_selector('text=Schedule conflict: overlaps ITE301'); check('schedule overlap shown in UI', True)
    page.screenshot(path=SHOTS+'/04-schedule-conflict.png'); page.keyboard.press('Escape')
    # request
    page.goto(BASE+'/service-requests'); page.wait_for_selector('text=Transcript of Records for internship'); page.get_by_role('button', name='New request').click()
    page.fill('input[name=title]','UI test request'); page.fill('textarea[name=description]','short'); page.get_by_role('button', name='Submit request').click()
    check('request validation', page.locator('text=Describe the request in at least 10 characters').is_visible())
    page.fill('textarea[name=description]','Created from the browser test run.'); page.get_by_role('button', name='Submit request').click(); page.wait_for_selector('text=Request submitted')
    page.get_by_role('link', name='UI test request').click(); page.wait_for_selector('text=Status history'); check('request detail route', page.get_by_role('button', name='Cancel request').is_visible() and page.get_by_role('button', name='Start processing').count()==0)
    req_url=page.url
    # appointment
    page.goto(BASE+'/appointments'); page.wait_for_selector('text=Prof. Ramon Dela Cruz'); page.get_by_role('button', name='Book appointment').first.click()
    page.select_option('select[name=staff]', label='Prof. Ramon Dela Cruz — Academic Advising'); import datetime; d=(datetime.date.today()+datetime.timedelta(days=1)).isoformat(); page.fill('input[name=date]', d)
    page.wait_for_selector('text=Already booked'); check('availability lookup shows booked slots', page.locator('text=9:00 AM – 9:30 AM').count()>0)
    page.select_option('select[name=startTime]','09:00'); page.select_option('select[name=endTime]','10:00'); page.fill('textarea[name=purpose]','Overlap attempt from UI'); page.get_by_role('button', name='Book appointment').last.click()
    page.wait_for_selector('text=is already booked at'); check('double booking rejected in UI', True); page.screenshot(path=SHOTS+'/05-appointment-conflict.png')
    page.get_by_role('button', name='11:00 AM', exact=True).click(); page.get_by_role('button', name='Book appointment').last.click(); page.wait_for_selector('text=Appointment booked'); check('booked a free slot', True)
    # reservation
    page.goto(BASE+'/reservations'); page.wait_for_selector('text=Study Room A'); page.get_by_role('button', name='Reserve a facility').first.click()
    page.select_option('select[name=facility]','Study Room A'); page.fill('input[name=date]', d); page.wait_for_selector('text=Already booked')
    page.select_option('select[name=startTime]','14:00'); page.select_option('select[name=endTime]','16:00'); page.fill('textarea[name=purpose]','Overlap attempt'); page.get_by_role('button', name='Reserve facility').click()
    page.wait_for_selector('text=Study Room A is already booked'); check('reservation overlap rejected in UI', True); page.keyboard.press('Escape')
    # events
    page.goto(BASE+'/events'); page.wait_for_selector('text=Resume Writing Clinic'); card=page.locator('li.card', has_text='Resume Writing Clinic')
    check('full event: register disabled', card.get_by_role('button', name='No slots left').is_disabled())
    card=page.locator('li.card', has_text='Web Development Bootcamp'); check('remaining slots shown (8/40)', card.locator('text=32 slots left').count()>0)
    card.get_by_role('button', name='Register').click(); page.wait_for_selector('text=You’re registered'); page.wait_for_timeout(500)
    card=page.locator('li.card', has_text='Web Development Bootcamp'); check('slots recalculated after registering', card.locator('text=31 slots left').count()>0 and card.locator('text=9 / 40 registered').count()>0)
    page.screenshot(path=SHOTS+'/06-events.png', full_page=True)
    page.goto(BASE+'/announcements'); page.wait_for_selector('text=Midterm examination'); check('active feed excludes expired/upcoming', page.locator('text=Typhoon advisory').count()==0 and page.locator('text=Scholarship application period').count()==0 and page.locator('li.card').count()==6)
    page.fill('input[aria-label="Search UniAssist"]','web'); page.keyboard.press('Enter'); page.wait_for_selector('text=Results for'); page.wait_for_selector('text=Events ('); check('global search', True)
    page.goto(BASE+'/admin'); page.wait_for_url('**/dashboard'); check('student redirected away from /admin', True)
    # API failure -> error state with retry, not blank
    page.route('**/api/tasks*', lambda r: r.abort()); page.goto(BASE+'/tasks'); page.wait_for_selector('text=We couldn’t load this'); check('API failure shows error + retry', page.get_by_role('button', name='Try again').is_visible())
    page.unroute('**/api/tasks*'); page.get_by_role('button', name='Try again').click(); page.wait_for_selector('text=Submit REST API documentation'); check('retry recovers', True)
    page.goto(BASE+'/service-requests/64b000000000000000000000'); page.wait_for_selector('text=Service request not found'); check('404 from API shown in UI', True)
    page.goto(BASE+'/nowhere'); check('unknown route -> 404 page', page.locator('text=This page doesn’t exist').is_visible())
    student_errors=[e for e in errors if 'Failed to load resource' not in e and 'ERR_FAILED' not in e]
    check('no unexpected console errors (student)', not student_errors, str(student_errors[:3]))
    # mobile
    print('Mobile 375px'); m=b.new_context(viewport={'width':375,'height':780}, storage_state=ctx.storage_state()); mp=m.new_page()
    for path in ['/','/about','/login','/dashboard','/schedule','/tasks','/service-requests','/appointments','/reservations','/events','/announcements']:
        mp.goto(BASE+path); mp.wait_for_load_state('networkidle'); o=overflow(mp); check('no horizontal overflow %s'%path, o<=0, 'overflow=%s'%o)
    mp.goto(BASE+'/dashboard'); mp.wait_for_load_state('networkidle'); mp.screenshot(path=SHOTS+'/07-mobile-dashboard.png', full_page=True)
    mp.get_by_role('button', name='Open menu').click(); mp.get_by_role('link', name='Tasks').click(); mp.wait_for_url('**/tasks'); check('mobile drawer navigation works', mp.get_by_role('link', name='Tasks').count()==0)
    mp.screenshot(path=SHOTS+'/08-mobile-tasks.png'); m.close()
    # admin
    print('Admin'); errors.clear(); page.evaluate('localStorage.clear()'); login(page,'Admin')
    for path,text in [('/admin','Users by role'),('/admin/users','Andrea Villanueva'),('/admin/requests','By status'),('/admin/appointments','All appointments'),('/admin/reservations','All reservations'),('/admin/events','Research Colloquium'),('/admin/announcements','Typhoon advisory')]:
        page.goto(BASE+path); page.wait_for_selector('text='+text); page.wait_for_load_state('networkidle'); check('admin route '+path, True)
    page.goto(BASE+'/admin'); page.wait_for_selector('text=Users by role'); page.wait_for_load_state('networkidle'); page.screenshot(path=SHOTS+'/09-admin.png', full_page=True)
    page.goto(req_url); page.wait_for_selector('text=Start processing'); page.get_by_role('button', name='Start processing').click(); page.wait_for_selector('text=Request moved to processing'); page.wait_for_timeout(400)
    check('staff progresses request; only legal moves offered', page.get_by_role('button', name='Mark as ready').is_visible() and page.get_by_role('button', name='Start processing').count()==0)
    page.screenshot(path=SHOTS+'/10-request-detail.png', full_page=True)
    page.goto(BASE+'/admin/events'); page.wait_for_selector('text=Resume Writing Clinic'); page.locator('tr', has_text='Resume Writing Clinic').get_by_role('button', name='Edit').click()
    page.fill('input[name=capacity]','2'); page.get_by_role('button', name='Save changes').click(); page.wait_for_selector('text=Capacity cannot be lower than the 5 people already registered'); check('capacity guard shown in UI', True); page.keyboard.press('Escape')
    page.locator('tr', has_text='Resume Writing Clinic').get_by_role('button', name='Attendees').click(); page.wait_for_selector('text=of 5 slots taken'); check('attendee list', True); page.keyboard.press('Escape')
    page.goto(BASE+'/admin/users'); page.wait_for_selector('text=Andrea Villanueva'); page.get_by_role('button', name='Add user').click(); page.get_by_role('button', name='Create user').click()
    check('user form validation', page.locator('text=Enter the full name').is_visible() and page.locator('text=Use at least 8 characters').is_visible())
    admin_errors=[e for e in errors if 'Failed to load resource' not in e]
    check('no unexpected console errors (admin)', not admin_errors, str(admin_errors[:3]))
    b.close()
print('\n%d passed, %d failed'%(ok,bad)); sys.exit(1 if bad else 0)
