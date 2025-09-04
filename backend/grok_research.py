import os
import json
import asyncio
from typing import List, Dict, Optional
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

# Initialize Grok client
GROK_API_KEY = os.getenv("GROK_API_KEY")
if not GROK_API_KEY:
    raise ValueError("GROK_API_KEY environment variable not set")

grok_client = AsyncOpenAI(
    api_key=GROK_API_KEY,
    base_url="https://api.x.ai/v1"
)

async def generate_research_questions_with_grok(
    company_name: str, 
    company_url: Optional[str] = None, 
    additional_context: Optional[str] = None
) -> List[str]:
    """
    Use Grok to generate 6-8 strategic research questions about the target company
    """
    print(f"🤖 Generating research questions for {company_name} using Grok...")
    
    prompt = f"""Generate exactly 6-8 strategic research questions to deeply understand this target company for business development purposes.

Company Name: {company_name}
Company URL: {company_url if company_url else 'Not provided'}
Additional Context: {additional_context if additional_context else 'General business research'}

Generate questions that would help a vendor understand:
1. Company's core business model, products, and capabilities
2. Main operational challenges and pain points they face
3. Key decision makers, stakeholders, and organizational structure
4. Recent developments, news, and strategic initiatives
5. Industry position, competitive landscape, and market pressures
6. Technology stack, infrastructure, and operational needs
7. Growth areas and future business priorities
8. Potential vendor partnership opportunities

Requirements:
- Each question should be specific and actionable for research
- Focus on information that would help in sales/partnership contexts
- Questions should enable deep research with current, relevant information
- Return ONLY a JSON array of strings, no other text

Example format: ["What are Company's main operational challenges in 2024?", "Who are the key decision makers in Company's technology division?"]

Return exactly 6-8 questions as a JSON array:"""

    try:
        response = await grok_client.chat.completions.create(
            model="grok-4-0709",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        content = response.choices[0].message.content.strip()
        
        # Clean up potential markdown formatting
        if content.startswith('```json'):
            content = content.replace('```json', '').replace('```', '').strip()
        elif content.startswith('```'):
            content = content.replace('```', '').strip()
        
        # Parse JSON response
        questions = json.loads(content)
        
        if not isinstance(questions, list):
            raise ValueError("Response is not a list")
        
        if len(questions) < 6 or len(questions) > 8:
            print(f"⚠️ Warning: Expected 6-8 questions, got {len(questions)}")
        
        print(f"✅ Generated {len(questions)} research questions")
        return questions
        
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse JSON response: {e}")
        print(f"Raw response: {content}")
        raise Exception(f"Failed to parse research questions from Grok: {e}")
    except Exception as e:
        print(f"❌ Error generating research questions: {e}")
        raise Exception(f"Failed to generate research questions: {e}")

async def grok_research_call(question: str, company_name: str) -> Dict:
    """
    Make a single deep research call to Grok for a specific question
    """
    prompt = f"""Conduct deep research to answer this question about {company_name}:

Question: {question}

Instructions:
- Provide comprehensive, current, and factual information
- Use deep research capabilities to find recent and relevant data
- Include specific details, names, dates, and concrete information when available
- Structure your response with clear sections and bullet points
- Focus on actionable business intelligence
- If information is not available or uncertain, clearly state that

Research deeply and provide a thorough answer:"""

    try:
        response = await grok_client.chat.completions.create(
            model="grok-4-0709",
            messages=[
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            temperature=0.1,
            max_tokens=2000
        )
        
        return {
            "question": question,
            "answer": response.choices[0].message.content,
            "status": "success"
        }
        
    except Exception as e:
        print(f"❌ Research call failed for question: {question[:50]}... Error: {e}")
        return {
            "question": question,
            "answer": f"Research failed: {str(e)}",
            "status": "error"
        }

async def execute_parallel_research(questions: List[str], company_name: str) -> List[Dict]:
    """
    Execute all research questions in parallel using asyncio.gather()
    """
    print(f"🔍 Executing {len(questions)} research questions in parallel...")
    
    # Create tasks for all research questions
    tasks = [
        grok_research_call(question, company_name) 
        for question in questions
    ]
    
    # Execute all tasks in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Process results and handle any exceptions
    processed_results = []
    successful_count = 0
    
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            processed_results.append({
                "question": questions[i],
                "answer": f"Research failed with exception: {str(result)}",
                "status": "error"
            })
        else:
            processed_results.append(result)
            if result.get("status") == "success":
                successful_count += 1
    
    print(f"✅ Parallel research completed: {successful_count}/{len(questions)} successful")
    
    if successful_count == 0:
        raise Exception("All research questions failed")
    
    return processed_results

def compile_research_results(research_results: List[Dict], company_name: str) -> Dict:
    """
    Compile all research results into structured data format
    """
    print(f"📊 Compiling research results for {company_name}...")
    
    # Separate successful and failed results
    successful_results = [r for r in research_results if r.get("status") == "success"]
    failed_questions = [r["question"] for r in research_results if r.get("status") == "error"]
    
    # Combine all successful answers
    all_research_content = "\n\n".join([
        f"Q: {result['question']}\nA: {result['answer']}"
        for result in successful_results
    ])
    
    # Create structured compilation
    compiled_research = {
        "target_company": company_name,
        "research_summary": {
            "total_questions": len(research_results),
            "successful_research": len(successful_results),
            "failed_questions": failed_questions,
            "compiled_intelligence": all_research_content
        },
        "structured_insights": {
            "company_overview": extract_company_overview(successful_results),
            "business_capabilities": extract_capabilities(successful_results),
            "pain_points_challenges": extract_pain_points(successful_results),
            "key_personnel_stakeholders": extract_personnel(successful_results),
            "recent_developments": extract_recent_developments(successful_results),
            "industry_market_context": extract_industry_context(successful_results),
            "technology_infrastructure": extract_technology_info(successful_results),
            "growth_opportunities": extract_growth_opportunities(successful_results)
        },
        "pov_context_block": format_for_pov_context(company_name, successful_results),
        "research_questions_used": [r["question"] for r in successful_results]
    }
    
    print(f"✅ Research compilation completed")
    return compiled_research

def extract_company_overview(results: List[Dict]) -> str:
    """Extract company overview information from research results"""
    overview_keywords = ["business model", "company overview", "what does", "core business", "primary focus"]
    relevant_content = []
    
    for result in results:
        question = result["question"].lower()
        answer = result["answer"]
        
        if any(keyword in question for keyword in overview_keywords):
            relevant_content.append(answer)
    
    return "\n".join(relevant_content) if relevant_content else "No specific company overview information found."

def extract_capabilities(results: List[Dict]) -> str:
    """Extract business capabilities and services"""
    capability_keywords = ["capabilities", "services", "products", "offerings", "solutions", "expertise"]
    relevant_content = []
    
    for result in results:
        question = result["question"].lower()
        answer = result["answer"]
        
        if any(keyword in question for keyword in capability_keywords):
            relevant_content.append(answer)
    
    return "\n".join(relevant_content) if relevant_content else "No specific capability information found."

def extract_pain_points(results: List[Dict]) -> str:
    """Extract pain points and challenges"""
    pain_keywords = ["challenges", "pain points", "problems", "difficulties", "issues", "obstacles"]
    relevant_content = []
    
    for result in results:
        question = result["question"].lower()
        answer = result["answer"]
        
        if any(keyword in question for keyword in pain_keywords):
            relevant_content.append(answer)
    
    return "\n".join(relevant_content) if relevant_content else "No specific pain point information found."

def extract_personnel(results: List[Dict]) -> str:
    """Extract key personnel and stakeholder information"""
    personnel_keywords = ["decision makers", "key personnel", "leadership", "stakeholders", "executives", "management"]
    relevant_content = []
    
    for result in results:
        question = result["question"].lower()
        answer = result["answer"]
        
        if any(keyword in question for keyword in personnel_keywords):
            relevant_content.append(answer)
    
    return "\n".join(relevant_content) if relevant_content else "No specific personnel information found."

def extract_recent_developments(results: List[Dict]) -> str:
    """Extract recent news and developments"""
    news_keywords = ["recent", "news", "developments", "initiatives", "announcements", "updates", "latest"]
    relevant_content = []
    
    for result in results:
        question = result["question"].lower()
        answer = result["answer"]
        
        if any(keyword in question for keyword in news_keywords):
            relevant_content.append(answer)
    
    return "\n".join(relevant_content) if relevant_content else "No recent development information found."

def extract_industry_context(results: List[Dict]) -> str:
    """Extract industry and market context"""
    industry_keywords = ["industry", "market", "competitive", "landscape", "position", "competitors", "sector"]
    relevant_content = []
    
    for result in results:
        question = result["question"].lower()
        answer = result["answer"]
        
        if any(keyword in question for keyword in industry_keywords):
            relevant_content.append(answer)
    
    return "\n".join(relevant_content) if relevant_content else "No industry context information found."

def extract_technology_info(results: List[Dict]) -> str:
    """Extract technology and infrastructure information"""
    tech_keywords = ["technology", "infrastructure", "tech stack", "systems", "platform", "software", "tools"]
    relevant_content = []
    
    for result in results:
        question = result["question"].lower()
        answer = result["answer"]
        
        if any(keyword in question for keyword in tech_keywords):
            relevant_content.append(answer)
    
    return "\n".join(relevant_content) if relevant_content else "No technology information found."

def extract_growth_opportunities(results: List[Dict]) -> str:
    """Extract growth areas and opportunities"""
    growth_keywords = ["growth", "opportunities", "expansion", "future", "strategic", "priorities", "goals"]
    relevant_content = []
    
    for result in results:
        question = result["question"].lower()
        answer = result["answer"]
        
    
        if any(keyword in question for keyword in growth_keywords):
            relevant_content.append(answer)
    
    return "\n".join(relevant_content) if relevant_content else "No growth opportunity information found."

def format_for_pov_context(company_name: str, results: List[Dict]) -> str:
    """
    Format research results into a context block ready for POV analysis
    """
    context_block = f"""
ENHANCED TARGET COMPANY RESEARCH - {company_name.upper()}
================================================================

This comprehensive research was conducted using Grok deep research capabilities to provide enhanced context for POV analysis.

RESEARCH FINDINGS:
"""
    
    for i, result in enumerate(results, 1):
        context_block += f"\n{i}. RESEARCH QUESTION: {result['question']}\n"
        context_block += f"   FINDINGS: {result['answer']}\n"
        context_block += "-" * 80 + "\n"
    
    context_block += """
END OF ENHANCED RESEARCH
================================================================

This research should be used to inform POV analysis with current, detailed intelligence about the target company's situation, challenges, and opportunities.
"""
    
    return context_block


