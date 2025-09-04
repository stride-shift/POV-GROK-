import os
import requests
import json
import time
# from llm_functions import *
import threading
import asyncio
import re

api_key = os.environ['PROXYCURL_API']

def preprocess_text(text):
    """Preprocess the input text by adding a space before each 'https:' to ensure URLs are separated."""
    return text.replace("https:", " https:").strip()

def extract_linkedin_urls(text):
    """Extract LinkedIn URLs from a given text string."""
    linkedin_url_pattern = r'https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9-_/]+'
    return re.findall(linkedin_url_pattern, text)

def extract_and_preprocess_linkedin_urls(text):
    """Preprocess the text and then extract LinkedIn URLs."""
    preprocessed_text = preprocess_text(text)
    return extract_linkedin_urls(preprocessed_text)

def format_date(starts_at, ends_at):
    """Helper function to format the date range."""
    if starts_at is None:
        start_date = "Unknown start date"
    else:
        start_date = f"{starts_at.get('month', '??'):02d}/{starts_at.get('year', '????')}"

    if ends_at is None:
        end_date = "Present"
    else:
        end_date = f"{ends_at.get('month', '??'):02d}/{ends_at.get('year', '????')}"

    return f"{start_date} - {end_date}"

def format_profile(profile):
    # profile = linkedin_data['profile']
    experiences = profile['experiences']
    education = profile['education']
    certifications = profile['certifications']
    groups = profile['groups']

    output = []
    output.append(f"# {profile['full_name']} - Professional Profile\n")

    output.append("## Background")
    output.append(
        f"{profile['full_name']} is a {profile['occupation']}, based in {profile['city']}, {profile['state']}.\n"
    )

    output.append("## Work Experience")
    for job in experiences:
        company = job['company']
        title = job['title']
        date_range = format_date(job['starts_at'], job.get('ends_at'))
        output.append(
            f"- **{company}** ({date_range}): {profile['first_name']} worked as a {title} at {company}"
        )

    output.append("\n## Education")
    for edu in education:
        school = edu['school']
        degree = edu['degree_name'] if edu['degree_name'] else "degree"
        date_range = format_date(edu['starts_at'], edu.get('ends_at'))
        output.append(
            f"- **{school}** ({date_range}): {profile['first_name']} obtained his {degree} degree from {school}."
        )

    output.append("\n## Certifications")
    for cert in certifications:
        cert_name = cert['name']
        output.append(
            f"{profile['first_name']} is recognized as a {cert_name}")

    output.append("\n## Connections")
    follower_count = profile['follower_count']
    connection_count = profile['connections']
    output.append(
        f"{profile['first_name']} has {follower_count} followers and {connection_count} connections on LinkedIn."
    )

    output.append("\n## Groups")
    for group in groups:
        group_name = group['name']
        output.append(
            f"{profile['first_name']} is a member of various professional groups on LinkedIn, including {group_name}."
        )

    return "\n".join(output)


async def fetch_social_media_profile_async(profile_url, api_key):
    headers = {'Authorization': 'Bearer ' + api_key}
    api_endpoint = 'https://nubela.co/proxycurl/api/v2/linkedin'
    params = {
        'extra': 'include',
        'use_cache': 'if-recent',
        'fallback_to_cache': 'on-error',
    }

    if 'linkedin.com' in profile_url:
        params['linkedin_profile_url'] = profile_url
    else:
        return {"error": "Unsupported URL. Please provide a LinkedIn URL."}

    try:
        response = requests.get(api_endpoint, params=params, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


def run_async_in_thread(fn, args, shared_dict, key):
    def start_loop(loop):
        try:
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(fn(*args))
            shared_dict[key] = result
        except Exception as e:
            shared_dict[key] = {"error": f"Error occurred: {e}"}

    loop = asyncio.new_event_loop()
    thread = threading.Thread(target=start_loop, args=(loop,))
    thread.start()
    return thread


def fetch_profiles_in_threads(li_input_text):
    api_key = os.environ['PROXYCURL_API']

    # Preprocess and extract URLs
    linkedin_urls = extract_and_preprocess_linkedin_urls(li_input_text)
    
    # results = {}
    results = []
    threads = []

    for url in linkedin_urls:
        shared_dict = {}  # Create a separate dictionary for each thread
        thread = run_async_in_thread(fetch_social_media_profile_async, (url, api_key), shared_dict, url)
        threads.append((url, thread, shared_dict))

    # Wait for all threads to finish
    for url, thread, shared_dict in threads:
        thread.join()
        # results[url] = shared_dict[url]  # Fetch the result from the corresponding dictionary
        results.append(shared_dict[url])

    formatted_results = [format_profile(profile) for profile in results]

    profiles_text = "\n\n---\n\n".join(formatted_results)

    return profiles_text