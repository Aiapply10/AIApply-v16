"""
Job Application Bot - Automated job application submission using Playwright
Supports multiple job platforms: LinkedIn Easy Apply, Indeed, Direct Company Sites
"""
import asyncio
import os
import uuid
import base64
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, List
from playwright.async_api import async_playwright, Page, Browser, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)

# Directory to store screenshots
SCREENSHOTS_DIR = "/app/backend/screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)


class JobApplicationBot:
    """
    Automated job application bot using Playwright.
    Handles form filling, file uploads, and submission on various job platforms.
    """
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context = None
        self.page: Optional[Page] = None
        self.playwright = None
        
    async def start(self):
        """Initialize the browser"""
        import os
        
        # Set Playwright browsers path if not in default location
        if os.path.exists('/pw-browsers'):
            os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/pw-browsers'
        
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        )
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        self.page = await self.context.new_page()
        logger.info("Browser started successfully")
        
    async def stop(self):
        """Close the browser"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("Browser stopped")
        
    async def take_screenshot(self, name: str) -> str:
        """Take a screenshot and return the file path"""
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        filename = f"{name}_{timestamp}.png"
        filepath = os.path.join(SCREENSHOTS_DIR, filename)
        await self.page.screenshot(path=filepath, full_page=False)
        logger.info(f"Screenshot saved: {filepath}")
        return filepath
        
    async def screenshot_to_base64(self) -> str:
        """Take a screenshot and return as base64 string"""
        screenshot_bytes = await self.page.screenshot(full_page=False)
        return base64.b64encode(screenshot_bytes).decode('utf-8')
        
    def detect_platform(self, url: str) -> str:
        """Detect which job platform the URL belongs to"""
        url_lower = url.lower()
        if 'linkedin.com' in url_lower:
            return 'linkedin'
        elif 'indeed.com' in url_lower:
            return 'indeed'
        elif 'glassdoor.com' in url_lower:
            return 'glassdoor'
        elif 'lever.co' in url_lower:
            return 'lever'
        elif 'greenhouse.io' in url_lower:
            return 'greenhouse'
        elif 'workday' in url_lower:
            return 'workday'
        elif 'smartrecruiters' in url_lower:
            return 'smartrecruiters'
        elif 'jobvite' in url_lower:
            return 'jobvite'
        elif 'remoteok.com' in url_lower or 'remotive.com' in url_lower:
            return 'remote_board'
        else:
            return 'generic'
            
    async def apply_to_job(
        self,
        apply_url: str,
        user_data: Dict,
        resume_path: Optional[str] = None,
        cover_letter: Optional[str] = None
    ) -> Dict:
        """
        Apply to a job using the provided URL and user data.
        
        Args:
            apply_url: The job application URL
            user_data: User profile data (name, email, phone, etc.)
            resume_path: Path to resume file (optional)
            cover_letter: Cover letter text (optional)
            
        Returns:
            Dict with status, screenshots, and any error messages
        """
        result = {
            "success": False,
            "platform": "unknown",
            "url": apply_url,
            "status": "not_started",
            "screenshots": [],
            "error": None,
            "submitted_at": None,
            "form_filled": False
        }
        
        try:
            if not self.page:
                await self.start()
                
            # Detect platform
            platform = self.detect_platform(apply_url)
            result["platform"] = platform
            logger.info(f"Applying to job on platform: {platform}")
            
            # Navigate to the application page
            try:
                await self.page.goto(apply_url, wait_until='domcontentloaded', timeout=45000)
            except PlaywrightTimeout:
                # Try with less strict waiting
                await self.page.goto(apply_url, wait_until='commit', timeout=60000)
            
            await asyncio.sleep(3)
            
            # Take initial screenshot
            initial_screenshot = await self.take_screenshot(f"initial_{platform}")
            result["screenshots"].append(initial_screenshot)
            
            # Apply based on platform
            if platform == 'linkedin':
                result = await self._apply_linkedin(user_data, resume_path, cover_letter, result)
            elif platform == 'indeed':
                result = await self._apply_indeed(user_data, resume_path, cover_letter, result)
            elif platform == 'lever':
                result = await self._apply_lever(user_data, resume_path, cover_letter, result)
            elif platform == 'greenhouse':
                result = await self._apply_greenhouse(user_data, resume_path, cover_letter, result)
            elif platform == 'remote_board':
                result = await self._apply_remote_board(user_data, resume_path, cover_letter, result)
            else:
                result = await self._apply_generic(user_data, resume_path, cover_letter, result)
                
        except PlaywrightTimeout as e:
            logger.error(f"Timeout during application: {str(e)}")
            result["error"] = f"Page timeout: {str(e)}"
            result["status"] = "timeout"
        except Exception as e:
            logger.error(f"Error during application: {str(e)}")
            result["error"] = str(e)
            result["status"] = "error"
            
        return result
        
    async def _fill_common_fields(self, user_data: Dict):
        """Fill common form fields found on most job application forms"""
        field_mappings = [
            # Name fields
            (['[name="name"]', '[name="fullName"]', '[name="full_name"]', '#name', '#fullName', 
              'input[placeholder*="name" i]', 'input[aria-label*="name" i]'], 
             user_data.get('full_name', '')),
            
            # First name
            (['[name="firstName"]', '[name="first_name"]', '#firstName', '#first_name',
              'input[placeholder*="first name" i]', 'input[aria-label*="first name" i]'], 
             user_data.get('first_name', '')),
            
            # Last name
            (['[name="lastName"]', '[name="last_name"]', '#lastName', '#last_name',
              'input[placeholder*="last name" i]', 'input[aria-label*="last name" i]'], 
             user_data.get('last_name', '')),
            
            # Email
            (['[name="email"]', '[type="email"]', '#email', 
              'input[placeholder*="email" i]', 'input[aria-label*="email" i]'], 
             user_data.get('email', '')),
            
            # Phone
            (['[name="phone"]', '[name="phoneNumber"]', '[name="phone_number"]', '[type="tel"]',
              '#phone', '#phoneNumber', 'input[placeholder*="phone" i]', 'input[aria-label*="phone" i]'], 
             user_data.get('phone', '')),
            
            # LinkedIn URL
            (['[name="linkedin"]', '[name="linkedinUrl"]', 'input[placeholder*="linkedin" i]'], 
             user_data.get('linkedin_url', '')),
            
            # Current company
            (['[name="company"]', '[name="currentCompany"]', 'input[placeholder*="company" i]'], 
             user_data.get('current_company', '')),
            
            # Current title
            (['[name="title"]', '[name="currentTitle"]', '[name="job_title"]', 
              'input[placeholder*="title" i]', 'input[placeholder*="position" i]'], 
             user_data.get('job_title', '')),
            
            # Location
            (['[name="location"]', '[name="city"]', 'input[placeholder*="location" i]', 
              'input[placeholder*="city" i]'], 
             user_data.get('location', '')),
        ]
        
        filled_fields = []
        
        for selectors, value in field_mappings:
            if not value:
                continue
                
            for selector in selectors:
                try:
                    element = self.page.locator(selector).first
                    if await element.count() > 0 and await element.is_visible():
                        await element.fill(str(value))
                        filled_fields.append(selector)
                        logger.info(f"Filled field {selector} with value")
                        break
                except Exception as e:
                    continue
                    
        return filled_fields
        
    async def _upload_resume(self, resume_path: str) -> bool:
        """Try to upload resume using various selectors"""
        if not resume_path or not os.path.exists(resume_path):
            return False
            
        upload_selectors = [
            'input[type="file"]',
            'input[name="resume"]',
            'input[name="cv"]',
            'input[accept=".pdf,.doc,.docx"]',
            '[data-testid="resume-upload"]',
            '.resume-upload input',
            '#resume-upload',
        ]
        
        for selector in upload_selectors:
            try:
                file_input = self.page.locator(selector).first
                if await file_input.count() > 0:
                    await file_input.set_input_files(resume_path)
                    logger.info(f"Uploaded resume using selector: {selector}")
                    await asyncio.sleep(2)  # Wait for upload
                    return True
            except Exception as e:
                continue
                
        return False
        
    async def _fill_cover_letter(self, cover_letter: str) -> bool:
        """Try to fill cover letter field"""
        if not cover_letter:
            return False
            
        cover_letter_selectors = [
            'textarea[name="coverLetter"]',
            'textarea[name="cover_letter"]',
            '#coverLetter',
            '#cover_letter',
            'textarea[placeholder*="cover letter" i]',
            'textarea[aria-label*="cover letter" i]',
            '.cover-letter textarea',
            'textarea[name="message"]',
        ]
        
        for selector in cover_letter_selectors:
            try:
                element = self.page.locator(selector).first
                if await element.count() > 0 and await element.is_visible():
                    await element.fill(cover_letter)
                    logger.info(f"Filled cover letter using selector: {selector}")
                    return True
            except Exception as e:
                continue
                
        return False
        
    async def _click_submit(self) -> bool:
        """Try to find and click the submit button"""
        submit_selectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Submit")',
            'button:has-text("Apply")',
            'button:has-text("Send Application")',
            'button:has-text("Submit Application")',
            '[data-testid="submit-button"]',
            '.submit-btn',
            '#submit-application',
        ]
        
        for selector in submit_selectors:
            try:
                button = self.page.locator(selector).first
                if await button.count() > 0 and await button.is_visible():
                    await button.click()
                    logger.info(f"Clicked submit button: {selector}")
                    await asyncio.sleep(3)  # Wait for submission
                    return True
            except Exception as e:
                continue
                
        return False
        
    async def _apply_lever(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on Lever ATS"""
        try:
            # Lever forms are usually straightforward
            result["status"] = "filling_form"
            
            # Fill common fields
            filled = await self._fill_common_fields(user_data)
            result["form_filled"] = len(filled) > 0
            
            # Upload resume
            if resume_path:
                await self._upload_resume(resume_path)
                
            # Fill cover letter
            if cover_letter:
                await self._fill_cover_letter(cover_letter)
                
            # Take screenshot before submit
            form_screenshot = await self.take_screenshot("lever_form_filled")
            result["screenshots"].append(form_screenshot)
            
            # Click submit
            submitted = await self._click_submit()
            
            if submitted:
                await asyncio.sleep(2)
                confirmation_screenshot = await self.take_screenshot("lever_submitted")
                result["screenshots"].append(confirmation_screenshot)
                result["success"] = True
                result["status"] = "submitted"
                result["submitted_at"] = datetime.now(timezone.utc).isoformat()
            else:
                result["status"] = "submit_button_not_found"
                
        except Exception as e:
            result["error"] = str(e)
            result["status"] = "error"
            
        return result
        
    async def _apply_greenhouse(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on Greenhouse ATS"""
        try:
            result["status"] = "filling_form"
            
            # Greenhouse forms often have specific field IDs
            filled = await self._fill_common_fields(user_data)
            result["form_filled"] = len(filled) > 0
            
            # Upload resume
            if resume_path:
                await self._upload_resume(resume_path)
                
            # Fill cover letter
            if cover_letter:
                await self._fill_cover_letter(cover_letter)
                
            # Take screenshot
            form_screenshot = await self.take_screenshot("greenhouse_form_filled")
            result["screenshots"].append(form_screenshot)
            
            # Submit
            submitted = await self._click_submit()
            
            if submitted:
                await asyncio.sleep(2)
                confirmation_screenshot = await self.take_screenshot("greenhouse_submitted")
                result["screenshots"].append(confirmation_screenshot)
                result["success"] = True
                result["status"] = "submitted"
                result["submitted_at"] = datetime.now(timezone.utc).isoformat()
            else:
                result["status"] = "submit_button_not_found"
                
        except Exception as e:
            result["error"] = str(e)
            result["status"] = "error"
            
        return result
        
    async def _apply_linkedin(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on LinkedIn - Note: Requires login"""
        result["status"] = "requires_login"
        result["error"] = "LinkedIn requires authentication. Please use LinkedIn Easy Apply directly or connect your LinkedIn account."
        
        # Take screenshot showing login required
        screenshot = await self.take_screenshot("linkedin_login_required")
        result["screenshots"].append(screenshot)
        
        return result
        
    async def _apply_indeed(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on Indeed - Note: Often requires login"""
        try:
            result["status"] = "checking_page"
            
            # Check if login is required
            login_required = await self.page.locator('text="Sign in"').count() > 0
            
            if login_required:
                result["status"] = "requires_login"
                result["error"] = "Indeed requires authentication for this application."
                screenshot = await self.take_screenshot("indeed_login_required")
                result["screenshots"].append(screenshot)
                return result
                
            # Try to fill form if no login required
            result["status"] = "filling_form"
            filled = await self._fill_common_fields(user_data)
            result["form_filled"] = len(filled) > 0
            
            if resume_path:
                await self._upload_resume(resume_path)
                
            form_screenshot = await self.take_screenshot("indeed_form_filled")
            result["screenshots"].append(form_screenshot)
            
            # Submit
            submitted = await self._click_submit()
            
            if submitted:
                await asyncio.sleep(2)
                confirmation_screenshot = await self.take_screenshot("indeed_submitted")
                result["screenshots"].append(confirmation_screenshot)
                result["success"] = True
                result["status"] = "submitted"
                result["submitted_at"] = datetime.now(timezone.utc).isoformat()
            else:
                result["status"] = "submit_button_not_found"
                
        except Exception as e:
            result["error"] = str(e)
            result["status"] = "error"
            
        return result
        
    async def _apply_remote_board(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on remote job boards (RemoteOK, Remotive, etc.)"""
        try:
            result["status"] = "redirect_to_company"
            
            # Most remote job boards redirect to company's application page
            # Take a screenshot of the job listing
            screenshot = await self.take_screenshot("remote_board_listing")
            result["screenshots"].append(screenshot)
            
            # Look for "Apply" button that redirects
            apply_buttons = [
                'a:has-text("Apply")',
                'button:has-text("Apply")',
                '.apply-button',
                '[data-testid="apply-button"]',
            ]
            
            for selector in apply_buttons:
                try:
                    button = self.page.locator(selector).first
                    if await button.count() > 0:
                        # Get the href if it's a link
                        href = await button.get_attribute('href')
                        if href:
                            result["redirect_url"] = href
                            await button.click()
                            await asyncio.sleep(3)
                            
                            # Now we're on the actual application page
                            redirect_screenshot = await self.take_screenshot("redirected_application")
                            result["screenshots"].append(redirect_screenshot)
                            
                            # Try generic application
                            return await self._apply_generic(user_data, resume_path, cover_letter, result)
                except Exception:
                    continue
                    
            result["status"] = "manual_apply_required"
            result["error"] = "Could not find apply button. Manual application may be required."
            
        except Exception as e:
            result["error"] = str(e)
            result["status"] = "error"
            
        return result
        
    async def _apply_generic(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Generic application handler for unknown platforms"""
        try:
            result["status"] = "filling_form"
            
            # Fill common fields
            filled = await self._fill_common_fields(user_data)
            result["form_filled"] = len(filled) > 0
            
            # Upload resume
            resume_uploaded = False
            if resume_path:
                resume_uploaded = await self._upload_resume(resume_path)
                
            # Fill cover letter
            if cover_letter:
                await self._fill_cover_letter(cover_letter)
                
            # Take screenshot of filled form
            form_screenshot = await self.take_screenshot("generic_form_filled")
            result["screenshots"].append(form_screenshot)
            
            # Check for required fields that might be empty
            # (This is a simplified check)
            
            # Try to submit
            submitted = await self._click_submit()
            
            if submitted:
                await asyncio.sleep(3)
                
                # Check for success indicators
                success_indicators = [
                    'text="Thank you"',
                    'text="Application submitted"',
                    'text="Successfully applied"',
                    'text="received your application"',
                    '.success-message',
                    '.confirmation',
                ]
                
                is_success = False
                for indicator in success_indicators:
                    try:
                        if await self.page.locator(indicator).count() > 0:
                            is_success = True
                            break
                    except:
                        continue
                
                confirmation_screenshot = await self.take_screenshot("generic_submitted")
                result["screenshots"].append(confirmation_screenshot)
                
                if is_success:
                    result["success"] = True
                    result["status"] = "submitted"
                    result["submitted_at"] = datetime.now(timezone.utc).isoformat()
                else:
                    result["status"] = "submitted_unconfirmed"
                    result["success"] = True  # Assume success if we clicked submit
                    result["submitted_at"] = datetime.now(timezone.utc).isoformat()
            else:
                result["status"] = "submit_button_not_found"
                
        except Exception as e:
            result["error"] = str(e)
            result["status"] = "error"
            
        return result


# Singleton instance
job_application_bot = JobApplicationBot()


async def apply_to_job_automated(
    apply_url: str,
    user_data: Dict,
    resume_path: Optional[str] = None,
    cover_letter: Optional[str] = None
) -> Dict:
    """
    Convenience function to apply to a job.
    Creates a new bot instance for each application to avoid state issues.
    """
    bot = JobApplicationBot()
    try:
        await bot.start()
        result = await bot.apply_to_job(apply_url, user_data, resume_path, cover_letter)
        return result
    finally:
        await bot.stop()
