import requests
import openai
from openai import OpenAI
from openai import AsyncOpenAI
import asyncio
import time
import os
import json
import threading
import requests
import concurrent.futures
import re

from dotenv import load_dotenv

load_dotenv()

my_secret = os.getenv('OPENAI_API_KEY')

client = OpenAI(api_key=my_secret)
client_async = AsyncOpenAI(api_key=my_secret, max_retries=1, timeout=100)

def jinaai_readerapi_web_scrape_url(url):
  response = requests.get("https://r.jina.ai/" + url)
  if response.status_code == 200:
      return response.text
  else:
      return "Failed to retrieve content from the website."


# Synchronous LLM call function to handle standard prompts
def llm_call_standard(prompt, model='gpt-4o-mini', format='json_object'):
    start_time = time.time()
    completion = client.chat.completions.create(
        model=model,
        response_format={"type": format},
        messages=[{
            "role": "user",
            "content": prompt
        }],
        temperature=0.0,
    )
    # Calculate the elapsed time
    elapsed_time = time.time() - start_time

    # Print out the time taken
    print(f"Time taken: {elapsed_time} seconds")
    return completion.choices[0].message.content

# Pipeline function to handle the entire process
def crawl_and_summarise_doc_site(url):
    # Step 1: Scrape the initial URL
    print("Scraping the initial URL...")
    initial_content = jinaai_readerapi_web_scrape_url(url)

    # Step 2: Use LLM to identify relevant links
    print("Identifying relevant links...")
    relevant_links_prompt = f"""Please identify the most relevant links from the following webpage content that could provide additional information useful for creating a startup pitch deck:\n\n{initial_content}
    If there's a link to a whitepaper, include it in the list.
    Format the response using json with the key: links
    For example:
    {{'links':['https://exampletest.com/page1/','https://exampletest.com/page2/','https://exampletest.com/page3/']}}"""
    relevant_links_json = llm_call_standard(relevant_links_prompt)
    relevant_links = json.loads(relevant_links_json).get('links', [])
    print(f"Relevant links identified: {relevant_links}")

    # Step 3: Scrape content from the relevant links concurrently using ThreadPoolExecutor
    print("Scraping content from relevant links...")
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future_to_url = {executor.submit(jinaai_readerapi_web_scrape_url, link): link for link in relevant_links}
        additional_contents = []
        for future in concurrent.futures.as_completed(future_to_url):
            url = future_to_url[future]
            try:
                data = future.result()
                additional_contents.append(data)
            except Exception as exc:
                print(f"Error scraping {url}: {exc}")

    # Combine initial content with additional contents
    combined_content = initial_content + "\n\n".join(additional_contents)

    # Step 4: Use LLM to summarize the combined content
    print("Summarizing content...")
    summary_prompt = f"Please summarize the following content to extract information most relevant to evaluating and creating a startup pitch deck:\n\n{combined_content}"
    summary = llm_call_standard(summary_prompt, format='text')
    return summary

def crawl_and_analyze_company_website(url):
    # Get the initial content
    print("Scraping company website...")
    initial_content = jinaai_readerapi_web_scrape_url(url)

    # Use LLM to identify relevant business pages
    print("Identifying relevant business pages...")
    relevant_links_prompt = f"""Analyze this webpage content and identify links to the most relevant business pages 
    that could provide information about:
    - Company overview and mission
    - Products and services
    - Leadership team
    - Case studies or success stories
    - Industry focus and expertise
    
    Format the response using json with the key: links
    Example: {{'links':['https://example.com/about','https://example.com/services']}}
    
    Content to analyze:
    {initial_content}"""
    
    relevant_links_json = llm_call_standard(relevant_links_prompt)
    relevant_links = json.loads(relevant_links_json).get('links', [])
    print(f"Relevant business pages identified: {relevant_links}")

    # Scrape content from the relevant links concurrently
    print("Scraping content from business pages...")
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future_to_url = {executor.submit(jinaai_readerapi_web_scrape_url, link): link 
                        for link in relevant_links}
        additional_contents = []
        for future in concurrent.futures.as_completed(future_to_url):
            url = future_to_url[future]
            try:
                data = future.result()
                additional_contents.append(data)
            except Exception as exc:
                print(f"Error scraping {url}: {exc}")

    # Combine all content
    combined_content = initial_content + "\n\n".join(additional_contents)

    # Use LLM to extract and structure business information
    print("Analyzing business information...")
    analysis_prompt = f"""Analyze this company website content and extract key business information.
    Return a JSON object with exactly these keys and structure:
    {{
        "company_overview": {{
            "core_business": "description",
            "mission_values": "description",
            "market_positioning": "description"
        }},
        "products_and_services": {{
            "main_offerings": ["list", "of", "offerings"],
            "key_features": ["list", "of", "features"],
            "target_markets": ["list", "of", "markets"]
        }},
        "expertise_and_differentiators": {{
            "industry_expertise": ["list", "of", "expertise"],
            "unique_selling_points": ["list", "of", "points"],
            "competitive_advantages": ["list", "of", "advantages"]
        }},
        "success_indicators": {{
            "case_studies": ["list", "of", "studies"],
            "testimonials": ["list", "of", "testimonials"],
            "achievements": ["list", "of", "achievements"]
        }},
        "target_industries": ["list", "of", "industries"]
    }}

    Content to analyze:
    {combined_content}"""
    
    business_analysis = llm_call_standard(analysis_prompt, format='json_object')
    return json.loads(business_analysis)

def create_pov_report(vendor_info, target_customer_info):
    """
    Creates a structured POV report with detailed vendor and customer information.
    """
    report = {
        "title": "POV (Point of View) Report",
        "vendor_information": {
            "vendor_name": vendor_info.get("name", ""),
            "vendor_url": vendor_info.get("url", ""),
            "vendor_products_services": vendor_info.get("products_services", []),
        },
        "customer_information": {
            "target_customer": target_customer_info.get("name", ""),
            "target_customer_url": target_customer_info.get("url", ""),
        },
        "executive_summary": generate_executive_summary(vendor_info, target_customer_info)
    }
    return report

def generate_executive_summary(vendor_info, target_customer_info):
    """
    Generates a structured executive summary based on vendor and customer information.
    """
    summary = f"""
    {vendor_info.get('name', '')} is a provider of {', '.join(vendor_info.get('products_services', []))}. 
    This analysis examines their potential relationship with {target_customer_info.get('name', '')}, 
    a {target_customer_info.get('description', '')}.
    """
    return summary.strip()

def extract_vendor_information(text):
    """
    Enhanced vendor information extraction to include URL and products/services.
    """
    # Extract company name using NLP or pattern matching
    name_patterns = [
        r'Company:\s*([^\n]+)',
        r'([A-Z][a-zA-Z\s]+)(?:\s+is\s+a|\s+provides|\s+offers)',
        r'^([A-Z][a-zA-Z\s]+)(?:\.|,|\s)'
    ]
    
    extracted_name = None
    for pattern in name_patterns:
        matches = re.findall(pattern, text)
        if matches:
            extracted_name = matches[0].strip()
            break
    
    # Extract description using context
    description_patterns = [
        r'(?:is\s+a|is\s+an)\s+([^.]+)',
        r'(?:about\s+us[:\s]+)([^.]+)',
        r'(?:description[:\s]+)([^.]+)'
    ]
    
    extracted_description = None
    for pattern in description_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            extracted_description = matches[0].strip()
            break
    
    vendor_info = {
        "name": extracted_name or "Unknown Company",
        "url": extract_url(text),
        "products_services": extract_products_services(text),
        "description": extracted_description or "No description available"
    }
    return vendor_info

def extract_url(text):
    """
    Extracts URLs from text using regex pattern matching.
    """
    url_pattern = r'https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_\+.~#?&//=]*'
    urls = re.findall(url_pattern, text)
    return urls[0] if urls else ""

def extract_products_services(text):
    """
    Extracts products and services from text using NLP techniques.
    """
    # Use NLP to identify products and services
    # This is a simplified version - you might want to enhance this with better NLP
    products_services = []
    service_indicators = ["provides", "offers", "specializes in", "delivers"]
    
    for sentence in text.split('.'):
        for indicator in service_indicators:
            if indicator in sentence.lower():
                service = sentence.split(indicator)[1].strip()
                if service:
                    products_services.append(service)
    
    return products_services if products_services else ["No services explicitly listed"]