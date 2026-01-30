# CareerQuest - Product Requirements Document

## Original Problem Statement
Build a website where a job seeker can:
1. Upload their resume and get it tailored by AI
2. Apply for jobs directly from the website
3. Receive job recommendations by checking different platforms
4. Tailor resume as per the recommended job
5. Have functionality that generally such job applying websites have

## User Personas
- **Job Seekers**: Primary users who want AI-assisted job applications
- **Admins**: Support team who manually add job portal links

## Core Requirements

### 1. Candidate Info and Login
- Get candidate info including primary technology (Java, Python, PHP, AI, React)
- Sub-technologies selection
- Resume upload
- Profile page with job preferences and completeness meter
- SSO: Google (DONE), LinkedIn (BLOCKED - needs credentials)

### 2. AI Resume Tailoring
- AI agent updates candidate's resume based on job description
- ATS-friendly, relevant keywords
- Downloadable as Word document
- Option to generate 2-3 different versions

### 3. AI Job Application
- AI agent applies for jobs using updated resume and cover letter
- **Browser Automation (Playwright)** - IMPLEMENTED Jan 26

### 4. Job Sourcing
- Web scraper for Indeed, Dice, RemoteOK (DONE - replaced paid APIs)
- Admin panel for manual job portal management
- Sample job data fallback

### 5. Email Communication
- **Email Center with AI-powered emails** (DONE - Jan 13, 2026)
- Connect user's own email (Gmail, Outlook, IMAP)
- AI composes job application emails
- AI drafts replies to recruiters

### 6. Reporting Portals
- **Company-level dashboard** (TODO)
- **Candidate-level dashboard** (DONE - Jan 27, 2026)

---

## Completed Features (as of January 27, 2026)

### Authentication & User Management
- [x] JWT-based authentication
- [x] Emergent-managed Google SSO
- [x] Profile management with photo upload
- [x] Profile completeness meter
- [ ] LinkedIn SSO (BLOCKED - needs credentials)

### Resume Features
- [x] Resume upload (PDF/DOCX/TXT)
- [x] AI-powered resume tailoring with custom prompts
- [x] Word document generation
- [x] Resume storage and management
- [x] **AUTOMATIC Resume Analysis on Upload**
  - Score (0-100) with letter grade shown immediately
  - Missing info popup (phone, address, LinkedIn, etc.)
  - Enhanced master resume created automatically
  - 3-4 job title versions generated automatically

### Job Features
- [x] Web scraper for real-time job listings (Remotive, RemoteOK, Arbeitnow, Jobicy, HackerNews)
- [x] Job recommendations based on user skills
- [x] 3-Step Apply Wizard (Tailor prompt -> Generate resume -> Preview & Apply)
- [x] Auto-Apply AI Agent panel with daily scheduler

### Auto-Apply Browser Automation (Jan 26, 2026)
- [x] **Playwright Integration** for browser automation
- [x] **Multi-Platform Support**: Greenhouse, Lever, Workday, SmartRecruiters, Ashby, Breezy, iCIMS
- [x] **Remote Job Board Handling**: Remotive, RemoteOK with redirect to company portals
- [x] **DOM-Based Link Detection**: Finds external apply links even when hidden
- [x] **Form Field Filling**: First name, last name, email, phone, LinkedIn, location, address, state, zip, country, website, github, years experience
- [x] **Dropdown Handling**: Work authorization, sponsorship, gender, veteran status, disability, race/ethnicity
- [x] **Screenshot Capture**: Initial, form_filled, submitted, confirmation states
- [x] **Application Status Tracking**: ready_to_apply, applied, submission_failed, validation_error, requires_login
- [x] **Submission Logs**: Detailed debug logs stored in MongoDB
- [x] **Enhanced Success Detection**: 40+ success patterns including URL-based detection

### Applications Tracking Page (Jan 26-27, 2026)
- [x] Stats cards: Total, Ready, Applied, Pending, Interview, Rejected, Accepted, Failed
- [x] **Clickable stat cards** - filter by status
- [x] Search and filter by status/date
- [x] View Resume dialog with tailored content
- [x] Cover Letter tab
- [x] Submit button triggers Playwright automation
- [x] Download resume per application
- [x] **Retry Failed Applications** - Individual and bulk retry

### Analytics Dashboard (Jan 27, 2026) - NEW
- [x] **Quick Stats**: Total Applications, Auto-Applied, Interviews, Offers, Avg ATS Score, Failed
- [x] **Key Metrics**: Success Rate percentage, This Week applications, Resources (resumes/emails)
- [x] **Status Distribution**: Pie chart and progress bars
- [x] **Timeline Chart**: Application activity over last 30 days (Area chart)
- [x] **Sources Breakdown**: Pie chart and bar chart by job source
- [x] **Recent Activity**: Last 5 applications with status badges

### Auto-Apply Enhancements (Jan 30, 2026) - NEW
- [x] **Enhanced Stats Panel**: Shows 4 metrics - Today, Submitted, Failed, Success Rate
- [x] **Max Daily Limit**: Reduced from 50 to 25 applications per day
- [x] **View Applications Button**: Quick access to applications page from Auto-Apply panel
- [x] **Progress Indicator**: Shows progress bar when auto-apply is running
- [x] **Source Tracking**: Applications track which page triggered them (Live Jobs vs Live Jobs 1)
- [x] **Source Badges on Applications Page**: 
  - "Live Jobs" badge (cyan) for free job sources
  - "Live Jobs 1" badge (amber) for premium RapidAPI sources
- [x] **Submitted By Tracking**: Applications track if submitted by system or manually
  - "Auto" badge (violet) for system-generated applications
  - "Manual" badge (slate) for manually created applications
- [x] **History Dialog Improvements**:
  - Shows Auto/Manual badges indicating submission method
  - Summary stats (Submitted, Failed, Pending counts)
  - "Apply Manually" button for failed applications with job URLs
  - Error messages displayed for failed submissions
- [x] **Resume Selection UX**: Shows helpful message when no resumes uploaded
- [x] **Real-time completion status**: Shows success message with link to Applications page after auto-apply completes

### Email Center
- [x] Connect email accounts (Gmail, Outlook, IMAP/SMTP)
- [x] View inbox messages
- [x] AI compose job application emails
- [x] AI draft replies to recruiters
- [x] Email history tracking
- [x] Settings (auto-compose, approval required, signature)

### Infrastructure
- [x] APScheduler for background jobs
- [x] Sample job data fallback when scraping fails
- [x] Hot reload development environment

---

## Known Limitations

### Browser Automation Limitations
1. **Platform-Specific Forms**: Some company portals use non-standard field selectors, causing validation errors
2. **Login Required**: LinkedIn, Indeed, Glassdoor require user authentication
3. **Multi-Step Forms**: Complex Workday applications may not complete all steps
4. **CAPTCHA**: Sites with CAPTCHA protection cannot be automated

### Expected Submission Statuses
- `submitted` - Successfully submitted with confirmation detected
- `submitted_unconfirmed` - Form submitted but no confirmation detected
- `validation_error` - Form fields didn't match selectors, validation failed
- `requires_login` - Platform requires authentication
- `error` - Technical error during submission

---

## In Progress / Pending

### P1 - High Priority  
- [ ] Company-level reporting dashboard (admin view)
- [ ] Backend refactoring - break down monolithic server.py (6000+ lines)

### P2 - Future
- [ ] LinkedIn SSO (needs user credentials)
- [ ] System-generated mailbox (e.g., user@careerquest-mail.com)
- [ ] Email Center App Password connection fix
- [ ] Add more platform-specific handlers for ATS systems

---

## Technical Architecture

### Backend
- Framework: FastAPI (Python)
- Database: MongoDB (motor)
- Authentication: JWT + Google OAuth
- Background Jobs: APScheduler
- Browser Automation: **Playwright**
- Email: IMAP/SMTP for user email integration

### Frontend
- Framework: React
- Styling: Tailwind CSS
- State: Zustand
- UI Components: Shadcn/UI
- Charts: Recharts

### Integrations
- OpenAI (via emergentintegrations) - Resume tailoring, Email composition
- Web Scraper (BeautifulSoup) - Job sourcing
- IMAP/SMTP - User email integration
- **Playwright** - Browser automation for job submission

### Key Files
- `/app/backend/server.py` - Main backend (needs refactoring)
- `/app/backend/utils/job_application_bot.py` - Playwright browser automation
- `/app/backend/utils/enhanced_job_scraper.py` - Free job API scraper
- `/app/frontend/src/pages/ApplicationsPage.jsx` - Applications tracking
- `/app/frontend/src/components/LiveJobsCore.jsx` - **REFACTORED** Shared component for Live Jobs pages
- `/app/frontend/src/pages/LiveJobsPage.jsx` - Job listings (free sources) - uses LiveJobsCore
- `/app/frontend/src/pages/LiveJobs1Page.jsx` - Job listings (RapidAPI premium) - uses LiveJobsCore
- `/app/frontend/src/pages/ReportsPage.jsx` - Analytics dashboard

---

## API Endpoints (Browser Automation)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auto-apply/submit/{application_id} | Trigger Playwright submission for single application |
| POST | /api/auto-apply/submit-batch | Trigger batch submission for multiple applications |
| GET | /api/auto-apply/submission-logs | Get submission attempt logs |
| GET | /api/auto-apply/screenshots/{application_id} | Get screenshot paths for application |
| GET | /api/reports/candidate | Get candidate analytics dashboard data |
| GET | /api/reports/admin | Get admin dashboard data |

---

## Code Refactoring History

### January 29, 2026 - Live Jobs Pages Refactoring
- **Before**: `LiveJobsPage.jsx` (2,626 lines) + `LiveJobs1Page.jsx` (2,683 lines) = 5,309 lines total
- **After**: `LiveJobsCore.jsx` (1,538 lines) + 2 page wrappers (16 lines each) = 1,570 lines total
- **Reduction**: 70% code reduction (3,739 lines removed)
- **Benefits**: Single source of truth, easier maintenance, consistent behavior across both pages

---

## Test Reports
- `/app/test_reports/iteration_12.json` - Auto-Apply source variant & badges (all passed) - Jan 30, 2026
- `/app/test_reports/iteration_11.json` - Auto-Apply enhancements (17/17 passed) - Jan 30, 2026
- `/app/test_reports/iteration_10.json` - LiveJobsCore refactoring (28/28 passed) - Jan 29, 2026
- `/app/test_reports/iteration_9.json` - Frontend testing (21/21 passed) - Jan 27, 2026
- `/app/test_reports/iteration_8.json` - Browser automation tests (14/14 passed)

## Test Credentials
- Test User: `test_autoapply@example.com` / `testpass123`
- Test Resume ID: `resume_8c4696bc3a38`

---

*Last updated: January 30, 2026*
