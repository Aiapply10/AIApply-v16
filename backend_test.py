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
    def __init__(self, base_url="https://job-craft-1.preview.emergentagent.com"):
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

    def test_user_login(self):
        """Test user login with provided credentials"""
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }

        success, data, status = self.test_api_call('POST', 'auth/login', 200, login_data)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.user_id = data['user']['user_id']
            self.log_test("POST /api/auth/login", True, f"Login successful for {self.test_email}")
        else:
            self.log_test("POST /api/auth/login", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_get_resumes(self):
        """Test GET /api/resumes - Get list of resumes for the user"""
        success, data, status = self.test_api_call('GET', 'resumes', 200)
        
        if success and isinstance(data, list):
            # Look for the specific resume ID from review request
            resume_found = False
            for resume in data:
                if resume.get('resume_id') == self.test_resume_id:
                    self.resume_id = self.test_resume_id
                    resume_found = True
                    break
            
            if not resume_found and len(data) > 0:
                # Use the first available resume
                self.resume_id = data[0].get('resume_id')
                resume_found = True
            
            if resume_found:
                self.log_test("GET /api/resumes", True, 
                             f"Found {len(data)} resumes, using resume_id: {self.resume_id}")
            else:
                self.log_test("GET /api/resumes", False, 
                             error="No resumes found for testing")
        else:
            self.log_test("GET /api/resumes", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_ats_optimize_without_versions(self):
        """Test POST /api/resumes/{resume_id}/optimize without generate_versions"""
        if not self.resume_id:
            self.log_test("ATS Optimize (no versions)", False, 
                         error="No resume ID available for testing")
            return

        optimize_data = {
            "target_role": "Senior Python Developer",
            "generate_versions": False
        }

        success, data, status = self.test_api_call(
            'POST', f'resumes/{self.resume_id}/optimize', 200, optimize_data
        )
        
        if success:
            # Verify response contains required fields
            required_fields = ['optimized_content', 'keywords', 'ats_optimized']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields and data.get('ats_optimized') is True:
                self.log_test("ATS Optimize (no versions)", True, 
                             f"Optimization successful, keywords: {len(data.get('keywords', '').split(','))}")
            else:
                self.log_test("ATS Optimize (no versions)", False, 
                             error=f"Missing fields: {missing_fields} or ats_optimized not True")
        else:
            self.log_test("ATS Optimize (no versions)", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_ats_optimize_with_versions(self):
        """Test POST /api/resumes/{resume_id}/optimize with generate_versions: true"""
        if not self.resume_id:
            self.log_test("ATS Optimize (with versions)", False, 
                         error="No resume ID available for testing")
            return

        optimize_data = {
            "target_role": "Senior Python Developer",
            "generate_versions": True
        }

        success, data, status = self.test_api_call(
            'POST', f'resumes/{self.resume_id}/optimize', 200, optimize_data
        )
        
        if success:
            # Verify response contains versions array with 3 items
            versions = data.get('versions', [])
            expected_version_names = ["Standard ATS-Optimized", "Technical Focus", "Leadership Focus"]
            
            if len(versions) == 3:
                version_names = [v.get('name') for v in versions]
                has_expected_names = all(name in version_names for name in expected_version_names)
                
                if has_expected_names:
                    self.log_test("ATS Optimize (with versions)", True, 
                                 f"Generated 3 versions: {version_names}")
                else:
                    self.log_test("ATS Optimize (with versions)", False, 
                                 error=f"Unexpected version names: {version_names}")
            else:
                self.log_test("ATS Optimize (with versions)", False, 
                             error=f"Expected 3 versions, got {len(versions)}")
        else:
            self.log_test("ATS Optimize (with versions)", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_download_word_document(self):
        """Test Word document generation for optimized resume"""
        if not self.resume_id:
            self.log_test("Download Word Document", False, 
                         error="No resume ID available for testing")
            return

        # Test the Word document generation endpoint
        url = f"{self.base_url}/api/resumes/{self.resume_id}/generate-word"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = self.session.post(url, headers=headers)
            
            if response.status_code == 200:
                # Check if response is a Word document
                content_type = response.headers.get('content-type', '')
                if 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' in content_type:
                    self.log_test("Download Word Document", True, 
                                 f"Word document generated, size: {len(response.content)} bytes")
                else:
                    self.log_test("Download Word Document", False, 
                                 error=f"Unexpected content type: {content_type}")
            else:
                self.log_test("Download Word Document", False, 
                             error=f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Download Word Document", False, 
                         error=f"Exception: {str(e)}")

    def test_get_specific_resume(self):
        """Test GET /api/resumes/{resume_id} for the specific resume"""
        if not self.resume_id:
            self.log_test("GET specific resume", False, 
                         error="No resume ID available for testing")
            return

        success, data, status = self.test_api_call('GET', f'resumes/{self.resume_id}', 200)
        
        if success and data.get('resume_id') == self.resume_id:
            # Check if it has ATS optimization data
            has_ats_data = 'ats_optimized' in data or 'ats_optimized_content' in data
            self.log_test("GET specific resume", True, 
                         f"Resume retrieved, ATS optimized: {has_ats_data}")
        else:
            self.log_test("GET specific resume", False, 
                         error=f"Status: {status}, Data: {data}")

    def run_all_tests(self):
        """Run ATS Resume Optimizer focused tests"""
        print("🚀 Starting ATS Resume Optimizer Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print(f"👤 Test user: {self.test_email}")
        print("=" * 60)

        # Test authentication with provided credentials
        self.test_user_login()
        
        if self.token:
            print("\n🔐 Authentication successful, testing ATS features...")
            
            # Test ATS Resume Optimizer specific endpoints
            self.test_get_resumes()
            
            if self.resume_id:
                print(f"\n📄 Testing with resume ID: {self.resume_id}")
                self.test_get_specific_resume()
                self.test_ats_optimize_without_versions()
                self.test_ats_optimize_with_versions()
                self.test_download_word_document()
            else:
                print("❌ No resume found for testing ATS optimization")
        else:
            print("❌ Authentication failed - cannot test ATS features")

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All ATS Resume Optimizer tests passed!")
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
    tester = ATSResumeOptimizerTester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results
    summary = tester.get_test_summary()
    
    # Ensure test_reports directory exists
    import os
    os.makedirs('/app/test_reports', exist_ok=True)
    
    with open('/app/test_reports/ats_optimizer_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/test_reports/ats_optimizer_test_results.json")
    return exit_code

if __name__ == "__main__":
    sys.exit(main())