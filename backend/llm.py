import asyncio
import openai
from openai import OpenAI
from openai import AsyncOpenAI
import time
import os
import json
import threading
from dotenv import load_dotenv

load_dotenv()


# Initialize OpenAI clients
openai_key = os.getenv('OPENAI_API_KEY')
client = OpenAI(api_key=openai_key)
client_async = AsyncOpenAI(api_key=openai_key, max_retries=1, timeout=300)

def call_gpt(prompt, system_prompt="", model='gpt-4.1-mini', format='text', temp=0.0):
    start_time = time.time()
    completion = client.chat.completions.create(
        model=model,
        response_format={"type": format},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        temperature=temp,
    )
    # Calculate the elapsed time
    elapsed_time = time.time() - start_time

    # Print out the time taken
    print(f"Time taken: {elapsed_time} seconds")
    return completion.choices[0].message.content, completion

async def llm_call(instructions,
                   system_prompt="",
                   model='gpt-4.1-mini',
                   response_format='text'):
    start_time = time.time()
    print(f"Is this where it gets iffy (async llm_call):{model}")
    tasks = [
        client_async.chat.completions.create(
            model=model,
            response_format={"type": response_format},
            messages=[{
                "role": "system",
                "content": system_prompt
            }, {
                "role": "user",
                "content": instruction
            }],
            temperature=0.0,
            max_completion_tokens=4000) for instruction in instructions
    ]

    # Using asyncio.gather to maintain order
    responses = await asyncio.gather(*tasks)
    responses_content = [
        response.choices[0].message.content for response in responses
    ]

    end_time = time.time()
    print(f"Total time: {end_time - start_time}")
    
    total_completion_tokens = 0
    total_prompt_tokens = 0
    total_tokens = 0

    # Process the responses
    for response in responses:
        completion_usage = response.usage

        # Sum the usage
        total_completion_tokens += completion_usage.completion_tokens
        total_prompt_tokens += completion_usage.prompt_tokens
        total_tokens += completion_usage.total_tokens

    # Print the total usage after all responses have been processed
    print("Total Usage Across All Responses:")
    print(f"Total Completion Tokens: {total_completion_tokens}")
    print(f"Total Prompt Tokens: {total_prompt_tokens}")
    print(f"Total Tokens: {total_tokens}")
    return responses_content, responses

def run_async_in_thread(fn, args, shared_dict):
    def start_loop(loop):
        try:
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(fn(*args))
            shared_dict["result"] = result
        except Exception as e:
            shared_dict["result"] = [f"Error occurred: {e}"]

    loop = asyncio.new_event_loop()
    thread = threading.Thread(target=start_loop, args=(loop,))
    thread.start()
    return thread

#--------------------------
#GPT o1 functions
#--------------------------

def llm_01(prompt, model='o1-mini'):
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
    )
    return response.choices[0].message.content, response

async def llm_01_async(instructions, model='o1-mini'):
    start_time = time.time()
    print(f"We're using this model: {model}")
    tasks = [client_async.chat.completions.create(
        model=model,
        max_completion_tokens=20000,
        reasoning_effort="high",
        messages=[{"role": "user", "content": instruction}]) for instruction in instructions]

    # Using asyncio.gather to maintain order
    responses = await asyncio.gather(*tasks)
    responses_content = [response.choices[0].message.content for response in responses]
    # Calculate the elapsed time
    elapsed_time = time.time() - start_time

    # Print out the time taken
    print(f"Time taken: {elapsed_time} seconds")
    return responses_content 

# --------------------------
# New Prompt Functions for Parallel POV Generation
# --------------------------

def generate_outcome_titles_prompt(background_context: str, vendor_name: str, target_customer_name: str, role_names: str, num_outcomes: int = 15) -> str:
    """
    Generates a prompt to ask the LLM for a list of outcome titles.
    """
    prompt = f"""
Based on the following background context about {vendor_name} and {target_customer_name}, generate a list of exactly {num_outcomes} concise, impactful, and distinct outcome titles relevant to {target_customer_name}'s industry and the {role_names}.

These outcomes should represent key strategic goals, challenges, or transformations that {vendor_name}'s offerings can help {target_customer_name} achieve, specifically for the {role_names}.

**Background Context:**
{background_context}

**Instructions:**
1.  Analyze the provided context carefully, paying attention to the customer's industry, potential needs, and the vendor's capabilities.
2.  Generate exactly {num_outcomes} unique and relevant outcome titles.
3.  Each title should be concise (ideally 5-10 words) and clearly articulate a valuable outcome.
4.  Format the output strictly as a JSON list of strings. Example:
    ["Outcome Title 1", "Outcome Title 2", ..., "Outcome Title {num_outcomes}"]

**Output:**
Return *only* the JSON list containing the {num_outcomes} outcome titles. Do not include any introductory text, explanations, or markdown formatting around the JSON list.
"""
    return prompt

def generate_single_outcome_detail_prompt(background_context: str, outcome_title: str, vendor_name: str, target_customer_name: str, role_names: str) -> str:
    """
    Generates a prompt to ask the LLM for the detailed analysis of a single outcome.
    Reuses the detailed structure and quality requirements from the original prompt.
    """
    prompt = f"""
You are a **world-class strategic advisor and master narrative consultant** from a top-tier firm, specializing in crafting deeply insightful and compelling Point-of-View (POV) analyses using the Jobs-to-be-Done framework. You write with **authority, precision, and a highly engaging, narrative style**. Your expertise includes **deep knowledge** of the industry and operational context relevant to **{target_customer_name}**, derived from the provided background information. You excel at **bringing abstract concepts to life with concrete, industry-relevant examples and vivid detail.** Your writing is not just informative but **deeply engaging and insightful**.

**CRITICAL LANGUAGE INSTRUCTION: Use clear, accessible English throughout. Avoid complex business jargon, overly sophisticated vocabulary, and academic language. Write in a way that is professional but easy to understand. Use simple, direct sentences and common words instead of complex terminology. The content should be insightful and analytical but expressed in plain English that any business professional can easily follow.**

Your task is to generate an **exceptionally insightful, deeply analytical, and highly persuasive YET CONCISE** detailed analysis for the *single* outcome titled: **"{outcome_title}"**. This analysis maps {vendor_name}'s capabilities to {target_customer_name}'s needs, specifically for the {role_names}. **This section must possess the depth, nuance, and strategic clarity expected of a premium consulting deliverable, delivered succinctly.**

Use the following background context, **integrating it deeply and specifically throughout, PAYING PARTICULAR ATTENTION to the 'Customer Research' section to understand their specific industry and operations**:

**Background Context:**
{background_context}

**CRITICAL REQUIREMENTS & VERY HIGH-QUALITY STANDARDS FOR THIS SINGLE, CONCISE OUTCOME:**
1.  **DEEP CONTEXTUALIZATION (NON-NEGOTIABLE & CONCISE):** Weave in **specific examples** and terminology relevant to **{target_customer_name}'s specific industry and operational context**... **Show, don't just tell, but do so efficiently.**
2.  **NARRATIVE DEPTH & STRUCTURED DETAIL (CONCISELY DELIVERED):** For this single outcome:
    *   Use bullet points (`-` or `*`) or numbered lists (`1.`, `2.`) to structure distinct items...
    *   **Crucially, EACH item listed MUST be followed by a CONCISE, analytical paragraph** (concisely, ~30-80 words) meeting the depth requirements outlined below. **Focus on the core insight.**
3.  **PRECISE FORMATTING:**
    *   Use **Markdown H2 (`##`)** for the main '## **Outcome: {outcome_title}**' title.
    *   Use **Markdown H3 (`###`)** for all subsections within this outcome (e.g., 'Functional Jobs,' 'Pain Points,' 'Solutions').
    *   **ALL headings (BOTH H2 and H3 levels) MUST be bolded (`**...**`)**.
4.  **CONSULTATIVE TONE & ANALYSIS:** Maintain a highly professional, strategic, and authoritative tone throughout. **Go beyond stating facts; analyze implications, connect ideas across sections, and provide strategic insights.** Use **clear, accessible language** and a **compelling narrative structure**. Avoid clichés, boilerplate text, or overly simplistic explanations. Ensure explanations flow logically and persuasively. Your analysis must demonstrate **critical thinking and foresight.**
5.  **Structure the output EXACTLY as follows for THIS ONE outcome, focusing on conciseness within each section:**

## **Outcome: {outcome_title}**

**Outcome Description (Deep Dive):**
    - Provide a **concise yet insightful paragraph (concisely, ~40-80 words)** vividly describing the outcome "{outcome_title}". Explain its **critical importance specifically within {target_customer_name}'s specific operational context**...

### **Functional Jobs**
    - **List** exactly 2 core functional tasks using bullets (`*`) or numbers (`1.`).
    - **Following EACH listed job, elaborate concisely in an analytical paragraph (concisely, ~30-80 words)** on *why* this job is crucial in **{target_customer_name}'s specific operational environment**... **Critically analyze *why* this job matters strategically**... Provide **substantive but brief analysis for each point.**

### **Hidden / Emotional Jobs**
    - **List** exactly 2 underlying emotional drivers/stakes using bullets (`*`) or numbers (`1.`).
    - **Following EACH listed driver/stake, unpack concisely in a detailed paragraph (concisely, ~30-80 words)** the core reasons behind these emotions within **{target_customer_name}'s industry context**... Provide **illustrative examples**... Go deep into the personal and professional implications, **focusing on the key emotional drivers.**

### **Success Metrics**
    - **List** specific, measurable metrics including **at least one Leading Indicator and at least one Lagging Indicator**. Format exactly as: "**Leading Indicator:** [metric name]" and "**Lagging Indicator:** [metric name]".
    - **Following EACH metric, explain concisely in a detailed paragraph (concisely, ~30-80 words)** its significance and interpretation within {target_customer_name}'s context... analyze *how* it reflects success and *why* it's critical...

### **Pain Points**
    - **List** exactly 3 significant pain points using bullets (`*`) or numbers (`1.`).
    - **Following EACH listed pain point, provide a concise, detailed paragraph (concisely, ~30-80 words)** analyzing its root causes and illustrating its operational/financial impact... Explain the **key consequences**... **Map out the core causal chain briefly.** Connect pains to the emotional strain... **Provide insightful but brief analysis for each point.**

### **Solutions ({vendor_name}'s Offering)**
    - **List** exactly 3 {vendor_name} offerings/solutions that directly address the 3 pain points listed above (maintain one-to-one mapping).
    - **Following EACH listed solution, provide a concise, detailed paragraph (concisely, ~30-80 words)** using a 'What/How/Value' narrative structure... Explain the underlying principle... Dissect the core mechanism... Articulate the key value **for them**... Contrast before/after **succinctly**... **Provide concise analysis for each solution.**

### **Hidden Emotional Benefits**
    - **List** exactly 2 key emotional benefits using bullets (`*`) or numbers (`1.`).
    - **Following EACH listed benefit, explain concisely in a detailed paragraph (concisely, ~30-80 words)** *precisely how* the solution delivers this emotional relief **within the context of {target_customer_name}'s challenges**... explicitly connect back to specific Hidden/Emotional Jobs and Pain Points...

### **Summary of Outcome: {outcome_title}**
    - Provide a **very concise concluding paragraph (concise, 2-3 sentences)** **synthesizing** the core transformation... Explicitly state how addressing this outcome creates **tangible strategic value**...

**FINAL MANDATORY REVIEW FOR THIS SECTION:** Before concluding, meticulously review your response for this single outcome. Does it meet the depth, nuance, context, and formatting requirements specified above, **while adhering to the conciseness instructions?** **Output failing these high standards is unacceptable.**
"""
    return prompt

def generate_summary_takeaways_prompt(background_context: str, vendor_name: str, target_customer_name: str, role_names: str, num_outcomes: int = 15) -> str:
    """
    Generates a prompt to ask the LLM for only the final summary and takeaways sections.
    """
    prompt = f"""
You are a **world-class strategic advisor and master narrative consultant** from a top-tier firm.

**CRITICAL LANGUAGE INSTRUCTION: Use clear, accessible English throughout. Avoid complex business jargon, overly sophisticated vocabulary, and academic language. Write in a way that is professional but easy to understand. Use simple, direct sentences and common words instead of complex terminology. The content should be insightful and analytical but expressed in plain English that any business professional can easily follow.**

Based on the comprehensive analysis implicitly covered across {num_outcomes} distinct outcomes (which you should infer from the provided background context), generate **ONLY** the final "Summary & Strategic Integration" and "Key Takeaways & Next Steps" sections for a Point-of-View (POV) report mapping {vendor_name}'s capabilities to {target_customer_name}'s needs, specifically for the {role_names}.

**Background Context (Use this to inform the summary and takeaways):**
{background_context}

**Instructions for the Sections to Generate:**

--- [Assume a rule precedes this section in the final document] ---

## **Summary & Strategic Integration of All {num_outcomes} Outcomes**
    - Synthesize the overall strategic narrative emerging from the (implied) {num_outcomes} outcomes.
    - **Use numbered lists (`1.`, `2.`, etc.) for the main integration points.**
    - **Ensure EACH numbered point is followed by a detailed, analytical paragraph** providing strategic guidance and rationale, **tailored to {target_customer_name}'s overall business context**. Explain how the combined impact of addressing these outcomes repositions {target_customer_name} competitively. Connect the dots between individual outcomes to highlight synergistic effects. Articulate the overarching value proposition at a strategic level.

--- [Ensure rule used before Key Takeaways] ---

## **Key Takeaways & Next Steps**
    - Distill the most critical insights and actionable recommendations.
    - **Use bullet points (`-` or `*`) for the main takeaways.**
    - **Ensure EACH bullet point is followed by a detailed, analytical paragraph** articulating the strategic value, positioning, collaboration needs, or empowerment focus, **all within the context of {target_customer_name}**. Focus on actionable next steps, potential implementation considerations, and how to maintain momentum. Frame the key benefits in executive-level language.

**Formatting Requirements:**
*   Use **Markdown H2 (`##`)** for the two main section titles, bolded (`**...**`).
*   Use numbered lists/bullet points as specified above.
*   Ensure each point is followed by a detailed analytical paragraph.
*   Maintain a highly professional, strategic, and authoritative tone. Use **clear, accessible language that remains professional and strategic**.
*   Start the output directly with `## **Summary & Strategic Integration...**`. Do not include any introductory text before this heading. Include the `---` separator between the two sections as shown.

**Output:**
Return *only* the markdown for these two final sections, formatted exactly as specified.
"""
    return prompt

def generate_pov_prompt(vendor_name, target_customer):
    """
    Enhanced prompt to generate a more detailed POV analysis.
    """
    prompt = f"""
    Create a detailed Point of View (POV) Report for {vendor_name} targeting {target_customer}.
    
    Please include:
    1. Vendor Information:
       - Full company name
       - Official website URL
       - Comprehensive list of products and services offered
       
    2. Target Customer Information:
       - Full organization name
       - Official website URL
       - Description of their business/operations
       
    3. Executive Summary:
       - Clear analysis of potential relationship
       - Value proposition
       - Key opportunities
    
    Format the response in a structured manner with clear sections and bullet points where appropriate.
    """
    return prompt

def format_pov_output(raw_output):
    """
    Formats the LLM output into the standardized POV report structure.
    """
    # Parse the raw output and structure it according to the new format
    structured_output = {
        "title": "POV (Point of View) Report",
        "sections": {
            "vendor_information": {},
            "customer_information": {},
            "executive_summary": ""
        }
    }
    
    # Extract and structure the information from raw_output
    # This would need pattern matching or parsing logic based on your LLM's output format
    
    return structured_output 