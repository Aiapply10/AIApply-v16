"""
Test suite for Auto-Apply functionality including:
- Applications page API endpoints
- Browser automation submission
- Application status updates
- Screenshots saving
- Auto-apply settings
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_autoapply@example.com"
TEST_PASSWORD = "testpass123"


class TestAutoApplyEndpoints:
    """Test Auto-Apply API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        assert token, "No access token received"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
        yield
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_get_auto_apply_settings(self):
        """Test getting auto-apply settings"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "enabled" in data
        assert "resume_id" in data
        assert "job_keywords" in data
        assert "locations" in data
        assert "max_applications_per_day" in data
        print(f"✓ Auto-apply settings retrieved: enabled={data['enabled']}, keywords={data['job_keywords']}")
    
    def test_get_auto_apply_status(self):
        """Test getting auto-apply status"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "enabled" in data
        assert "configured" in data
        assert "today_applications" in data
        assert "max_daily" in data
        assert "total_applications" in data
        print(f"✓ Auto-apply status: enabled={data['enabled']}, today={data['today_applications']}, total={data['total_applications']}")
    
    def test_get_application_history(self):
        """Test getting application history"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/history?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "applications" in data
        applications = data["applications"]
        assert isinstance(applications, list)
        
        if len(applications) > 0:
            app = applications[0]
            # Verify application structure
            assert "application_id" in app
            assert "job_title" in app
            assert "company" in app
            assert "status" in app
            print(f"✓ Application history retrieved: {len(applications)} applications")
            print(f"  First app: {app['job_title']} at {app['company']} - status: {app['status']}")
        else:
            print("✓ Application history retrieved: 0 applications")
    
    def test_get_submission_logs(self):
        """Test getting submission logs"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/submission-logs?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "logs" in data
        logs = data["logs"]
        assert isinstance(logs, list)
        print(f"✓ Submission logs retrieved: {len(logs)} logs")
    
    def test_get_activity_log(self):
        """Test getting activity log"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/activity-log?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "activities" in data
        activities = data["activities"]
        assert isinstance(activities, list)
        print(f"✓ Activity log retrieved: {len(activities)} activities")
    
    def test_update_auto_apply_settings(self):
        """Test updating auto-apply settings"""
        # First get current settings
        get_response = self.session.get(f"{BASE_URL}/api/auto-apply/settings")
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update settings
        new_settings = {
            "job_keywords": ["React", "Frontend", "JavaScript"],
            "locations": ["Remote, United States"],
            "max_applications_per_day": 10,
            "generate_cover_letter": True
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/auto-apply/settings",
            json=new_settings
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data or "job_keywords" in data
        print("✓ Auto-apply settings updated successfully")
    
    def test_application_not_found(self):
        """Test submitting non-existent application"""
        response = self.session.post(
            f"{BASE_URL}/api/auto-apply/submit/nonexistent_app_id"
        )
        assert response.status_code == 404
        print("✓ Non-existent application returns 404")


class TestApplicationSubmission:
    """Test application submission with browser automation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_find_ready_to_apply_application(self):
        """Find an application with ready_to_apply status"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/history?limit=50")
        assert response.status_code == 200
        
        data = response.json()
        applications = data.get("applications", [])
        
        ready_apps = [app for app in applications if app.get("status") == "ready_to_apply"]
        print(f"✓ Found {len(ready_apps)} applications ready to apply")
        
        if ready_apps:
            app = ready_apps[0]
            print(f"  Ready app: {app['application_id']} - {app['job_title']} at {app['company']}")
            return app["application_id"]
        return None
    
    def test_verify_screenshots_saved(self):
        """Verify screenshots are saved after submission"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/history?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        applications = data.get("applications", [])
        
        # Find applications with screenshots
        apps_with_screenshots = [
            app for app in applications 
            if app.get("submission_screenshots") and len(app.get("submission_screenshots", [])) > 0
        ]
        
        print(f"✓ Found {len(apps_with_screenshots)} applications with screenshots")
        
        if apps_with_screenshots:
            app = apps_with_screenshots[0]
            screenshots = app.get("submission_screenshots", [])
            print(f"  App {app['application_id']} has {len(screenshots)} screenshots:")
            for ss in screenshots[:3]:
                print(f"    - {ss}")
    
    def test_verify_submission_result_structure(self):
        """Verify submission result has correct structure"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/history?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        applications = data.get("applications", [])
        
        # Find applications with submission results
        apps_with_results = [
            app for app in applications 
            if app.get("submission_result")
        ]
        
        if apps_with_results:
            app = apps_with_results[0]
            result = app.get("submission_result", {})
            
            # Verify structure
            assert "success" in result
            assert "platform" in result
            assert "status" in result
            assert "screenshots" in result
            
            print(f"✓ Submission result structure verified:")
            print(f"  success: {result.get('success')}")
            print(f"  platform: {result.get('platform')}")
            print(f"  status: {result.get('status')}")
            print(f"  screenshots: {len(result.get('screenshots', []))}")
        else:
            print("✓ No applications with submission results found (expected if no submissions yet)")


class TestLiveJobsSearch:
    """Test Live Jobs search functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_search_jobs_react(self):
        """Test searching for React jobs"""
        response = self.session.get(
            f"{BASE_URL}/api/live-jobs/search",
            params={"query": "React", "page": 1}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "jobs" in data
        jobs = data["jobs"]
        print(f"✓ React job search: {len(jobs)} jobs found")
        
        if jobs:
            job = jobs[0]
            print(f"  First job: {job.get('title')} at {job.get('company')}")
    
    def test_search_jobs_python(self):
        """Test searching for Python jobs"""
        response = self.session.get(
            f"{BASE_URL}/api/live-jobs/search",
            params={"query": "Python", "page": 1}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "jobs" in data
        jobs = data["jobs"]
        print(f"✓ Python job search: {len(jobs)} jobs found")
    
    def test_get_job_recommendations(self):
        """Test getting job recommendations"""
        response = self.session.get(f"{BASE_URL}/api/live-jobs/recommendations")
        assert response.status_code == 200
        
        data = response.json()
        assert "jobs" in data
        jobs = data["jobs"]
        print(f"✓ Job recommendations: {len(jobs)} jobs found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
