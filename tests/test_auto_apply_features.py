"""
Test suite for Auto-Apply features and Resume management
Tests:
1. Auto-Apply functionality - verify it finds and processes jobs using internal job scraper
2. Resume set-primary endpoint - verify user can set a resume as primary
3. Profile tax_types saving - verify multi-select tax types persist correctly
4. Auto-apply settings update - verify settings save without ObjectId error
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
TEST_USER_EMAIL = "test_autoapply@example.com"
TEST_USER_PASSWORD = "testpass123"
TEST_RESUME_ID = "resume_8c4696bc3a38"


class TestSetup:
    """Setup tests - create test user and get auth token"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        return s
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Get authentication token - try login first, then register if needed"""
        # Try to login first
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            print(f"✓ Logged in as existing user: {TEST_USER_EMAIL}")
            return token
        
        # If login fails, register new user
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Test AutoApply User",
            "primary_technology": "Python",
            "sub_technologies": ["FastAPI", "React", "MongoDB"]
        })
        
        if register_response.status_code == 200:
            token = register_response.json().get("access_token")
            print(f"✓ Registered new user: {TEST_USER_EMAIL}")
            return token
        
        pytest.skip(f"Could not authenticate: {register_response.text}")
    
    @pytest.fixture(scope="class")
    def authenticated_session(self, session, auth_token):
        """Session with auth header"""
        session.headers.update({"Authorization": f"Bearer {auth_token}"})
        return session


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ API health check passed: {data}")


class TestSetPrimaryResume(TestSetup):
    """Test resume set-primary endpoint"""
    
    def test_set_primary_requires_auth(self, session):
        """Test that set-primary requires authentication"""
        response = session.put(f"{BASE_URL}/api/resumes/test_resume/set-primary")
        assert response.status_code == 401
        print("✓ Set primary requires authentication (401)")
    
    def test_set_primary_nonexistent_resume(self, authenticated_session):
        """Test set-primary with non-existent resume returns 404"""
        response = authenticated_session.put(f"{BASE_URL}/api/resumes/nonexistent_resume_123/set-primary")
        assert response.status_code == 404
        print("✓ Set primary returns 404 for non-existent resume")
    
    def test_get_resumes_list(self, authenticated_session):
        """Test getting list of resumes"""
        response = authenticated_session.get(f"{BASE_URL}/api/resumes")
        assert response.status_code == 200
        resumes = response.json()
        print(f"✓ Got {len(resumes)} resumes for user")
        return resumes
    
    def test_set_primary_existing_resume(self, authenticated_session):
        """Test setting an existing resume as primary"""
        # First get list of resumes
        resumes_response = authenticated_session.get(f"{BASE_URL}/api/resumes")
        assert resumes_response.status_code == 200
        resumes = resumes_response.json()
        
        if not resumes:
            pytest.skip("No resumes found for user - cannot test set-primary")
        
        # Get first resume
        resume_id = resumes[0].get("resume_id")
        
        # Set as primary
        response = authenticated_session.put(f"{BASE_URL}/api/resumes/{resume_id}/set-primary")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data.get("resume_id") == resume_id
        print(f"✓ Successfully set resume {resume_id} as primary")
        
        # Verify it's now primary
        verify_response = authenticated_session.get(f"{BASE_URL}/api/resumes/{resume_id}")
        assert verify_response.status_code == 200
        resume_data = verify_response.json()
        assert resume_data.get("is_primary") == True
        print(f"✓ Verified resume {resume_id} is now primary")


class TestProfileTaxTypes(TestSetup):
    """Test profile tax_types multi-select saving"""
    
    def test_update_profile_with_tax_types(self, authenticated_session):
        """Test updating profile with multiple tax types"""
        tax_types = ["Fulltime", "C2C", "W2 Contract"]
        
        response = authenticated_session.put(f"{BASE_URL}/api/auth/profile", json={
            "tax_types": tax_types
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        print(f"✓ Profile updated with tax_types: {tax_types}")
        
        # Verify persistence by fetching profile
        me_response = authenticated_session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        user_data = me_response.json()
        
        saved_tax_types = user_data.get("tax_types", [])
        assert saved_tax_types == tax_types
        print(f"✓ Verified tax_types persisted correctly: {saved_tax_types}")
    
    def test_update_profile_with_single_tax_type(self, authenticated_session):
        """Test updating profile with single tax type"""
        tax_types = ["Fulltime"]
        
        response = authenticated_session.put(f"{BASE_URL}/api/auth/profile", json={
            "tax_types": tax_types
        })
        
        assert response.status_code == 200
        
        # Verify
        me_response = authenticated_session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        user_data = me_response.json()
        
        assert user_data.get("tax_types") == tax_types
        print(f"✓ Single tax_type saved correctly: {tax_types}")
    
    def test_update_profile_with_empty_tax_types(self, authenticated_session):
        """Test updating profile with empty tax types"""
        response = authenticated_session.put(f"{BASE_URL}/api/auth/profile", json={
            "tax_types": []
        })
        
        assert response.status_code == 200
        
        # Verify
        me_response = authenticated_session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        user_data = me_response.json()
        
        assert user_data.get("tax_types") == []
        print("✓ Empty tax_types saved correctly")


class TestAutoApplySettings(TestSetup):
    """Test auto-apply settings update without ObjectId error"""
    
    def test_get_auto_apply_settings(self, authenticated_session):
        """Test getting auto-apply settings"""
        response = authenticated_session.get(f"{BASE_URL}/api/auto-apply/settings")
        assert response.status_code == 200
        data = response.json()
        
        # Verify no ObjectId in response (would cause JSON serialization error)
        assert "_id" not in data
        print(f"✓ Got auto-apply settings without ObjectId: {list(data.keys())}")
    
    def test_update_auto_apply_settings_basic(self, authenticated_session):
        """Test updating auto-apply settings with basic fields"""
        settings = {
            "enabled": False,
            "job_keywords": ["Python Developer", "Backend Engineer"],
            "locations": ["Remote, United States"],
            "max_applications_per_day": 5
        }
        
        response = authenticated_session.post(f"{BASE_URL}/api/auto-apply/settings", json=settings)
        assert response.status_code == 200
        data = response.json()
        
        # Verify no ObjectId in response
        assert "_id" not in data
        if "settings" in data:
            assert "_id" not in data["settings"]
        
        print(f"✓ Updated auto-apply settings successfully")
    
    def test_update_auto_apply_settings_with_resume(self, authenticated_session):
        """Test updating auto-apply settings with resume_id"""
        # First get a resume
        resumes_response = authenticated_session.get(f"{BASE_URL}/api/resumes")
        resumes = resumes_response.json() if resumes_response.status_code == 200 else []
        
        resume_id = resumes[0].get("resume_id") if resumes else ""
        
        settings = {
            "enabled": True,
            "resume_id": resume_id,
            "job_keywords": ["Software Engineer"],
            "locations": ["United States"],
            "employment_types": ["FULL_TIME"],
            "max_applications_per_day": 10,
            "auto_tailor_resume": True
        }
        
        response = authenticated_session.post(f"{BASE_URL}/api/auto-apply/settings", json=settings)
        assert response.status_code == 200
        data = response.json()
        
        # Verify no ObjectId in response (this was the bug)
        assert "_id" not in data
        if "settings" in data:
            assert "_id" not in data["settings"]
        
        print(f"✓ Updated auto-apply settings with resume_id without ObjectId error")
    
    def test_update_auto_apply_settings_verify_persistence(self, authenticated_session):
        """Test that auto-apply settings persist correctly"""
        # Update settings
        settings = {
            "enabled": False,
            "job_keywords": ["React Developer", "Frontend Engineer"],
            "locations": ["New York, NY", "Remote"],
            "max_applications_per_day": 15
        }
        
        update_response = authenticated_session.post(f"{BASE_URL}/api/auto-apply/settings", json=settings)
        assert update_response.status_code == 200
        
        # Verify by fetching
        get_response = authenticated_session.get(f"{BASE_URL}/api/auto-apply/settings")
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("job_keywords") == settings["job_keywords"]
        assert data.get("locations") == settings["locations"]
        assert data.get("max_applications_per_day") == settings["max_applications_per_day"]
        
        print(f"✓ Auto-apply settings persisted correctly")


class TestAutoApplyRun(TestSetup):
    """Test auto-apply run functionality"""
    
    def test_run_auto_apply_requires_auth(self, session):
        """Test that run auto-apply requires authentication"""
        response = session.post(f"{BASE_URL}/api/auto-apply/run")
        assert response.status_code == 401
        print("✓ Run auto-apply requires authentication (401)")
    
    def test_run_auto_apply_requires_settings(self, authenticated_session):
        """Test that run auto-apply requires settings to be configured"""
        # First disable auto-apply to test the check
        authenticated_session.post(f"{BASE_URL}/api/auto-apply/settings", json={
            "enabled": False,
            "resume_id": ""
        })
        
        response = authenticated_session.post(f"{BASE_URL}/api/auto-apply/run")
        
        # Should return 400 because either settings not configured or disabled
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Run auto-apply returns error when not configured: {data.get('detail')}")
    
    def test_run_auto_apply_with_valid_settings(self, authenticated_session):
        """Test running auto-apply with valid settings"""
        # First get a resume
        resumes_response = authenticated_session.get(f"{BASE_URL}/api/resumes")
        resumes = resumes_response.json() if resumes_response.status_code == 200 else []
        
        if not resumes:
            pytest.skip("No resumes found - cannot test auto-apply run")
        
        resume_id = resumes[0].get("resume_id")
        
        # Configure settings
        settings_response = authenticated_session.post(f"{BASE_URL}/api/auto-apply/settings", json={
            "enabled": True,
            "resume_id": resume_id,
            "job_keywords": ["Python Developer"],
            "locations": ["Remote, United States"],
            "max_applications_per_day": 5,
            "auto_tailor_resume": False  # Disable to speed up test
        })
        assert settings_response.status_code == 200
        
        # Run auto-apply
        print("Running auto-apply (this may take a few seconds)...")
        response = authenticated_session.post(f"{BASE_URL}/api/auto-apply/run", timeout=120)
        
        # Should return 200 with results (even if no jobs found)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "applied_count" in data
        assert "applications" in data
        
        print(f"✓ Auto-apply run completed: {data.get('message')}")
        print(f"  Applied count: {data.get('applied_count')}")
        print(f"  Applications: {len(data.get('applications', []))}")


class TestAutoApplyHistory(TestSetup):
    """Test auto-apply history endpoint"""
    
    def test_get_auto_apply_history(self, authenticated_session):
        """Test getting auto-apply history"""
        response = authenticated_session.get(f"{BASE_URL}/api/auto-apply/history")
        assert response.status_code == 200
        data = response.json()
        
        # Response is {"history": [...], "total": N}
        assert "history" in data
        assert "total" in data
        history = data.get("history", [])
        assert isinstance(history, list)
        
        # Verify no ObjectId in any record
        for record in history:
            assert "_id" not in record
        
        print(f"✓ Got auto-apply history: {data.get('total')} records")


class TestJobScraper(TestSetup):
    """Test job scraper endpoints"""
    
    def test_search_live_jobs(self, authenticated_session):
        """Test live job search endpoint"""
        response = authenticated_session.get(f"{BASE_URL}/api/live-jobs/search", params={
            "query": "Python Developer",
            "location": "Remote"
        })
        
        # Should return 200 (even if no jobs found due to rate limits)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "jobs" in data or isinstance(data, list)
        jobs = data.get("jobs", data) if isinstance(data, dict) else data
        print(f"✓ Live job search completed: {len(jobs)} jobs found")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests"""
    yield
    # Cleanup can be added here if needed
    print("\n✓ Test suite completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
