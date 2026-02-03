"""
Browser Automation Module - Multi-tool support for job application submission
Supports: Playwright (primary), Selenium (fallback)
"""
import asyncio
import os
import logging
import re
from datetime import datetime, timezone
from typing import Dict, Optional, List, Tuple
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

# Directory to store screenshots
SCREENSHOTS_DIR = "/app/backend/screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

# Check available automation tools
PLAYWRIGHT_AVAILABLE = False
SELENIUM_AVAILABLE = False

try:
    from playwright.async_api import async_playwright, Page, Browser, TimeoutError as PlaywrightTimeout
    PLAYWRIGHT_AVAILABLE = True
    logger.info("Playwright is available")
except ImportError:
    async_playwright = None
    Page = None
    Browser = None
    PlaywrightTimeout = TimeoutError
    logger.warning("Playwright not available")

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.chrome.service import Service as ChromeService
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    from webdriver_manager.chrome import ChromeDriverManager
    SELENIUM_AVAILABLE = True
    logger.info("Selenium is available")
except ImportError:
    logger.warning("Selenium not available")


def get_available_automation_tool() -> str:
    """Get the best available automation tool"""
    if PLAYWRIGHT_AVAILABLE:
        return "playwright"
    elif SELENIUM_AVAILABLE:
        return "selenium"
    return "none"


def is_automation_available() -> bool:
    """Check if any browser automation is available"""
    return PLAYWRIGHT_AVAILABLE or SELENIUM_AVAILABLE


class BaseBrowserBot(ABC):
    """Abstract base class for browser automation bots"""
    
    def __init__(self):
        self.debug_logs: List[str] = []
        
    def log(self, message: str):
        """Add to debug logs"""
        timestamp = datetime.now(timezone.utc).strftime('%H:%M:%S')
        log_entry = f"[{timestamp}] {message}"
        self.debug_logs.append(log_entry)
        logger.info(message)
    
    @abstractmethod
    async def start(self):
        """Initialize the browser"""
        pass
    
    @abstractmethod
    async def stop(self):
        """Close the browser"""
        pass
    
    @abstractmethod
    async def navigate(self, url: str) -> bool:
        """Navigate to a URL"""
        pass
    
    @abstractmethod
    async def fill_field(self, selectors: List[str], value: str) -> bool:
        """Fill a form field"""
        pass
    
    @abstractmethod
    async def click_element(self, selectors: List[str]) -> bool:
        """Click an element"""
        pass
    
    @abstractmethod
    async def take_screenshot(self, name: str) -> str:
        """Take a screenshot and return the path"""
        pass
    
    @abstractmethod
    async def get_page_text(self) -> str:
        """Get the page text content"""
        pass


class PlaywrightBot(BaseBrowserBot):
    """Playwright-based browser automation"""
    
    def __init__(self):
        super().__init__()
        self.browser = None
        self.context = None
        self.page = None
        self.playwright = None
        
    async def start(self):
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright not available")
        
        if os.path.exists('/pw-browsers'):
            os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/pw-browsers'
        
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        self.page = await self.context.new_page()
        self.log("Playwright browser started")
        
    async def stop(self):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        self.log("Playwright browser stopped")
        
    async def navigate(self, url: str) -> bool:
        try:
            await self.page.goto(url, timeout=30000)
            await self.page.wait_for_load_state('networkidle', timeout=10000)
            self.log(f"Navigated to: {url}")
            return True
        except Exception as e:
            self.log(f"Navigation failed: {str(e)}")
            return False
    
    async def fill_field(self, selectors: List[str], value: str) -> bool:
        if not value:
            return False
        for selector in selectors:
            try:
                element = self.page.locator(selector).first
                await element.wait_for(state="visible", timeout=3000)
                await element.fill(value)
                self.log(f"Filled field: {selector}")
                return True
            except:
                continue
        return False
    
    async def click_element(self, selectors: List[str]) -> bool:
        for selector in selectors:
            try:
                element = self.page.locator(selector).first
                await element.wait_for(state="visible", timeout=3000)
                await element.click(force=True)
                self.log(f"Clicked: {selector}")
                return True
            except:
                continue
        return False
    
    async def take_screenshot(self, name: str) -> str:
        path = os.path.join(SCREENSHOTS_DIR, f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")
        await self.page.screenshot(path=path)
        self.log(f"Screenshot saved: {path}")
        return path
    
    async def get_page_text(self) -> str:
        return await self.page.content()


class SeleniumBot(BaseBrowserBot):
    """Selenium-based browser automation (fallback)"""
    
    def __init__(self):
        super().__init__()
        self.driver = None
        
    async def start(self):
        if not SELENIUM_AVAILABLE:
            raise RuntimeError("Selenium not available")
        
        options = ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-setuid-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        try:
            # Try to use webdriver-manager to get Chrome driver
            service = ChromeService(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)
        except Exception as e:
            # Fallback to system Chrome
            self.driver = webdriver.Chrome(options=options)
        
        self.log("Selenium browser started")
        
    async def stop(self):
        if self.driver:
            self.driver.quit()
        self.log("Selenium browser stopped")
        
    async def navigate(self, url: str) -> bool:
        try:
            self.driver.get(url)
            await asyncio.sleep(2)  # Wait for page load
            self.log(f"Navigated to: {url}")
            return True
        except Exception as e:
            self.log(f"Navigation failed: {str(e)}")
            return False
    
    async def fill_field(self, selectors: List[str], value: str) -> bool:
        if not value:
            return False
        for selector in selectors:
            try:
                # Convert CSS selector for Selenium
                element = WebDriverWait(self.driver, 3).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                element.clear()
                element.send_keys(value)
                self.log(f"Filled field: {selector}")
                return True
            except:
                continue
        return False
    
    async def click_element(self, selectors: List[str]) -> bool:
        for selector in selectors:
            try:
                element = WebDriverWait(self.driver, 3).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                )
                element.click()
                self.log(f"Clicked: {selector}")
                return True
            except:
                continue
        return False
    
    async def take_screenshot(self, name: str) -> str:
        path = os.path.join(SCREENSHOTS_DIR, f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")
        self.driver.save_screenshot(path)
        self.log(f"Screenshot saved: {path}")
        return path
    
    async def get_page_text(self) -> str:
        return self.driver.page_source


class UnifiedApplicationBot:
    """
    Unified job application bot with automatic fallback between automation tools.
    Uses Playwright as primary, Selenium as fallback.
    """
    
    def __init__(self):
        self.bot: Optional[BaseBrowserBot] = None
        self.tool_used: str = "none"
        self.debug_logs: List[str] = []
        
    def log(self, message: str):
        timestamp = datetime.now(timezone.utc).strftime('%H:%M:%S')
        log_entry = f"[{timestamp}] {message}"
        self.debug_logs.append(log_entry)
        logger.info(message)
        
    async def start(self) -> bool:
        """Start browser with automatic fallback"""
        # Try Playwright first
        if PLAYWRIGHT_AVAILABLE:
            try:
                self.bot = PlaywrightBot()
                await self.bot.start()
                self.tool_used = "playwright"
                self.log("Using Playwright for automation")
                return True
            except Exception as e:
                self.log(f"Playwright failed to start: {str(e)}")
        
        # Fallback to Selenium
        if SELENIUM_AVAILABLE:
            try:
                self.bot = SeleniumBot()
                await self.bot.start()
                self.tool_used = "selenium"
                self.log("Using Selenium for automation (fallback)")
                return True
            except Exception as e:
                self.log(f"Selenium failed to start: {str(e)}")
        
        self.log("No browser automation available")
        return False
    
    async def stop(self):
        if self.bot:
            await self.bot.stop()
            self.debug_logs.extend(self.bot.debug_logs)
            
    async def apply_to_job(
        self,
        apply_url: str,
        user_data: Dict,
        resume_content: str = "",
        cover_letter: str = "",
        resume_path: str = None
    ) -> Dict:
        """
        Apply to a job using browser automation.
        Returns a dict with status and details.
        """
        result = {
            "success": False,
            "status": "error",
            "message": "",
            "tool_used": self.tool_used,
            "screenshots": [],
            "debug_logs": []
        }
        
        if not self.bot:
            result["message"] = "Browser not started"
            return result
        
        try:
            # Navigate to job page
            if not await self.bot.navigate(apply_url):
                result["message"] = "Failed to navigate to job page"
                result["status"] = "navigation_failed"
                return result
            
            # Take initial screenshot
            screenshot = await self.bot.take_screenshot("initial")
            result["screenshots"].append(screenshot)
            
            # Detect platform type
            platform = self._detect_platform(apply_url)
            self.log(f"Detected platform: {platform}")
            
            # Fill the application form based on platform
            if platform == "greenhouse":
                success = await self._fill_greenhouse_form(user_data, resume_content, cover_letter)
            elif platform == "lever":
                success = await self._fill_lever_form(user_data, resume_content, cover_letter)
            elif platform == "workday":
                success = await self._fill_workday_form(user_data, resume_content, cover_letter)
            else:
                success = await self._fill_generic_form(user_data, resume_content, cover_letter)
            
            # Take post-fill screenshot
            screenshot = await self.bot.take_screenshot("filled")
            result["screenshots"].append(screenshot)
            
            if not success:
                result["message"] = "Failed to fill application form"
                result["status"] = "form_fill_failed"
                return result
            
            # Try to submit the form
            submit_success = await self._submit_form()
            
            # Take final screenshot
            await asyncio.sleep(2)
            screenshot = await self.bot.take_screenshot("submitted")
            result["screenshots"].append(screenshot)
            
            if submit_success:
                # Check for confirmation
                page_text = await self.bot.get_page_text()
                if self._check_submission_confirmation(page_text):
                    result["success"] = True
                    result["status"] = "submitted"
                    result["message"] = "Application submitted successfully"
                else:
                    result["success"] = True
                    result["status"] = "submitted_unconfirmed"
                    result["message"] = "Form submitted but confirmation not detected"
            else:
                result["status"] = "submission_failed"
                result["message"] = "Failed to submit application form"
            
        except Exception as e:
            result["message"] = f"Error during application: {str(e)}"
            result["status"] = "error"
            self.log(f"Application error: {str(e)}")
        
        result["debug_logs"] = self.debug_logs + (self.bot.debug_logs if self.bot else [])
        return result
    
    def _detect_platform(self, url: str) -> str:
        """Detect the job platform from URL"""
        url_lower = url.lower()
        if 'greenhouse.io' in url_lower or 'boards.greenhouse' in url_lower:
            return 'greenhouse'
        elif 'lever.co' in url_lower or 'jobs.lever' in url_lower:
            return 'lever'
        elif 'myworkdayjobs' in url_lower or 'workday' in url_lower:
            return 'workday'
        elif 'smartrecruiters' in url_lower:
            return 'smartrecruiters'
        elif 'icims' in url_lower:
            return 'icims'
        elif 'linkedin.com' in url_lower:
            return 'linkedin'
        elif 'indeed.com' in url_lower:
            return 'indeed'
        elif 'dice.com' in url_lower:
            return 'dice'
        elif 'remoteok' in url_lower or 'remotive' in url_lower:
            return 'remote_board'
        return 'generic'
    
    async def _fill_greenhouse_form(self, user_data: Dict, resume: str, cover_letter: str) -> bool:
        """Fill Greenhouse application form"""
        self.log("Filling Greenhouse form")
        
        # Common Greenhouse selectors
        name_filled = await self.bot.fill_field(
            ['input[name="first_name"]', '#first_name', 'input[aria-label*="First"]'],
            user_data.get('first_name', user_data.get('name', '').split()[0] if user_data.get('name') else '')
        )
        
        await self.bot.fill_field(
            ['input[name="last_name"]', '#last_name', 'input[aria-label*="Last"]'],
            user_data.get('last_name', user_data.get('name', '').split()[-1] if user_data.get('name') else '')
        )
        
        await self.bot.fill_field(
            ['input[name="email"]', '#email', 'input[type="email"]'],
            user_data.get('email', '')
        )
        
        await self.bot.fill_field(
            ['input[name="phone"]', '#phone', 'input[type="tel"]'],
            user_data.get('phone', '')
        )
        
        # LinkedIn profile
        await self.bot.fill_field(
            ['input[name*="linkedin"]', 'input[aria-label*="LinkedIn"]'],
            user_data.get('linkedin_profile', '')
        )
        
        # Cover letter (if textarea exists)
        if cover_letter:
            await self.bot.fill_field(
                ['textarea[name*="cover"]', '#cover_letter', 'textarea[aria-label*="Cover"]'],
                cover_letter
            )
        
        return name_filled
    
    async def _fill_lever_form(self, user_data: Dict, resume: str, cover_letter: str) -> bool:
        """Fill Lever application form"""
        self.log("Filling Lever form")
        
        name_filled = await self.bot.fill_field(
            ['input[name="name"]', 'input[aria-label*="Full name"]'],
            user_data.get('name', '')
        )
        
        await self.bot.fill_field(
            ['input[name="email"]', 'input[type="email"]'],
            user_data.get('email', '')
        )
        
        await self.bot.fill_field(
            ['input[name="phone"]', 'input[type="tel"]'],
            user_data.get('phone', '')
        )
        
        await self.bot.fill_field(
            ['input[name*="linkedin"]', 'input[name="urls[LinkedIn]"]'],
            user_data.get('linkedin_profile', '')
        )
        
        if cover_letter:
            await self.bot.fill_field(
                ['textarea[name*="comments"]', 'textarea[name="comments"]'],
                cover_letter
            )
        
        return name_filled
    
    async def _fill_workday_form(self, user_data: Dict, resume: str, cover_letter: str) -> bool:
        """Fill Workday application form"""
        self.log("Filling Workday form")
        
        # Workday forms are complex - try common patterns
        name_filled = await self.bot.fill_field(
            ['input[data-automation-id*="firstName"]', 'input[id*="firstName"]'],
            user_data.get('first_name', user_data.get('name', '').split()[0] if user_data.get('name') else '')
        )
        
        await self.bot.fill_field(
            ['input[data-automation-id*="lastName"]', 'input[id*="lastName"]'],
            user_data.get('last_name', user_data.get('name', '').split()[-1] if user_data.get('name') else '')
        )
        
        await self.bot.fill_field(
            ['input[data-automation-id*="email"]', 'input[type="email"]'],
            user_data.get('email', '')
        )
        
        await self.bot.fill_field(
            ['input[data-automation-id*="phone"]', 'input[type="tel"]'],
            user_data.get('phone', '')
        )
        
        return name_filled
    
    async def _fill_generic_form(self, user_data: Dict, resume: str, cover_letter: str) -> bool:
        """Fill generic application form with common selectors"""
        self.log("Filling generic form")
        
        # Try various common form field patterns
        name = user_data.get('name', '')
        first_name = user_data.get('first_name', name.split()[0] if name else '')
        last_name = user_data.get('last_name', name.split()[-1] if name else '')
        
        # Name fields
        name_filled = await self.bot.fill_field([
            'input[name*="name" i]', 'input[id*="name" i]', 
            'input[placeholder*="name" i]', 'input[aria-label*="name" i]'
        ], name)
        
        if not name_filled:
            await self.bot.fill_field([
                'input[name*="first" i]', 'input[id*="first" i]',
                'input[placeholder*="first" i]'
            ], first_name)
            await self.bot.fill_field([
                'input[name*="last" i]', 'input[id*="last" i]',
                'input[placeholder*="last" i]'
            ], last_name)
        
        # Email
        await self.bot.fill_field([
            'input[type="email"]', 'input[name*="email" i]',
            'input[id*="email" i]', 'input[placeholder*="email" i]'
        ], user_data.get('email', ''))
        
        # Phone
        await self.bot.fill_field([
            'input[type="tel"]', 'input[name*="phone" i]',
            'input[id*="phone" i]', 'input[placeholder*="phone" i]'
        ], user_data.get('phone', ''))
        
        # LinkedIn
        await self.bot.fill_field([
            'input[name*="linkedin" i]', 'input[id*="linkedin" i]',
            'input[placeholder*="linkedin" i]'
        ], user_data.get('linkedin_profile', ''))
        
        # Cover letter
        if cover_letter:
            await self.bot.fill_field([
                'textarea[name*="cover" i]', 'textarea[id*="cover" i]',
                'textarea[placeholder*="cover" i]', 'textarea[name*="message" i]'
            ], cover_letter)
        
        return True
    
    async def _submit_form(self) -> bool:
        """Try to submit the application form"""
        submit_selectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Submit")',
            'button:has-text("Apply")',
            'button:has-text("Send")',
            'button[class*="submit" i]',
            'button[id*="submit" i]',
            'a:has-text("Submit")',
            '.btn-submit',
            '#submit-btn',
            '[data-testid*="submit"]'
        ]
        
        return await self.bot.click_element(submit_selectors)
    
    def _check_submission_confirmation(self, page_text: str) -> bool:
        """Check if page contains submission confirmation"""
        confirmation_patterns = [
            r'thank\s*you',
            r'application\s*(has\s*been\s*)?submitted',
            r'successfully\s*(submitted|applied)',
            r'received\s*your\s*application',
            r'application\s*received',
            r'we\'ll\s*be\s*in\s*touch',
            r'confirmation',
            r'applied\s*successfully'
        ]
        
        page_lower = page_text.lower()
        for pattern in confirmation_patterns:
            if re.search(pattern, page_lower):
                return True
        return False


async def apply_to_job_with_fallback(
    apply_url: str,
    user_data: Dict,
    resume_content: str = "",
    cover_letter: str = "",
    resume_path: str = None
) -> Dict:
    """
    Main entry point for job application with automatic fallback.
    Uses Playwright first, falls back to Selenium if needed.
    """
    if not is_automation_available():
        return {
            "success": False,
            "status": "no_automation",
            "message": "No browser automation tools available (Playwright and Selenium both unavailable)",
            "tool_used": "none",
            "screenshots": [],
            "debug_logs": []
        }
    
    bot = UnifiedApplicationBot()
    try:
        started = await bot.start()
        if not started:
            return {
                "success": False,
                "status": "browser_start_failed",
                "message": "Failed to start any browser automation tool",
                "tool_used": "none",
                "screenshots": [],
                "debug_logs": bot.debug_logs
            }
        
        result = await bot.apply_to_job(
            apply_url=apply_url,
            user_data=user_data,
            resume_content=resume_content,
            cover_letter=cover_letter,
            resume_path=resume_path
        )
        return result
        
    finally:
        await bot.stop()
