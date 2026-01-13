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
- AI agent for handling email replies (FUTURE)

### 6. Reporting Portals
- Company-level dashboard (TODO)
- Candidate-level dashboard (TODO)

---

## Completed Features (as of January 13, 2026)

### Authentication & User Management
- [x] JWT-based authentication
- [x] Emergent-managed Google SSO
- [x] **Email OTP Verification for signup** (NEW - Jan 13)
- [x] Profile management with photo upload
- [x] Profile completeness meter
- [ ] LinkedIn SSO (BLOCKED - needs credentials)

### Resume Features
- [x] Resume upload (PDF/DOCX)
- [x] AI-powered resume tailoring with custom prompts
- [x] Word document generation
- [x] Resume storage and management

### Job Features
- [x] Web scraper for real-time job listings (Indeed, Dice, RemoteOK)
- [x] Job recommendations based on user skills
- [x] 3-Step Apply Wizard (Tailor prompt -> Generate resume -> Preview & Apply)
- [x] Auto-Apply AI Agent panel with daily scheduler
- [x] Profile gating (must have tech & resume to see jobs)

### Infrastructure
- [x] APScheduler for background jobs
- [x] Sample job data fallback when scraping fails
- [x] Hot reload development environment

---

## In Progress / Pending

### P0 - Critical
- [x] ~~OTP Email Verification~~ **COMPLETED Jan 13, 2026**

### P1 - High Priority
- [ ] Flaky frontend login during automated testing (recurring issue)
- [ ] Backend refactoring - break down monolithic server.py

### P1 - Upcoming
- [ ] Reporting dashboards (company & candidate views)

### P2 - Future
- [ ] AI Email Agent for recruiter communication
- [ ] LinkedIn SSO (needs user credentials)

---

## Technical Architecture

### Backend
- Framework: FastAPI (Python)
- Database: MongoDB (motor)
- Authentication: JWT + Google OAuth
- Background Jobs: APScheduler
- Email: Resend (DEMO MODE - no valid API key)

### Frontend
- Framework: React
- Styling: Tailwind CSS
- State: Zustand
- UI Components: Shadcn/UI

### Integrations
- OpenAI (via emergentintegrations) - Resume tailoring
- Web Scraper (BeautifulSoup) - Job sourcing
- Resend - Email OTP (MOCKED in demo)

### Key Files
- `/app/backend/server.py` - Main backend (needs refactoring)
- `/app/backend/utils/job_scraper.py` - Web scraper for jobs
- `/app/frontend/src/pages/AuthPages.jsx` - Login/Register with OTP
- `/app/frontend/src/pages/LiveJobsPage.jsx` - Job listings and auto-apply

---

## Known Issues & Limitations

1. **Email Service (MOCKED)**: Resend API key not configured. OTPs are logged to console for demo/testing.
2. **LinkedIn SSO (BLOCKED)**: Requires LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.
3. **Job Scraping**: Web scrapers can be brittle if site layouts change.
4. **Flaky Tests**: Frontend login flow unreliable in automated testing.

---

## Test Credentials
- OTP Test User: `TEST_complete_1768343875@example.com` / `testpassword123`
- Note: OTPs logged to backend console in demo mode

---

*Last updated: January 13, 2026*
