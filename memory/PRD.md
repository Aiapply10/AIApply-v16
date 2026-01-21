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
- Company-level dashboard (TODO)
- Candidate-level dashboard (TODO)

---

## Completed Features (as of January 13, 2026)

### Authentication & User Management
- [x] JWT-based authentication
- [x] Emergent-managed Google SSO
- [x] **Email OTP Verification for signup** (Jan 13)
- [x] Profile management with photo upload
- [x] Profile completeness meter
- [ ] LinkedIn SSO (BLOCKED - needs credentials)

### Resume Features
- [x] Resume upload (PDF/DOCX/TXT)
- [x] AI-powered resume tailoring with custom prompts
- [x] Word document generation
- [x] Resume storage and management
- [x] **AUTOMATIC Resume Analysis on Upload** (Jan 14)
  - Score (0-100) with letter grade shown immediately
  - Missing info popup (phone, address, LinkedIn, etc.)
  - Enhanced master resume created automatically
  - 3-4 job title versions generated automatically
  - All happens on upload - NO manual button clicks needed

### Job Features
- [x] Web scraper for real-time job listings (Indeed, Dice, RemoteOK)
- [x] Job recommendations based on user skills
- [x] 3-Step Apply Wizard (Tailor prompt -> Generate resume -> Preview & Apply)
- [x] Auto-Apply AI Agent panel with daily scheduler
- [x] Profile gating (must have tech & resume to see jobs)

### Email Center (NEW - Jan 13, 2026)
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

## In Progress / Pending

### P0 - Critical
- [x] ~~OTP Email Verification~~ **REMOVED Jan 20** - Simplified to simple email/password registration
- [x] ~~Email Center~~ **COMPLETED Jan 13**
- [x] ~~Google login button hover bug~~ **VERIFIED FIXED Jan 19**
- [x] ~~Profile popup raw field names~~ **VERIFIED FIXED Jan 19**
- [x] ~~Job search not fetching from multiple platforms~~ **FIXED Jan 19**
- [x] ~~UI Enhancement - Animations & Interactivity~~ **COMPLETED Jan 19**
- [x] ~~Production Auth Issues~~ **FIXED Jan 20** - Fixed Google auth (session endpoint now returns JWT token), simplified registration, fixed CORS for production
- [x] ~~Run Auto-Apply not working~~ **FIXED Jan 20** - Fixed variable reference error, now uses internal job scraper successfully

### P1 - High Priority  
- [x] ~~Resume auto-generation~~ **VERIFIED WORKING Jan 19**
- [x] ~~Profile tax_types bug~~ **FIXED Jan 20** - Changed to array for multi-selection, backend now correctly handles List[str]
- [x] ~~Multiple Resume Management UI~~ **COMPLETED Jan 20** - Added "Set as Primary" button, primary badge, 5-resume limit with UI indicator
- [ ] Flaky frontend login during automated testing (recurring issue)
- [ ] Backend refactoring - break down monolithic server.py

### P1 - Upcoming
- [ ] Reporting dashboards (company & candidate views)

### P2 - Future
- [ ] LinkedIn SSO (needs user credentials)
- [ ] System-generated mailbox (e.g., user@careerquest-mail.com)
- [ ] Resume AI download functionality (user reported failing)
- [ ] Email Center App Password connection fix
- [ ] "View Original" link to point to specific job URL

---

## Technical Architecture

### Backend
- Framework: FastAPI (Python)
- Database: MongoDB (motor)
- Authentication: JWT + Google OAuth
- Background Jobs: APScheduler
- Email: IMAP/SMTP for user email integration

### Frontend
- Framework: React
- Styling: Tailwind CSS
- State: Zustand
- UI Components: Shadcn/UI

### Integrations
- OpenAI (via emergentintegrations) - Resume tailoring, Email composition
- Web Scraper (BeautifulSoup) - Job sourcing
- Resend - Email OTP (MOCKED in demo without valid key)
- IMAP/SMTP - User email integration

### Key Files
- `/app/backend/server.py` - Main backend (needs refactoring)
- `/app/backend/utils/job_scraper.py` - Web scraper for jobs
- `/app/frontend/src/pages/AuthPages.jsx` - Login/Register with OTP
- `/app/frontend/src/pages/LiveJobsPage.jsx` - Job listings and auto-apply
- `/app/frontend/src/pages/EmailCenterPage.jsx` - **NEW** Email Center

---

## API Endpoints (Email Center)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/email-center/accounts | List connected email accounts |
| POST | /api/email-center/connect/imap | Connect email via IMAP/SMTP |
| POST | /api/email-center/connect/gmail/init | Get Gmail IMAP setup instructions |
| POST | /api/email-center/connect/outlook/init | Get Outlook IMAP setup instructions |
| DELETE | /api/email-center/accounts/{id} | Disconnect email account |
| PUT | /api/email-center/accounts/{id}/primary | Set as primary account |
| GET | /api/email-center/inbox | Get inbox messages |
| POST | /api/email-center/send | Send email |
| POST | /api/email-center/ai/compose-application | AI compose job application |
| POST | /api/email-center/ai/draft-reply | AI draft reply to recruiter |
| GET | /api/email-center/settings | Get email settings |
| POST | /api/email-center/settings | Update email settings |
| GET | /api/email-center/history | Get email history |

---

## Known Issues & Limitations

1. **OTP Email Service (MOCKED)**: Resend API key not configured. OTPs logged to console.
2. **LinkedIn SSO (BLOCKED)**: Requires LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.
3. **Job Scraping**: Web scrapers can be brittle if site layouts change.
4. **Flaky Tests**: Frontend login flow unreliable in automated testing.
5. **Email Integration**: Requires App Password (not regular password) for Gmail/Outlook.

---

## Test Credentials
- Test User: `test_autoapply@example.com` / `testpass123`
- Test Resume ID: `resume_8c4696bc3a38`

## Test Reports
- `/app/test_reports/iteration_4.json` - OTP verification tests
- `/app/test_reports/iteration_5.json` - Email Center tests (23 tests passed)
- `/app/test_reports/iteration_6.json` - Auto-Apply & Resume management tests (17 tests passed, 100%)

---

*Last updated: January 20, 2026*

---

## Session Fixes (Jan 20, 2026)

### Bug Fixes
1. **Run Auto-Apply not working (P0)** - Fixed `original_content` undefined variable to `resume_content` in server.py line 3855
2. **Auto-Apply Settings ObjectId error** - Added filter to exclude `_id` from response in update_auto_apply_settings
3. **Profile tax_types not saving** - Fixed backend to use `tax_types` (plural) consistently across all endpoints
4. **Multiple Resume Management** - Added "Set as Primary" button, primary badge (amber star), and 5-resume limit with UI indicator
5. **Job Recommendations not loading** - Fixed LiveJobsPage to fetch fresh user profile on load to get primary_technology
6. **Profile Completeness popup abrupt** - Added 1.5s delay and 24-hour dismissal memory via localStorage
7. **Job Search not working properly** - Implemented enhanced free job scraper with 5 sources (Arbeitnow, Remotive, RemoteOK, Jobicy, FindWork)
8. **Live Jobs 1 Section** - Integrated JSearch RapidAPI for premium job search (Indeed, LinkedIn, Glassdoor, ZipRecruiter)

### New Features
- Resume card shows primary status with amber star icon and "Primary" badge
- Upload button shows "(X/5)" count and disables at 5 resumes
- Auto-apply now uses internal job scraper (Dice, RemoteOK, LinkedIn) instead of external APIs
- Zustand store now has `updateUser()` method to update user without changing token
- **Enhanced Job Search** with multiple FREE API sources returning 15-20+ jobs
- **Remote Jobs Only** toggle for filtering remote positions
- **Multi-select Employment Type** filter (Full Time, Part Time, Contract, C2C, W2)
- **Job Platform** dropdown to filter by source
- **Live Jobs 1 Tab** - New premium search section using JSearch RapidAPI (aggregates Indeed, LinkedIn, Glassdoor, ZipRecruiter)

---

## Session Fixes (Jan 19, 2026)

### Bug Fixes
1. **Quick Actions hover transparency** - Fixed button hover states to maintain readable text
2. **Auto-Apply button grayed out** - Now enables when profile reaches 80%, shows clear message when incomplete
3. **Non-US jobs appearing** - Strengthened location filtering with stricter US-only validation
4. **Settings/History popup alignment** - FIXED: Moved all dialogs OUTSIDE of PageTransition wrapper (CSS transforms from framer-motion break fixed positioning)
5. **Profile completion popup** - FIXED: Now shows automatically on login unless profile is 100% complete, and properly centered

### Animation Consistency
- Added framer-motion animations to Email Center page (stat cards with hover lift)
- Added animations to Live Jobs Auto-Apply stat cards
- All pages now have consistent PageTransition and StaggerContainer animations
