# AI Resume Tailor - Requirements & Architecture

## Original Problem Statement
Build a website where a job seeker can come, upload their resume, get their resume tailored by AI, and have an option to apply for jobs from the website directly. It should give recommendations by checking different platforms, and also have an option to tailor resume as per the recommended job.

### Core Features Implemented:
1. **Candidate Info and Login Page** - Registration with primary technology selection (Java, Python, PHP, AI, React), resume upload capability
2. **AI Resume Update** - AI agent updates resume based on primary technology using GPT-5.2, converts to Word/PDF format
3. **Job Application** - Apply to jobs from client portal with AI-generated cover letters
4. **Email Communication** - Track emails and use AI to generate professional replies
5. **Report Portal for Company** - Admin dashboard with statistics for all candidates
6. **Report Portal for Candidates** - Personal statistics including applications, interviews, offers

## Technology Stack
- **Frontend**: React 19, TailwindCSS, Shadcn/UI components, Zustand state management
- **Backend**: FastAPI (Python), Motor (async MongoDB driver)
- **Database**: MongoDB
- **AI Integration**: OpenAI GPT-5.2 via Emergent Integrations library
- **Authentication**: JWT + Emergent-managed Google OAuth

## Architecture

### Backend Endpoints (`/api`)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login (JWT)
- `POST /auth/session` - Google OAuth session handling
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

- `POST /resumes/upload` - Upload resume (PDF/Word)
- `GET /resumes` - Get user's resumes
- `GET /resumes/{id}` - Get specific resume
- `POST /resumes/tailor` - AI-tailor resume for job
- `GET /resumes/{id}/download/{format}` - Download as DOCX/PDF

- `POST /cover-letter/generate` - Generate AI cover letter

- `GET /job-portals` - List job portals
- `POST /job-portals` - Create portal (admin)
- `PUT /job-portals/{id}` - Update portal (admin)
- `DELETE /job-portals/{id}` - Delete portal (admin)

- `POST /applications` - Submit job application
- `GET /applications` - Get user's applications
- `PUT /applications/{id}/status` - Update status

- `POST /emails` - Record email
- `GET /emails` - Get emails
- `POST /emails/generate-reply` - AI generate reply

- `GET /reports/candidate` - Candidate statistics
- `GET /reports/admin` - Admin statistics
- `GET /reports/admin/candidates` - All candidates list

- `GET /technologies` - Get technology options

### Frontend Pages
- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Candidate dashboard
- `/resumes` - Resume management
- `/jobs` - Job listings
- `/applications` - Application tracker
- `/emails` - Email center
- `/reports` - Personal reports
- `/settings` - User settings
- `/admin` - Admin dashboard
- `/admin/candidates` - All candidates
- `/admin/portals` - Job portal management
- `/admin/reports` - Company reports

## Completed Tasks
- [x] Landing page with hero, features, CTA sections
- [x] User registration with technology selection
- [x] User login (JWT + Google OAuth)
- [x] Candidate dashboard with statistics
- [x] Resume upload (PDF/Word extraction)
- [x] AI resume tailoring with GPT-5.2
- [x] Resume download (DOCX/PDF)
- [x] Cover letter generation
- [x] Job portal listing
- [x] Job application submission
- [x] Application status tracking
- [x] Email communication tracking
- [x] AI email reply generation
- [x] Candidate reports with charts
- [x] Admin dashboard with analytics
- [x] Admin candidate management
- [x] Admin job portal management
- [x] Admin reports

## Next Tasks / Enhancements
1. **Web Crawler Integration** - Auto-discover job listings from external sites
2. **Gmail API Integration** - Direct email sending/receiving (currently tracking only)
3. **Interview Scheduling** - Calendar integration for scheduling
4. **Notifications** - Email/push notifications for application updates
5. **Resume Templates** - Pre-designed resume templates
6. **Skills Assessment** - AI-powered skills gap analysis
7. **Job Matching Algorithm** - Recommend jobs based on resume content
8. **Bulk Applications** - Apply to multiple jobs at once
9. **Analytics Export** - Export reports as PDF/CSV
10. **Mobile App** - React Native mobile version

## Environment Variables

### Backend (.env)
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY=sk-emergent-xxxxx
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://your-domain.com
```
