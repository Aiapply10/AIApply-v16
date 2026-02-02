"""
Test Default Resume Dropdown in Auto-Apply Settings
Tests:
1. GET /api/resumes returns resume with master_resume and title_versions
2. POST /api/auto-apply/settings accepts resume_id with _master suffix
3. POST /api/auto-apply/settings accepts resume_id with _variant_N suffix
4. Backend correctly parses resume_id suffixes during auto-apply run
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_autoapply@example.com"
TEST_PASSWORD = "testpass123"


class TestDefaultResumeDropdown:
    """Tests for Default Resume dropdown showing all resume versions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_01_get_resumes_returns_master_and_variants(self):
        """Test that GET /api/resumes returns resume with master_resume and title_versions"""
        response = requests.get(f"{BASE_URL}/api/resumes", headers=self.headers)
        assert response.status_code == 200, f"Failed to get resumes: {response.text}"
        
        resumes = response.json()
        assert len(resumes) > 0, "No resumes found for test user"
        
        # Find the test resume
        test_resume = None
        for resume in resumes:
            if resume.get("resume_id") == "resume_8c4696bc3a38":
                test_resume = resume
                break
        
        assert test_resume is not None, "Test resume not found"
        
        # Verify master_resume exists
        assert test_resume.get("master_resume") is not None, "master_resume field is missing"
        print(f"✓ master_resume exists (length: {len(test_resume['master_resume'])} chars)")
        
        # Verify title_versions exist
        title_versions = test_resume.get("title_versions", [])
        assert len(title_versions) == 4, f"Expected 4 title_versions, got {len(title_versions)}"
        
        # Verify variant names
        expected_variants = ["Python Developer", "Python Engineer", "Backend Developer", "Data Engineer"]
        for i, version in enumerate(title_versions):
            variant_name = version.get("name") or version.get("job_title")
            assert variant_name in expected_variants, f"Unexpected variant: {variant_name}"
            print(f"✓ Variant {i}: {variant_name}")
        
        print("✓ All resume versions present in API response")
    
    def test_02_save_settings_with_original_resume_id(self):
        """Test saving settings with original resume_id (no suffix)"""
        response = requests.post(f"{BASE_URL}/api/auto-apply/settings", 
            headers=self.headers,
            json={
                "resume_id": "resume_8c4696bc3a38",
                "enabled": True
            }
        )
        assert response.status_code == 200, f"Failed to save settings: {response.text}"
        
        # Verify settings were saved
        get_response = requests.get(f"{BASE_URL}/api/auto-apply/settings", headers=self.headers)
        assert get_response.status_code == 200
        settings = get_response.json()
        assert settings.get("resume_id") == "resume_8c4696bc3a38"
        print("✓ Original resume_id saved correctly")
    
    def test_03_save_settings_with_master_suffix(self):
        """Test saving settings with resume_id_master suffix"""
        response = requests.post(f"{BASE_URL}/api/auto-apply/settings", 
            headers=self.headers,
            json={
                "resume_id": "resume_8c4696bc3a38_master",
                "enabled": True
            }
        )
        assert response.status_code == 200, f"Failed to save settings with _master: {response.text}"
        
        # Verify settings were saved
        get_response = requests.get(f"{BASE_URL}/api/auto-apply/settings", headers=self.headers)
        assert get_response.status_code == 200
        settings = get_response.json()
        assert settings.get("resume_id") == "resume_8c4696bc3a38_master"
        print("✓ Master resume_id saved correctly: resume_8c4696bc3a38_master")
    
    def test_04_save_settings_with_variant_suffix(self):
        """Test saving settings with resume_id_variant_N suffix"""
        # Test variant_0 (Python Developer)
        response = requests.post(f"{BASE_URL}/api/auto-apply/settings", 
            headers=self.headers,
            json={
                "resume_id": "resume_8c4696bc3a38_variant_0",
                "enabled": True
            }
        )
        assert response.status_code == 200, f"Failed to save settings with _variant_0: {response.text}"
        
        # Verify settings were saved
        get_response = requests.get(f"{BASE_URL}/api/auto-apply/settings", headers=self.headers)
        assert get_response.status_code == 200
        settings = get_response.json()
        assert settings.get("resume_id") == "resume_8c4696bc3a38_variant_0"
        print("✓ Variant 0 resume_id saved correctly: resume_8c4696bc3a38_variant_0")
        
        # Test variant_3 (Data Engineer)
        response = requests.post(f"{BASE_URL}/api/auto-apply/settings", 
            headers=self.headers,
            json={
                "resume_id": "resume_8c4696bc3a38_variant_3",
                "enabled": True
            }
        )
        assert response.status_code == 200, f"Failed to save settings with _variant_3: {response.text}"
        
        get_response = requests.get(f"{BASE_URL}/api/auto-apply/settings", headers=self.headers)
        settings = get_response.json()
        assert settings.get("resume_id") == "resume_8c4696bc3a38_variant_3"
        print("✓ Variant 3 resume_id saved correctly: resume_8c4696bc3a38_variant_3")
    
    def test_05_auto_apply_run_with_master_resume(self):
        """Test that auto-apply run correctly parses _master suffix"""
        # First set the resume_id to master version
        requests.post(f"{BASE_URL}/api/auto-apply/settings", 
            headers=self.headers,
            json={
                "resume_id": "resume_8c4696bc3a38_master",
                "enabled": True,
                "job_keywords": ["Python Developer"],
                "locations": ["Remote"]
            }
        )
        
        # Run auto-apply (this tests the backend parsing logic)
        response = requests.post(f"{BASE_URL}/api/auto-apply/run", 
            headers=self.headers,
            json={"source_variant": "live_jobs"}
        )
        
        # We expect either success or "no jobs found" - both are valid
        # The key is that it doesn't fail with "Resume not found"
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Auto-apply run succeeded with master resume: {data.get('message', 'OK')}")
        else:
            # 400 could be "no jobs found" which is acceptable
            error = response.json().get("detail", "")
            assert "Resume not found" not in error, f"Backend failed to parse _master suffix: {error}"
            print(f"✓ Auto-apply run completed (no jobs found is acceptable): {error}")
    
    def test_06_auto_apply_run_with_variant_resume(self):
        """Test that auto-apply run correctly parses _variant_N suffix"""
        # Set the resume_id to variant version
        requests.post(f"{BASE_URL}/api/auto-apply/settings", 
            headers=self.headers,
            json={
                "resume_id": "resume_8c4696bc3a38_variant_2",  # Backend Developer
                "enabled": True,
                "job_keywords": ["Backend Developer"],
                "locations": ["Remote"]
            }
        )
        
        # Run auto-apply
        response = requests.post(f"{BASE_URL}/api/auto-apply/run", 
            headers=self.headers,
            json={"source_variant": "live_jobs"}
        )
        
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Auto-apply run succeeded with variant resume: {data.get('message', 'OK')}")
        else:
            error = response.json().get("detail", "")
            assert "Resume not found" not in error, f"Backend failed to parse _variant_2 suffix: {error}"
            print(f"✓ Auto-apply run completed with variant: {error}")
    
    def test_07_verify_all_dropdown_options_structure(self):
        """Verify the structure expected by frontend dropdown"""
        response = requests.get(f"{BASE_URL}/api/resumes", headers=self.headers)
        assert response.status_code == 200
        
        resumes = response.json()
        test_resume = next((r for r in resumes if r.get("resume_id") == "resume_8c4696bc3a38"), None)
        assert test_resume is not None
        
        # Simulate what frontend flatMap does
        dropdown_options = []
        resume_id = test_resume.get("resume_id")
        resume_name = test_resume.get("file_name", "Resume")
        
        # Original option
        dropdown_options.append({
            "key": resume_id,
            "value": resume_id,
            "label": resume_name,
            "type": "original"
        })
        
        # Master option (if exists)
        if test_resume.get("master_resume"):
            dropdown_options.append({
                "key": f"{resume_id}_master",
                "value": f"{resume_id}_master",
                "label": f"{resume_name} - Master",
                "type": "master"
            })
        
        # Variant options
        title_versions = test_resume.get("title_versions", [])
        for idx, version in enumerate(title_versions):
            dropdown_options.append({
                "key": f"{resume_id}_variant_{idx}",
                "value": f"{resume_id}_variant_{idx}",
                "label": version.get("name") or version.get("job_title"),
                "type": "variant"
            })
        
        # Verify we have all expected options
        assert len(dropdown_options) == 6, f"Expected 6 options (1 original + 1 master + 4 variants), got {len(dropdown_options)}"
        
        print("\n✓ Dropdown options structure:")
        for opt in dropdown_options:
            print(f"  - {opt['type'].upper()}: {opt['label']} (value: {opt['value']})")
        
        print("\n✓ All 6 dropdown options verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
