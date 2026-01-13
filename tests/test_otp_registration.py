"""
OTP Registration Flow Tests
Tests the 3-step OTP-based email verification for user signup:
1. Send OTP to email
2. Verify OTP code
3. Complete registration with password
"""

import pytest
import requests
import os
import time
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://careerhub-24.preview.emergentagent.com')

def generate_test_email():
    """Generate unique test email"""
    timestamp = int(time.time())
    random_suffix = ''.join(random.choices(string.ascii_lowercase, k=4))
    return f"TEST_otp_user_{timestamp}_{random_suffix}@example.com"

class TestOTPRegistrationFlow:
    """Test the complete OTP registration flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_email = generate_test_email()
        self.test_name = "Test OTP User"
        self.test_password = "testpassword123"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        yield
        # Cleanup is handled by the test itself
    
    def test_01_send_otp_success(self):
        """Step 1: Test sending OTP to email"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={
                "email": self.test_email,
                "name": self.test_name
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "verification" in data["message"].lower() or "sent" in data["message"].lower()
        print(f"✓ OTP sent successfully to {self.test_email}")
    
    def test_02_send_otp_missing_email(self):
        """Test sending OTP without email - should fail"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={
                "name": self.test_name
            }
        )
        
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ Correctly rejected request without email")
    
    def test_03_send_otp_missing_name(self):
        """Test sending OTP without name - should fail"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={
                "email": self.test_email
            }
        )
        
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ Correctly rejected request without name")
    
    def test_04_verify_otp_invalid_code(self):
        """Test verifying with invalid OTP code"""
        # First send OTP
        self.session.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={
                "email": self.test_email,
                "name": self.test_name
            }
        )
        
        # Try to verify with wrong OTP
        response = self.session.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={
                "email": self.test_email,
                "otp": "000000"  # Invalid OTP
            }
        )
        
        assert response.status_code in [400, 401], f"Expected 400/401, got {response.status_code}"
        print("✓ Correctly rejected invalid OTP code")
    
    def test_05_verify_otp_nonexistent_email(self):
        """Test verifying OTP for email that never requested one"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={
                "email": "nonexistent_test@example.com",
                "otp": "123456"
            }
        )
        
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print("✓ Correctly rejected OTP for non-existent email")
    
    def test_06_resend_otp_success(self):
        """Test resending OTP"""
        # First send OTP
        self.session.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={
                "email": self.test_email,
                "name": self.test_name
            }
        )
        
        # Resend OTP
        response = self.session.post(
            f"{BASE_URL}/api/auth/resend-otp",
            json={
                "email": self.test_email,
                "name": self.test_name
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print("✓ OTP resent successfully")
    
    def test_07_register_without_otp_verification(self):
        """Test registration without OTP verification - should fail"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/register-with-otp",
            json={
                "email": "unverified_test@example.com",
                "name": self.test_name,
                "password": self.test_password,
                "otp": "123456"
            }
        )
        
        # Should fail because OTP was never sent/verified
        assert response.status_code in [400, 401, 404], f"Expected 400/401/404, got {response.status_code}"
        print("✓ Correctly rejected registration without OTP verification")
    
    def test_08_register_with_wrong_otp(self):
        """Test registration with wrong OTP code"""
        # First send OTP
        self.session.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={
                "email": self.test_email,
                "name": self.test_name
            }
        )
        
        # Try to register with wrong OTP
        response = self.session.post(
            f"{BASE_URL}/api/auth/register-with-otp",
            json={
                "email": self.test_email,
                "name": self.test_name,
                "password": self.test_password,
                "otp": "000000"  # Wrong OTP
            }
        )
        
        assert response.status_code in [400, 401], f"Expected 400/401, got {response.status_code}"
        print("✓ Correctly rejected registration with wrong OTP")


class TestOTPEndpointValidation:
    """Test OTP endpoint input validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_send_otp_invalid_email_format(self):
        """Test sending OTP with invalid email format"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={
                "email": "not-an-email",
                "name": "Test User"
            }
        )
        
        # Should return 422 (validation error)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Correctly rejected invalid email format")
    
    def test_verify_otp_empty_code(self):
        """Test verifying with empty OTP code"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={
                "email": "test@example.com",
                "otp": ""
            }
        )
        
        # Should return 400 or 422
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ Correctly rejected empty OTP code")


class TestExistingUserOTP:
    """Test OTP flow for existing users"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_send_otp_existing_email(self):
        """Test sending OTP to an email that already has an account"""
        # Use an email that might already exist from previous tests
        response = self.session.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={
                "email": "testuser_dashboard@test.com",  # Existing test user
                "name": "Existing User"
            }
        )
        
        # Should return 400 if user already exists
        # Note: This depends on implementation - some systems allow OTP for existing users
        if response.status_code == 400:
            data = response.json()
            assert "already" in data.get("detail", "").lower() or "exists" in data.get("detail", "").lower()
            print("✓ Correctly rejected OTP for existing user")
        elif response.status_code == 200:
            print("✓ System allows OTP for existing users (may be for password reset)")
        else:
            print(f"Response: {response.status_code} - {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
