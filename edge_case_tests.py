#!/usr/bin/env python3
"""
Additional ATS Resume Optimizer Edge Case Tests
"""

import requests
import json

def test_edge_cases():
    base_url = "https://hirepilot-3.preview.emergentagent.com"
    
    # Login to get token
    login_data = {
        "email": "testuser_dashboard@test.com",
        "password": "Test123!"
    }
    
    response = requests.post(f"{base_url}/api/auth/login", json=login_data)
    if response.status_code != 200:
        print("❌ Login failed for edge case testing")
        return
    
    token = response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    print("🧪 Running ATS Resume Optimizer Edge Case Tests")
    print("=" * 50)
    
    # Test 1: Empty target role
    print("Test 1: Empty target role...")
    test_data = {"target_role": "", "generate_versions": False}
    response = requests.post(f"{base_url}/api/resumes/resume_0dbaaaa25be6/optimize", 
                           json=test_data, headers=headers)
    if response.status_code == 200:
        print("✅ Empty target role handled correctly")
    else:
        print(f"❌ Empty target role failed: {response.status_code}")
    
    # Test 2: Invalid resume ID
    print("Test 2: Invalid resume ID...")
    test_data = {"target_role": "Developer", "generate_versions": False}
    response = requests.post(f"{base_url}/api/resumes/invalid_resume_id/optimize", 
                           json=test_data, headers=headers)
    if response.status_code == 404:
        print("✅ Invalid resume ID properly returns 404")
    else:
        print(f"❌ Invalid resume ID unexpected status: {response.status_code}")
    
    # Test 3: Missing authentication
    print("Test 3: Missing authentication...")
    response = requests.post(f"{base_url}/api/resumes/resume_0dbaaaa25be6/optimize", 
                           json={"target_role": "Developer"})
    if response.status_code == 401:
        print("✅ Missing authentication properly returns 401")
    else:
        print(f"❌ Missing authentication unexpected status: {response.status_code}")
    
    # Test 4: Word generation with version parameter
    print("Test 4: Word generation with version parameter...")
    response = requests.post(f"{base_url}/api/resumes/resume_0dbaaaa25be6/generate-word?version=Technical Focus", 
                           headers=headers)
    if response.status_code == 200:
        content_type = response.headers.get('content-type', '')
        if 'wordprocessingml' in content_type:
            print("✅ Word generation with version parameter works")
        else:
            print(f"❌ Word generation wrong content type: {content_type}")
    else:
        print(f"❌ Word generation with version failed: {response.status_code}")
    
    print("=" * 50)
    print("🧪 Edge case testing completed")

if __name__ == "__main__":
    test_edge_cases()