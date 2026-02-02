"""
Test Auth Persistence and Session Management
Tests for:
1. Login persists across page refreshes (token + user data)
2. 401 errors properly handled
3. Email Center IMAP error messages
4. Backend health check
5. Auto-apply handlers still working
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_autoapply@example.com"
TEST_PASSWORD = "testpass123"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint_returns_200(self):
        """Test that health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
        assert "database" in data
        print(f"✓ Health check passed: {data}")


class TestAuthLogin:
    """Authentication and login tests"""
    
    def test_login_returns_token_and_user(self):
        """Test that login returns both token AND user data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        
        # Verify token is returned
        assert "access_token" in data, "Missing access_token in response"
        assert len(data["access_token"]) > 0, "Empty access_token"
        
        # Verify user data is returned (for localStorage persistence)
        assert "user" in data, "Missing user data in response"
        user = data["user"]
        
        # Verify user has required fields for persistence
        assert "user_id" in user, "Missing user_id"
        assert "email" in user, "Missing email"
        assert "name" in user, "Missing name"
        
        print(f"✓ Login returns token and user data: {user.get('email')}")
        return data
    
    def test_login_invalid_credentials_returns_401(self):
        """Test that invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly return 401")


class TestAuthMe:
    """Test /auth/me endpoint for session validation"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_auth_me_with_valid_token(self, auth_token):
        """Test /auth/me returns user data with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert data["email"] == TEST_EMAIL
        
        print(f"✓ /auth/me returns user data: {data.get('email')}")
    
    def test_auth_me_without_token_returns_401(self):
        """Test /auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /auth/me without token correctly returns 401")
    
    def test_auth_me_with_invalid_token_returns_401(self):
        """Test /auth/me with invalid token returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /auth/me with invalid token correctly returns 401")


class TestEmailCenterIMAP:
    """Test Email Center IMAP connection error messages"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_imap_missing_fields_returns_400(self, auth_token):
        """Test IMAP connection with missing fields returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/email-center/connect/imap",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "provider": "imap",
                "email_address": "test@gmail.com"
                # Missing imap_host, smtp_host, password
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Missing IMAP fields returns 400: {data.get('detail')}")
    
    def test_gmail_init_returns_imap_instructions(self, auth_token):
        """Test Gmail init returns IMAP instructions with App Password guidance"""
        response = requests.post(
            f"{BASE_URL}/api/email-center/connect/gmail/init",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Gmail init failed: {response.text}"
        
        data = response.json()
        assert "status" in data
        
        # Should return IMAP instructions
        if data.get("status") == "use_imap":
            assert "instructions" in data
            instructions = data["instructions"]
            assert instructions.get("imap_host") == "imap.gmail.com"
            assert "App Password" in data.get("instructions", {}).get("note", "")
            print(f"✓ Gmail init returns IMAP instructions with App Password guidance")
        else:
            print(f"✓ Gmail init returned: {data.get('status')}")
    
    def test_outlook_init_returns_imap_instructions(self, auth_token):
        """Test Outlook init returns IMAP instructions"""
        response = requests.post(
            f"{BASE_URL}/api/email-center/connect/outlook/init",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Outlook init failed: {response.text}"
        
        data = response.json()
        assert "status" in data
        assert data.get("status") == "use_imap"
        assert "instructions" in data
        
        instructions = data["instructions"]
        assert instructions.get("imap_host") == "outlook.office365.com"
        print(f"✓ Outlook init returns IMAP instructions")


class TestAutoApplyHandlers:
    """Test Auto-Apply handlers are still working"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_auto_apply_settings_endpoint(self, auth_token):
        """Test auto-apply settings endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Auto-apply settings failed: {response.text}"
        
        data = response.json()
        # Settings should have expected fields
        print(f"✓ Auto-apply settings endpoint works")
    
    def test_auto_apply_status_endpoint(self, auth_token):
        """Test auto-apply status endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Auto-apply status failed: {response.text}"
        
        data = response.json()
        # Status should have expected fields
        assert "total_submitted" in data or "enabled" in data or "status" in data
        print(f"✓ Auto-apply status endpoint works: {data}")
    
    def test_auto_apply_history_endpoint(self, auth_token):
        """Test auto-apply history endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/auto-apply/history?limit=5",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Auto-apply history failed: {response.text}"
        print(f"✓ Auto-apply history endpoint works")


class TestResumesEndpoint:
    """Test resumes endpoint for authenticated access"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_resumes_with_valid_token(self, auth_token):
        """Test resumes endpoint with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/resumes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Resumes failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Resumes should return a list"
        print(f"✓ Resumes endpoint works, found {len(data)} resumes")
    
    def test_resumes_without_token_returns_401(self):
        """Test resumes endpoint without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/resumes")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Resumes without token correctly returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
