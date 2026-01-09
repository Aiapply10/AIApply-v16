"""
Job Scraper Module - Fetches real-time jobs from Indeed, Dice, and other job boards
"""
import httpx
import asyncio
import re
import json
import hashlib
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from typing import List, Dict, Optional
import logging
import urllib.parse

logger = logging.getLogger(__name__)

class JobScraper:
    """Web scraper for fetching jobs from multiple job boards"""
    
    def __init__(self):
        self.ua = UserAgent()
        self.timeout = 30.0
        
    def _get_headers(self) -> dict:
        """Generate random headers to avoid detection"""
        return {
            'User-Agent': self.ua.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
    
    def _generate_job_id(self, title: str, company: str, location: str) -> str:
        """Generate a unique job ID from job details"""
        unique_str = f"{title}_{company}_{location}".lower()
        return f"scrape_{hashlib.md5(unique_str.encode()).hexdigest()[:12]}"
    
    async def scrape_indeed(self, query: str, location: str = "United States", limit: int = 15) -> List[Dict]:
        """
        Scrape jobs from Indeed
        """
        jobs = []
        encoded_query = urllib.parse.quote(query)
        encoded_location = urllib.parse.quote(location)
        
        # Indeed search URL
        url = f"https://www.indeed.com/jobs?q={encoded_query}&l={encoded_location}&sort=date"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code != 200:
                    logger.warning(f"Indeed returned status {response.status_code}")
                    return []
                
                soup = BeautifulSoup(response.text, 'lxml')
                
                # Find job cards - Indeed uses various class patterns
                job_cards = soup.find_all('div', class_=re.compile(r'job_seen_beacon|cardOutline|resultContent'))
                
                if not job_cards:
                    # Try alternative selectors
                    job_cards = soup.find_all('div', {'data-jk': True})
                
                for card in job_cards[:limit]:
                    try:
                        # Extract job title
                        title_elem = card.find(['h2', 'a'], class_=re.compile(r'jobTitle|jcs-JobTitle'))
                        title = title_elem.get_text(strip=True) if title_elem else None
                        
                        if not title:
                            title_elem = card.find('a', {'data-jk': True})
                            title = title_elem.get_text(strip=True) if title_elem else None
                        
                        if not title:
                            continue
                        
                        # Extract company name
                        company_elem = card.find(['span', 'div'], class_=re.compile(r'companyName|company'))
                        company = company_elem.get_text(strip=True) if company_elem else "Company Not Listed"
                        
                        # Extract location
                        location_elem = card.find(['div', 'span'], class_=re.compile(r'companyLocation|location'))
                        job_location = location_elem.get_text(strip=True) if location_elem else location
                        
                        # Extract salary if available
                        salary_elem = card.find(['div', 'span'], class_=re.compile(r'salary|estimated-salary|salaryOnly'))
                        salary = salary_elem.get_text(strip=True) if salary_elem else None
                        
                        # Extract job snippet/description
                        desc_elem = card.find(['div', 'td'], class_=re.compile(r'job-snippet|summary'))
                        description = desc_elem.get_text(strip=True) if desc_elem else ""
                        
                        # Get job URL
                        link_elem = card.find('a', href=True)
                        job_url = None
                        if link_elem:
                            href = link_elem.get('href', '')
                            if href.startswith('/'):
                                job_url = f"https://www.indeed.com{href}"
                            elif href.startswith('http'):
                                job_url = href
                        
                        # Check for remote
                        is_remote = 'remote' in job_location.lower() or 'remote' in title.lower()
                        
                        jobs.append({
                            "job_id": self._generate_job_id(title, company, job_location),
                            "title": title,
                            "company": company,
                            "company_logo": f"https://ui-avatars.com/api/?name={urllib.parse.quote(company[:2])}&background=6366f1&color=fff",
                            "location": job_location,
                            "description": description[:500] + "..." if len(description) > 500 else description,
                            "salary_info": salary,
                            "apply_link": job_url,
                            "posted_at": datetime.now(timezone.utc).isoformat(),
                            "is_remote": is_remote,
                            "employment_type": "Full-time",
                            "source": "Indeed",
                            "matched_technology": query
                        })
                        
                    except Exception as e:
                        logger.error(f"Error parsing Indeed job card: {e}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error scraping Indeed: {e}")
        
        return jobs
    
    async def scrape_dice(self, query: str, location: str = "United States", limit: int = 15) -> List[Dict]:
        """
        Scrape jobs from Dice (tech-focused job board)
        """
        jobs = []
        encoded_query = urllib.parse.quote(query)
        
        # Dice API endpoint (they have a public search)
        url = f"https://www.dice.com/jobs?q={encoded_query}&countryCode=US&radius=30&radiusUnit=mi&page=1&pageSize={limit}&filters.postedDate=ONE"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code != 200:
                    logger.warning(f"Dice returned status {response.status_code}")
                    return []
                
                soup = BeautifulSoup(response.text, 'lxml')
                
                # Dice uses data attributes for job cards
                job_cards = soup.find_all('div', class_=re.compile(r'card-title-link|search-card'))
                
                if not job_cards:
                    job_cards = soup.find_all('dhi-search-card')
                
                for card in job_cards[:limit]:
                    try:
                        # Extract job title
                        title_elem = card.find('a', class_=re.compile(r'card-title-link'))
                        if not title_elem:
                            title_elem = card.find('h5') or card.find('a', href=re.compile(r'/job-detail/'))
                        
                        title = title_elem.get_text(strip=True) if title_elem else None
                        if not title:
                            continue
                        
                        # Extract company
                        company_elem = card.find(['span', 'a'], class_=re.compile(r'card-company|companyName'))
                        company = company_elem.get_text(strip=True) if company_elem else "Company Not Listed"
                        
                        # Extract location
                        location_elem = card.find(['span', 'div'], class_=re.compile(r'card-location|search-result-location'))
                        job_location = location_elem.get_text(strip=True) if location_elem else "United States"
                        
                        # Get job URL
                        job_url = None
                        if title_elem and title_elem.get('href'):
                            href = title_elem.get('href')
                            if href.startswith('/'):
                                job_url = f"https://www.dice.com{href}"
                            else:
                                job_url = href
                        
                        # Check for remote
                        is_remote = 'remote' in job_location.lower() or 'remote' in title.lower()
                        
                        jobs.append({
                            "job_id": self._generate_job_id(title, company, job_location),
                            "title": title,
                            "company": company,
                            "company_logo": f"https://ui-avatars.com/api/?name={urllib.parse.quote(company[:2])}&background=ec4899&color=fff",
                            "location": job_location,
                            "description": f"Tech position at {company}. Click to view full job description.",
                            "salary_info": None,
                            "apply_link": job_url,
                            "posted_at": datetime.now(timezone.utc).isoformat(),
                            "is_remote": is_remote,
                            "employment_type": "Full-time",
                            "source": "Dice",
                            "matched_technology": query
                        })
                        
                    except Exception as e:
                        logger.error(f"Error parsing Dice job card: {e}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error scraping Dice: {e}")
        
        return jobs
    
    async def scrape_remoteok(self, query: str, limit: int = 15) -> List[Dict]:
        """
        Scrape jobs from RemoteOK (remote jobs focus)
        """
        jobs = []
        
        # RemoteOK has a JSON API
        url = "https://remoteok.com/api"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                headers = self._get_headers()
                headers['Accept'] = 'application/json'
                
                response = await client.get(url, headers=headers)
                
                if response.status_code != 200:
                    logger.warning(f"RemoteOK returned status {response.status_code}")
                    return []
                
                data = response.json()
                
                # Filter by query
                query_lower = query.lower()
                filtered_jobs = [
                    job for job in data[1:] if isinstance(job, dict) and (
                        query_lower in job.get('position', '').lower() or
                        query_lower in ' '.join(job.get('tags', [])).lower() or
                        query_lower in job.get('company', '').lower() or
                        query_lower in job.get('description', '').lower()
                    )
                ][:limit]
                
                for job in filtered_jobs:
                    try:
                        title = job.get('position', 'Unknown Position')
                        company = job.get('company', 'Company Not Listed')
                        
                        # Parse salary
                        salary_info = None
                        if job.get('salary_min') and job.get('salary_max'):
                            salary_info = f"${job['salary_min']:,} - ${job['salary_max']:,}"
                        
                        jobs.append({
                            "job_id": f"remoteok_{job.get('id', self._generate_job_id(title, company, 'Remote'))}",
                            "title": title,
                            "company": company,
                            "company_logo": job.get('company_logo') or f"https://ui-avatars.com/api/?name={urllib.parse.quote(company[:2])}&background=14b8a6&color=fff",
                            "location": job.get('location', 'Remote'),
                            "description": job.get('description', '')[:500] + "..." if len(job.get('description', '')) > 500 else job.get('description', ''),
                            "salary_info": salary_info,
                            "salary_min": job.get('salary_min'),
                            "salary_max": job.get('salary_max'),
                            "apply_link": job.get('url', f"https://remoteok.com/remote-jobs/{job.get('slug', '')}"),
                            "posted_at": job.get('date', datetime.now(timezone.utc).isoformat()),
                            "is_remote": True,
                            "employment_type": "Full-time",
                            "source": "RemoteOK",
                            "matched_technology": query,
                            "tags": job.get('tags', [])
                        })
                        
                    except Exception as e:
                        logger.error(f"Error parsing RemoteOK job: {e}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error scraping RemoteOK: {e}")
        
        return jobs
    
    async def scrape_github_jobs(self, query: str, location: str = "", limit: int = 15) -> List[Dict]:
        """
        Scrape jobs from GitHub Jobs alternative sources (since GitHub Jobs is deprecated)
        Using Arbeitnow API as it's free and has tech jobs
        """
        jobs = []
        
        # Arbeitnow API (free, no auth required)
        url = f"https://www.arbeitnow.com/api/job-board-api"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code != 200:
                    logger.warning(f"Arbeitnow returned status {response.status_code}")
                    return []
                
                data = response.json()
                all_jobs = data.get('data', [])
                
                # Filter by query
                query_lower = query.lower()
                filtered_jobs = [
                    job for job in all_jobs if (
                        query_lower in job.get('title', '').lower() or
                        query_lower in ' '.join(job.get('tags', [])).lower() or
                        query_lower in job.get('company_name', '').lower() or
                        query_lower in job.get('description', '').lower()
                    )
                ][:limit]
                
                for job in filtered_jobs:
                    try:
                        title = job.get('title', 'Unknown Position')
                        company = job.get('company_name', 'Company Not Listed')
                        job_location = job.get('location', 'Remote')
                        
                        jobs.append({
                            "job_id": f"arbeit_{job.get('slug', self._generate_job_id(title, company, job_location))}",
                            "title": title,
                            "company": company,
                            "company_logo": f"https://ui-avatars.com/api/?name={urllib.parse.quote(company[:2])}&background=f59e0b&color=fff",
                            "location": job_location,
                            "description": job.get('description', '')[:500] + "..." if len(job.get('description', '')) > 500 else job.get('description', ''),
                            "salary_info": None,
                            "apply_link": job.get('url', ''),
                            "posted_at": job.get('created_at', datetime.now(timezone.utc).isoformat()),
                            "is_remote": job.get('remote', False),
                            "employment_type": job.get('job_types', ['Full-time'])[0] if job.get('job_types') else 'Full-time',
                            "source": "Arbeitnow",
                            "matched_technology": query,
                            "tags": job.get('tags', [])
                        })
                        
                    except Exception as e:
                        logger.error(f"Error parsing Arbeitnow job: {e}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error scraping Arbeitnow: {e}")
        
        return jobs
    
    async def scrape_all_sources(self, query: str, location: str = "United States", limit_per_source: int = 10) -> List[Dict]:
        """
        Scrape jobs from all available sources concurrently
        """
        # Run all scrapers concurrently
        results = await asyncio.gather(
            self.scrape_indeed(query, location, limit_per_source),
            self.scrape_dice(query, location, limit_per_source),
            self.scrape_remoteok(query, limit_per_source),
            self.scrape_github_jobs(query, location, limit_per_source),
            return_exceptions=True
        )
        
        all_jobs = []
        source_names = ['Indeed', 'Dice', 'RemoteOK', 'Arbeitnow']
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error from {source_names[i]}: {result}")
            elif isinstance(result, list):
                all_jobs.extend(result)
                logger.info(f"Got {len(result)} jobs from {source_names[i]}")
        
        # Remove duplicates based on job_id
        seen_ids = set()
        unique_jobs = []
        for job in all_jobs:
            if job['job_id'] not in seen_ids:
                seen_ids.add(job['job_id'])
                unique_jobs.append(job)
        
        return unique_jobs


# Create singleton instance
job_scraper = JobScraper()
