"""
Test suite for Schedule Frequency Feature (P2)
Tests the user-configurable scheduler frequency for auto-apply
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://appliwise.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "test_autoapply@example.com"
TEST_PASSWORD = "testpass123"


class TestSchedulerStatus:
    """Tests for GET /api/scheduler/status endpoint"""
    
    def test_scheduler_status_returns_all_frequency_jobs(self):
        """Verify scheduler status shows all 4 frequency jobs running"""
        response = requests.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify scheduler is running
        assert data["scheduler_running"] == True
        
        # Verify all 4 jobs exist
        jobs = data["jobs"]
        job_ids = [job["id"] for job in jobs]
        
        assert "hourly_auto_apply" in job_ids, "Hourly job missing"
        assert "6h_auto_apply" in job_ids, "6-hour job missing"
        assert "12h_auto_apply" in job_ids, "12-hour job missing"
        assert "daily_auto_apply" in job_ids, "Daily job missing"
        
        # Verify job triggers
        for job in jobs:
            if job["id"] == "hourly_auto_apply":
                assert "interval[1:00:00]" in job["trigger"]
            elif job["id"] == "6h_auto_apply":
                assert "interval[6:00:00]" in job["trigger"]
            elif job["id"] == "12h_auto_apply":
                assert "interval[12:00:00]" in job["trigger"]
            elif job["id"] == "daily_auto_apply":
                assert "cron" in job["trigger"]
    
    def test_scheduler_status_returns_available_frequencies(self):
        """Verify scheduler status returns available frequency options"""
        response = requests.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        
        data = response.json()
        frequencies = data["available_frequencies"]
        
        # Verify all 4 frequency options
        freq_values = [f["value"] for f in frequencies]
        assert "1h" in freq_values
        assert "6h" in freq_values
        assert "12h" in freq_values
        assert "daily" in freq_values
        
        # Verify labels
        freq_labels = {f["value"]: f["label"] for f in frequencies}
        assert "Every hour" in freq_labels["1h"]
        assert "Every 6 hours" in freq_labels["6h"]
        assert "Every 12 hours" in freq_labels["12h"]
        assert "daily" in freq_labels["daily"].lower() or "once" in freq_labels["daily"].lower()


class TestAutoApplySettings:
    """Tests for auto-apply settings with schedule_frequency"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_get_settings_returns_schedule_frequency(self, auth_token):
        """Verify GET /api/auto-apply/settings returns schedule_frequency field"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "schedule_frequency" in data, "schedule_frequency field missing from settings"
        
        # Verify it's a valid frequency value
        valid_frequencies = ["1h", "6h", "12h", "daily", "custom"]
        assert data["schedule_frequency"] in valid_frequencies, f"Invalid frequency: {data['schedule_frequency']}"
    
    def test_update_schedule_frequency_to_1h(self, auth_token):
        """Test updating schedule_frequency to 1h"""
        response = requests.post(
            f"{BASE_URL}/api/auto-apply/settings",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"schedule_frequency": "1h"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Settings updated successfully"
        assert data["settings"]["schedule_frequency"] == "1h"
        
        # Verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/auto-apply/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.json()["schedule_frequency"] == "1h"
    
    def test_update_schedule_frequency_to_6h(self, auth_token):
        """Test updating schedule_frequency to 6h"""
        response = requests.post(
            f"{BASE_URL}/api/auto-apply/settings",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"schedule_frequency": "6h"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["settings"]["schedule_frequency"] == "6h"
        
        # Verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/auto-apply/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.json()["schedule_frequency"] == "6h"
    
    def test_update_schedule_frequency_to_12h(self, auth_token):
        """Test updating schedule_frequency to 12h"""
        response = requests.post(
            f"{BASE_URL}/api/auto-apply/settings",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"schedule_frequency": "12h"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["settings"]["schedule_frequency"] == "12h"
        
        # Verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/auto-apply/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.json()["schedule_frequency"] == "12h"
    
    def test_update_schedule_frequency_to_daily(self, auth_token):
        """Test updating schedule_frequency to daily"""
        response = requests.post(
            f"{BASE_URL}/api/auto-apply/settings",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"schedule_frequency": "daily"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["settings"]["schedule_frequency"] == "daily"
        
        # Verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/auto-apply/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.json()["schedule_frequency"] == "daily"
    
    def test_settings_include_all_required_fields(self, auth_token):
        """Verify settings response includes all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Required fields
        required_fields = [
            "enabled",
            "resume_id",
            "job_keywords",
            "locations",
            "max_applications_per_day",
            "auto_tailor_resume",
            "generate_cover_letter",
            "schedule_time",
            "schedule_frequency"
        ]
        
        for field in required_fields:
            assert field in data, f"Required field '{field}' missing from settings"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
