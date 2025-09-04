import json
import os
from typing import Dict, List, Optional
import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
from file_upload import FileReader
import uuid

# These imports assume you have real implementations of these functions
from internet_research_functions import crawl_and_analyze_company_website
from llm import (
    llm_call,
    call_gpt, 
    llm_01, 
    llm_01_async,
    generate_outcome_titles_prompt, 
    generate_single_outcome_detail_prompt,
    generate_summary_takeaways_prompt
)
from fetch_linkedin_profiles import fetch_profiles_in_threads



async def process_research(url: str, research_type: str) -> Dict:
    """
    Asynchronously process web research for a given URL
    """
    if not url or not url.strip():
        return {"status": "skipped", "reason": f"No {research_type} URL provided"}
    
    try:
        # Run the CPU-bound crawl operation in a thread pool
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            result = await loop.run_in_executor(
                pool, 
                crawl_and_analyze_company_website, 
                url
            )
        return {"status": "success", "data": result}
    except Exception as e:
        return {
            "status": "error",
            "reason": f"Error analyzing {research_type}: {str(e)}"
        }

async def process_file_content(file_path: str) -> Dict:
    """
    Asynchronously process file content using FileReader
    """
    if not file_path or not os.path.exists(file_path):
        return {"status": "skipped", "reason": "File not provided or doesn't exist"}
    
    try:
        # Run the file reading operation in a thread pool
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            result = await loop.run_in_executor(
                pool,
                FileReader.read_file,
                file_path
            )
        return {"status": "success", "data": result}
    except Exception as e:
        return {
            "status": "error",
            "reason": f"Error processing file: {str(e)}"
        }

async def process_linkedin_profiles(linkedin_urls_text: Optional[str]) -> Dict:
    """
    Asynchronously process LinkedIn profile fetching for given URLs text.
    Runs the synchronous fetch_profiles_in_threads in a thread pool.
    """
    if not linkedin_urls_text or not linkedin_urls_text.strip():
        return {"status": "skipped", "reason": "No LinkedIn URLs provided"}

    try:
        print(f"Processing LinkedIn profiles for URLs: {linkedin_urls_text}")
        # Run the potentially blocking operation in a thread pool
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            # fetch_profiles_in_threads expects the raw text containing URLs
            result = await loop.run_in_executor(
                pool,
                fetch_profiles_in_threads,
                linkedin_urls_text
            )
        print(f"LinkedIn profiles fetched: {result}")
        return {"status": "success", "data": result}
    except Exception as e:
        # Log the error appropriately if needed
        return {
            "status": "error",
            "reason": f"Error fetching LinkedIn profiles: {str(e)}"
        }



def format_pov_as_markdown(pov_data: str, output_file: str) -> str:
    """
    Saves the POV analysis as a markdown file
    
    Parameters:
        pov_data: The markdown string containing the POV analysis
        output_file: Path where the markdown file should be saved
        
    Returns:
        The path to the saved markdown file
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(pov_data)
    
    return output_file



async def complete_pov(
    vendor_name: str,
    vendor_url: str,
    vendor_services: str,
    target_customer_name: str,
    target_customer_url: str,
    role_names: str = None,
    linkedin_urls: str = None,
    role_context: str = None,
    additional_context: str = None,
    vendor_files: List[str] = None,
    customer_files: List[str] = None,
    model_name: str = 'gpt-4.1-mini'
) -> str:
    """
    Generates a complete POV analysis using the parallel approach and returns markdown
    """
    try:
        # Generate the POV analysis data as markdown using parallel approach
        pov_markdown = await generate_pov_analysis_parallel(
                vendor_name=vendor_name,
                vendor_url=vendor_url,
                vendor_services=vendor_services,
                target_customer_name=target_customer_name,
                target_customer_url=target_customer_url,
            roles_sold_to=role_names,
            linkedin_urls=linkedin_urls,
                role_names=role_names,
                role_context=role_context,
                additional_context=additional_context,
                vendor_files=vendor_files,
            customer_files=customer_files,
            model_name=model_name
        )
        
        return pov_markdown
            
    except Exception as e:
        # Log the error here if needed
        raise Exception(f"Error generating POV: {str(e)}")

async def generate_pov_analysis_parallel(
    vendor_name: str,
    vendor_url: str,
    vendor_services: str,
    target_customer_name: str,
    target_customer_url: str,
    roles_sold_to: Optional[str] = None,
    linkedin_urls: Optional[str] = None,
    role_names: Optional[str] = None,
    role_context: Optional[str] = None,
    additional_context: Optional[str] = None,
    vendor_files: Optional[List[str]] = None,
    customer_files: Optional[List[str]] = None,
    model_name: str = 'gpt-4.1-mini'
) -> str:
    """
    Generates POV analysis data in markdown format using a parallel approach.
    1. Generates 15 outcome titles.
    2. Generates detailed analysis for each outcome in parallel.
    3. Generates final summary and takeaways.
    4. Assembles the final report.
    Returns markdown text.
    """
    print("Starting parallel POV generation...")
    # --- Step 0: Gather Context (Same as original function) ---
    tasks = [
        process_research(vendor_url, "vendor"),
        process_research(target_customer_url, "customer")
    ]
    vendor_research_idx = 0
    customer_research_idx = 1
    vendor_files_start_idx = 2
    if vendor_files:
        tasks.extend([process_file_content(f) for f in vendor_files])
    customer_files_start_idx = len(tasks)
    if customer_files:
        tasks.extend([process_file_content(f) for f in customer_files])
    linkedin_profiles_idx = -1
    if linkedin_urls:
        linkedin_profiles_idx = len(tasks)
        tasks.append(process_linkedin_profiles(linkedin_urls))

    results = await asyncio.gather(*tasks)

    vendor_research = None
    customer_research = None
    vendor_file_content = []
    customer_file_content = []
    linkedin_profiles_data = None

    for i, result in enumerate(results):
        if result["status"] == "success":
            if i == vendor_research_idx:
                vendor_research = result["data"]
            elif i == customer_research_idx:
                customer_research = result["data"]
            elif vendor_files_start_idx <= i < customer_files_start_idx:
                vendor_file_content.append(result["data"])
            elif customer_files_start_idx <= i < (linkedin_profiles_idx if linkedin_profiles_idx != -1 else len(tasks)):
                customer_file_content.append(result["data"])
            elif i == linkedin_profiles_idx:
                linkedin_profiles_data = result["data"]
        elif result["status"] == "error":
             print(f"Context gathering task {i} failed: {result.get('reason', 'Unknown error')}")

    background_context = f"""
vendor_name: {vendor_name}
vendor_url: {vendor_url}
vendor_services: {vendor_services}
target_customer_name: {target_customer_name}
target_customer_url: {target_customer_url}
roles_sold_to: {roles_sold_to}
linkedin_urls: {linkedin_urls}
role_names: {role_names}
role_context: {role_context}
additional_context: {additional_context}

Vendor Research: {json.dumps(vendor_research, indent=2) if vendor_research else "Not available"}
Customer Research: {json.dumps(customer_research, indent=2) if customer_research else "Not available"}

Vendor Document Analysis: {json.dumps(vendor_file_content, indent=2) if vendor_file_content else "No documents provided"}
Customer Document Analysis: {json.dumps(customer_file_content, indent=2) if customer_file_content else "No documents provided"}

LinkedIn Profiles Analysis: {linkedin_profiles_data if linkedin_profiles_data else "Not available or not requested"}
"""

    # --- Step 1: Generate Outcome Titles --- 
    print("Step 1: Generating outcome titles...")
    outcome_titles = []
    try:
        title_prompt = generate_outcome_titles_prompt(
            background_context, vendor_name, target_customer_name, role_names
        )
        # Use llm_01_async, expecting a single JSON string in the first element of the list
        title_responses, _ = await llm_call(instructions=[title_prompt], model=model_name)
        
        if not title_responses:
            raise ValueError("LLM did not return any response for outcome titles.")

        # Attempt to parse the JSON string response
        try:
            # Clean potential markdown code fences if present
            json_string = title_responses[0].strip().strip('`').strip("json\n")
            outcome_titles = json.loads(json_string)
            if not isinstance(outcome_titles, list):
                raise ValueError("Parsed JSON is not a list.")
            if len(outcome_titles) < 15:
                print(f"Warning: LLM generated only {len(outcome_titles)} titles, expected 15.")
                # Decide how to handle this - error out or proceed with fewer?
                # For now, let's error out if less than 15 are generated
                if len(outcome_titles) == 0:
                    raise ValueError("LLM generated an empty list of titles.")
                # Or, maybe pad with placeholder titles? 
                # outcome_titles.extend([f"Placeholder Outcome {i+1}" for i in range(len(outcome_titles), 15)])
            elif len(outcome_titles) > 15:
                 print(f"Warning: LLM generated {len(outcome_titles)} titles, using first 15.")
                 outcome_titles = outcome_titles[:15] # Use only the first 15
        except json.JSONDecodeError as json_err:
            print(f"Failed to parse JSON response for titles: {json_err}")
            print(f"Raw response was: {title_responses[0]}")
            raise ValueError(f"Could not decode JSON for outcome titles. Raw response: {title_responses[0]}") from json_err
        except Exception as parse_err:
             print(f"Error processing title response: {parse_err}")
             raise ValueError(f"Error processing title response: {parse_err}")

    except Exception as e:
        print(f"Error generating outcome titles: {e}")
        return f"Error: Failed to generate outcome titles - {e}"

    if not outcome_titles:
        return "Error: No outcome titles were generated."
    print(f"Generated {len(outcome_titles)} outcome titles.")

    # --- Step 2 & 3: Generate Details for Each Outcome in Parallel ---
    print("Step 2 & 3: Generating details for each outcome...")
    detail_prompts = []
    for title in outcome_titles:
        detail_prompts.append(
            generate_single_outcome_detail_prompt(
                background_context, title, vendor_name, target_customer_name, role_names
            )
        )
    
    outcome_details_markdown = []
    try:
        # Run the 15 detail prompts in parallel
        outcome_details_markdown, _ = await llm_call(instructions=detail_prompts, model=model_name)
        if len(outcome_details_markdown) != len(outcome_titles):
             print(f"Warning: Mismatch between requested ({len(outcome_titles)}) and received ({len(outcome_details_markdown)}) outcome details.")
             # Handle mismatch? Maybe use only the ones received?
             # For now, just log a warning.

    except Exception as e:
        print(f"Error generating outcome details in parallel: {e}")
        # Decide how to proceed - return partial or error?
        return f"Error: Failed during parallel generation of outcome details - {e}"
    print("Finished generating outcome details.")

    # --- Step 4: Generate Summary & Takeaways ---
    print("Step 4: Generating summary and takeaways...")
    summary_takeaways_markdown = ""
    try:
        summary_prompt = generate_summary_takeaways_prompt(
            background_context, vendor_name, target_customer_name, role_names
        )
        summary_responses, _ = await llm_call(instructions=[summary_prompt], model=model_name)
        if summary_responses:
            summary_takeaways_markdown = summary_responses[0]
        else:
            print("Warning: LLM did not return summary/takeaways content.")
            summary_takeaways_markdown = "\n## **Summary & Strategic Integration of All 15 Outcomes**\n\n*Error: Failed to generate Summary & Strategic Integration.*\n\n---\n\n## **Key Takeaways & Next Steps**\n\n*Error: Failed to generate Key Takeaways & Next Steps.*"
    except Exception as e:
        print(f"Error generating summary and takeaways: {e}")
        summary_takeaways_markdown = f"\n## **Summary & Strategic Integration of All 15 Outcomes**\n\n*Error generating Summary & Strategic Integration: {e}*\n\n---\n\n## **Key Takeaways & Next Steps**\n\n*Error generating Key Takeaways & Next Steps: {e}*"
    print("Finished generating summary and takeaways.")
    
    # --- Step 5: Assemble Final Markdown --- 
    print("Step 5: Assembling final markdown...")
    # Get current date
    current_date = datetime.datetime.now().strftime("%d %B %Y")
    
    # Create the title
    report_title_md = f"## **POV Report: {vendor_name} {target_customer_name} {role_names} {current_date}**\n\n"

    # Create the information header section
    info_header = f"### **1. Input Information**\n"
    info_header += f"- **Vendor Name:** {vendor_name}\n"
    if vendor_url:
        info_header += f"- **Vendor URL:** {vendor_url}\n"
    info_header += f"- **Target Customer:** {target_customer_name}\n"
    if target_customer_url:
        info_header += f"- **Target Customer URL:** {target_customer_url}\n"
    if role_names:
        info_header += f"- **Role(s) Being Sold To:** {role_names}\n"
    if linkedin_urls:
        info_header += f"- **LinkedIn URL:** {linkedin_urls}\n"
    if role_context:
        info_header += f"- **Role Context:** {role_context}\n"
    if additional_context:
        info_header += f"- **Additional Context:** {additional_context}\n"
    info_header += "\n---\n\n" # Add separator
    
    # Join outcome details with separator
    all_outcomes_markdown = "\n\n---\n\n".join(outcome_details_markdown)

    # Combine all parts
    final_markdown = (
        report_title_md
        + info_header
        + all_outcomes_markdown
        + "\n\n---\n\n" # Separator before summary
        + summary_takeaways_markdown
    )
    
    print("Finished assembling markdown.")
    return final_markdown 

async def generate_pov_titles_only(
    vendor_name: str,
    vendor_url: str,
    vendor_services: str,
    target_customer_name: str,
    target_customer_url: str,
    roles_sold_to: Optional[str] = None,
    linkedin_urls: Optional[str] = None,
    role_names: Optional[str] = None,
    role_context: Optional[str] = None,
    additional_context: Optional[str] = None,
    vendor_files: Optional[List[str]] = None,
    customer_files: Optional[List[str]] = None,
    model_name: str = 'gpt-4.1-mini',
    num_outcomes: int = 15
) -> List[str]:
    """
    Generates only the outcome titles for selective workflow (Step 1).
    Returns a list of outcome title strings.
    """
    print("🎯 Starting selective POV generation - Step 1: Titles only...")
    
    # --- Step 0: Gather Context (Same as full function) ---
    print("📊 Gathering context...")
    tasks = [
        process_research(vendor_url, "vendor"),
        process_research(target_customer_url, "customer")
    ]
    vendor_research_idx = 0
    customer_research_idx = 1
    vendor_files_start_idx = 2
    if vendor_files:
        tasks.extend([process_file_content(f) for f in vendor_files])
    customer_files_start_idx = len(tasks)
    if customer_files:
        tasks.extend([process_file_content(f) for f in customer_files])
    linkedin_profiles_idx = -1
    if linkedin_urls:
        linkedin_profiles_idx = len(tasks)
        tasks.append(process_linkedin_profiles(linkedin_urls))

    results = await asyncio.gather(*tasks)

    vendor_research = None
    customer_research = None
    vendor_file_content = []
    customer_file_content = []
    linkedin_profiles_data = None

    for i, result in enumerate(results):
        if result["status"] == "success":
            if i == vendor_research_idx:
                vendor_research = result["data"]
            elif i == customer_research_idx:
                customer_research = result["data"]
            elif vendor_files_start_idx <= i < customer_files_start_idx:
                vendor_file_content.append(result["data"])
            elif customer_files_start_idx <= i < (linkedin_profiles_idx if linkedin_profiles_idx != -1 else len(tasks)):
                customer_file_content.append(result["data"])
            elif i == linkedin_profiles_idx:
                linkedin_profiles_data = result["data"]
        elif result["status"] == "error":
             print(f"⚠️ Context gathering task {i} failed: {result.get('reason', 'Unknown error')}")

    background_context = f"""
vendor_name: {vendor_name}
vendor_url: {vendor_url}
vendor_services: {vendor_services}
target_customer_name: {target_customer_name}
target_customer_url: {target_customer_url}
roles_sold_to: {roles_sold_to}
linkedin_urls: {linkedin_urls}
role_names: {role_names}
role_context: {role_context}
additional_context: {additional_context}

Vendor Research: {json.dumps(vendor_research, indent=2) if vendor_research else "Not available"}
Customer Research: {json.dumps(customer_research, indent=2) if customer_research else "Not available"}

Vendor Document Analysis: {json.dumps(vendor_file_content, indent=2) if vendor_file_content else "No documents provided"}
Customer Document Analysis: {json.dumps(customer_file_content, indent=2) if customer_file_content else "No documents provided"}

LinkedIn Profiles Analysis: {linkedin_profiles_data if linkedin_profiles_data else "Not available or not requested"}
"""

    # --- Step 1: Generate Outcome Titles Only --- 
    print(f"🎯 Generating {num_outcomes} outcome titles...")
    outcome_titles = []
    try:
        title_prompt = generate_outcome_titles_prompt(
            background_context, vendor_name, target_customer_name, role_names, num_outcomes
        )
        # Use llm_01_async, expecting a single JSON string in the first element of the list
        title_responses, _ = await llm_call(instructions=[title_prompt], model=model_name)
        
        if not title_responses:
            raise ValueError("LLM did not return any response for outcome titles.")

        # Attempt to parse the JSON string response
        try:
            # Clean potential markdown code fences if present
            json_string = title_responses[0].strip().strip('`').strip("json\n")
            outcome_titles = json.loads(json_string)
            if not isinstance(outcome_titles, list):
                raise ValueError("Parsed JSON is not a list.")
            if len(outcome_titles) < num_outcomes:
                print(f"⚠️ Warning: LLM generated only {len(outcome_titles)} titles, expected {num_outcomes}.")
                if len(outcome_titles) == 0:
                    raise ValueError("LLM generated an empty list of titles.")
            elif len(outcome_titles) > num_outcomes:
                 print(f"⚠️ Warning: LLM generated {len(outcome_titles)} titles, using first {num_outcomes}.")
                 outcome_titles = outcome_titles[:num_outcomes] # Use only the first num_outcomes
        except json.JSONDecodeError as json_err:
            print(f"❌ Failed to parse JSON response for titles: {json_err}")
            print(f"Raw response was: {title_responses[0]}")
            raise ValueError(f"Could not decode JSON for outcome titles. Raw response: {title_responses[0]}") from json_err
        except Exception as parse_err:
             print(f"❌ Error processing title response: {parse_err}")
             raise ValueError(f"Error processing title response: {parse_err}")

    except Exception as e:
        print(f"❌ Error generating outcome titles: {e}")
        raise Exception(f"Failed to generate outcome titles: {e}")

    if not outcome_titles:
        raise Exception("No outcome titles were generated.")
    
    print(f"✅ Generated {len(outcome_titles)} outcome titles successfully!")
    
    # Return both titles and context for saving to database
    return {
        "titles": outcome_titles,
        "context_data": {
            "vendor_research": vendor_research,
            "customer_research": customer_research,
            "vendor_file_content": vendor_file_content,
            "customer_file_content": customer_file_content,
            "linkedin_profiles_data": linkedin_profiles_data,
            "background_context": background_context
        }
    }

async def generate_selected_outcomes_only(
    report_id: str,
    user_id: str,
    selected_titles: List[Dict],
    vendor_name: str,
    vendor_url: str,
    vendor_services: str,
    target_customer_name: str,
    target_customer_url: str,
    roles_sold_to: Optional[str] = None,
    linkedin_urls: Optional[str] = None,
    role_names: Optional[str] = None,
    role_context: Optional[str] = None,
    additional_context: Optional[str] = None,
    vendor_files: Optional[List[str]] = None,
    customer_files: Optional[List[str]] = None,
    model_name: str = 'gpt-4.1-mini',
    grok_research: Optional[Dict] = None
) -> Dict:
    """
    Generates detailed analysis for selected outcome titles only (Step 2 of selective workflow).
    
    Args:
        report_id: The report ID to save outcomes to
        user_id: The user ID for security
        selected_titles: List of selected title dicts with 'title_index', 'title', etc.
        ... other parameters same as full POV generation
    
    Returns:
        Dict with 'outcomes' (list of outcome content) and 'summary' (summary content)
    """
    print(f"🎯 Starting selective POV generation - Step 2: Details for {len(selected_titles)} selected outcomes...")
    
    # --- Step 0: Retrieve Stored Context (No re-gathering!) ---
    print("📊 Retrieving stored context data...")
    from database import get_context_data
    
    try:
        stored_context = await get_context_data(report_id, user_id)
        background_context = stored_context["background_context"]
        print("✅ Using stored context data (no re-gathering needed)")
    except Exception as context_error:
        print(f"⚠️ Could not retrieve stored context: {context_error}")
        print("📊 Falling back to re-gathering context...")
        
        # Fallback to re-gathering if stored context not available
        tasks = [
            process_research(vendor_url, "vendor"),
            process_research(target_customer_url, "customer")
        ]
        vendor_research_idx = 0
        customer_research_idx = 1
        vendor_files_start_idx = 2
        if vendor_files:
            tasks.extend([process_file_content(f) for f in vendor_files])
        customer_files_start_idx = len(tasks)
        if customer_files:
            tasks.extend([process_file_content(f) for f in customer_files])
        linkedin_profiles_idx = -1
        if linkedin_urls:
            linkedin_profiles_idx = len(tasks)
            tasks.append(process_linkedin_profiles(linkedin_urls))

        results = await asyncio.gather(*tasks)

        vendor_research = None
        customer_research = None
        vendor_file_content = []
        customer_file_content = []
        linkedin_profiles_data = None

        for i, result in enumerate(results):
            if result["status"] == "success":
                if i == vendor_research_idx:
                    vendor_research = result["data"]
                elif i == customer_research_idx:
                    customer_research = result["data"]
                elif vendor_files_start_idx <= i < customer_files_start_idx:
                    vendor_file_content.append(result["data"])
                elif customer_files_start_idx <= i < (linkedin_profiles_idx if linkedin_profiles_idx != -1 else len(tasks)):
                    customer_file_content.append(result["data"])
                elif i == linkedin_profiles_idx:
                    linkedin_profiles_data = result["data"]
            elif result["status"] == "error":
                 print(f"⚠️ Context gathering task {i} failed: {result.get('reason', 'Unknown error')}")

        # Build enhanced context including Grok research if available
        grok_context = ""
        if grok_research and grok_research.get("pov_context_block"):
            grok_context = f"\n\nGrok Enhanced Research:\n{grok_research['pov_context_block']}"

        background_context = f"""
vendor_name: {vendor_name}
vendor_url: {vendor_url}
vendor_services: {vendor_services}
target_customer_name: {target_customer_name}
target_customer_url: {target_customer_url}
roles_sold_to: {roles_sold_to}
linkedin_urls: {linkedin_urls}
role_names: {role_names}
role_context: {role_context}
additional_context: {additional_context}

Vendor Research: {json.dumps(vendor_research, indent=2) if vendor_research else "Not available"}
Customer Research: {json.dumps(customer_research, indent=2) if customer_research else "Not available"}

Vendor Document Analysis: {json.dumps(vendor_file_content, indent=2) if vendor_file_content else "No documents provided"}
Customer Document Analysis: {json.dumps(customer_file_content, indent=2) if customer_file_content else "No documents provided"}

LinkedIn Profiles Analysis: {linkedin_profiles_data if linkedin_profiles_data else "Not available or not requested"}{grok_context}
"""

    # --- Step 2: Generate Details for Selected Outcomes Only ---
    print(f"🔍 Generating details for {len(selected_titles)} selected outcomes...")
    detail_prompts = []
    for title_data in selected_titles:
        detail_prompts.append(
            generate_single_outcome_detail_prompt(
                background_context, title_data['title'], vendor_name, target_customer_name, role_names
            )
        )
    
    outcome_details_markdown = []
    try:
        # Run the selected detail prompts in parallel
        outcome_details_markdown, _ = await llm_call(instructions=detail_prompts, model=model_name)
        if len(outcome_details_markdown) != len(selected_titles):
             print(f"⚠️ Warning: Mismatch between requested ({len(selected_titles)}) and received ({len(outcome_details_markdown)}) outcome details.")

    except Exception as e:
        print(f"❌ Error generating outcome details in parallel: {e}")
        raise Exception(f"Failed during parallel generation of outcome details: {e}")
    
    print("✅ Finished generating outcome details.")

    # --- Step 3: Generate Summary & Takeaways ---
    print("📝 Generating summary and takeaways...")
    summary_takeaways_markdown = ""
    try:
        summary_prompt = generate_summary_takeaways_prompt(
            background_context, vendor_name, target_customer_name, role_names, len(selected_titles)
        )
        summary_responses, _ = await llm_call(instructions=[summary_prompt], model=model_name)
        if summary_responses:
            summary_takeaways_markdown = summary_responses[0]
        else:
            print("⚠️ Warning: LLM did not return summary/takeaways content.")
            summary_takeaways_markdown = f"\n## **Summary & Strategic Integration of All {len(selected_titles)} Selected Outcomes**\n\n*Error: Failed to generate Summary & Strategic Integration.*\n\n---\n\n## **Key Takeaways & Next Steps**\n\n*Error: Failed to generate Key Takeaways & Next Steps.*"
    except Exception as e:
        print(f"❌ Error generating summary and takeaways: {e}")
        summary_takeaways_markdown = f"\n## **Summary & Strategic Integration of All {len(selected_titles)} Selected Outcomes**\n\n*Error generating Summary & Strategic Integration: {e}*\n\n---\n\n## **Key Takeaways & Next Steps**\n\n*Error generating Key Takeaways & Next Steps: {e}*"
    
    print("✅ Finished generating summary and takeaways.")
    
    return {
        'outcomes': outcome_details_markdown,
        'summary': summary_takeaways_markdown
    } 