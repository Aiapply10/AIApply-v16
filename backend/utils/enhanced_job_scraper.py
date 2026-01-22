"""
Enhanced Job Scraper Module - Fetches real-time jobs from multiple FREE sources
Sources: Arbeitnow, Remotive, RemoteOK, HN Who's Hiring, FindWork.dev, Jobicy
Focus: US-based and Remote opportunities
"""
import httpx
import asyncio
import re
import json
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
import logging
import urllib.parse
import os

logger = logging.getLogger(__name__)

# Cache for job results to reduce API calls
_job_cache = {}
_cache_duration = timedelta(minutes=15)

# Technology synonyms and related terms for better matching
TECH_SYNONYMS = {
    'react': ['react', 'reactjs', 'react.js', 'frontend', 'front-end', 'javascript', 'typescript', 'next.js', 'nextjs'],
    'python': ['python', 'django', 'flask', 'fastapi', 'data science', 'machine learning', 'ml', 'ai', 'backend'],
    'java': ['java', 'spring', 'spring boot', 'springboot', 'j2ee', 'jvm', 'kotlin', 'backend'],
    'javascript': ['javascript', 'js', 'node', 'nodejs', 'node.js', 'typescript', 'ts', 'frontend', 'backend', 'fullstack'],
    'node': ['node', 'nodejs', 'node.js', 'express', 'javascript', 'typescript', 'backend'],
    'angular': ['angular', 'angularjs', 'frontend', 'front-end', 'typescript', 'javascript'],
    'vue': ['vue', 'vuejs', 'vue.js', 'nuxt', 'frontend', 'front-end', 'javascript'],
    'golang': ['golang', 'go', 'backend'],
    'rust': ['rust', 'systems', 'backend'],
    'devops': ['devops', 'sre', 'kubernetes', 'k8s', 'docker', 'aws', 'azure', 'gcp', 'cloud', 'infrastructure'],
    'aws': ['aws', 'amazon', 'cloud', 'devops', 'infrastructure'],
    'data': ['data', 'analytics', 'data science', 'data engineer', 'etl', 'sql', 'python', 'machine learning'],
    'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
    'fullstack': ['fullstack', 'full-stack', 'full stack', 'backend', 'frontend'],
    'backend': ['backend', 'back-end', 'server', 'api', 'microservices'],
    'frontend': ['frontend', 'front-end', 'ui', 'ux', 'web', 'react', 'angular', 'vue'],
    'software': ['software', 'developer', 'engineer', 'programming', 'coding'],
    '.net': ['.net', 'dotnet', 'c#', 'csharp', 'asp.net', 'microsoft'],
    'php': ['php', 'laravel', 'symfony', 'wordpress', 'backend'],
    'ruby': ['ruby', 'rails', 'ruby on rails', 'backend'],
}


class EnhancedJobScraper:
    """Enhanced web scraper for fetching jobs from multiple FREE job boards"""
    
    def __init__(self):
        self.timeout = 25.0
    
    def _get_search_terms(self, query: str) -> List[str]:
        """Get list of search terms including synonyms for better matching"""
        query_lower = query.lower().strip()
        
        # Start with the original query
        terms = [query_lower]
        
        # Add synonyms if available
        for key, synonyms in TECH_SYNONYMS.items():
            if key in query_lower or query_lower in key:
                terms.extend(synonyms)
                break
            for syn in synonyms:
                if query_lower in syn or syn in query_lower:
                    terms.extend(synonyms)
                    break
        
        # Remove duplicates while preserving order
        seen = set()
        unique_terms = []
        for term in terms:
            if term not in seen:
                seen.add(term)
                unique_terms.append(term)
        
        return unique_terms
    
    def _matches_query(self, job: Dict, search_terms: List[str]) -> bool:
        """Check if a job matches any of the search terms"""
        # Collect all searchable text from the job
        searchable_fields = [
            job.get('title', ''),
            job.get('description', ''),
            job.get('category', ''),
            job.get('company', ''),
            job.get('company_name', ''),
        ]
        
        # Add tags if present
        tags = job.get('tags', [])
        if isinstance(tags, list):
            searchable_fields.extend(tags)
        
        # Join and lowercase for searching
        searchable_text = ' '.join(str(f) for f in searchable_fields).lower()
        
        # Check if any search term matches
        for term in search_terms:
            if term in searchable_text:
                return True
        
        return False
        
    def _get_headers(self) -> dict:
        """Generate headers for requests - no gzip to avoid decoding issues"""
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    
    def _generate_job_id(self, title: str, company: str, source: str) -> str:
        """Generate a unique job ID from job details"""
        unique_str = f"{title}_{company}_{source}".lower()
        return f"job_{hashlib.md5(unique_str.encode()).hexdigest()[:12]}"
    
    def _is_remote_job(self, job: Dict) -> bool:
        """Check if job is remote"""
        location = (job.get('location', '') or '').lower()
        title = (job.get('title', '') or '').lower()
        description = (job.get('description', '') or '').lower()
        
        remote_keywords = ['remote', 'work from home', 'wfh', 'anywhere', 'distributed', 'telecommute']
        
        for keyword in remote_keywords:
            if keyword in location or keyword in title or keyword in description:
                return True
        return False
    
    def _is_us_based(self, location: str) -> bool:
        """Check if location is US-based or remote"""
        if not location:
            return True  # Assume US if not specified
        
        location_lower = location.lower()
        
        # Accept remote jobs
        if any(kw in location_lower for kw in ['remote', 'anywhere', 'worldwide', 'global']):
            return True
        
        # Check for US indicators
        us_indicators = [
            'usa', 'united states', 'u.s.', 'america',
            # States
            'california', 'new york', 'texas', 'florida', 'washington', 'illinois',
            'georgia', 'north carolina', 'ohio', 'pennsylvania', 'arizona', 'colorado',
            'massachusetts', 'virginia', 'oregon', 'nevada', 'utah', 'tennessee',
            # Cities
            'san francisco', 'new york', 'seattle', 'austin', 'boston', 'denver',
            'los angeles', 'chicago', 'atlanta', 'miami', 'dallas', 'houston',
            'phoenix', 'portland', 'san diego', 'san jose', 'raleigh', 'nashville'
        ]
        
        # State abbreviations
        us_states = ['CA', 'NY', 'TX', 'FL', 'WA', 'IL', 'GA', 'NC', 'OH', 'PA', 
                     'AZ', 'CO', 'MA', 'VA', 'OR', 'NV', 'UT', 'TN', 'MN', 'WI']
        
        for indicator in us_indicators:
            if indicator in location_lower:
                return True
        
        for state in us_states:
            if f', {state}' in location or f' {state}' in location or location.endswith(state):
                return True
        
        # Reject known non-US
        non_us = ['uk', 'canada', 'india', 'germany', 'france', 'australia', 'singapore',
                  'london', 'toronto', 'berlin', 'paris', 'sydney', 'mumbai', 'bangalore']
        for loc in non_us:
            if loc in location_lower:
                return False
        
        return True  # Default to accepting if uncertain
    
    def _get_cache_key(self, source: str, query: str, remote_only: bool) -> str:
        """Generate cache key"""
        return f"{source}_{query}_{remote_only}"
    
    def _get_cached_jobs(self, cache_key: str) -> Optional[List[Dict]]:
        """Get jobs from cache if valid"""
        if cache_key in _job_cache:
            cached_data, cached_time = _job_cache[cache_key]
            if datetime.now(timezone.utc) - cached_time < _cache_duration:
                logger.info(f"Cache hit for {cache_key}")
                return cached_data
        return None
    
    def _set_cache(self, cache_key: str, jobs: List[Dict]):
        """Store jobs in cache"""
        _job_cache[cache_key] = (jobs, datetime.now(timezone.utc))

    async def scrape_arbeitnow(self, query: str, remote_only: bool = False, limit: int = 20) -> List[Dict]:
        """
        Fetch jobs from Arbeitnow API - FREE, no API key required
        Great for tech jobs, supports remote filtering
        """
        cache_key = self._get_cache_key("arbeitnow", query, remote_only)
        cached = self._get_cached_jobs(cache_key)
        if cached:
            return cached[:limit]
        
        jobs = []
        search_terms = self._get_search_terms(query)
        
        try:
            # Arbeitnow has a public JSON API
            url = "https://www.arbeitnow.com/api/job-board-api"
            
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code != 200:
                    logger.warning(f"Arbeitnow returned status {response.status_code}")
                    return jobs
                
                data = response.json()
                job_list = data.get("data", [])
                
                for job in job_list:
                    try:
                        title = job.get("title", "")
                        company = job.get("company_name", "Company Not Listed")
                        location = job.get("location", "Remote")
                        description = job.get("description", "")[:500]
                        tags = job.get("tags", [])
                        is_remote = job.get("remote", False)
                        
                        # Use improved matching with synonyms
                        if not self._matches_query({'title': title, 'description': description, 'tags': tags}, search_terms):
                            continue
                        
                        # Filter remote if requested
                        if remote_only and not is_remote:
                            continue
                        
                        # Check US location
                        if not self._is_us_based(location) and not is_remote:
                            continue
                        
                        jobs.append({
                            "job_id": f"arbeitnow_{job.get('slug', self._generate_job_id(title, company, 'arbeitnow'))}",
                            "title": title,
                            "company": company,
                            "company_logo": f"https://ui-avatars.com/api/?name={urllib.parse.quote(company[:2])}&background=10b981&color=fff",
                            "location": "Remote" if is_remote else location,
                            "description": description,
                            "salary_info": None,
                            "apply_link": job.get("url", ""),
                            "posted_at": job.get("created_at", datetime.now(timezone.utc).isoformat()),
                            "is_remote": is_remote,
                            "employment_type": job.get("job_types", ["Full-time"])[0] if job.get("job_types") else "Full-time",
                            "source": "Arbeitnow",
                            "tags": tags[:5],
                            "matched_technology": query
                        })
                        
                        if len(jobs) >= limit * 2:  # Get extra for filtering
                            break
                            
                    except Exception as e:
                        logger.error(f"Error parsing Arbeitnow job: {e}")
                        continue
            
            self._set_cache(cache_key, jobs)
                        
        except Exception as e:
            logger.error(f"Error scraping Arbeitnow: {e}")
        
        return jobs[:limit]

    async def scrape_remotive(self, query: str, remote_only: bool = True, limit: int = 20) -> List[Dict]:
        """
        Fetch jobs from Remotive API - FREE, no API key required
        Focused on remote tech jobs
        """
        cache_key = self._get_cache_key("remotive", query, remote_only)
        cached = self._get_cached_jobs(cache_key)
        if cached:
            return cached[:limit]
        
        jobs = []
        search_terms = self._get_search_terms(query)
        
        try:
            # Remotive has a public JSON API
            url = "https://remotive.com/api/remote-jobs"
            params = {"limit": 100}  # Get more to filter
            
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, params=params, headers=self._get_headers())
                
                if response.status_code != 200:
                    logger.warning(f"Remotive returned status {response.status_code}")
                    return jobs
                
                data = response.json()
                job_list = data.get("jobs", [])
                
                for job in job_list:
                    try:
                        title = job.get("title", "")
                        company = job.get("company_name", "Company Not Listed")
                        category = job.get("category", "")
                        description = job.get("description", "")[:500]
                        tags = job.get("tags", [])
                        location = job.get("candidate_required_location", "Worldwide")
                        
                        # Use improved matching with synonyms
                        if not self._matches_query({'title': title, 'category': category, 'description': description, 'tags': tags}, search_terms):
                            continue
                        
                        # Check if US or worldwide
                        if not self._is_us_based(location):
                            continue
                        
                        # Parse salary
                        salary_info = None
                        if job.get("salary"):
                            salary_info = job.get("salary")
                        
                        jobs.append({
                            "job_id": f"remotive_{job.get('id', self._generate_job_id(title, company, 'remotive'))}",
                            "title": title,
                            "company": company,
                            "company_logo": job.get("company_logo") or f"https://ui-avatars.com/api/?name={urllib.parse.quote(company[:2])}&background=8b5cf6&color=fff",
                            "location": location if location else "Remote",
                            "description": description,
                            "salary_info": salary_info,
                            "apply_link": job.get("url", ""),
                            "posted_at": job.get("publication_date", datetime.now(timezone.utc).isoformat()),
                            "is_remote": True,
                            "employment_type": job.get("job_type", "Full-time"),
                            "source": "Remotive",
                            "category": category,
                            "tags": tags[:5] if tags else [],
                            "matched_technology": query
                        })
                        
                        if len(jobs) >= limit * 2:
                            break
                            
                    except Exception as e:
                        logger.error(f"Error parsing Remotive job: {e}")
                        continue
            
            self._set_cache(cache_key, jobs)
                        
        except Exception as e:
            logger.error(f"Error scraping Remotive: {e}")
        
        return jobs[:limit]

    async def scrape_remoteok(self, query: str, limit: int = 20) -> List[Dict]:
        """
        Fetch jobs from RemoteOK API - FREE, no API key required
        All jobs are remote by default
        """
        cache_key = self._get_cache_key("remoteok", query, True)
        cached = self._get_cached_jobs(cache_key)
        if cached:
            return cached[:limit]
        
        jobs = []
        search_terms = self._get_search_terms(query)
        
        try:
            url = "https://remoteok.com/api"
            
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                headers = self._get_headers()
                headers['Accept'] = 'application/json'
                
                response = await client.get(url, headers=headers)
                
                if response.status_code != 200:
                    logger.warning(f"RemoteOK returned status {response.status_code}")
                    return jobs
                
                data = response.json()
                
                # First item is metadata, skip it
                for job in data[1:]:
                    if not isinstance(job, dict):
                        continue
                    
                    try:
                        title = job.get('position', '')
                        company = job.get('company', 'Company Not Listed')
                        tags = job.get('tags', [])
                        description = job.get('description', '')[:500]
                        location = job.get('location', 'Remote (Worldwide)')
                        
                        # Use improved matching with synonyms
                        if not self._matches_query({'title': title, 'company': company, 'description': description, 'tags': tags}, search_terms):
                            continue
                        
                        # Check US or worldwide
                        if not self._is_us_based(location):
                            continue
                        
                        # Parse salary
                        salary_info = None
                        if job.get('salary_min') and job.get('salary_max'):
                            salary_info = f"${job['salary_min']:,} - ${job['salary_max']:,}"
                        
                        jobs.append({
                            "job_id": f"remoteok_{job.get('id', self._generate_job_id(title, company, 'remoteok'))}",
                            "title": title,
                            "company": company,
                            "company_logo": job.get('company_logo') or f"https://ui-avatars.com/api/?name={urllib.parse.quote(company[:2])}&background=14b8a6&color=fff",
                            "location": location if location else "Remote",
                            "description": description,
                            "salary_info": salary_info,
                            "salary_min": job.get('salary_min'),
                            "salary_max": job.get('salary_max'),
                            "apply_link": job.get('url', f"https://remoteok.com/remote-jobs/{job.get('slug', '')}"),
                            "posted_at": job.get('date', datetime.now(timezone.utc).isoformat()),
                            "is_remote": True,
                            "employment_type": "Full-time",
                            "source": "RemoteOK",
                            "tags": tags[:5],
                            "matched_technology": query
                        })
                        
                        if len(jobs) >= limit * 2:
                            break
                            
                    except Exception as e:
                        logger.error(f"Error parsing RemoteOK job: {e}")
                        continue
            
            self._set_cache(cache_key, jobs)
                        
        except Exception as e:
            logger.error(f"Error scraping RemoteOK: {e}")
        
        return jobs[:limit]

    async def scrape_jobicy(self, query: str, remote_only: bool = True, limit: int = 20) -> List[Dict]:
        """
        Fetch jobs from Jobicy API - FREE, no API key required
        Focused on remote jobs
        """
        cache_key = self._get_cache_key("jobicy", query, remote_only)
        cached = self._get_cached_jobs(cache_key)
        if cached:
            return cached[:limit]
        
        jobs = []
        search_terms = self._get_search_terms(query)
        
        try:
            url = "https://jobicy.com/api/v2/remote-jobs"
            params = {
                "count": 50,
                "tag": query
            }
            
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, params=params, headers=self._get_headers())
                
                if response.status_code != 200:
                    logger.warning(f"Jobicy returned status {response.status_code}")
                    return jobs
                
                data = response.json()
                job_list = data.get("jobs", [])
                
                for job in job_list:
                    try:
                        title = job.get("jobTitle", "")
                        company = job.get("companyName", "Company Not Listed")
                        location = job.get("jobGeo", "Remote")
                        description = job.get("jobExcerpt", "")[:500]
                        job_type = job.get("jobType", "Full-time")
                        
                        # Use improved matching with synonyms
                        if not self._matches_query({'title': title, 'description': description}, search_terms):
                            continue
                        
                        # Check US or worldwide
                        if not self._is_us_based(location):
                            continue
                        
                        # Parse salary
                        salary_info = None
                        if job.get("annualSalaryMin") and job.get("annualSalaryMax"):
                            salary_info = f"${int(job['annualSalaryMin']):,} - ${int(job['annualSalaryMax']):,}"
                        
                        jobs.append({
                            "job_id": f"jobicy_{job.get('id', self._generate_job_id(title, company, 'jobicy'))}",
                            "title": title,
                            "company": company,
                            "company_logo": job.get("companyLogo") or f"https://ui-avatars.com/api/?name={urllib.parse.quote(company[:2])}&background=ec4899&color=fff",
                            "location": location if location else "Remote",
                            "description": description,
                            "salary_info": salary_info,
                            "apply_link": job.get("url", ""),
                            "posted_at": job.get("pubDate", datetime.now(timezone.utc).isoformat()),
                            "is_remote": True,
                            "employment_type": job_type,
                            "source": "Jobicy",
                            "industry": job.get("jobIndustry", []),
                            "matched_technology": query
                        })
                        
                        if len(jobs) >= limit * 2:
                            break
                            
                    except Exception as e:
                        logger.error(f"Error parsing Jobicy job: {e}")
                        continue
            
            self._set_cache(cache_key, jobs)
                        
        except Exception as e:
            logger.error(f"Error scraping Jobicy: {e}")
        
        return jobs[:limit]

    async def scrape_findwork(self, query: str, remote_only: bool = False, limit: int = 20) -> List[Dict]:
        """
        FindWork API requires API key - skip for now
        """
        # FindWork API now requires authentication - skip
        return []

    async def scrape_hackernews_jobs(self, query: str, remote_only: bool = False, limit: int = 20) -> List[Dict]:
        """
        Fetch jobs from HackerNews Who's Hiring via Algolia API - FREE
        Great source for tech/startup jobs
        """
        cache_key = self._get_cache_key("hackernews", query, remote_only)
        cached = self._get_cached_jobs(cache_key)
        if cached:
            return cached[:limit]
        
        jobs = []
        search_terms = self._get_search_terms(query)
        
        try:
            # Algolia HN Search API - search for jobs
            url = "https://hn.algolia.com/api/v1/search"
            params = {
                "query": f"{query} hiring",
                "tags": "story",
                "hitsPerPage": 100
            }
            
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, params=params, headers=self._get_headers())
                
                if response.status_code != 200:
                    logger.warning(f"HackerNews returned status {response.status_code}")
                    return jobs
                
                data = response.json()
                hits = data.get("hits", [])
                
                for hit in hits:
                    try:
                        title = hit.get("title", "")
                        story_text = hit.get("story_text", "") or ""
                        
                        # Skip non-job posts
                        if not any(kw in title.lower() for kw in ['hiring', 'job', 'remote', 'engineer', 'developer']):
                            continue
                        
                        # Use improved matching with synonyms
                        if not self._matches_query({'title': title, 'description': story_text}, search_terms):
                            continue
                        
                        # Extract company name from title (usually "Company (Location)" format)
                        company = "Tech Startup"
                        if "(" in title:
                            company = title.split("(")[0].strip().replace("hiring", "").replace("Hiring", "").strip()
                        
                        is_remote = 'remote' in title.lower() or 'remote' in story_text.lower()
                        
                        if remote_only and not is_remote:
                            continue
                        
                        jobs.append({
                            "job_id": f"hackernews_{hit.get('objectID', self._generate_job_id(title, company, 'hackernews'))}",
                            "title": f"Software Engineer at {company}" if 'engineer' not in title.lower() else title[:100],
                            "company": company[:50],
                            "company_logo": f"https://ui-avatars.com/api/?name={urllib.parse.quote(company[:2])}&background=ff6600&color=fff",
                            "location": "Remote" if is_remote else "Various / Check Listing",
                            "description": story_text[:500] if story_text else f"Job opportunity at {company}. Click to view full details on HackerNews.",
                            "salary_info": None,
                            "apply_link": f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}",
                            "posted_at": hit.get("created_at", datetime.now(timezone.utc).isoformat()),
                            "is_remote": is_remote,
                            "employment_type": "Full-time",
                            "source": "HackerNews",
                            "tags": ["startup", "tech"],
                            "matched_technology": query
                        })
                        
                        if len(jobs) >= limit:
                            break
                            
                    except Exception as e:
                        logger.error(f"Error parsing HackerNews job: {e}")
                        continue
            
            self._set_cache(cache_key, jobs)
                        
        except Exception as e:
            logger.error(f"Error scraping HackerNews: {e}")
        
        return jobs[:limit]

    async def scrape_all_sources(
        self, 
        query: str, 
        remote_only: bool = False,
        employment_types: List[str] = None,
        limit_per_source: int = 15
    ) -> List[Dict]:
        """
        Scrape jobs from all available FREE sources concurrently
        """
        logger.info(f"Enhanced scraper: Searching for '{query}', remote_only={remote_only}")
        
        # Clear cache if needed to get fresh results
        # self.clear_cache()  # Uncomment for debugging
        
        # Run all scrapers concurrently
        results = await asyncio.gather(
            self.scrape_arbeitnow(query, remote_only, limit_per_source),
            self.scrape_remotive(query, True, limit_per_source),  # Remotive is always remote
            self.scrape_remoteok(query, limit_per_source),
            self.scrape_jobicy(query, remote_only, limit_per_source),
            self.scrape_hackernews_jobs(query, remote_only, limit_per_source),
            return_exceptions=True
        )
        
        all_jobs = []
        source_names = ['Arbeitnow', 'Remotive', 'RemoteOK', 'Jobicy', 'HackerNews']
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error from {source_names[i]}: {result}")
            elif isinstance(result, list):
                all_jobs.extend(result)
                logger.info(f"Got {len(result)} jobs from {source_names[i]}")
        
        # Remove duplicates based on title + company
        seen = set()
        unique_jobs = []
        for job in all_jobs:
            key = (job.get('title', '').lower(), job.get('company', '').lower())
            if key not in seen:
                seen.add(key)
                unique_jobs.append(job)
        
        # Filter by remote if requested
        if remote_only:
            unique_jobs = [j for j in unique_jobs if j.get('is_remote', False)]
        
        # Filter by employment type if specified
        if employment_types:
            emp_types_lower = [et.lower() for et in employment_types]
            unique_jobs = [
                j for j in unique_jobs 
                if any(et in (j.get('employment_type', '') or '').lower() for et in emp_types_lower)
            ]
        
        # Sort by posted date (newest first) - handle mixed types
        def safe_sort_key(x):
            posted = x.get('posted_at', '')
            if isinstance(posted, (int, float)):
                return str(posted)
            return str(posted) if posted else ''
        
        unique_jobs.sort(key=safe_sort_key, reverse=True)
        
        logger.info(f"Enhanced scraper: Total unique jobs: {len(unique_jobs)}")
        return unique_jobs

    def clear_cache(self):
        """Clear the job cache"""
        global _job_cache
        _job_cache = {}
        logger.info("Job cache cleared")


# Create singleton instance
enhanced_job_scraper = EnhancedJobScraper()
