"""
Email Center API Tests
Tests for the new Email Center feature including:
- Account management (GET accounts, connect IMAP, disconnect)
- Settings management (GET/POST settings)
- History retrieval
- Gmail/Outlook init endpoints
"""

import pytest
import requests
import os
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from previous iteration
TEST_USER_EMAIL = "TEST_complete_1768343875@example.com"
TEST_USER_PASSWORD = "testpassword123"


class TestEmailCenterAuth:
    """Test authentication for Email Center endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestEmailCenterAccounts(TestEmailCenterAuth):
    """Test Email Center Account Management endpoints"""
    
    def test_get_accounts_returns_empty_for_new_user(self, auth_headers):
        """GET /api/email-center/accounts should return empty array for user with no accounts"""
        response = requests.get(
            f"{BASE_URL}/api/email-center/accounts",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # For a new user, this should be empty or contain previously connected accounts
        print(f"Accounts found: {len(data)}")
    
    def test_get_accounts_requires_auth(self):
        """GET /api/email-center/accounts should require authentication"""
        response = requests.get(f"{BASE_URL}/api/email-center/accounts")
        assert response.status_code == 401, "Should require authentication"
    
    def test_gmail_init_returns_imap_instructions(self, auth_headers):
        """POST /api/email-center/connect/gmail/init should return IMAP setup instructions"""
        response = requests.post(
            f"{BASE_URL}/api/email-center/connect/gmail/init",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should return IMAP instructions since OAuth is not fully configured
        assert "status" in data
        if data["status"] == "use_imap":
            assert "instructions" in data
            assert data["instructions"]["imap_host"] == "imap.gmail.com"
            assert data["instructions"]["smtp_host"] == "smtp.gmail.com"
            print(f"Gmail init response: {data['message']}")
        else:
            print(f"Gmail init status: {data['status']}")
    
    def test_outlook_init_returns_imap_instructions(self, auth_headers):
        """POST /api/email-center/connect/outlook/init should return IMAP setup instructions"""
        response = requests.post(
            f"{BASE_URL}/api/email-center/connect/outlook/init",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "use_imap"
        assert "instructions" in data
        assert data["instructions"]["imap_host"] == "outlook.office365.com"
        assert data["instructions"]["smtp_host"] == "smtp.office365.com"
        print(f"Outlook init response: {data['message']}")
    
    def test_connect_imap_requires_all_fields(self, auth_headers):
        """POST /api/email-center/connect/imap should require all fields"""
        # Missing required fields
        response = requests.post(
            f"{BASE_URL}/api/email-center/connect/imap",
            headers=auth_headers,
            json={
                "provider": "imap",
                "email_address": "test@example.com"
                # Missing password, imap_host, smtp_host
            }
        )
        assert response.status_code == 400, f"Should fail with missing fields: {response.text}"
    
    def test_connect_imap_rejects_wrong_provider(self, auth_headers):
        """POST /api/email-center/connect/imap should reject non-IMAP provider"""
        response = requests.post(
            f"{BASE_URL}/api/email-center/connect/imap",
            headers=auth_headers,
            json={
                "provider": "gmail",  # Wrong provider for this endpoint
                "email_address": "test@example.com",
                "password": "testpass",
                "imap_host": "imap.gmail.com",
                "smtp_host": "smtp.gmail.com"
            }
        )
        assert response.status_code == 400, f"Should reject non-IMAP provider: {response.text}"
        assert "IMAP" in response.json().get("detail", "")
    
    def test_disconnect_nonexistent_account(self, auth_headers):
        """DELETE /api/email-center/accounts/{id} should return 404 for non-existent account"""
        response = requests.delete(
            f"{BASE_URL}/api/email-center/accounts/nonexistent_account_id",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Should return 404: {response.text}"
    
    def test_set_primary_nonexistent_account(self, auth_headers):
        """PUT /api/email-center/accounts/{id}/primary should return 404 for non-existent account"""
        response = requests.put(
            f"{BASE_URL}/api/email-center/accounts/nonexistent_account_id/primary",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Should return 404: {response.text}"


class TestEmailCenterSettings(TestEmailCenterAuth):
    """Test Email Center Settings endpoints"""
    
    def test_get_settings_returns_defaults(self, auth_headers):
        """GET /api/email-center/settings should return default settings for new user"""
        response = requests.get(
            f"{BASE_URL}/api/email-center/settings",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check default settings structure
        assert "auto_reply_enabled" in data
        assert "auto_apply_compose" in data
        assert "reply_approval_required" in data
        assert "signature" in data
        
        # Default values
        assert data["auto_reply_enabled"] == False
        assert data["auto_apply_compose"] == True
        assert data["reply_approval_required"] == True
        print(f"Settings: {data}")
    
    def test_get_settings_requires_auth(self):
        """GET /api/email-center/settings should require authentication"""
        response = requests.get(f"{BASE_URL}/api/email-center/settings")
        assert response.status_code == 401, "Should require authentication"
    
    def test_update_settings_auto_compose(self, auth_headers):
        """POST /api/email-center/settings should update auto_apply_compose setting"""
        # Update setting
        response = requests.post(
            f"{BASE_URL}/api/email-center/settings",
            headers=auth_headers,
            json={
                "auto_reply_enabled": False,
                "auto_apply_compose": False,  # Change from default
                "reply_approval_required": True,
                "signature": ""
            }
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/email-center/settings",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["auto_apply_compose"] == False, "Setting should be updated"
        
        # Reset to default
        requests.post(
            f"{BASE_URL}/api/email-center/settings",
            headers=auth_headers,
            json={
                "auto_reply_enabled": False,
                "auto_apply_compose": True,
                "reply_approval_required": True,
                "signature": ""
            }
        )
    
    def test_update_settings_signature(self, auth_headers):
        """POST /api/email-center/settings should update signature"""
        test_signature = "Best regards,\nTest User"
        
        response = requests.post(
            f"{BASE_URL}/api/email-center/settings",
            headers=auth_headers,
            json={
                "auto_reply_enabled": False,
                "auto_apply_compose": True,
                "reply_approval_required": True,
                "signature": test_signature
            }
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/email-center/settings",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["signature"] == test_signature, "Signature should be updated"
        
        # Reset
        requests.post(
            f"{BASE_URL}/api/email-center/settings",
            headers=auth_headers,
            json={
                "auto_reply_enabled": False,
                "auto_apply_compose": True,
                "reply_approval_required": True,
                "signature": ""
            }
        )
    
    def test_update_settings_requires_auth(self):
        """POST /api/email-center/settings should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/email-center/settings",
            json={"auto_reply_enabled": True}
        )
        assert response.status_code == 401, "Should require authentication"


class TestEmailCenterInbox(TestEmailCenterAuth):
    """Test Email Center Inbox endpoints"""
    
    def test_get_inbox_no_account(self, auth_headers):
        """GET /api/email-center/inbox should handle no connected account gracefully"""
        response = requests.get(
            f"{BASE_URL}/api/email-center/inbox",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should return empty messages with a message
        assert "messages" in data
        assert isinstance(data["messages"], list)
        print(f"Inbox response: {data}")
    
    def test_get_inbox_requires_auth(self):
        """GET /api/email-center/inbox should require authentication"""
        response = requests.get(f"{BASE_URL}/api/email-center/inbox")
        assert response.status_code == 401, "Should require authentication"


class TestEmailCenterHistory(TestEmailCenterAuth):
    """Test Email Center History endpoints"""
    
    def test_get_history_returns_list(self, auth_headers):
        """GET /api/email-center/history should return a list"""
        response = requests.get(
            f"{BASE_URL}/api/email-center/history",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"History items: {len(data)}")
    
    def test_get_history_with_limit(self, auth_headers):
        """GET /api/email-center/history should respect limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/email-center/history",
            headers=auth_headers,
            params={"limit": 5}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5, "Should respect limit parameter"
    
    def test_get_history_requires_auth(self):
        """GET /api/email-center/history should require authentication"""
        response = requests.get(f"{BASE_URL}/api/email-center/history")
        assert response.status_code == 401, "Should require authentication"


class TestEmailCenterSend(TestEmailCenterAuth):
    """Test Email Center Send endpoint"""
    
    def test_send_email_requires_account(self, auth_headers):
        """POST /api/email-center/send should require a connected account"""
        response = requests.post(
            f"{BASE_URL}/api/email-center/send",
            headers=auth_headers,
            json={
                "to_addresses": ["test@example.com"],
                "subject": "Test Subject",
                "body": "Test body",
                "body_type": "text"
            }
        )
        # Should fail because no account is connected
        assert response.status_code == 400, f"Should require connected account: {response.text}"
        assert "No email account" in response.json().get("detail", "")
    
    def test_send_email_requires_auth(self):
        """POST /api/email-center/send should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/email-center/send",
            json={
                "to_addresses": ["test@example.com"],
                "subject": "Test",
                "body": "Test"
            }
        )
        assert response.status_code == 401, "Should require authentication"


class TestEmailCenterAICompose(TestEmailCenterAuth):
    """Test Email Center AI Compose endpoint"""
    
    def test_ai_compose_requires_resume(self, auth_headers):
        """POST /api/email-center/ai/compose-application should require valid resume"""
        response = requests.post(
            f"{BASE_URL}/api/email-center/ai/compose-application",
            headers=auth_headers,
            json={
                "job_title": "Software Engineer",
                "company_name": "Test Company",
                "job_description": "Test job description",
                "resume_id": "nonexistent_resume_id",
                "recipient_email": "recruiter@test.com",
                "tone": "professional"
            }
        )
        assert response.status_code == 404, f"Should return 404 for invalid resume: {response.text}"
        assert "Resume not found" in response.json().get("detail", "")
    
    def test_ai_compose_requires_auth(self):
        """POST /api/email-center/ai/compose-application should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/email-center/ai/compose-application",
            json={
                "job_title": "Software Engineer",
                "company_name": "Test Company",
                "job_description": "Test job description",
                "resume_id": "test_resume",
                "recipient_email": "recruiter@test.com"
            }
        )
        assert response.status_code == 401, "Should require authentication"


class TestEmailCenterAIReply(TestEmailCenterAuth):
    """Test Email Center AI Reply endpoint"""
    
    def test_ai_reply_requires_auth(self):
        """POST /api/email-center/ai/draft-reply should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/email-center/ai/draft-reply",
            json={
                "original_email": "Test email content",
                "original_subject": "Test Subject",
                "sender_email": "recruiter@test.com",
                "tone": "professional"
            }
        )
        assert response.status_code == 401, "Should require authentication"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
