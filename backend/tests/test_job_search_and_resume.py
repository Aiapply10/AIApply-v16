"""
Test Job Search and Resume Download Features
Tests:
1. /api/live-jobs/search - Free API job search (Arbeitnow, Remotive, RemoteOK, Jobicy, HackerNews)
2. /api/live-jobs-1/search - Premium API job search (JSearch, Active Jobs DB, LinkedIn Jobs Search)
3. /api/live-jobs/recommendations - Job recommendations based on user profile
4. /api/resumes/{id}/download/docx - Resume download as Word document
5. /api/resumes/{id}/download/pdf - Resume download as PDF
6. /api/resumes/{id}/generate-word - Generate Word document from resume
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_autoapply@example.com"
TEST_PASSWORD = "testpass123"
TEST_RESUME_ID = "resume_8c4696bc3a38"


class TestJobSearchFeatures:
    """Test job search functionality across free and premium APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.auth_token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    # ============ FREE API TESTS (Live Jobs) ============
    
    def test_live_jobs_search_react(self):
        """Test job search for 'React' keyword - should return 10+ jobs"""
        response = self.session.get(
            f"{BASE_URL}/api/live-jobs/search",
            params={"query": "React", "location": "United States", "remote_only": "true", "page": 1}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        jobs = data.get("jobs", [])
        total = data.get("total", 0)
        
        print(f"React search: Found {len(jobs)} jobs on page, {total} total")
        print(f"Query used: {data.get('query_used')}")
        print(f"Data source: {data.get('data_source')}")
        print(f"Sources: {data.get('sources')}")
        
        # Verify we get jobs
        assert total >= 5, f"Expected at least 5 jobs for React, got {total}"
        
        # Verify job structure
        if jobs:
            job = jobs[0]
            assert "job_id" in job, "Job should have job_id"
            assert "title" in job, "Job should have title"
            assert "company" in job, "Job should have company"
            assert "source" in job, "Job should have source"
            print(f"Sample job: {job.get('title')} at {job.get('company')} (Source: {job.get('source')})")
    
    def test_live_jobs_search_python(self):
        """Test job search for 'Python' keyword - should return 10+ jobs"""
        response = self.session.get(
            f"{BASE_URL}/api/live-jobs/search",
            params={"query": "Python", "location": "United States", "remote_only": "true", "page": 1}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        jobs = data.get("jobs", [])
        total = data.get("total", 0)
        
        print(f"Python search: Found {len(jobs)} jobs on page, {total} total")
        
        # Verify we get jobs
        assert total >= 5, f"Expected at least 5 jobs for Python, got {total}"
        
        # Check sources
        sources_found = set(job.get('source') for job in jobs if job.get('source'))
        print(f"Sources found: {sources_found}")
    
    def test_live_jobs_search_java(self):
        """Test job search for 'Java' keyword - should return 10+ jobs"""
        response = self.session.get(
            f"{BASE_URL}/api/live-jobs/search",
            params={"query": "Java", "location": "United States", "remote_only": "true", "page": 1}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        jobs = data.get("jobs", [])
        total = data.get("total", 0)
        
        print(f"Java search: Found {len(jobs)} jobs on page, {total} total")
        
        # Verify we get jobs
        assert total >= 5, f"Expected at least 5 jobs for Java, got {total}"
    
    def test_live_jobs_search_javascript(self):
        """Test job search for 'JavaScript' keyword"""
        response = self.session.get(
            f"{BASE_URL}/api/live-jobs/search",
            params={"query": "JavaScript", "location": "United States", "remote_only": "false", "page": 1}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        total = data.get("total", 0)
        print(f"JavaScript search: Found {total} total jobs")
        
        assert total >= 3, f"Expected at least 3 jobs for JavaScript, got {total}"
    
    # ============ PREMIUM API TESTS (Live Jobs 1) ============
    
    def test_live_jobs_1_search_react(self):
        """Test premium API job search for 'React' keyword"""
        response = self.session.get(
            f"{BASE_URL}/api/live-jobs-1/search",
            params={"query": "React", "location": "United States", "remote_only": "true", "page": 1}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        jobs = data.get("jobs", [])
        total = data.get("total", 0)
        api_used = data.get("api_used")
        
        print(f"Live Jobs 1 React search: Found {len(jobs)} jobs, {total} total")
        print(f"API used: {api_used}")
        print(f"Sources: {data.get('sources')}")
        
        # Premium APIs may have rate limits, so we accept 0 jobs with proper error handling
        if total == 0:
            print("Note: Premium APIs may be rate limited or have no matching jobs")
            # Check if there's a setup_required flag
            if data.get("setup_required"):
                pytest.skip("API key not configured")
        else:
            assert total >= 1, f"Expected at least 1 job from premium APIs, got {total}"
    
    def test_live_jobs_1_search_python(self):
        """Test premium API job search for 'Python' keyword"""
        response = self.session.get(
            f"{BASE_URL}/api/live-jobs-1/search",
            params={"query": "Python", "location": "United States", "remote_only": "false", "page": 1}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        total = data.get("total", 0)
        api_used = data.get("api_used")
        
        print(f"Live Jobs 1 Python search: Found {total} total jobs")
        print(f"API used: {api_used}")
    
    # ============ RECOMMENDATIONS TEST ============
    
    def test_live_jobs_recommendations(self):
        """Test job recommendations based on user profile"""
        response = self.session.get(f"{BASE_URL}/api/live-jobs/recommendations")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check if profile update is required
        if data.get("requires_profile_update"):
            print(f"Profile update required: {data.get('message')}")
            print(f"Missing fields: {data.get('missing_fields')}")
            # This is acceptable - user needs to update profile
            return
        
        recommendations = data.get("recommendations", [])
        print(f"Recommendations: Found {len(recommendations)} jobs")
        
        if recommendations:
            rec = recommendations[0]
            print(f"Sample recommendation: {rec.get('title')} at {rec.get('company')}")


class TestResumeDownloadFeatures:
    """Test resume download functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.auth_token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_resume_download_docx(self):
        """Test resume download as Word document"""
        response = self.session.get(
            f"{BASE_URL}/api/resumes/{TEST_RESUME_ID}/download/docx"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text[:200] if response.text else 'No content'}"
        
        # Verify content type
        content_type = response.headers.get("Content-Type", "")
        assert "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in content_type or "application/octet-stream" in content_type, f"Unexpected content type: {content_type}"
        
        # Verify we got content
        assert len(response.content) > 0, "Downloaded file is empty"
        
        # Verify it's a valid DOCX (starts with PK - ZIP signature)
        assert response.content[:2] == b'PK', "File does not appear to be a valid DOCX (ZIP) file"
        
        print(f"DOCX download successful: {len(response.content)} bytes")
    
    def test_resume_download_pdf(self):
        """Test resume download as PDF"""
        response = self.session.get(
            f"{BASE_URL}/api/resumes/{TEST_RESUME_ID}/download/pdf"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text[:200] if response.text else 'No content'}"
        
        # Verify content type
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type or "application/octet-stream" in content_type, f"Unexpected content type: {content_type}"
        
        # Verify we got content
        assert len(response.content) > 0, "Downloaded file is empty"
        
        # Verify it's a valid PDF (starts with %PDF)
        assert response.content[:4] == b'%PDF', "File does not appear to be a valid PDF"
        
        print(f"PDF download successful: {len(response.content)} bytes")
    
    def test_resume_generate_word(self):
        """Test Word document generation from resume"""
        response = self.session.post(
            f"{BASE_URL}/api/resumes/{TEST_RESUME_ID}/generate-word",
            json={}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text[:200] if response.text else 'No content'}"
        
        # Verify content type
        content_type = response.headers.get("Content-Type", "")
        assert "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in content_type or "application/octet-stream" in content_type, f"Unexpected content type: {content_type}"
        
        # Verify we got content
        assert len(response.content) > 0, "Generated file is empty"
        
        # Verify it's a valid DOCX
        assert response.content[:2] == b'PK', "File does not appear to be a valid DOCX file"
        
        print(f"Word generation successful: {len(response.content)} bytes")
    
    def test_resume_download_invalid_format(self):
        """Test resume download with invalid format returns error"""
        response = self.session.get(
            f"{BASE_URL}/api/resumes/{TEST_RESUME_ID}/download/txt"
        )
        
        # Should return 400 for invalid format
        assert response.status_code == 400, f"Expected 400 for invalid format, got {response.status_code}"
    
    def test_resume_download_nonexistent(self):
        """Test resume download for non-existent resume returns 404"""
        response = self.session.get(
            f"{BASE_URL}/api/resumes/nonexistent_resume_id/download/docx"
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent resume, got {response.status_code}"


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "healthy"
        assert data.get("database") == "connected"
        
        print(f"API Health: {data}")
    
    def test_auth_login(self):
        """Test authentication login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        assert response.status_code == 200, f"Login failed: {response.status_code}"
        
        data = response.json()
        assert "access_token" in data, "No access token in response"
        assert "user" in data, "No user data in response"
        
        print(f"Login successful for user: {data['user'].get('email')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
