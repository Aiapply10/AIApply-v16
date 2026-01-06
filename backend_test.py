#!/usr/bin/env python3
"""
AI Resume Tailor Backend API Testing Suite - Live Jobs Recommendations Focus
Tests Live Jobs recommendations feature with profile validation using the external URL
"""

import requests
import sys
import json
from datetime import datetime
import uuid
import time

class LiveJobsTester:
    def __init__(self, base_url="https://job-craft-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.resume_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.session = requests.Session()
        
        # Test credentials from review request for scheduler testing
        self.test_email = "scheduler@test.com"
        self.test_password = "test123"

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

    def test_scheduler_status_public(self):
        """Test GET /api/scheduler/status - Public endpoint that returns scheduler status"""
        # This endpoint should not require authentication
        url = f"{self.base_url}/api/scheduler/status"
        
        try:
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                if 'scheduler_running' in data and data['scheduler_running'] is True:
                    # Look for daily_auto_apply job
                    jobs = data.get('jobs', [])
                    daily_job_found = False
                    
                    for job in jobs:
                        if job.get('id') == 'daily_auto_apply' and 'next_run_time' in job:
                            daily_job_found = True
                            break
                    
                    if daily_job_found:
                        self.log_test("GET /api/scheduler/status", True, 
                                     f"Scheduler running: {data['scheduler_running']}, daily_auto_apply job found")
                    else:
                        self.log_test("GET /api/scheduler/status", False, 
                                     error="daily_auto_apply job not found or missing next_run_time")
                else:
                    self.log_test("GET /api/scheduler/status", False, 
                                 error=f"scheduler_running not true or missing. Data: {data}")
            else:
                self.log_test("GET /api/scheduler/status", False, 
                             error=f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("GET /api/scheduler/status", False, 
                         error=f"Exception: {str(e)}")

    def test_scheduler_logs_authenticated(self):
        """Test GET /api/scheduler/logs - Authenticated endpoint for user's scheduler logs"""
        if not self.token:
            self.log_test("GET /api/scheduler/logs", False, 
                         error="No authentication token available")
            return

        success, data, status = self.test_api_call('GET', 'scheduler/logs', 200)
        
        if success:
            # Check if response has the expected structure (logs array)
            if 'logs' in data and isinstance(data['logs'], list):
                self.log_test("GET /api/scheduler/logs", True, 
                             f"Retrieved {len(data['logs'])} scheduler log entries")
            else:
                self.log_test("GET /api/scheduler/logs", False, 
                             error=f"Expected 'logs' array in response, got: {data}")
        else:
            self.log_test("GET /api/scheduler/logs", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_scheduler_trigger_authenticated(self):
        """Test POST /api/scheduler/trigger - Authenticated endpoint to manually trigger auto-apply"""
        if not self.token:
            self.log_test("POST /api/scheduler/trigger", False, 
                         error="No authentication token available")
            return

        # First, we need to ensure the user has auto-apply enabled
        # Check current auto-apply settings
        success, settings_data, status = self.test_api_call('GET', 'auto-apply/settings', 200)
        
        if not success:
            self.log_test("POST /api/scheduler/trigger", False, 
                         error=f"Could not get auto-apply settings. Status: {status}")
            return

        # If auto-apply is not enabled, try to enable it first
        if not settings_data.get('enabled', False):
            # Try to enable auto-apply with basic settings
            enable_data = {
                "enabled": True,
                "job_keywords": ["python", "developer"],
                "locations": ["United States"],
                "employment_types": ["FULL_TIME"],
                "max_applications_per_day": 5
            }
            
            enable_success, enable_response, enable_status = self.test_api_call(
                'POST', 'auto-apply/settings', 200, enable_data
            )
            
            if not enable_success:
                self.log_test("POST /api/scheduler/trigger", False, 
                             error=f"Could not enable auto-apply. Status: {enable_status}")
                return

        # Now try to trigger the scheduler
        success, data, status = self.test_api_call('POST', 'scheduler/trigger', 200)
        
        if success:
            if 'message' in data and 'triggered successfully' in data['message']:
                self.log_test("POST /api/scheduler/trigger", True, 
                             f"Scheduler triggered successfully: {data['message']}")
            else:
                self.log_test("POST /api/scheduler/trigger", False, 
                             error=f"Unexpected response format: {data}")
        else:
            self.log_test("POST /api/scheduler/trigger", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_auto_apply_schedule_settings(self):
        """Test POST /api/auto-apply/schedule-settings - Update user's preferred schedule time"""
        if not self.token:
            self.log_test("POST /api/auto-apply/schedule-settings", False, 
                         error="No authentication token available")
            return

        schedule_data = {
            "preferred_hour": 6
        }

        success, data, status = self.test_api_call(
            'POST', 'auto-apply/schedule-settings', 200, schedule_data
        )
        
        if success:
            if 'message' in data and 'updated' in data['message'].lower():
                self.log_test("POST /api/auto-apply/schedule-settings", True, 
                             f"Schedule settings updated: {data['message']}")
            else:
                self.log_test("POST /api/auto-apply/schedule-settings", False, 
                             error=f"Unexpected response format: {data}")
        else:
            self.log_test("POST /api/auto-apply/schedule-settings", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_auto_apply_status(self):
        """Test GET /api/auto-apply/status - Check auto-apply status with scheduler info"""
        if not self.token:
            self.log_test("GET /api/auto-apply/status", False, 
                         error="No authentication token available")
            return

        success, data, status = self.test_api_call('GET', 'auto-apply/status', 200)
        
        if success:
            # Check if response contains scheduler-related information
            has_scheduler_info = any(key in data for key in ['enabled', 'settings', 'today_applications'])
            
            if has_scheduler_info:
                self.log_test("GET /api/auto-apply/status", True, 
                             f"Auto-apply status retrieved with scheduler info")
            else:
                self.log_test("GET /api/auto-apply/status", False, 
                             error=f"Missing scheduler info in response: {data}")
        else:
            self.log_test("GET /api/auto-apply/status", False, 
                         error=f"Status: {status}, Data: {data}")

    def run_all_tests(self):
        """Run Daily Auto-Apply Scheduler focused tests"""
        print("🚀 Starting Daily Auto-Apply Scheduler Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print(f"👤 Test user: {self.test_email}")
        print("=" * 60)

        # Test 1: Verify scheduler is running via status endpoint (public)
        print("\n🔍 Testing scheduler status (public endpoint)...")
        self.test_scheduler_status_public()

        # Test 2: Login to get token for authenticated endpoints
        print("\n🔐 Testing authentication...")
        self.test_user_login()
        
        if self.token:
            print("\n✅ Authentication successful, testing authenticated scheduler endpoints...")
            
            # Test 3: Check scheduler logs endpoint
            print("\n📋 Testing scheduler logs...")
            self.test_scheduler_logs_authenticated()
            
            # Test 4: Verify auto-apply status endpoint shows scheduler info
            print("\n📊 Testing auto-apply status...")
            self.test_auto_apply_status()
            
            # Test 5: Configure auto-apply settings for the user
            print("\n⚙️ Testing schedule settings configuration...")
            self.test_auto_apply_schedule_settings()
            
            # Test 6: Try triggering manual scheduler run
            print("\n🎯 Testing manual scheduler trigger...")
            self.test_scheduler_trigger_authenticated()
            
        else:
            print("❌ Authentication failed - cannot test authenticated scheduler features")

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All Daily Auto-Apply Scheduler tests passed!")
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
    tester = SchedulerTester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results
    summary = tester.get_test_summary()
    
    # Ensure test_reports directory exists
    import os
    os.makedirs('/app/test_reports', exist_ok=True)
    
    with open('/app/test_reports/scheduler_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/test_reports/scheduler_test_results.json")
    return exit_code

if __name__ == "__main__":
    sys.exit(main())