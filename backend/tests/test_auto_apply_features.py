"""
Test Auto-Apply Features for Job Application Platform
Tests the new features:
1. Max applications slider (1-25)
2. Auto-Apply panel stats (Today, Submitted, Failed, Success Rate)
3. History dialog with submission method badges
4. Apply Manually button for failed applications
5. Resume selection in Apply dialog
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_autoapply@example.com"
TEST_PASSWORD = "testpass123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with authentication"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestAutoApplyStatus:
    """Test Auto-Apply status endpoint returns correct stats"""
    
    def test_status_endpoint_returns_200(self, auth_headers):
        """Status endpoint should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/status",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_status_contains_today_count(self, auth_headers):
        """Status should contain applications_today field"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/status",
            headers=auth_headers
        )
        data = response.json()
        assert "applications_today" in data
        assert isinstance(data["applications_today"], int)
    
    def test_status_contains_total_submitted(self, auth_headers):
        """Status should contain total_submitted field"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/status",
            headers=auth_headers
        )
        data = response.json()
        assert "total_submitted" in data
        assert isinstance(data["total_submitted"], int)
    
    def test_status_contains_total_failed(self, auth_headers):
        """Status should contain total_failed field"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/status",
            headers=auth_headers
        )
        data = response.json()
        assert "total_failed" in data
        assert isinstance(data["total_failed"], int)
    
    def test_status_contains_success_rate(self, auth_headers):
        """Status should contain success_rate field"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/status",
            headers=auth_headers
        )
        data = response.json()
        assert "success_rate" in data
        assert isinstance(data["success_rate"], (int, float))
        assert 0 <= data["success_rate"] <= 100


class TestAutoApplySettings:
    """Test Auto-Apply settings endpoint"""
    
    def test_settings_endpoint_returns_200(self, auth_headers):
        """Settings endpoint should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/settings",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_settings_contains_max_applications(self, auth_headers):
        """Settings should contain max_applications_per_day field"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/settings",
            headers=auth_headers
        )
        data = response.json()
        assert "max_applications_per_day" in data
        # Max should be between 1 and 25
        assert 1 <= data["max_applications_per_day"] <= 25
    
    def test_update_max_applications_to_25(self, auth_headers):
        """Should be able to set max_applications_per_day to 25"""
        response = requests.post(
            f"{BASE_URL}/api/auto-apply/settings",
            headers=auth_headers,
            json={"max_applications_per_day": 25}
        )
        assert response.status_code == 200
        
        # Verify the update
        get_response = requests.get(
            f"{BASE_URL}/api/auto-apply/settings",
            headers=auth_headers
        )
        data = get_response.json()
        assert data["max_applications_per_day"] == 25


class TestAutoApplyHistory:
    """Test Auto-Apply history endpoint"""
    
    def test_history_endpoint_returns_200(self, auth_headers):
        """History endpoint should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/history",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_history_returns_list(self, auth_headers):
        """History should return a list"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/history",
            headers=auth_headers
        )
        data = response.json()
        assert isinstance(data, list)
    
    def test_history_items_have_required_fields(self, auth_headers):
        """History items should have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/history",
            headers=auth_headers
        )
        data = response.json()
        
        if len(data) > 0:
            item = data[0]
            # Check for required fields
            assert "job_title" in item
            assert "status" in item
            # submitted_by field for Auto/Manual badge
            assert "submitted_by" in item
    
    def test_history_items_have_submitted_by_field(self, auth_headers):
        """History items should have submitted_by field for Auto/Manual badges"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/history",
            headers=auth_headers
        )
        data = response.json()
        
        if len(data) > 0:
            for item in data[:5]:  # Check first 5 items
                assert "submitted_by" in item
                assert item["submitted_by"] in ["auto", "manual", "system", None, ""]


class TestResumes:
    """Test Resumes endpoint for Apply dialog"""
    
    def test_resumes_endpoint_returns_200(self, auth_headers):
        """Resumes endpoint should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/resumes",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_resumes_returns_list(self, auth_headers):
        """Resumes should return a list"""
        response = requests.get(
            f"{BASE_URL}/api/resumes",
            headers=auth_headers
        )
        data = response.json()
        assert isinstance(data, list)
    
    def test_resume_items_have_required_fields(self, auth_headers):
        """Resume items should have required fields for dropdown"""
        response = requests.get(
            f"{BASE_URL}/api/resumes",
            headers=auth_headers
        )
        data = response.json()
        
        if len(data) > 0:
            resume = data[0]
            # Check for fields needed in dropdown
            assert "resume_id" in resume
            assert "file_name" in resume


class TestApplications:
    """Test Applications endpoint"""
    
    def test_applications_endpoint_returns_200(self, auth_headers):
        """Applications endpoint should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/applications",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_applications_returns_list(self, auth_headers):
        """Applications should return a list"""
        response = requests.get(
            f"{BASE_URL}/api/applications",
            headers=auth_headers
        )
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
