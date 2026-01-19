#!/usr/bin/env python3
"""
AI Resume Tailor Backend API Testing Suite - Live Jobs Web Scraping Focus
Tests new Live Jobs web scraping feature that fetches real-time jobs from multiple job boards
(Indeed, Dice, RemoteOK, Arbeitnow) without using paid APIs
"""

import requests
import sys
import json
from datetime import datetime
import uuid
import time

class LiveJobsWebScrapingTester:
    def __init__(self, base_url="https://resume-tailor-52.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.resume_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.session = requests.Session()
        
        # Test credentials from review request for Live Jobs testing
        self.test_email = "scheduler@test.com"
        self.test_password = "test123"
        # Expected user profile for testing
        self.expected_primary_tech = "Python"
        self.expected_sub_techs = ["Django", "FastAPI"]

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

    def test_user_profile_setup(self):
        """Ensure user profile has the expected primary_technology and sub_technologies"""
        if not self.token:
            self.log_test("Profile Setup", False, error="No authentication token available")
            return

        # First get current profile
        success, data, status = self.test_api_call('GET', 'auth/me', 200)
        
        if not success:
            self.log_test("Profile Setup", False, error=f"Could not get user profile. Status: {status}")
            return

        # Check if profile needs updating
        current_primary = data.get('primary_technology', '')
        current_sub = data.get('sub_technologies', [])
        
        needs_update = (current_primary != self.expected_primary_tech or 
                       set(current_sub) != set(self.expected_sub_techs))
        
        if needs_update:
            # Update profile with expected values
            profile_data = {
                "primary_technology": self.expected_primary_tech,
                "sub_technologies": self.expected_sub_techs
            }
            
            success, update_data, status = self.test_api_call('PUT', 'auth/profile', 200, profile_data)
            
            if success:
                self.log_test("Profile Setup", True, 
                             f"Profile updated: primary_technology={self.expected_primary_tech}, sub_technologies={self.expected_sub_techs}")
            else:
                self.log_test("Profile Setup", False, 
                             error=f"Could not update profile. Status: {status}, Data: {update_data}")
        else:
            self.log_test("Profile Setup", True, 
                         f"Profile already has correct values: primary_technology={current_primary}, sub_technologies={current_sub}")

    def test_live_jobs_recommendations_web_scraping(self):
        """Test GET /api/live-jobs/recommendations with web scraping (NEW FEATURE)"""
        if not self.token:
            self.log_test("GET /api/live-jobs/recommendations (web scraping)", False, 
                         error="No authentication token available")
            return

        success, data, status = self.test_api_call('GET', 'live-jobs/recommendations', 200)
        
        if success:
            # Check if response has recommendations array
            if 'recommendations' in data and isinstance(data['recommendations'], list):
                recommendations_count = len(data['recommendations'])
                
                # Verify it's using web scraping
                data_source = data.get('data_source')
                sources = data.get('sources', [])
                
                if data_source == "live_scraping":
                    print(f"    ✓ Confirmed data_source: 'live_scraping'")
                    
                    # Check if sources include expected job boards
                    expected_sources = ["Indeed", "Dice", "RemoteOK", "Arbeitnow"]
                    if all(source in sources for source in expected_sources):
                        print(f"    ✓ All expected sources present: {sources}")
                    else:
                        print(f"    ⚠ Some sources missing. Expected: {expected_sources}, Got: {sources}")
                    
                    if recommendations_count > 0:
                        # Check job structure
                        sample_job = data['recommendations'][0]
                        required_fields = ['job_id', 'title', 'company', 'location', 'description', 'apply_link', 'source']
                        missing_fields = [field for field in required_fields if field not in sample_job]
                        
                        if not missing_fields:
                            print(f"    ✓ Job structure complete with all required fields")
                            
                            # Check if jobs have real company names (not sample data)
                            real_companies = []
                            for job in data['recommendations'][:3]:
                                company = job.get('company', '')
                                if company and not company.startswith('Sample') and company != 'TechCorp Inc.':
                                    real_companies.append(company)
                            
                            if real_companies:
                                print(f"    ✓ Real company names found: {real_companies[:3]}")
                            else:
                                print(f"    ⚠ No real company names detected in first 3 jobs")
                            
                            self.log_test("GET /api/live-jobs/recommendations (web scraping)", True, 
                                         f"Retrieved {recommendations_count} jobs from web scraping with data_source: live_scraping, sources: {sources}")
                        else:
                            self.log_test("GET /api/live-jobs/recommendations (web scraping)", False, 
                                         error=f"Job structure missing required fields: {missing_fields}")
                    else:
                        self.log_test("GET /api/live-jobs/recommendations (web scraping)", False, 
                                     error="No recommendations returned from web scraping")
                else:
                    self.log_test("GET /api/live-jobs/recommendations (web scraping)", False, 
                                 error=f"Expected data_source: 'live_scraping', got: {data_source}")
            else:
                self.log_test("GET /api/live-jobs/recommendations (web scraping)", False, 
                             error=f"Expected 'recommendations' array in response, got: {data}")
        else:
            self.log_test("GET /api/live-jobs/recommendations (web scraping)", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_live_jobs_search_web_scraping(self):
        """Test GET /api/live-jobs/search with web scraping (NEW FEATURE)"""
        if not self.token:
            self.log_test("GET /api/live-jobs/search (web scraping)", False, 
                         error="No authentication token available")
            return

        # Test with specific query and location as per review request
        search_params = "query=Python&location=United States"
        success, data, status = self.test_api_call('GET', f'live-jobs/search?{search_params}', 200)
        
        if success:
            # Check if response has jobs array
            if 'jobs' in data and isinstance(data['jobs'], list):
                jobs_count = len(data['jobs'])
                
                # Verify it's using web scraping
                data_source = data.get('data_source')
                sources = data.get('sources', [])
                query_used = data.get('query_used')
                location_used = data.get('location')
                
                if data_source == "live_scraping":
                    print(f"    ✓ Confirmed data_source: 'live_scraping'")
                    print(f"    ✓ Query used: {query_used}, Location: {location_used}")
                    
                    # Check if sources include expected job boards
                    expected_sources = ["Indeed", "Dice", "RemoteOK", "Arbeitnow"]
                    if all(source in sources for source in expected_sources):
                        print(f"    ✓ All expected sources present: {sources}")
                    else:
                        print(f"    ⚠ Some sources missing. Expected: {expected_sources}, Got: {sources}")
                    
                    if jobs_count > 0:
                        # Check job structure
                        sample_job = data['jobs'][0]
                        required_fields = ['job_id', 'title', 'company', 'location', 'description', 'apply_link', 'source']
                        missing_fields = [field for field in required_fields if field not in sample_job]
                        
                        if not missing_fields:
                            print(f"    ✓ Job structure complete with all required fields")
                            
                            # Verify source field contains one of expected sources
                            job_sources = [job.get('source') for job in data['jobs'][:5]]
                            valid_sources = [src for src in job_sources if src in expected_sources]
                            
                            if valid_sources:
                                print(f"    ✓ Jobs have valid sources: {set(valid_sources)}")
                            else:
                                print(f"    ⚠ No valid sources found in job source fields: {job_sources}")
                            
                            self.log_test("GET /api/live-jobs/search (web scraping)", True, 
                                         f"Retrieved {jobs_count} jobs from web scraping search with query=Python, location=United States")
                        else:
                            self.log_test("GET /api/live-jobs/search (web scraping)", False, 
                                         error=f"Job structure missing required fields: {missing_fields}")
                    else:
                        self.log_test("GET /api/live-jobs/search (web scraping)", False, 
                                     error="No jobs returned from web scraping search")
                else:
                    self.log_test("GET /api/live-jobs/search (web scraping)", False, 
                                 error=f"Expected data_source: 'live_scraping', got: {data_source}")
            else:
                self.log_test("GET /api/live-jobs/search (web scraping)", False, 
                             error=f"Expected 'jobs' array in response, got: {data}")
        else:
            self.log_test("GET /api/live-jobs/search (web scraping)", False, 
                         error=f"Status: {status}, Data: {data}")

    def test_live_jobs_2_recommendations(self):
        """Test GET /api/live-jobs-2/recommendations (LinkedIn API)"""
        if not self.token:
            self.log_test("GET /api/live-jobs-2/recommendations", False, 
                         error="No authentication token available")
            return

        success, data, status = self.test_api_call('GET', 'live-jobs-2/recommendations', 200)
        
        if success:
            # Check if response has recommendations or quota exceeded message
            if 'recommendations' in data and isinstance(data['recommendations'], list):
                recommendations_count = len(data['recommendations'])
                self.log_test("GET /api/live-jobs-2/recommendations", True, 
                             f"Retrieved {recommendations_count} LinkedIn job recommendations")
            elif 'message' in data and 'quota' in data['message'].lower():
                self.log_test("GET /api/live-jobs-2/recommendations", True, 
                             f"API quota exceeded (expected): {data['message']}")
            else:
                self.log_test("GET /api/live-jobs-2/recommendations", False, 
                             error=f"Unexpected response format: {data}")
        else:
            # Status might be 429 (quota exceeded) or other error - check if it's expected
            if status == 429:
                self.log_test("GET /api/live-jobs-2/recommendations", True, 
                             f"API quota exceeded (expected): Status {status}")
            else:
                self.log_test("GET /api/live-jobs-2/recommendations", False, 
                             error=f"Status: {status}, Data: {data}")

    def test_profile_validation_without_primary_technology(self):
        """Test profile validation by temporarily clearing primary_technology"""
        if not self.token:
            self.log_test("Profile Validation Test", False, 
                         error="No authentication token available")
            return

        # Step 1: Clear primary_technology
        clear_profile_data = {
            "primary_technology": ""
        }
        
        success, data, status = self.test_api_call('PUT', 'auth/profile', 200, clear_profile_data)
        
        if not success:
            self.log_test("Profile Validation Test", False, 
                         error=f"Could not clear primary_technology. Status: {status}")
            return

        print("    ✓ Cleared primary_technology from profile")

        # Step 2: Test live-jobs/recommendations - should return error
        success, data, status = self.test_api_call('GET', 'live-jobs/recommendations', 200)
        
        validation_passed = False
        if success:
            # Check if response indicates profile update required
            if ('requires_profile_update' in data and data['requires_profile_update'] is True and
                'message' in data and 'profile' in data['message'].lower()):
                validation_passed = True
                print(f"    ✓ Correctly returned profile update requirement: {data['message']}")
            else:
                print(f"    ❌ Expected requires_profile_update=true with profile message, got: {data}")
        else:
            print(f"    ❌ API call failed. Status: {status}, Data: {data}")

        # Step 3: Restore profile with correct values
        restore_profile_data = {
            "primary_technology": self.expected_primary_tech,
            "sub_technologies": self.expected_sub_techs
        }
        
        restore_success, restore_data, restore_status = self.test_api_call('PUT', 'auth/profile', 200, restore_profile_data)
        
        if restore_success:
            print(f"    ✓ Restored profile: primary_technology={self.expected_primary_tech}")
            
            # Verify recommendations work again
            verify_success, verify_data, verify_status = self.test_api_call('GET', 'live-jobs/recommendations', 200)
            
            if verify_success and 'recommendations' in verify_data:
                print(f"    ✓ Recommendations working again after profile restore")
                validation_passed = validation_passed and True
            else:
                print(f"    ❌ Recommendations not working after profile restore")
                validation_passed = False
        else:
            print(f"    ❌ Could not restore profile. Status: {restore_status}")
            validation_passed = False

        if validation_passed:
            self.log_test("Profile Validation Test", True, 
                         "Successfully validated profile requirement and restored functionality")
        else:
            self.log_test("Profile Validation Test", False, 
                         error="Profile validation test failed - see details above")

    def run_all_tests(self):
        """Run Live Jobs Web Scraping focused tests"""
        print("🚀 Starting Live Jobs Web Scraping Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print(f"👤 Test user: {self.test_email}")
        print(f"🎯 Expected profile: Primary Technology = {self.expected_primary_tech}, Sub Technologies = {self.expected_sub_techs}")
        print("🕷️  Testing NEW web scraping feature (Indeed, Dice, RemoteOK, Arbeitnow)")
        print("=" * 80)

        # Test 1: Login to get token for authenticated endpoints
        print("\n🔐 Testing authentication...")
        self.test_user_login()
        
        if self.token:
            print("\n✅ Authentication successful, testing Live Jobs Web Scraping features...")
            
            # Test 2: Ensure user profile is set up correctly
            print("\n👤 Setting up user profile...")
            self.test_user_profile_setup()
            
            # Test 3: Test Live Jobs Recommendations with Web Scraping (NEW FEATURE)
            print("\n🕷️  Testing Live Jobs Recommendations with Web Scraping (NEW)...")
            self.test_live_jobs_recommendations_web_scraping()
            
            # Test 4: Test Live Jobs Search with Web Scraping (NEW FEATURE)
            print("\n🔍 Testing Live Jobs Search with Web Scraping (NEW)...")
            self.test_live_jobs_search_web_scraping()
            
            # Test 5: Test profile validation by clearing primary_technology
            print("\n⚠️  Testing profile validation (clearing primary_technology)...")
            self.test_profile_validation_without_primary_technology()
            
        else:
            print("❌ Authentication failed - cannot test Live Jobs Web Scraping features")

        # Print summary
        print("\n" + "=" * 80)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All Live Jobs Web Scraping tests passed!")
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
            },
            "expected_profile": {
                "primary_technology": self.expected_primary_tech,
                "sub_technologies": self.expected_sub_techs
            }
        }

def main():
    tester = LiveJobsWebScrapingTester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results
    summary = tester.get_test_summary()
    
    # Ensure test_reports directory exists
    import os
    os.makedirs('/app/test_reports', exist_ok=True)
    
    with open('/app/test_reports/live_jobs_web_scraping_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/test_reports/live_jobs_web_scraping_test_results.json")
    return exit_code

if __name__ == "__main__":
    sys.exit(main())