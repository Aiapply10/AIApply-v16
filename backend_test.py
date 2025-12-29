#!/usr/bin/env python3
"""
AI Resume Tailor Backend API Testing Suite - ATS Resume Optimizer Focus
Tests ATS Resume Optimizer feature endpoints using the external URL
"""

import requests
import sys
import json
from datetime import datetime
import uuid
import time

class ATSResumeOptimizerTester:
    def __init__(self, base_url="https://resumeforge-47.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.resume_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.session = requests.Session()
        
        # Test credentials from review request
        self.test_email = "testuser_dashboard@test.com"
        self.test_password = "Test123!"
        self.test_resume_id = "resume_0dbaaaa25be6"  # From review request

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def test_api_call(self, method, endpoint, expected_status, data=None, headers=None):
        """Make API call and validate response"""
        url = f"{self.base_url}/api/{endpoint}"
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            default_headers.update(headers)

        try:
            if method == 'GET':
                response = self.session.get(url, headers=default_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=default_headers)

            success = response.status_code == expected_status
            
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text}

            return success, response_data, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_technologies_endpoint(self):
        """Test /api/technologies endpoint"""
        success, data, status = self.test_api_call('GET', 'technologies', 200)
        
        if success and 'primary' in data and 'sub_technologies' in data:
            expected_techs = ['Java', 'Python', 'PHP', 'AI', 'React']
            has_expected = all(tech in data['primary'] for tech in expected_techs)
            self.log_test("GET /api/technologies", has_expected, 
                         f"Found {len(data['primary'])} primary technologies")
        else:
            self.log_test("GET /api/technologies", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_user_registration(self):
        """Test user registration"""
        registration_data = {
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name,
            "primary_technology": "Python",
            "sub_technologies": ["FastAPI", "Django"],
            "phone": "+1234567890",
            "location": "New York, NY"
        }

        success, data, status = self.test_api_call('POST', 'auth/register', 200, registration_data)
        
        if success and 'access_token' in data and 'user' in data:
            self.token = data['access_token']
            self.user_id = data['user']['user_id']
            self.log_test("POST /api/auth/register", True, 
                         f"User created with ID: {self.user_id}")
        else:
            self.log_test("POST /api/auth/register", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }

        success, data, status = self.test_api_call('POST', 'auth/login', 200, login_data)
        
        if success and 'access_token' in data:
            # Update token from login
            self.token = data['access_token']
            self.log_test("POST /api/auth/login", True, "Login successful")
        else:
            self.log_test("POST /api/auth/login", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_get_current_user(self):
        """Test /api/auth/me endpoint"""
        success, data, status = self.test_api_call('GET', 'auth/me', 200)
        
        if success and 'user_id' in data and 'email' in data:
            self.log_test("GET /api/auth/me", True, 
                         f"Retrieved user: {data.get('name', 'Unknown')}")
        else:
            self.log_test("GET /api/auth/me", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_resume_endpoints(self):
        """Test resume-related endpoints"""
        # Test get resumes (should be empty initially)
        success, data, status = self.test_api_call('GET', 'resumes', 200)
        
        if success and isinstance(data, list):
            self.log_test("GET /api/resumes", True, f"Found {len(data)} resumes")
        else:
            self.log_test("GET /api/resumes", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_job_portals_endpoint(self):
        """Test job portals endpoint"""
        success, data, status = self.test_api_call('GET', 'job-portals', 200)
        
        if success and isinstance(data, list):
            self.log_test("GET /api/job-portals", True, f"Found {len(data)} job portals")
        else:
            self.log_test("GET /api/job-portals", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_applications_endpoint(self):
        """Test applications endpoint"""
        success, data, status = self.test_api_call('GET', 'applications', 200)
        
        if success and isinstance(data, list):
            self.log_test("GET /api/applications", True, f"Found {len(data)} applications")
        else:
            self.log_test("GET /api/applications", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_emails_endpoint(self):
        """Test emails endpoint"""
        success, data, status = self.test_api_call('GET', 'emails', 200)
        
        if success and isinstance(data, list):
            self.log_test("GET /api/emails", True, f"Found {len(data)} emails")
        else:
            self.log_test("GET /api/emails", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_candidate_reports(self):
        """Test candidate reports endpoint"""
        success, data, status = self.test_api_call('GET', 'reports/candidate', 200)
        
        if success and 'total_applications' in data:
            self.log_test("GET /api/reports/candidate", True, 
                         f"Total applications: {data.get('total_applications', 0)}")
        else:
            self.log_test("GET /api/reports/candidate", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, data, status = self.test_api_call('GET', '', 200)
        
        if success and 'message' in data:
            self.log_test("GET /api/", True, f"API message: {data.get('message')}")
        else:
            self.log_test("GET /api/", False, 
                         error=f"Status: {status}, Data: {data}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting AI Resume Tailor Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Test public endpoints first
        self.test_root_endpoint()
        self.test_technologies_endpoint()

        # Test authentication flow
        self.test_user_registration()
        
        if self.token:
            # Test authenticated endpoints
            self.test_user_login()
            self.test_get_current_user()
            self.test_resume_endpoints()
            self.test_job_portals_endpoint()
            self.test_applications_endpoint()
            self.test_emails_endpoint()
            self.test_candidate_reports()
        else:
            print("❌ Skipping authenticated tests - registration failed")

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

    def get_test_summary(self):
        """Get detailed test summary"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results,
            "test_user": {
                "email": self.test_email,
                "user_id": self.user_id
            }
        }

def main():
    tester = AIResumeTailorTester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results
    summary = tester.get_test_summary()
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/test_reports/backend_test_results.json")
    return exit_code

if __name__ == "__main__":
    sys.exit(main())