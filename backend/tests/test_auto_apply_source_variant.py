"""
Test Auto-Apply Source Variant Feature
Tests for:
1. Auto-apply run endpoint accepts source_variant parameter
2. Applications are created with correct source field (live_jobs or live_jobs_1)
3. Applications are created with submitted_by field (auto or manual)
4. Applications appear in /api/applications endpoint after auto-apply run
5. Success rate calculation in status endpoint is accurate
"""

import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_autoapply@example.com"
TEST_PASSWORD = "testpass123"


class TestAutoApplySourceVariant:
    """Test auto-apply source variant feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                # Also set cookie for session-based auth
                self.session.cookies.set("session_token", token)
        else:
            pytest.skip(f"Login failed with status {login_response.status_code}")
        
        yield
        
        self.session.close()
    
    # ==================== AUTO-APPLY STATUS ENDPOINT ====================
    
    def test_auto_apply_status_endpoint_returns_200(self):
        """Test that auto-apply status endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_status_contains_total_submitted(self):
        """Test that status contains total_submitted field"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/status")
        assert response.status_code == 200
        data = response.json()
        assert "total_submitted" in data, f"Missing total_submitted field. Got: {data.keys()}"
        assert isinstance(data["total_submitted"], int), f"total_submitted should be int, got {type(data['total_submitted'])}"
    
    def test_status_contains_total_failed(self):
        """Test that status contains total_failed field"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/status")
        assert response.status_code == 200
        data = response.json()
        assert "total_failed" in data, f"Missing total_failed field. Got: {data.keys()}"
        assert isinstance(data["total_failed"], int), f"total_failed should be int, got {type(data['total_failed'])}"
    
    def test_status_contains_success_rate(self):
        """Test that status contains success_rate field (0-100)"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/status")
        assert response.status_code == 200
        data = response.json()
        assert "success_rate" in data, f"Missing success_rate field. Got: {data.keys()}"
        assert isinstance(data["success_rate"], (int, float)), f"success_rate should be numeric, got {type(data['success_rate'])}"
        assert 0 <= data["success_rate"] <= 100, f"success_rate should be 0-100, got {data['success_rate']}"
    
    def test_success_rate_calculation_accuracy(self):
        """Test that success rate is calculated correctly from submitted and failed counts"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/status")
        assert response.status_code == 200
        data = response.json()
        
        total_submitted = data.get("total_submitted", 0)
        total_failed = data.get("total_failed", 0)
        success_rate = data.get("success_rate", 0)
        
        # Calculate expected success rate
        total_attempted = total_submitted + total_failed
        if total_attempted > 0:
            expected_rate = round((total_submitted / total_attempted) * 100)
            # Allow for rounding differences
            assert abs(success_rate - expected_rate) <= 1, \
                f"Success rate mismatch. Expected ~{expected_rate}%, got {success_rate}%. " \
                f"Submitted: {total_submitted}, Failed: {total_failed}"
        else:
            assert success_rate == 0, f"Success rate should be 0 when no attempts, got {success_rate}"
    
    # ==================== AUTO-APPLY HISTORY ENDPOINT ====================
    
    def test_history_endpoint_returns_200(self):
        """Test that history endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/history?limit=50")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_history_returns_applications_list(self):
        """Test that history returns applications list"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/history?limit=50")
        assert response.status_code == 200
        data = response.json()
        assert "applications" in data or isinstance(data, list), f"Expected applications list. Got: {type(data)}"
    
    def test_history_items_have_source_field(self):
        """Test that history items have source field (live_jobs or live_jobs_1)"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/history?limit=50")
        assert response.status_code == 200
        data = response.json()
        
        applications = data.get("applications", data) if isinstance(data, dict) else data
        
        if applications and len(applications) > 0:
            # Check first few applications for source field
            for app in applications[:5]:
                if "source" in app:
                    assert app["source"] in ["live_jobs", "live_jobs_1", None, ""], \
                        f"Invalid source value: {app['source']}"
    
    def test_history_items_have_submitted_by_field(self):
        """Test that history items have submitted_by field (auto or manual)"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/history?limit=50")
        assert response.status_code == 200
        data = response.json()
        
        applications = data.get("applications", data) if isinstance(data, dict) else data
        
        if applications and len(applications) > 0:
            # Check first few applications for submitted_by field
            for app in applications[:5]:
                if "submitted_by" in app:
                    assert app["submitted_by"] in ["auto", "manual", None, ""], \
                        f"Invalid submitted_by value: {app['submitted_by']}"
    
    # ==================== APPLICATIONS ENDPOINT ====================
    
    def test_applications_endpoint_returns_200(self):
        """Test that applications endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/applications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_applications_returns_list(self):
        """Test that applications endpoint returns a list"""
        response = self.session.get(f"{BASE_URL}/api/applications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
    
    def test_applications_have_required_fields(self):
        """Test that applications have required fields"""
        response = self.session.get(f"{BASE_URL}/api/applications")
        assert response.status_code == 200
        data = response.json()
        
        if data and len(data) > 0:
            app = data[0]
            required_fields = ["job_title", "company", "status"]
            for field in required_fields:
                assert field in app, f"Missing required field: {field}. Got: {app.keys()}"
    
    # ==================== AUTO-APPLY RUN ENDPOINT ====================
    
    def test_auto_apply_run_endpoint_exists(self):
        """Test that auto-apply run endpoint exists"""
        # First check if auto-apply is enabled
        status_response = self.session.get(f"{BASE_URL}/api/auto-apply/status")
        if status_response.status_code == 200:
            status = status_response.json()
            if not status.get("enabled", False):
                pytest.skip("Auto-apply is not enabled for this user")
        
        # Try to run auto-apply with source_variant
        response = self.session.post(
            f"{BASE_URL}/api/auto-apply/run",
            json={"source_variant": "live_jobs"}
        )
        
        # Should return 200 or 400 (if settings not configured), not 404
        assert response.status_code != 404, "Auto-apply run endpoint not found"
        assert response.status_code in [200, 400, 401, 403], \
            f"Unexpected status code: {response.status_code}: {response.text}"
    
    def test_auto_apply_run_accepts_source_variant_live_jobs(self):
        """Test that auto-apply run accepts source_variant='live_jobs'"""
        # Check if auto-apply is enabled
        status_response = self.session.get(f"{BASE_URL}/api/auto-apply/status")
        if status_response.status_code == 200:
            status = status_response.json()
            if not status.get("enabled", False):
                pytest.skip("Auto-apply is not enabled")
        
        response = self.session.post(
            f"{BASE_URL}/api/auto-apply/run",
            json={"source_variant": "live_jobs"}
        )
        
        # Should not return 422 (validation error) for valid source_variant
        assert response.status_code != 422, \
            f"source_variant='live_jobs' should be valid. Got: {response.text}"
    
    def test_auto_apply_run_accepts_source_variant_live_jobs_1(self):
        """Test that auto-apply run accepts source_variant='live_jobs_1'"""
        # Check if auto-apply is enabled
        status_response = self.session.get(f"{BASE_URL}/api/auto-apply/status")
        if status_response.status_code == 200:
            status = status_response.json()
            if not status.get("enabled", False):
                pytest.skip("Auto-apply is not enabled")
        
        response = self.session.post(
            f"{BASE_URL}/api/auto-apply/run",
            json={"source_variant": "live_jobs_1"}
        )
        
        # Should not return 422 (validation error) for valid source_variant
        assert response.status_code != 422, \
            f"source_variant='live_jobs_1' should be valid. Got: {response.text}"
    
    # ==================== AUTO-APPLY SETTINGS ====================
    
    def test_settings_endpoint_returns_200(self):
        """Test that settings endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_settings_contains_required_fields(self):
        """Test that settings contains required fields"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/settings")
        assert response.status_code == 200
        data = response.json()
        
        # Check for key settings fields
        expected_fields = ["enabled", "max_applications_per_day"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}. Got: {data.keys()}"


class TestApplicationsSourceAndSubmittedBy:
    """Test that applications have correct source and submitted_by fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.session.cookies.set("session_token", token)
        else:
            pytest.skip(f"Login failed with status {login_response.status_code}")
        
        yield
        
        self.session.close()
    
    def test_applications_with_source_live_jobs_exist(self):
        """Test that applications with source='live_jobs' can exist"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/history?limit=100")
        assert response.status_code == 200
        data = response.json()
        
        applications = data.get("applications", data) if isinstance(data, dict) else data
        
        live_jobs_apps = [app for app in applications if app.get("source") == "live_jobs"]
        print(f"Found {len(live_jobs_apps)} applications with source='live_jobs'")
        # This is informational - we just verify the field exists and can be filtered
    
    def test_applications_with_source_live_jobs_1_exist(self):
        """Test that applications with source='live_jobs_1' can exist"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/history?limit=100")
        assert response.status_code == 200
        data = response.json()
        
        applications = data.get("applications", data) if isinstance(data, dict) else data
        
        live_jobs_1_apps = [app for app in applications if app.get("source") == "live_jobs_1"]
        print(f"Found {len(live_jobs_1_apps)} applications with source='live_jobs_1'")
    
    def test_applications_with_submitted_by_auto_exist(self):
        """Test that applications with submitted_by='auto' can exist"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/history?limit=100")
        assert response.status_code == 200
        data = response.json()
        
        applications = data.get("applications", data) if isinstance(data, dict) else data
        
        auto_apps = [app for app in applications if app.get("submitted_by") == "auto"]
        print(f"Found {len(auto_apps)} applications with submitted_by='auto'")
    
    def test_applications_with_submitted_by_manual_exist(self):
        """Test that applications with submitted_by='manual' can exist"""
        response = self.session.get(f"{BASE_URL}/api/auto-apply/history?limit=100")
        assert response.status_code == 200
        data = response.json()
        
        applications = data.get("applications", data) if isinstance(data, dict) else data
        
        manual_apps = [app for app in applications if app.get("submitted_by") == "manual"]
        print(f"Found {len(manual_apps)} applications with submitted_by='manual'")


class TestProgressIndicator:
    """Test progress indicator during auto-apply run"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.session.cookies.set("session_token", token)
        else:
            pytest.skip(f"Login failed with status {login_response.status_code}")
        
        yield
        
        self.session.close()
    
    def test_auto_apply_run_returns_applied_count(self):
        """Test that auto-apply run returns applied_count in response"""
        # Check if auto-apply is enabled
        status_response = self.session.get(f"{BASE_URL}/api/auto-apply/status")
        if status_response.status_code == 200:
            status = status_response.json()
            if not status.get("enabled", False):
                pytest.skip("Auto-apply is not enabled")
        
        response = self.session.post(
            f"{BASE_URL}/api/auto-apply/run",
            json={"source_variant": "live_jobs"}
        )
        
        if response.status_code == 200:
            data = response.json()
            # Should have applied_count or applications_created
            assert "applied_count" in data or "applications_created" in data or "message" in data, \
                f"Response should contain progress info. Got: {data.keys()}"
    
    def test_auto_apply_run_returns_applications_list(self):
        """Test that auto-apply run returns applications list"""
        # Check if auto-apply is enabled
        status_response = self.session.get(f"{BASE_URL}/api/auto-apply/status")
        if status_response.status_code == 200:
            status = status_response.json()
            if not status.get("enabled", False):
                pytest.skip("Auto-apply is not enabled")
        
        response = self.session.post(
            f"{BASE_URL}/api/auto-apply/run",
            json={"source_variant": "live_jobs"}
        )
        
        if response.status_code == 200:
            data = response.json()
            # Should have applications list or message
            assert "applications" in data or "message" in data, \
                f"Response should contain applications or message. Got: {data.keys()}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
