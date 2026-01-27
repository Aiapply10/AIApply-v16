"""
Job Application Bot - Automated job application submission using Playwright
Supports multiple job platforms: Greenhouse, Lever, Workday, SmartRecruiters, Jobvite, and more.
"""
import asyncio
import os
import uuid
import base64
import logging
import re
from datetime import datetime, timezone
from typing import Dict, Optional, List, Tuple

# Playwright is optional - may not be available in production
PLAYWRIGHT_AVAILABLE = False
try:
    from playwright.async_api import async_playwright, Page, Browser, TimeoutError as PlaywrightTimeout
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    async_playwright = None
    Page = None
    Browser = None
    PlaywrightTimeout = TimeoutError
    logging.warning("Playwright not available - browser automation disabled")

logger = logging.getLogger(__name__)

# Directory to store screenshots
SCREENSHOTS_DIR = "/app/backend/screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)


def is_playwright_available() -> bool:
    """Check if Playwright is available for browser automation"""
    return PLAYWRIGHT_AVAILABLE


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
        self.debug_logs: List[str] = []
        
    def log(self, message: str):
        """Add to debug logs and log to logger"""
        timestamp = datetime.now(timezone.utc).strftime('%H:%M:%S')
        log_entry = f"[{timestamp}] {message}"
        self.debug_logs.append(log_entry)
        logger.info(message)
        
    async def start(self):
        """Initialize the browser"""
        if os.path.exists('/pw-browsers'):
            os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/pw-browsers'
        
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        )
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/New_York'
        )
        self.page = await self.context.new_page()
        
        # Set default timeouts
        self.page.set_default_timeout(30000)
        self.page.set_default_navigation_timeout(45000)
        
        self.log("Browser started successfully")
        
    async def stop(self):
        """Close the browser"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        self.log("Browser stopped")
        
    async def take_screenshot(self, name: str) -> str:
        """Take a screenshot and return the file path"""
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        filename = f"{name}_{timestamp}.png"
        filepath = os.path.join(SCREENSHOTS_DIR, filename)
        await self.page.screenshot(path=filepath, full_page=False)
        self.log(f"Screenshot saved: {filepath}")
        return filepath
        
    async def screenshot_to_base64(self) -> str:
        """Take a screenshot and return as base64 string"""
        screenshot_bytes = await self.page.screenshot(full_page=False)
        return base64.b64encode(screenshot_bytes).decode('utf-8')
        
    def detect_platform(self, url: str) -> str:
        """Detect which job platform the URL belongs to"""
        url_lower = url.lower()
        
        # ATS Platforms
        if 'greenhouse.io' in url_lower or 'boards.greenhouse' in url_lower:
            return 'greenhouse'
        elif 'lever.co' in url_lower or 'jobs.lever' in url_lower:
            return 'lever'
        elif 'workday' in url_lower or 'myworkdayjobs' in url_lower:
            return 'workday'
        elif 'smartrecruiters' in url_lower:
            return 'smartrecruiters'
        elif 'jobvite' in url_lower:
            return 'jobvite'
        elif 'icims' in url_lower:
            return 'icims'
        elif 'breezy' in url_lower or 'breezyhr' in url_lower:
            return 'breezy'
        elif 'ashbyhq' in url_lower:
            return 'ashby'
        elif 'recruitee' in url_lower:
            return 'recruitee'
        elif 'bamboohr' in url_lower:
            return 'bamboohr'
        # Job Boards (usually redirect to company)
        elif 'linkedin.com' in url_lower:
            return 'linkedin'
        elif 'indeed.com' in url_lower:
            return 'indeed'
        elif 'glassdoor.com' in url_lower:
            return 'glassdoor'
        elif 'remoteok.com' in url_lower or 'remotive.com' in url_lower:
            return 'remote_board'
        elif 'dice.com' in url_lower:
            return 'dice'
        elif 'angel.co' in url_lower or 'wellfound.com' in url_lower:
            return 'angellist'
        else:
            return 'generic'
            
    async def wait_and_click(self, selectors: List[str], timeout: int = 5000) -> bool:
        """Try multiple selectors and click the first visible one"""
        for selector in selectors:
            try:
                element = self.page.locator(selector).first
                await element.wait_for(state="visible", timeout=timeout)
                if await element.is_enabled():
                    await element.scroll_into_view_if_needed()
                    await asyncio.sleep(0.3)
                    await element.click(force=True)
                    self.log(f"Clicked: {selector}")
                    return True
            except Exception:
                continue
        return False
        
    async def wait_and_fill(self, selectors: List[str], value: str, timeout: int = 3000) -> bool:
        """Try multiple selectors and fill the first visible one"""
        if not value:
            return False
            
        for selector in selectors:
            try:
                element = self.page.locator(selector).first
                await element.wait_for(state="visible", timeout=timeout)
                await element.scroll_into_view_if_needed()
                await element.fill(str(value))
                self.log(f"Filled '{selector}' with value")
                return True
            except Exception:
                continue
        return False
        
    async def apply_to_job(
        self,
        apply_url: str,
        user_data: Dict,
        resume_path: Optional[str] = None,
        cover_letter: Optional[str] = None
    ) -> Dict:
        """
        Apply to a job using the provided URL and user data.
        """
        self.debug_logs = []  # Reset logs for new application
        
        result = {
            "success": False,
            "platform": "unknown",
            "url": apply_url,
            "status": "not_started",
            "screenshots": [],
            "error": None,
            "submitted_at": None,
            "form_filled": False,
            "debug_logs": []
        }
        
        try:
            if not self.page:
                await self.start()
                
            # Detect platform
            platform = self.detect_platform(apply_url)
            result["platform"] = platform
            self.log(f"Detected platform: {platform} for URL: {apply_url}")
            
            # Navigate to the application page
            try:
                await self.page.goto(apply_url, wait_until='domcontentloaded', timeout=45000)
            except PlaywrightTimeout:
                self.log("First navigation attempt timed out, retrying with less strict waiting")
                await self.page.goto(apply_url, wait_until='commit', timeout=60000)
            
            await asyncio.sleep(2)
            
            # Wait for page to stabilize
            await self._wait_for_page_load()
            
            # Take initial screenshot
            initial_screenshot = await self.take_screenshot(f"initial_{platform}")
            result["screenshots"].append(initial_screenshot)
            
            # Apply based on platform
            if platform == 'greenhouse':
                result = await self._apply_greenhouse(user_data, resume_path, cover_letter, result)
            elif platform == 'lever':
                result = await self._apply_lever(user_data, resume_path, cover_letter, result)
            elif platform == 'workday':
                result = await self._apply_workday(user_data, resume_path, cover_letter, result)
            elif platform == 'smartrecruiters':
                result = await self._apply_smartrecruiters(user_data, resume_path, cover_letter, result)
            elif platform == 'ashby':
                result = await self._apply_ashby(user_data, resume_path, cover_letter, result)
            elif platform == 'breezy':
                result = await self._apply_breezy(user_data, resume_path, cover_letter, result)
            elif platform == 'icims':
                result = await self._apply_icims(user_data, resume_path, cover_letter, result)
            elif platform in ['linkedin', 'indeed', 'glassdoor']:
                result = await self._apply_job_board(platform, user_data, resume_path, cover_letter, result)
            elif platform == 'remote_board':
                result = await self._apply_remote_board(user_data, resume_path, cover_letter, result)
            else:
                result = await self._apply_generic(user_data, resume_path, cover_letter, result)
                
        except PlaywrightTimeout as e:
            self.log(f"Timeout during application: {str(e)}")
            result["error"] = f"Page timeout: {str(e)}"
            result["status"] = "timeout"
        except Exception as e:
            self.log(f"Error during application: {str(e)}")
            result["error"] = str(e)
            result["status"] = "error"
            
        result["debug_logs"] = self.debug_logs
        return result
        
    async def _wait_for_page_load(self):
        """Wait for page to be fully loaded and interactive"""
        try:
            # Wait for network to be idle
            await self.page.wait_for_load_state('networkidle', timeout=10000)
        except:
            pass
            
        # Additional wait for dynamic content
        await asyncio.sleep(1)
        
    async def _fill_common_fields(self, user_data: Dict) -> List[str]:
        """Fill common form fields found on most job application forms"""
        filled_fields = []
        
        field_configs = [
            # Full name / Name
            {
                "selectors": [
                    'input[name="name"]', 'input[name="fullName"]', 'input[name="full_name"]',
                    '#name', '#fullName', 'input[placeholder*="full name" i]',
                    'input[aria-label*="full name" i]', 'input[data-qa="name"]'
                ],
                "value": user_data.get('full_name', '')
            },
            # First name
            {
                "selectors": [
                    'input[name="firstName"]', 'input[name="first_name"]', 'input[name="first-name"]',
                    '#firstName', '#first_name', 'input[placeholder*="first name" i]',
                    'input[aria-label*="first name" i]', 'input[data-qa="first-name"]',
                    'input[id*="firstName" i]', 'input[id*="first_name" i]',
                    'input[autocomplete="given-name"]'
                ],
                "value": user_data.get('first_name', '')
            },
            # Last name
            {
                "selectors": [
                    'input[name="lastName"]', 'input[name="last_name"]', 'input[name="last-name"]',
                    '#lastName', '#last_name', 'input[placeholder*="last name" i]',
                    'input[aria-label*="last name" i]', 'input[data-qa="last-name"]',
                    'input[id*="lastName" i]', 'input[id*="last_name" i]',
                    'input[autocomplete="family-name"]'
                ],
                "value": user_data.get('last_name', '')
            },
            # Email
            {
                "selectors": [
                    'input[name="email"]', 'input[type="email"]', '#email',
                    'input[placeholder*="email" i]', 'input[aria-label*="email" i]',
                    'input[data-qa="email"]', 'input[autocomplete="email"]',
                    'input[id*="email" i]', 'input[name*="email" i]'
                ],
                "value": user_data.get('email', '')
            },
            # Phone
            {
                "selectors": [
                    'input[name="phone"]', 'input[name="phoneNumber"]', 'input[name="phone_number"]',
                    'input[type="tel"]', '#phone', '#phoneNumber',
                    'input[placeholder*="phone" i]', 'input[aria-label*="phone" i]',
                    'input[data-qa="phone"]', 'input[autocomplete="tel"]',
                    'input[id*="phone" i]', 'input[name*="mobile" i]',
                    'input[placeholder*="mobile" i]'
                ],
                "value": user_data.get('phone', '')
            },
            # LinkedIn URL
            {
                "selectors": [
                    'input[name="linkedin"]', 'input[name="linkedinUrl"]', 'input[name="linkedin_url"]',
                    '#linkedin', 'input[placeholder*="linkedin" i]', 'input[aria-label*="linkedin" i]',
                    'input[id*="linkedin" i]', 'input[name*="social" i]',
                    'input[placeholder*="linkedin.com" i]'
                ],
                "value": user_data.get('linkedin_url', '')
            },
            # Location / City
            {
                "selectors": [
                    'input[name="location"]', 'input[name="city"]', '#location', '#city',
                    'input[placeholder*="location" i]', 'input[placeholder*="city" i]',
                    'input[aria-label*="location" i]', 'input[id*="location" i]',
                    'input[id*="city" i]'
                ],
                "value": user_data.get('location', '')
            },
            # Address / Street Address
            {
                "selectors": [
                    'input[name="address"]', 'input[name="streetAddress"]', 'input[name="street"]',
                    '#address', '#streetAddress', 'input[placeholder*="address" i]',
                    'input[placeholder*="street" i]', 'input[aria-label*="address" i]',
                    'input[autocomplete="street-address"]', 'input[id*="address" i]'
                ],
                "value": user_data.get('address', user_data.get('location', ''))
            },
            # State
            {
                "selectors": [
                    'input[name="state"]', 'input[name="region"]', '#state',
                    'input[placeholder*="state" i]', 'input[aria-label*="state" i]',
                    'input[autocomplete="address-level1"]'
                ],
                "value": user_data.get('state', '')
            },
            # Zip/Postal Code
            {
                "selectors": [
                    'input[name="zip"]', 'input[name="zipCode"]', 'input[name="postalCode"]',
                    '#zip', '#zipCode', '#postalCode', 'input[placeholder*="zip" i]',
                    'input[placeholder*="postal" i]', 'input[autocomplete="postal-code"]',
                    'input[id*="zip" i]', 'input[type="text"][maxlength="5"]'
                ],
                "value": user_data.get('zip_code', '')
            },
            # Country
            {
                "selectors": [
                    'input[name="country"]', '#country', 'input[placeholder*="country" i]',
                    'input[autocomplete="country-name"]'
                ],
                "value": user_data.get('country', 'United States')
            },
            # Current company
            {
                "selectors": [
                    'input[name="company"]', 'input[name="currentCompany"]', 'input[name="current_company"]',
                    '#company', 'input[placeholder*="company" i]', 'input[aria-label*="company" i]',
                    'input[placeholder*="current employer" i]', 'input[id*="company" i]'
                ],
                "value": user_data.get('current_company', '')
            },
            # Current title / Position
            {
                "selectors": [
                    'input[name="title"]', 'input[name="currentTitle"]', 'input[name="job_title"]',
                    '#title', 'input[placeholder*="title" i]', 'input[placeholder*="position" i]',
                    'input[aria-label*="title" i]', 'input[placeholder*="current role" i]',
                    'input[id*="title" i]', 'input[id*="position" i]'
                ],
                "value": user_data.get('job_title', '')
            },
            # Website/Portfolio
            {
                "selectors": [
                    'input[name="website"]', 'input[name="portfolio"]', 'input[name="personal_website"]',
                    '#website', '#portfolio', 'input[placeholder*="website" i]',
                    'input[placeholder*="portfolio" i]', 'input[type="url"]',
                    'input[aria-label*="website" i]'
                ],
                "value": user_data.get('website', user_data.get('portfolio_url', ''))
            },
            # GitHub
            {
                "selectors": [
                    'input[name="github"]', 'input[name="githubUrl"]', '#github',
                    'input[placeholder*="github" i]', 'input[aria-label*="github" i]'
                ],
                "value": user_data.get('github_url', '')
            },
            # Years of experience
            {
                "selectors": [
                    'input[name="experience"]', 'input[name="years_experience"]',
                    'input[name="yearsOfExperience"]', '#experience',
                    'input[placeholder*="years" i][placeholder*="experience" i]',
                    'input[aria-label*="experience" i]'
                ],
                "value": user_data.get('years_experience', '')
            },
        ]
        
        for config in field_configs:
            if await self.wait_and_fill(config["selectors"], config["value"], timeout=2000):
                filled_fields.append(config["selectors"][0])
        
        # Handle dropdowns for common required fields
        await self._fill_common_dropdowns(user_data)
                
        return filled_fields
    
    async def _fill_common_dropdowns(self, user_data: Dict):
        """Fill common dropdown fields like work authorization, gender, etc."""
        
        # Work authorization dropdown
        work_auth_selectors = [
            'select[name*="authorization" i]', 'select[name*="work_auth" i]',
            'select[name*="legal" i]', 'select[id*="authorization" i]',
            '[data-qa*="authorization"]'
        ]
        
        for selector in work_auth_selectors:
            try:
                dropdown = self.page.locator(selector).first
                if await dropdown.count() > 0:
                    # Try to select "Yes" or affirmative option
                    await dropdown.select_option(label="Yes")
                    self.log(f"Selected work authorization: Yes")
                    break
            except:
                try:
                    # Try clicking radio buttons for work authorization
                    yes_options = [
                        'input[type="radio"][value*="yes" i]',
                        'label:has-text("authorized to work")',
                        'label:has-text("Yes, I am")'
                    ]
                    for opt in yes_options:
                        el = self.page.locator(opt).first
                        if await el.count() > 0:
                            await el.click(force=True)
                            self.log("Clicked work authorization yes option")
                            break
                except:
                    continue
        
        # Sponsorship dropdown (usually "No" means doesn't need sponsorship)
        sponsorship_selectors = [
            'select[name*="sponsor" i]', 'select[id*="sponsor" i]',
            '[data-qa*="sponsor"]'
        ]
        
        for selector in sponsorship_selectors:
            try:
                dropdown = self.page.locator(selector).first
                if await dropdown.count() > 0:
                    await dropdown.select_option(label="No")
                    self.log("Selected sponsorship: No")
                    break
            except:
                try:
                    no_options = [
                        'input[type="radio"][name*="sponsor" i][value*="no" i]',
                        'label:has-text("do not require")'
                    ]
                    for opt in no_options:
                        el = self.page.locator(opt).first
                        if await el.count() > 0:
                            await el.click(force=True)
                            self.log("Clicked sponsorship no option")
                            break
                except:
                    continue
        
        # Gender (Decline to answer is safest)
        gender_value = user_data.get('gender', 'Decline')
        gender_selectors = [
            'select[name*="gender" i]', 'select[id*="gender" i]'
        ]
        
        for selector in gender_selectors:
            try:
                dropdown = self.page.locator(selector).first
                if await dropdown.count() > 0:
                    # Try "Decline to self-identify" first, then actual value
                    try:
                        await dropdown.select_option(label="Decline to self-identify")
                    except:
                        try:
                            await dropdown.select_option(label="Prefer not to say")
                        except:
                            await dropdown.select_option(label=gender_value)
                    self.log("Selected gender option")
                    break
            except:
                continue
        
        # Veteran status (usually "No" or "Decline")
        veteran_selectors = [
            'select[name*="veteran" i]', 'select[id*="veteran" i]'
        ]
        
        for selector in veteran_selectors:
            try:
                dropdown = self.page.locator(selector).first
                if await dropdown.count() > 0:
                    try:
                        await dropdown.select_option(label="I am not a veteran")
                    except:
                        try:
                            await dropdown.select_option(label="No")
                        except:
                            await dropdown.select_option(label="Decline to self-identify")
                    self.log("Selected veteran status")
                    break
            except:
                continue
        
        # Disability status (usually "Decline")
        disability_selectors = [
            'select[name*="disability" i]', 'select[id*="disability" i]'
        ]
        
        for selector in disability_selectors:
            try:
                dropdown = self.page.locator(selector).first
                if await dropdown.count() > 0:
                    try:
                        await dropdown.select_option(label="Decline to self-identify")
                    except:
                        await dropdown.select_option(label="I don't wish to answer")
                    self.log("Selected disability status")
                    break
            except:
                continue
        
        # Race/Ethnicity (usually "Decline")
        race_selectors = [
            'select[name*="race" i]', 'select[name*="ethnicity" i]',
            'select[id*="race" i]', 'select[id*="ethnicity" i]'
        ]
        
        for selector in race_selectors:
            try:
                dropdown = self.page.locator(selector).first
                if await dropdown.count() > 0:
                    try:
                        await dropdown.select_option(label="Decline to self-identify")
                    except:
                        await dropdown.select_option(label="Prefer not to say")
                    self.log("Selected race/ethnicity option")
                    break
            except:
                continue
        
    async def _upload_resume(self, resume_path: str) -> bool:
        """Try to upload resume using various selectors"""
        if not resume_path or not os.path.exists(resume_path):
            self.log(f"Resume path invalid or doesn't exist: {resume_path}")
            return False
            
        upload_selectors = [
            'input[type="file"][accept*=".pdf"]',
            'input[type="file"][accept*=".doc"]',
            'input[type="file"][name*="resume" i]',
            'input[type="file"][name*="cv" i]',
            'input[type="file"][id*="resume" i]',
            'input[type="file"][id*="cv" i]',
            'input[type="file"][data-qa*="resume" i]',
            'input[type="file"]',  # Generic fallback
        ]
        
        for selector in upload_selectors:
            try:
                file_input = self.page.locator(selector).first
                if await file_input.count() > 0:
                    await file_input.set_input_files(resume_path)
                    self.log(f"Uploaded resume using selector: {selector}")
                    await asyncio.sleep(2)  # Wait for upload
                    return True
            except Exception as e:
                self.log(f"Resume upload failed with {selector}: {str(e)}")
                continue
                
        self.log("No file upload field found")
        return False
        
    async def _fill_cover_letter(self, cover_letter: str) -> bool:
        """Try to fill cover letter field"""
        if not cover_letter:
            return False
            
        cover_letter_selectors = [
            'textarea[name*="cover" i]',
            'textarea[name*="letter" i]',
            'textarea[id*="cover" i]',
            '#coverLetter', '#cover_letter', '#cover-letter',
            'textarea[placeholder*="cover letter" i]',
            'textarea[aria-label*="cover letter" i]',
            'textarea[data-qa*="cover" i]',
            '.cover-letter textarea',
            'textarea[name="message"]',
            'textarea[name="comments"]',
            'div[contenteditable="true"][aria-label*="cover" i]',
        ]
        
        for selector in cover_letter_selectors:
            try:
                element = self.page.locator(selector).first
                if await element.count() > 0 and await element.is_visible():
                    await element.fill(cover_letter)
                    self.log(f"Filled cover letter using selector: {selector}")
                    return True
            except Exception:
                continue
                
        self.log("No cover letter field found")
        return False
        
    async def _detect_success(self) -> Tuple[bool, str]:
        """Detect if submission was successful by looking for confirmation indicators"""
        # Wait a moment for any animations/transitions
        await asyncio.sleep(1)
        
        success_patterns = [
            # Thank you messages
            ('text="Thank you"', 'thank_you'),
            ('text="Thanks for applying"', 'thanks_applying'),
            ('text="Thank you for applying"', 'thank_applying'),
            ('text="Thank you for your application"', 'thank_application'),
            ('text="Thank you for your interest"', 'thank_interest'),
            # Submission confirmations
            ('text="Application submitted"', 'submitted'),
            ('text="Successfully submitted"', 'success'),
            ('text="Your application has been submitted"', 'app_submitted'),
            ('text="Application Submitted Successfully"', 'success_submitted'),
            # Received confirmations
            ('text="received your application"', 'received'),
            ('text="application has been received"', 'received'),
            ("text=\"We've received your application\"", 'we_received'),
            ('text="We have received your application"', 'have_received'),
            # Applied confirmations
            ('text="You have applied"', 'applied'),
            ('text="You have successfully applied"', 'success_applied'),
            ('text="Application complete"', 'complete'),
            ('text="Your application is complete"', 'app_complete'),
            # Next steps
            ('text="What happens next"', 'next_steps'),
            ("text=\"We'll be in touch\"", 'in_touch'),
            ('text="We will review"', 'will_review'),
            # CSS class indicators
            ('.confirmation', 'confirmation_class'),
            ('.success-message', 'success_class'),
            ('.confirmation-message', 'confirmation_msg'),
            ('.application-confirmation', 'app_confirmation'),
            ('.thank-you', 'thank_you_class'),
            # Data attribute indicators
            ('[data-qa="confirmation"]', 'confirmation_qa'),
            ('[data-testid="confirmation"]', 'confirmation_testid'),
            ('[data-automation-id="confirmation"]', 'confirmation_automation'),
            # Heading indicators
            ('h1:has-text("Thank")', 'thank_heading'),
            ('h2:has-text("Thank")', 'thank_heading_h2'),
            ('h1:has-text("Application")', 'application_heading'),
            ('h1:has-text("Submitted")', 'submitted_heading'),
            ('h1:has-text("Success")', 'success_heading'),
        ]
        
        for selector, indicator in success_patterns:
            try:
                if await self.page.locator(selector).count() > 0:
                    self.log(f"Success detected via: {indicator}")
                    # Take confirmation screenshot
                    await self.take_screenshot(f"confirmation_{indicator}")
                    return True, indicator
            except:
                continue
        
        # Also check URL for common success indicators
        current_url = self.page.url.lower()
        url_success_indicators = ['thank', 'success', 'confirm', 'complete', 'submitted']
        for indicator in url_success_indicators:
            if indicator in current_url:
                self.log(f"Success detected via URL containing: {indicator}")
                return True, f"url_{indicator}"
                
        return False, "none"
        
    async def _click_submit_button(self) -> bool:
        """Try to find and click the submit button with platform-aware selectors"""
        submit_selectors = [
            # Specific submit buttons
            'button[type="submit"]',
            'input[type="submit"]',
            
            # Text-based buttons
            'button:has-text("Submit Application")',
            'button:has-text("Submit")',
            'button:has-text("Apply Now")',
            'button:has-text("Apply")',
            'button:has-text("Send Application")',
            'button:has-text("Complete Application")',
            'button:has-text("Finish")',
            
            # Data attribute based
            '[data-qa="submit-application"]',
            '[data-testid="submit-button"]',
            '[data-testid="apply-button"]',
            '[aria-label="Submit application"]',
            '[aria-label="Submit"]',
            
            # Class-based
            '.submit-btn',
            '.apply-btn',
            '.btn-submit',
            '.button--submit',
            '#submit-application',
            '#submit-btn',
            
            # Link-based apply buttons
            'a:has-text("Submit Application")',
            'a:has-text("Apply")',
        ]
        
        for selector in submit_selectors:
            try:
                button = self.page.locator(selector).first
                if await button.count() > 0:
                    is_visible = await button.is_visible()
                    is_enabled = await button.is_enabled()
                    
                    if is_visible and is_enabled:
                        await button.scroll_into_view_if_needed()
                        await asyncio.sleep(0.5)
                        await button.click(force=True)
                        self.log(f"Clicked submit button: {selector}")
                        await asyncio.sleep(3)  # Wait for submission
                        return True
            except Exception as e:
                self.log(f"Submit attempt failed with {selector}: {str(e)}")
                continue
                
        self.log("No submit button found")
        return False

    # ==================== PLATFORM-SPECIFIC HANDLERS ====================

    async def _apply_greenhouse(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on Greenhouse ATS - specific handling"""
        try:
            result["status"] = "filling_form"
            self.log("Starting Greenhouse application")
            
            # Greenhouse-specific selectors for fields
            gh_field_mappings = [
                # First name
                (['#first_name', 'input[name="job_application[first_name]"]', 
                  'input[autocomplete="given-name"]'], user_data.get('first_name', '')),
                # Last name
                (['#last_name', 'input[name="job_application[last_name]"]',
                  'input[autocomplete="family-name"]'], user_data.get('last_name', '')),
                # Email
                (['#email', 'input[name="job_application[email]"]', 
                  'input[type="email"]'], user_data.get('email', '')),
                # Phone
                (['#phone', 'input[name="job_application[phone]"]',
                  'input[type="tel"]'], user_data.get('phone', '')),
                # LinkedIn
                (['input[name*="linkedin" i]', 'input[placeholder*="LinkedIn" i]'], 
                 user_data.get('linkedin_url', '')),
                # Location
                (['input[name*="location" i]', '#location'], user_data.get('location', '')),
            ]
            
            filled_count = 0
            for selectors, value in gh_field_mappings:
                if value and await self.wait_and_fill(selectors, value, timeout=2000):
                    filled_count += 1
                    
            result["form_filled"] = filled_count > 0
            self.log(f"Filled {filled_count} Greenhouse fields")
            
            # Upload resume - Greenhouse uses data-qa attributes
            if resume_path:
                gh_resume_selectors = [
                    'input[type="file"][data-source="attach"]',
                    'input[type="file"][id="resume_upload"]',
                    'input[type="file"][name="job_application[resume]"]',
                    'input[type="file"]'
                ]
                
                for selector in gh_resume_selectors:
                    try:
                        file_input = self.page.locator(selector).first
                        if await file_input.count() > 0:
                            await file_input.set_input_files(resume_path)
                            self.log(f"Greenhouse resume uploaded via: {selector}")
                            await asyncio.sleep(2)
                            break
                    except:
                        continue
                        
            # Fill cover letter if there's a field
            if cover_letter:
                await self._fill_cover_letter(cover_letter)
                
            # Take screenshot before submit
            form_screenshot = await self.take_screenshot("greenhouse_form_filled")
            result["screenshots"].append(form_screenshot)
            
            # Greenhouse submit button selectors
            gh_submit_selectors = [
                'button[type="submit"]',
                'input[type="submit"][value="Submit Application"]',
                'input[type="submit"]',
                '#submit_app',
                'button:has-text("Submit Application")',
                'button:has-text("Submit")',
            ]
            
            submitted = await self.wait_and_click(gh_submit_selectors, timeout=5000)
            
            if submitted:
                await asyncio.sleep(3)
                
                # Check for success
                is_success, indicator = await self._detect_success()
                
                confirmation_screenshot = await self.take_screenshot("greenhouse_submitted")
                result["screenshots"].append(confirmation_screenshot)
                
                if is_success:
                    result["success"] = True
                    result["status"] = "submitted"
                    result["submitted_at"] = datetime.now(timezone.utc).isoformat()
                    self.log(f"Greenhouse submission successful: {indicator}")
                else:
                    # Check for errors
                    error_text = await self._get_error_messages()
                    if error_text:
                        result["status"] = "validation_error"
                        result["error"] = error_text
                    else:
                        result["success"] = True
                        result["status"] = "submitted_unconfirmed"
                        result["submitted_at"] = datetime.now(timezone.utc).isoformat()
            else:
                result["status"] = "submit_button_not_found"
                
        except Exception as e:
            self.log(f"Greenhouse error: {str(e)}")
            result["error"] = str(e)
            result["status"] = "error"
            
        return result

    async def _apply_lever(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on Lever ATS - specific handling"""
        try:
            result["status"] = "filling_form"
            self.log("Starting Lever application")
            
            # Wait for Lever's dynamic form to load
            await asyncio.sleep(2)
            
            # Lever-specific field selectors
            lever_fields = [
                # Full name
                (['input[name="name"]', 'input[placeholder*="Full name" i]', 
                  '#name'], user_data.get('full_name', '')),
                # Email
                (['input[name="email"]', 'input[type="email"]', '#email'], 
                 user_data.get('email', '')),
                # Phone
                (['input[name="phone"]', 'input[type="tel"]', '#phone'], 
                 user_data.get('phone', '')),
                # Current company
                (['input[name="org"]', 'input[placeholder*="Current company" i]'], 
                 user_data.get('current_company', '')),
                # LinkedIn
                (['input[name*="linkedin" i]', 'input[placeholder*="LinkedIn" i]'], 
                 user_data.get('linkedin_url', '')),
                # Location
                (['input[name="location"]', '#location'], user_data.get('location', '')),
            ]
            
            filled_count = 0
            for selectors, value in lever_fields:
                if value and await self.wait_and_fill(selectors, value, timeout=2000):
                    filled_count += 1
                    
            result["form_filled"] = filled_count > 0
            self.log(f"Filled {filled_count} Lever fields")
            
            # Lever resume upload
            if resume_path:
                lever_upload_selectors = [
                    'input[type="file"][name="resume"]',
                    'input.file-input',
                    'input[type="file"]'
                ]
                
                for selector in lever_upload_selectors:
                    try:
                        file_input = self.page.locator(selector).first
                        if await file_input.count() > 0:
                            await file_input.set_input_files(resume_path)
                            self.log(f"Lever resume uploaded via: {selector}")
                            await asyncio.sleep(2)
                            break
                    except:
                        continue
                        
            # Cover letter for Lever
            if cover_letter:
                lever_cl_selectors = [
                    'textarea[name="comments"]',
                    'textarea[placeholder*="Add a cover letter" i]',
                    'textarea'
                ]
                for selector in lever_cl_selectors:
                    try:
                        element = self.page.locator(selector).first
                        if await element.count() > 0 and await element.is_visible():
                            await element.fill(cover_letter)
                            self.log("Lever cover letter filled")
                            break
                    except:
                        continue
                        
            # Take screenshot
            form_screenshot = await self.take_screenshot("lever_form_filled")
            result["screenshots"].append(form_screenshot)
            
            # Lever submit buttons
            lever_submit_selectors = [
                'button.postings-btn',
                'button[type="submit"]',
                'button:has-text("Submit application")',
                'button:has-text("Submit")',
                '.btn-send',
            ]
            
            submitted = await self.wait_and_click(lever_submit_selectors, timeout=5000)
            
            if submitted:
                await asyncio.sleep(3)
                
                is_success, indicator = await self._detect_success()
                
                confirmation_screenshot = await self.take_screenshot("lever_submitted")
                result["screenshots"].append(confirmation_screenshot)
                
                if is_success:
                    result["success"] = True
                    result["status"] = "submitted"
                    result["submitted_at"] = datetime.now(timezone.utc).isoformat()
                else:
                    error_text = await self._get_error_messages()
                    if error_text:
                        result["status"] = "validation_error"
                        result["error"] = error_text
                    else:
                        result["success"] = True
                        result["status"] = "submitted_unconfirmed"
                        result["submitted_at"] = datetime.now(timezone.utc).isoformat()
            else:
                result["status"] = "submit_button_not_found"
                
        except Exception as e:
            self.log(f"Lever error: {str(e)}")
            result["error"] = str(e)
            result["status"] = "error"
            
        return result

    async def _apply_workday(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on Workday - multi-step process"""
        try:
            result["status"] = "filling_form"
            self.log("Starting Workday application")
            
            # Workday has complex multi-step forms
            # First, try to click "Apply" button if on job listing page
            apply_buttons = [
                'button[data-automation-id="jobPostingApplyButton"]',
                'button:has-text("Apply")',
                'a:has-text("Apply")',
            ]
            await self.wait_and_click(apply_buttons, timeout=5000)
            await asyncio.sleep(3)
            
            # Workday might ask for login - check and note
            login_check = self.page.locator('input[type="password"], [data-automation-id="signIn"]')
            if await login_check.count() > 0:
                self.log("Workday requires authentication")
                result["status"] = "requires_login"
                result["error"] = "Workday requires account creation/login"
                screenshot = await self.take_screenshot("workday_login_required")
                result["screenshots"].append(screenshot)
                return result
                
            # Try manual apply if available
            manual_apply = ['button:has-text("Apply Manually")', 'a:has-text("Manual Application")']
            await self.wait_and_click(manual_apply, timeout=3000)
            await asyncio.sleep(2)
            
            # Workday field selectors
            workday_fields = [
                (['input[data-automation-id="firstName"]', '#firstName'], user_data.get('first_name', '')),
                (['input[data-automation-id="lastName"]', '#lastName'], user_data.get('last_name', '')),
                (['input[data-automation-id="email"]', '#email'], user_data.get('email', '')),
                (['input[data-automation-id="phone"]', '#phone'], user_data.get('phone', '')),
            ]
            
            filled_count = 0
            for selectors, value in workday_fields:
                if value and await self.wait_and_fill(selectors, value, timeout=2000):
                    filled_count += 1
                    
            result["form_filled"] = filled_count > 0
            
            # Resume upload for Workday
            if resume_path:
                workday_upload = [
                    'input[data-automation-id="resumeUpload"]',
                    'input[type="file"]'
                ]
                for selector in workday_upload:
                    try:
                        file_input = self.page.locator(selector).first
                        if await file_input.count() > 0:
                            await file_input.set_input_files(resume_path)
                            self.log("Workday resume uploaded")
                            await asyncio.sleep(2)
                            break
                    except:
                        continue
                        
            form_screenshot = await self.take_screenshot("workday_form_filled")
            result["screenshots"].append(form_screenshot)
            
            # Workday submit - often "Next" then "Submit"
            next_buttons = ['button:has-text("Next")', 'button:has-text("Continue")']
            if await self.wait_and_click(next_buttons, timeout=3000):
                await asyncio.sleep(2)
                
            submit_buttons = [
                'button[data-automation-id="submitButton"]',
                'button:has-text("Submit")',
                'button:has-text("Submit Application")',
            ]
            
            submitted = await self.wait_and_click(submit_buttons, timeout=5000)
            
            if submitted:
                await asyncio.sleep(3)
                is_success, _ = await self._detect_success()
                confirmation_screenshot = await self.take_screenshot("workday_submitted")
                result["screenshots"].append(confirmation_screenshot)
                
                result["success"] = is_success
                result["status"] = "submitted" if is_success else "submitted_unconfirmed"
                result["submitted_at"] = datetime.now(timezone.utc).isoformat()
            else:
                result["status"] = "submit_button_not_found"
                
        except Exception as e:
            self.log(f"Workday error: {str(e)}")
            result["error"] = str(e)
            result["status"] = "error"
            
        return result

    async def _apply_smartrecruiters(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on SmartRecruiters"""
        try:
            result["status"] = "filling_form"
            self.log("Starting SmartRecruiters application")
            
            # Click Apply if on listing page
            await self.wait_and_click(['button.apply-btn', 'button:has-text("Apply")'], timeout=5000)
            await asyncio.sleep(2)
            
            # SmartRecruiters fields
            sr_fields = [
                (['input[name="firstName"]', '#firstName'], user_data.get('first_name', '')),
                (['input[name="lastName"]', '#lastName'], user_data.get('last_name', '')),
                (['input[name="email"]', '#email'], user_data.get('email', '')),
                (['input[name="phone"]', '#phone'], user_data.get('phone', '')),
            ]
            
            filled_count = 0
            for selectors, value in sr_fields:
                if value and await self.wait_and_fill(selectors, value, timeout=2000):
                    filled_count += 1
                    
            result["form_filled"] = filled_count > 0
            
            if resume_path:
                await self._upload_resume(resume_path)
                
            if cover_letter:
                await self._fill_cover_letter(cover_letter)
                
            form_screenshot = await self.take_screenshot("smartrecruiters_form_filled")
            result["screenshots"].append(form_screenshot)
            
            submitted = await self._click_submit_button()
            
            if submitted:
                await asyncio.sleep(3)
                is_success, _ = await self._detect_success()
                confirmation_screenshot = await self.take_screenshot("smartrecruiters_submitted")
                result["screenshots"].append(confirmation_screenshot)
                
                result["success"] = is_success or True  # Assume success if clicked
                result["status"] = "submitted" if is_success else "submitted_unconfirmed"
                result["submitted_at"] = datetime.now(timezone.utc).isoformat()
            else:
                result["status"] = "submit_button_not_found"
                
        except Exception as e:
            self.log(f"SmartRecruiters error: {str(e)}")
            result["error"] = str(e)
            result["status"] = "error"
            
        return result

    async def _apply_ashby(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on Ashby ATS"""
        try:
            result["status"] = "filling_form"
            self.log("Starting Ashby application")
            
            # Ashby uses modern React forms
            await asyncio.sleep(2)
            
            # Fill fields
            filled = await self._fill_common_fields(user_data)
            result["form_filled"] = len(filled) > 0
            
            if resume_path:
                await self._upload_resume(resume_path)
                
            if cover_letter:
                await self._fill_cover_letter(cover_letter)
                
            form_screenshot = await self.take_screenshot("ashby_form_filled")
            result["screenshots"].append(form_screenshot)
            
            # Ashby submit
            ashby_submit = [
                'button[type="submit"]',
                'button:has-text("Submit")',
                'button:has-text("Apply")',
            ]
            
            submitted = await self.wait_and_click(ashby_submit, timeout=5000)
            
            if submitted:
                await asyncio.sleep(3)
                is_success, _ = await self._detect_success()
                confirmation_screenshot = await self.take_screenshot("ashby_submitted")
                result["screenshots"].append(confirmation_screenshot)
                
                result["success"] = is_success or True
                result["status"] = "submitted" if is_success else "submitted_unconfirmed"
                result["submitted_at"] = datetime.now(timezone.utc).isoformat()
            else:
                result["status"] = "submit_button_not_found"
                
        except Exception as e:
            self.log(f"Ashby error: {str(e)}")
            result["error"] = str(e)
            result["status"] = "error"
            
        return result

    async def _apply_breezy(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on BreezyHR"""
        try:
            result["status"] = "filling_form"
            self.log("Starting BreezyHR application")
            
            # Fill common fields
            filled = await self._fill_common_fields(user_data)
            result["form_filled"] = len(filled) > 0
            
            if resume_path:
                await self._upload_resume(resume_path)
                
            if cover_letter:
                await self._fill_cover_letter(cover_letter)
                
            form_screenshot = await self.take_screenshot("breezy_form_filled")
            result["screenshots"].append(form_screenshot)
            
            submitted = await self._click_submit_button()
            
            if submitted:
                await asyncio.sleep(3)
                is_success, _ = await self._detect_success()
                confirmation_screenshot = await self.take_screenshot("breezy_submitted")
                result["screenshots"].append(confirmation_screenshot)
                
                result["success"] = is_success or True
                result["status"] = "submitted" if is_success else "submitted_unconfirmed"
                result["submitted_at"] = datetime.now(timezone.utc).isoformat()
            else:
                result["status"] = "submit_button_not_found"
                
        except Exception as e:
            self.log(f"BreezyHR error: {str(e)}")
            result["error"] = str(e)
            result["status"] = "error"
            
        return result

    async def _apply_icims(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on iCIMS ATS - popular enterprise ATS"""
        try:
            result["status"] = "filling_form"
            self.log("Starting iCIMS application")
            
            # iCIMS often has multi-step forms
            await asyncio.sleep(2)
            
            # Click Apply if on listing page
            apply_buttons = [
                'button:has-text("Apply")',
                'a:has-text("Apply Now")',
                'a:has-text("Apply for this job")',
                '#icims_apply',
            ]
            await self.wait_and_click(apply_buttons, timeout=5000)
            await asyncio.sleep(2)
            
            # iCIMS field selectors
            icims_fields = [
                (['input[name*="firstName" i]', '#firstName', 'input[id*="first" i]'], user_data.get('first_name', '')),
                (['input[name*="lastName" i]', '#lastName', 'input[id*="last" i]'], user_data.get('last_name', '')),
                (['input[name*="email" i]', '#email', 'input[type="email"]'], user_data.get('email', '')),
                (['input[name*="phone" i]', '#phone', 'input[type="tel"]'], user_data.get('phone', '')),
                (['input[name*="address" i]', '#address'], user_data.get('address', user_data.get('location', ''))),
                (['input[name*="city" i]', '#city'], user_data.get('city', '')),
                (['input[name*="zip" i]', '#zipCode', '#postalCode'], user_data.get('zip_code', '')),
            ]
            
            filled_count = 0
            for selectors, value in icims_fields:
                if value and await self.wait_and_fill(selectors, value, timeout=2000):
                    filled_count += 1
            
            # Handle dropdowns
            await self._fill_common_dropdowns(user_data)
            
            result["form_filled"] = filled_count > 0
            self.log(f"Filled {filled_count} iCIMS fields")
            
            # iCIMS resume upload
            if resume_path:
                icims_upload = [
                    'input[type="file"][name*="resume" i]',
                    'input[type="file"][id*="resume" i]',
                    'input[type="file"][accept*=".pdf"]',
                    'input[type="file"]'
                ]
                for selector in icims_upload:
                    try:
                        file_input = self.page.locator(selector).first
                        if await file_input.count() > 0:
                            await file_input.set_input_files(resume_path)
                            self.log(f"iCIMS resume uploaded via: {selector}")
                            await asyncio.sleep(2)
                            break
                    except:
                        continue
            
            if cover_letter:
                await self._fill_cover_letter(cover_letter)
                
            form_screenshot = await self.take_screenshot("icims_form_filled")
            result["screenshots"].append(form_screenshot)
            
            # iCIMS often has "Continue" or "Next" buttons
            next_buttons = ['button:has-text("Continue")', 'button:has-text("Next")', 'input[type="submit"]']
            for _ in range(3):  # Try up to 3 pages
                clicked = await self.wait_and_click(next_buttons, timeout=3000)
                if not clicked:
                    break
                await asyncio.sleep(2)
                # Check if we reached submit
                submit_check = self.page.locator('button:has-text("Submit")')
                if await submit_check.count() > 0:
                    break
            
            # Final submit
            icims_submit = [
                'button:has-text("Submit Application")',
                'button:has-text("Submit")',
                'input[type="submit"][value*="Submit" i]',
                'button[type="submit"]',
            ]
            
            submitted = await self.wait_and_click(icims_submit, timeout=5000)
            
            if submitted:
                await asyncio.sleep(3)
                is_success, _ = await self._detect_success()
                confirmation_screenshot = await self.take_screenshot("icims_submitted")
                result["screenshots"].append(confirmation_screenshot)
                
                result["success"] = is_success
                result["status"] = "submitted" if is_success else "submitted_unconfirmed"
                result["submitted_at"] = datetime.now(timezone.utc).isoformat()
            else:
                result["status"] = "submit_button_not_found"
                
        except Exception as e:
            self.log(f"iCIMS error: {str(e)}")
            result["error"] = str(e)
            result["status"] = "error"
            
        return result

    async def _apply_job_board(self, platform: str, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Handle major job boards that require authentication"""
        result["status"] = "requires_login"
        result["error"] = f"{platform.title()} requires authentication. Please apply directly through the {platform.title()} website or use the direct apply link."
        
        screenshot = await self.take_screenshot(f"{platform}_login_required")
        result["screenshots"].append(screenshot)
        
        # Try to find direct apply link
        direct_links = [
            'a:has-text("Apply on company site")',
            'a:has-text("Apply directly")',
            'a[href*="apply"]',
        ]
        
        for selector in direct_links:
            try:
                link = self.page.locator(selector).first
                if await link.count() > 0:
                    href = await link.get_attribute('href')
                    if href:
                        result["redirect_url"] = href
                        self.log(f"Found direct apply link: {href}")
                        break
            except:
                continue
                
        return result

    async def _apply_remote_board(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Apply to jobs on remote job boards (RemoteOK, Remotive, etc.)"""
        try:
            result["status"] = "redirect_to_company"
            self.log("Processing remote job board listing")
            
            # First, try to close any popup overlays (common on Remotive)
            popup_close_selectors = [
                'button[aria-label="Close"]',
                'button:has-text("×")',
                'button:has-text("Close")',
                '.modal-close',
                '[data-dismiss="modal"]',
                'button.close',
                'div[role="dialog"] button',
            ]
            for selector in popup_close_selectors:
                try:
                    close_btn = self.page.locator(selector).first
                    if await close_btn.count() > 0 and await close_btn.is_visible():
                        await close_btn.click(force=True)
                        self.log(f"Closed popup using: {selector}")
                        await asyncio.sleep(1)
                        break
                except:
                    continue
            
            screenshot = await self.take_screenshot("remote_board_listing")
            result["screenshots"].append(screenshot)
            
            # Scroll down to reveal apply buttons that might be hidden
            await self.page.evaluate('window.scrollBy(0, 500)')
            await asyncio.sleep(0.5)
            
            # Try to extract apply links directly from the DOM (even if not visible)
            external_apply_link = None
            
            dom_links = await self.page.evaluate('''
                () => {
                    const links = [];
                    // Find all links with external apply URLs
                    document.querySelectorAll('a[href*="apply"], a[href*="jobs."], a[href*="greenhouse"], a[href*="lever"]').forEach(el => {
                        const href = el.href;
                        // Prefer external links (not the same domain)
                        if (href && !href.includes('remotive.com') && !href.includes('remoteok.com') && !href.startsWith('#')) {
                            links.push({
                                href: href,
                                text: el.textContent.trim().substring(0, 50)
                            });
                        }
                    });
                    return links;
                }
            ''')
            
            # Check for external apply links from DOM first
            if dom_links:
                for link in dom_links:
                    href = link.get('href', '')
                    if href and ('apply' in href.lower() or 'jobs.' in href.lower()):
                        external_apply_link = href
                        self.log(f"Found external link from DOM: {href[:80]}...")
                        break
            
            # Fallback to traditional selector approach if no external link found
            if not external_apply_link:
                # Enhanced apply button selectors - ordered by specificity
                apply_buttons = [
                    # Remotive specific
                    'a[href*="jobs."][href*="apply"]',  # External apply links
                    'a:has-text("Apply for this position")',
                    'a.btn:has-text("Apply")',
                    'button:has-text("Apply for this position")',
                    # RemoteOK specific
                    'a.apply-btn',
                    'a[data-job-apply]',
                    # Generic
                    'a:has-text("Apply Now")',
                    'a:has-text("Apply")',
                    'button:has-text("Apply Now")',
                    'button:has-text("Apply")',
                    '.apply-button a',
                    '.apply-button',
                    'a[href*="apply"]',
                ]
            
                # First pass: find all apply links and prefer external ones
                for selector in apply_buttons:
                    try:
                        elements = self.page.locator(selector)
                        count = await elements.count()
                        
                        for i in range(min(count, 5)):  # Check up to 5 matches
                            element = elements.nth(i)
                            if await element.is_visible():
                                href = await element.get_attribute('href')
                                
                                if href:
                                    # Prefer external links (not staying on remotive/remoteok)
                                    is_external = not ('remotive.com' in href.lower() or 
                                                      'remoteok.com' in href.lower() or
                                                      href.startswith('#') or
                                                      href.startswith('/'))
                                    
                                    self.log(f"Found link: {href[:80]}... (external={is_external})")
                                    
                                    if is_external:
                                        external_apply_link = href
                                        break
                                    elif not external_apply_link:
                                        # Store as fallback
                                        external_apply_link = href
                                        
                    except Exception as e:
                        self.log(f"Selector check failed for {selector}: {str(e)}")
                        continue
                    
                    if external_apply_link and ('remotive.com' not in external_apply_link.lower() and 
                                                'remoteok.com' not in external_apply_link.lower()):
                        break
            
            if external_apply_link:
                result["redirect_url"] = external_apply_link
                self.log(f"Following apply link: {external_apply_link}")
                
                try:
                    # Navigate to the actual application
                    await self.page.goto(external_apply_link, wait_until='domcontentloaded', timeout=30000)
                    await asyncio.sleep(3)
                    
                    # Check the new URL
                    new_url = self.page.url
                    self.log(f"Now on: {new_url}")
                    
                    # Take screenshot after redirect
                    redirect_screenshot = await self.take_screenshot("remote_board_redirected")
                    result["screenshots"].append(redirect_screenshot)
                    
                    # Detect the platform and apply
                    new_platform = self.detect_platform(new_url)
                    result["platform"] = new_platform
                    self.log(f"Redirected to platform: {new_platform}")
                    
                    if new_platform == 'greenhouse':
                        return await self._apply_greenhouse(user_data, resume_path, cover_letter, result)
                    elif new_platform == 'lever':
                        return await self._apply_lever(user_data, resume_path, cover_letter, result)
                    elif new_platform == 'workday':
                        return await self._apply_workday(user_data, resume_path, cover_letter, result)
                    elif new_platform == 'smartrecruiters':
                        return await self._apply_smartrecruiters(user_data, resume_path, cover_letter, result)
                    elif new_platform == 'ashby':
                        return await self._apply_ashby(user_data, resume_path, cover_letter, result)
                    elif new_platform in ['linkedin', 'indeed', 'glassdoor']:
                        return await self._apply_job_board(new_platform, user_data, resume_path, cover_letter, result)
                    else:
                        return await self._apply_generic(user_data, resume_path, cover_letter, result)
                        
                except Exception as e:
                    self.log(f"Failed to navigate to apply link: {str(e)}")
                    result["error"] = f"Failed to access application page: {str(e)}"
                    result["status"] = "navigation_failed"
                    return result
            else:
                self.log("No apply link found on page")
                result["status"] = "manual_apply_required"
                result["error"] = "Could not find apply button. Manual application may be required."
            
        except Exception as e:
            self.log(f"Remote board error: {str(e)}")
            result["error"] = str(e)
            result["status"] = "error"
            
        return result

    async def _apply_generic(self, user_data: Dict, resume_path: str, cover_letter: str, result: Dict) -> Dict:
        """Generic application handler for unknown platforms"""
        try:
            result["status"] = "filling_form"
            self.log("Starting generic application flow")
            
            # First look for an "Apply" button if we're on a job listing page
            apply_entry_buttons = [
                'button:has-text("Apply Now")',
                'button:has-text("Apply")',
                'a:has-text("Apply Now")',
                'a:has-text("Apply")',
                '.apply-btn',
                '#apply-button',
            ]
            
            clicked_apply = await self.wait_and_click(apply_entry_buttons, timeout=3000)
            if clicked_apply:
                await asyncio.sleep(2)
                self.log("Clicked apply entry button")
                
            # Fill all possible form fields
            filled = await self._fill_common_fields(user_data)
            result["form_filled"] = len(filled) > 0
            self.log(f"Filled {len(filled)} generic fields")
            
            # Upload resume
            if resume_path:
                resume_uploaded = await self._upload_resume(resume_path)
                self.log(f"Resume upload: {'success' if resume_uploaded else 'no field found'}")
                
            # Fill cover letter
            if cover_letter:
                cl_filled = await self._fill_cover_letter(cover_letter)
                self.log(f"Cover letter: {'filled' if cl_filled else 'no field found'}")
                
            # Take screenshot of filled form
            form_screenshot = await self.take_screenshot("generic_form_filled")
            result["screenshots"].append(form_screenshot)
            
            # Try to submit
            submitted = await self._click_submit_button()
            
            if submitted:
                await asyncio.sleep(3)
                
                # Check for success indicators
                is_success, indicator = await self._detect_success()
                
                confirmation_screenshot = await self.take_screenshot("generic_submitted")
                result["screenshots"].append(confirmation_screenshot)
                
                # Check for error messages
                error_text = await self._get_error_messages()
                
                if is_success:
                    result["success"] = True
                    result["status"] = "submitted"
                    result["submitted_at"] = datetime.now(timezone.utc).isoformat()
                    self.log(f"Generic submission successful via: {indicator}")
                elif error_text:
                    result["status"] = "validation_error"
                    result["error"] = error_text
                    self.log(f"Form validation error: {error_text}")
                else:
                    # Assume success if we clicked submit and no errors
                    result["success"] = True
                    result["status"] = "submitted_unconfirmed"
                    result["submitted_at"] = datetime.now(timezone.utc).isoformat()
                    self.log("Submit clicked, assuming success (unconfirmed)")
            else:
                result["status"] = "submit_button_not_found"
                self.log("Could not find submit button")
                
        except Exception as e:
            self.log(f"Generic application error: {str(e)}")
            result["error"] = str(e)
            result["status"] = "error"
            
        return result

    async def _get_error_messages(self) -> Optional[str]:
        """Try to find and return any error messages on the page"""
        error_selectors = [
            '.error-message',
            '.error',
            '.validation-error',
            '[role="alert"]',
            '.form-error',
            '.field-error',
            '.invalid-feedback',
            'span.error',
            'div.error',
        ]
        
        errors = []
        for selector in error_selectors:
            try:
                elements = self.page.locator(selector)
                count = await elements.count()
                for i in range(min(count, 3)):  # Limit to 3 errors
                    text = await elements.nth(i).text_content()
                    if text and text.strip():
                        errors.append(text.strip())
            except:
                continue
                
        return "; ".join(errors) if errors else None


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
