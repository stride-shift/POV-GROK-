import os
from dotenv import load_dotenv

# Load environment variables FIRST before importing anything that needs them
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, Header, Body
from fastapi.responses import Response, FileResponse, PlainTextResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from typing import Optional, List
from pov_function import generate_pov_analysis_parallel, format_pov_as_markdown, generate_pov_titles_only, generate_selected_outcomes_only
import pypandoc
import uuid
import uvicorn
import json
from datetime import datetime
from database import (
    create_pov_report, 
    save_outcome_titles, 
    save_outcome_details, 
    save_summary_and_takeaways, 
    update_report_status,
    get_pov_report_data,
    get_pov_report_data_with_auth,
    get_user_reports,
    update_selected_titles,
    get_selected_titles,
    save_selected_outcome_details,
    get_report_titles_only,
    save_context_data,
    get_context_data,
    get_selection_summary,
    create_user_profile,
    update_user_profile,
    delete_user_profile,
    get_user_profile,
    get_all_user_profiles,
    search_user_profiles,
    create_user_profile_with_auth,
    update_user_profile_with_auth,
    delete_user_profile_with_auth,
    get_user_profiles_with_auth,
    get_all_reports_with_auth,
    get_user_profile_by_id,
    check_admin_or_super_admin_access,
    check_super_admin_access,
    # System settings and expiry functions
    get_system_setting,
    set_system_setting,
    expire_old_accounts,
    get_expiry_settings,
    set_user_expiry,
    get_users_expiring_soon,
    # Organization user limit functions
    check_organization_user_limit,
    get_organization_user_info,
    set_organization_user_limit,
    get_all_organization_limits,
    # New report quota functions
    check_user_report_quota,
    increment_user_report_count,
    get_user_quota_status,
    reset_user_quotas,
    get_quota_settings,
    set_user_report_quotas,
    get_users_over_quota,
    supabase,
    # Cold call email functions
    create_cold_call_email,
    get_cold_call_emails_by_report,
    get_cold_call_email_by_id,
    update_cold_call_email_status,
    delete_cold_call_email
)

# Optional Grok research integration
try:
    from grok_research import (
        generate_research_questions_with_grok,
        execute_parallel_research,
        compile_research_results
    )
    _grok_available = True
except Exception as _grok_import_error:
    print(f"⚠️ Grok research not available: {_grok_import_error}")
    _grok_available = False

# Get API key from environment variable
API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY environment variable not set")

app = FastAPI(title="POV Analysis API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Create a directory for temporary files if it doesn't exist
os.makedirs("temp", exist_ok=True)

def cleanup_temp_files_list(file_list):
    """Helper function to clean up a list of temporary files"""
    for file_path in file_list:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"🧹 Cleaned up temp file: {file_path}")
        except Exception as e:
            print(f"⚠️ Failed to clean up {file_path}: {e}")

def create_cleanup_task(file_list):
    """Create a cleanup task for the background parameter"""
    def cleanup():
        cleanup_temp_files_list(file_list)
    return cleanup

class POVRequest(BaseModel):
    vendor_name: str
    vendor_url: str
    vendor_services: str
    target_customer_name: str
    target_customer_url: str
    role_names: Optional[str] = None
    linkedin_urls: Optional[str] = None
    role_context: Optional[str] = None
    additional_context: Optional[str] = None
    output_format: Optional[str] = "markdown"  # Can be "markdown", "docx", "json"
    model_name: Optional[str] = "gpt-4.1-mini"

class POVDatabaseRequest(BaseModel):
    user_id: str
    vendor_name: str
    vendor_url: Optional[str] = None
    vendor_services: Optional[str] = None
    target_customer_name: str
    target_customer_url: Optional[str] = None
    role_names: Optional[str] = None
    linkedin_urls: Optional[str] = None
    role_context: Optional[str] = None
    additional_context: Optional[str] = None
    model_name: Optional[str] = "gpt-4.1-mini"
    num_outcomes: Optional[int] = 15

class MarkdownToDocxRequest(BaseModel):
    markdown_content: str
    filename: Optional[str] = "output.docx"

class POVTitlesRequest(BaseModel):
    user_id: str
    vendor_name: str
    vendor_url: Optional[str] = None
    vendor_services: Optional[str] = None
    target_customer_name: str
    target_customer_url: Optional[str] = None
    role_names: Optional[str] = None
    linkedin_urls: Optional[str] = None
    role_context: Optional[str] = None
    additional_context: Optional[str] = None
    model_name: Optional[str] = "gpt-4.1-mini"
    num_outcomes: Optional[int] = 15
    use_grok_research: Optional[bool] = False

class UpdateSelectedTitlesRequest(BaseModel):
    user_id: str
    selected_indices: List[int]

class CreateUserRequest(BaseModel):
    email: str
    password: Optional[str] = None  # Optional for external users
    full_name: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    organization_role: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = True
    metadata: Optional[dict] = None
    # New fields for account expiry and report quotas
    auto_expire_days: Optional[int] = None
    # New fields for report quotas
    report_quota_total: Optional[int] = None
    report_quota_monthly: Optional[int] = None
    report_quota_daily: Optional[int] = None

class UpdateUserRequest(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    organization_role: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None
    metadata: Optional[dict] = None
    # New fields for account expiry and report quotas
    auto_expire_days: Optional[int] = None
    # New fields for report quotas
    report_quota_total: Optional[int] = None
    report_quota_monthly: Optional[int] = None
    report_quota_daily: Optional[int] = None

class DeleteUserRequest(BaseModel):
    permanent: Optional[bool] = False  # If True, permanently delete; if False, just deactivate

# New request models for seat management and time-boxed access
class SystemSettingRequest(BaseModel):
    setting_key: str
    setting_value: str
    description: Optional[str] = None

class SetUserExpiryRequest(BaseModel):
    expiry_days: Optional[int] = None
    expiry_date: Optional[str] = None

class SetOrganizationExpiryRequest(BaseModel):
    organization: str
    expiry_days: Optional[int] = None

class SetUserQuotasRequest(BaseModel):
    report_quota_total: Optional[int] = None
    report_quota_monthly: Optional[int] = None
    report_quota_daily: Optional[int] = None

class SetOrganizationQuotasRequest(BaseModel):
    organization: str
    report_quota_total: Optional[int] = None
    report_quota_monthly: Optional[int] = None
    report_quota_daily: Optional[int] = None  # ISO format date string

# SeatManagementSettingsRequest removed - using organization limits instead

class ExpirySettingsRequest(BaseModel):
    default_account_expiry_days: Optional[int] = None
    auto_expiry_enabled: Optional[bool] = None

# New request models for report quota management
class ReportQuotaSettingsRequest(BaseModel):
    default_report_quota_total: Optional[int] = None
    default_report_quota_monthly: Optional[int] = None
    default_report_quota_daily: Optional[int] = None
    report_quota_enabled: Optional[bool] = None

class SetUserQuotaRequest(BaseModel):
    quota_total: Optional[int] = None
    quota_monthly: Optional[int] = None
    quota_daily: Optional[int] = None

class ResetQuotaRequest(BaseModel):
    reset_type: str = "all"  # 'daily', 'monthly', 'total', 'all'

class SetOrganizationUserLimitRequest(BaseModel):
    organization: str
    user_limit: Optional[int] = None  # None means unlimited

class GenerateEmailProposalRequest(BaseModel):
    user_id: str
    custom_instructions: Optional[str] = None

class GenerateColdCallEmailRequest(BaseModel):
    user_id: str
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_company: Optional[str] = None
    selected_outcomes: List[int] = []  # Array of outcome indices
    custom_instructions: Optional[str] = None

class GenerateWhitepaperRequest(BaseModel):
    user_id: str
    title: str
    custom_instructions: Optional[str] = None
    selected_outcomes: List[int] = []

class GenerateMarketingAssetRequest(BaseModel):
    user_id: str
    asset_type: str  # one_pager, linkedin_post, blog, landing_page, press_release
    title: str
    custom_instructions: Optional[str] = None
    selected_outcomes: List[int] = []

class GenerateSalesScriptRequest(BaseModel):
    user_id: str
    scenario: str  # cold_call, discovery, objection_handling, demo_intro, follow_up
    title: str
    custom_instructions: Optional[str] = None
    selected_outcomes: List[int] = []

class AdminPasswordResetRequest(BaseModel):
    new_password: str

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )
    return x_api_key

@app.post("/generate-pov")
async def generate_pov(
    request: POVRequest,
    api_key: str = Depends(verify_api_key)
):
    temp_files = []
    try:
        # Generate the POV analysis
        pov_markdown = await generate_pov_analysis_parallel(
            vendor_name=request.vendor_name,
            vendor_url=request.vendor_url,
            vendor_services=request.vendor_services,
            target_customer_name=request.target_customer_name,
            target_customer_url=request.target_customer_url,
            role_names=request.role_names,
            linkedin_urls=request.linkedin_urls,
            role_context=request.role_context,
            additional_context=request.additional_context,
            model_name=request.model_name
        )
        
        # Create filename and paths
        request_id = str(uuid.uuid4())
        # Sanitize names for filename: replace space and slash with underscore
        safe_vendor_name = request.vendor_name.replace(' ', '_').replace('/', '_')
        safe_customer_name = request.target_customer_name.replace(' ', '_').replace('/', '_')
        current_date = datetime.now().strftime("%Y%m%d")
        base_filename = f"{safe_vendor_name}_{safe_customer_name}_POV_Report_{current_date}"
        md_path = os.path.join("temp", f"{base_filename}.md")
        docx_path = os.path.join("temp", f"{base_filename}.docx")
        temp_files.extend([md_path, docx_path])
        
        # Save markdown to a temporary file
        format_pov_as_markdown(pov_markdown, md_path)
        
        # Determine response based on requested format
        output_format_lower = request.output_format.lower()

        if output_format_lower == "json":
            # Return the markdown content as JSON
            return JSONResponse({
                "markdown_content": pov_markdown,
                "suggested_filename": f"{base_filename}.md"
            })

        elif output_format_lower == "docx":
            # Convert markdown to docx using pypandoc
            try:
                pypandoc.convert_file(md_path, 'docx', outputfile=docx_path)
                if not os.path.exists(docx_path):
                     raise HTTPException(
                        status_code=500,
                        detail="Failed to generate DOCX file using Pandoc."
                    )
                
                # Return DOCX file with background cleanup
                response = FileResponse(
                    path=docx_path,
                    filename=f"{base_filename}.docx",
                    media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    headers={
                        "Content-Disposition": f"attachment; filename={base_filename}.docx"
                    },
                    background=create_cleanup_task(temp_files)
                )
                return response
            except Exception as pandoc_error:
                # Clean up files on Pandoc error
                for file in temp_files:
                    if os.path.exists(file):
                        os.remove(file)
                raise HTTPException(
                    status_code=500,
                    detail=f"Error during DOCX conversion: {pandoc_error}. Ensure Pandoc is installed and accessible."
                )

        else: # Default to markdown
            # Return markdown output
            return PlainTextResponse(
                content=pov_markdown,
                media_type="text/markdown",
                headers={
                    "Content-Disposition": f"attachment; filename={base_filename}.md"
                }
            )
        
    except Exception as e:
        # Clean up files on error
        for file in temp_files:
            if os.path.exists(file):
                os.remove(file)
                
        import traceback
        error_details = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        raise HTTPException(
            status_code=500,
            detail=error_details
        )

@app.post("/generate-pov-to-database")
async def generate_pov_to_database(
    request: POVDatabaseRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Generate POV analysis and save components to Supabase database.
    Returns the report ID and individual components (titles, outcomes, summary).
    """
    print(f"\n🚀 Starting POV generation for {request.vendor_name} -> {request.target_customer_name}")
    print(f"📋 User ID: {request.user_id}")
    print(f"🤖 Model: {request.model_name}")
    print(f"🎯 Number of outcomes: {request.num_outcomes}")
    
    try:
        # Check user report quota before proceeding
        print("🔍 Checking user report quota...")
        can_generate = await check_user_report_quota(request.user_id)
        if not can_generate:
            quota_status = await get_user_quota_status(request.user_id)
            print(f"❌ User quota exceeded: {quota_status}")
            raise HTTPException(
                status_code=429,  # Too Many Requests
                detail={
                    "message": "Report generation quota exceeded",
                    "quota_status": quota_status,
                    "type": "quota_exceeded"
                }
            )
        print("✅ User quota check passed")
        
        print("📝 Creating report record in database...")
        # Create the report record first
        report_id = await create_pov_report(
            user_id=request.user_id,
            vendor_name=request.vendor_name,
            vendor_url=request.vendor_url,
            vendor_services=request.vendor_services,
            target_customer_name=request.target_customer_name,
            target_customer_url=request.target_customer_url,
            role_names=request.role_names,
            linkedin_urls=request.linkedin_urls,
            role_context=request.role_context,
            additional_context=request.additional_context,
            model_name=request.model_name
        )
        print(f"✅ Report created with ID: {report_id}")

        # NOTE: Quota will be charged only after successful generation to avoid charging for failed reports

        try:
            # Import the individual functions from pov_function for the parallel approach
            from pov_function import (
                process_research, 
                process_file_content, 
                process_linkedin_profiles
            )
            from llm import llm_call, generate_outcome_titles_prompt, generate_single_outcome_detail_prompt, generate_summary_takeaways_prompt
            import asyncio
            import json

            # Step 1: Gather context (same as in generate_pov_analysis_parallel)
            print("🔍 Step 1: Gathering context data...")
            print(f"   - Researching vendor: {request.vendor_url}")
            print(f"   - Researching customer: {request.target_customer_url}")
            if request.linkedin_urls:
                print(f"   - Processing LinkedIn profiles")
            
            tasks = [
                process_research(request.vendor_url, "vendor"),
                process_research(request.target_customer_url, "customer")
            ]
            
            # Add LinkedIn profile fetching if URLs provided
            if request.linkedin_urls:
                tasks.append(process_linkedin_profiles(request.linkedin_urls))
            
            results = await asyncio.gather(*tasks)
            print("✅ Context gathering completed")
            
            # Process results
            vendor_research = None
            customer_research = None
            linkedin_profiles_data = None
            
            for i, result in enumerate(results):
                if result["status"] == "success":
                    if i == 0:  # vendor research
                        vendor_research = result["data"]
                    elif i == 1:  # customer research
                        customer_research = result["data"]
                    elif i == 2:  # linkedin profiles
                        linkedin_profiles_data = result["data"]

            # Create background context
            background_context = f"""
vendor_name: {request.vendor_name}
vendor_url: {request.vendor_url}
vendor_services: {request.vendor_services}
target_customer_name: {request.target_customer_name}
target_customer_url: {request.target_customer_url}
role_names: {request.role_names}
linkedin_urls: {request.linkedin_urls}
role_context: {request.role_context}
additional_context: {request.additional_context}

Vendor Research: {json.dumps(vendor_research, indent=2) if vendor_research else "Not available"}
Customer Research: {json.dumps(customer_research, indent=2) if customer_research else "Not available"}
LinkedIn Profiles Analysis: {linkedin_profiles_data if linkedin_profiles_data else "Not available or not requested"}
"""

            # Step 2: Generate outcome titles
            print(f"🎯 Step 2: Generating {request.num_outcomes} outcome titles...")
            title_prompt = generate_outcome_titles_prompt(
                background_context, request.vendor_name, request.target_customer_name, request.role_names, request.num_outcomes
            )
            title_responses, _ = await llm_call(instructions=[title_prompt], model=request.model_name)
            
            # Parse titles
            json_string = title_responses[0].strip().strip('`').strip("json\n")
            outcome_titles = json.loads(json_string)
            print(f"✅ Generated {len(outcome_titles)} outcome titles")
            
            # Save titles to database
            print("💾 Saving titles to database...")
            await save_outcome_titles(report_id, outcome_titles)
            print("✅ Titles saved to database")

            # Step 3: Generate detailed outcomes in parallel
            print(f"⚡ Step 3: Generating detailed analysis for all {request.num_outcomes} outcomes in parallel...")
            detail_prompts = []
            for i, title in enumerate(outcome_titles, 1):
                print(f"   - Preparing prompt {i}: {title[:50]}...")
                detail_prompts.append(
                    generate_single_outcome_detail_prompt(
                        background_context, title, request.vendor_name, request.target_customer_name, request.role_names
                    )
                )
            
            print(f"🚀 Sending {len(detail_prompts)} parallel requests to LLM...")
            outcome_details, _ = await llm_call(instructions=detail_prompts, model=request.model_name)
            print(f"✅ Received {len(outcome_details)} detailed outcome analyses")
            
            # Save outcomes to database
            print("💾 Saving outcome details to database...")
            await save_outcome_details(report_id, outcome_details)
            print("✅ Outcome details saved to database")

            # Step 4: Generate summary and takeaways
            print("📊 Step 4: Generating summary and strategic takeaways...")
            summary_prompt = generate_summary_takeaways_prompt(
                background_context, request.vendor_name, request.target_customer_name, request.role_names, request.num_outcomes
            )
            summary_responses, _ = await llm_call(instructions=[summary_prompt], model=request.model_name)
            summary_content = summary_responses[0] if summary_responses else ""
            print("✅ Summary and takeaways generated")
            
            # Save summary to database
            print("💾 Saving summary to database...")
            await save_summary_and_takeaways(report_id, summary_content)
            print("✅ Summary saved to database")

            # Update report status to completed
            print("🏁 Updating report status to completed...")
            await update_report_status(report_id, "completed")
            print("✅ Report status updated")

            # Charge user quota only after successful completion
            print("📊 Incrementing user report count after successful generation...")
            await increment_user_report_count(request.user_id)
            print("✅ Report count incremented")

            # Return the components
            print(f"🎉 POV generation completed successfully!")
            print(f"📋 Report ID: {report_id}")
            print(f"📊 Generated {len(outcome_titles)} titles, {len(outcome_details)} outcomes, and summary")
            
            return JSONResponse({
                "report_id": report_id,
                "status": "completed",
                "titles": outcome_titles,
                "outcomes": outcome_details,
                "summary": summary_content,
                "message": "POV analysis generated and saved to database successfully"
            })

        except Exception as generation_error:
            print(f"❌ Error during POV generation: {str(generation_error)}")
            # Update report status to failed
            await update_report_status(report_id, "failed")
            raise HTTPException(
                status_code=500,
                detail=f"Error during POV generation: {str(generation_error)}"
            )

    except HTTPException:
        # Re-raise HTTP exceptions (like quota exceeded)
        raise
    except Exception as e:
        print(f"💥 Fatal error in POV generation: {str(e)}")
        import traceback
        print(f"🔍 Traceback: {traceback.format_exc()}")
        error_details = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        raise HTTPException(
            status_code=500,
            detail=error_details
        )

@app.get("/get-pov-report/{report_id}")
async def get_pov_report(
    report_id: str,
    user_id: str = None,
    current_user_id: str = Header(None, alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Retrieve a POV report and its components from the database with role-based authorization
    """
    try:
        # Determine the requesting user ID
        requesting_user_id = current_user_id if current_user_id else user_id
        
        if not requesting_user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        # Use the new authorization-aware function
        report_data = await get_pov_report_data_with_auth(report_id, requesting_user_id)
        return JSONResponse(report_data)
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )

@app.get("/get-user-reports/{user_id}")
async def get_user_reports_endpoint(
    user_id: str,
    current_user_id: str = Header(None, alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get all POV reports for a user with authorization (users can see their own, admins can see their org users, super-admins can see all)
    """
    try:
        # If no current_user_id provided, assume it's the user themselves (backward compatibility)
        if not current_user_id:
            current_user_id = user_id
        
        # Check if user is accessing their own reports
        if current_user_id == user_id:
            reports = await get_user_reports(user_id)
            return JSONResponse({"reports": reports})
        
        # For other users, need admin authorization
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile:
            raise HTTPException(status_code=403, detail="Unauthorized: User profile not found")
        
        requesting_role = requesting_profile.get("role")
        
        # Super admins can see any user's reports
        if requesting_role == "super_admin":
            reports = await get_user_reports(user_id)
            return JSONResponse({"reports": reports})
        
        # Admins can see reports from users in their organization
        if requesting_role == "admin":
            target_profile = await get_user_profile_by_id(user_id)
            if not target_profile:
                raise HTTPException(status_code=404, detail="Target user not found")
            
            requesting_org = requesting_profile.get("organization")
            target_org = target_profile.get("organization")
            
            if requesting_org and requesting_org == target_org:
                reports = await get_user_reports(user_id)
                return JSONResponse({"reports": reports})
            else:
                raise HTTPException(status_code=403, detail="Unauthorized: Can only view reports from users in your organization")
        
        # Regular users can only see their own reports
        raise HTTPException(status_code=403, detail="Unauthorized: Insufficient permissions")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/reports")
async def get_all_reports(
    organization: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get reports with role-based access (super-admins see all, others see their own)
    """
    try:
        reports = await get_all_reports_with_auth(
            requesting_user_id=current_user_id,
            organization=organization,
            limit=limit,
            offset=offset
        )
        return JSONResponse({"reports": reports, "total": len(reports)})
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/generate-docx-from-db/{report_id}")
async def generate_docx_from_db(
    report_id: str,
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Retrieve POV data from database and generate a DOCX file
    """
    temp_files = []
    try:
        print(f"📄 Generating DOCX for report ID: {report_id}")
        print(f"👤 User ID: {user_id}")
        
        # Get the report data from database
        print("🔍 Retrieving report data from database...")
        report_data = await get_pov_report_data(report_id, user_id)
        
        if not report_data:
            raise HTTPException(
                status_code=404,
                detail="Report not found or access denied"
            )
        
        print("✅ Report data retrieved successfully")
        
        # Assemble the markdown content
        print("🔧 Assembling markdown content...")
        
        # Get report details
        report = report_data["report"]
        titles = report_data["titles"]
        outcomes = report_data["outcomes"]
        summary_data = report_data["summary"]
        
        # Create the title
        current_date = datetime.now().strftime("%d %B %Y")
        title = f"## **POV Report: {report['vendor_name']} {report['target_customer_name']} {report['role_names']} {current_date}**\n\n"
        
        # Create the information header section
        info_header = f"### **1. Input Information**\n"
        info_header += f"- **Vendor Name:** {report['vendor_name']}\n"
        if report.get('vendor_url'):
            info_header += f"- **Vendor URL:** {report['vendor_url']}\n"
        info_header += f"- **Target Customer:** {report['target_customer_name']}\n"
        if report.get('target_customer_url'):
            info_header += f"- **Target Customer URL:** {report['target_customer_url']}\n"
        if report.get('role_names'):
            info_header += f"- **Role(s) Being Sold To:** {report['role_names']}\n"
        if report.get('linkedin_urls'):
            info_header += f"- **LinkedIn URL:** {report['linkedin_urls']}\n"
        if report.get('role_context'):
            info_header += f"- **Role Context:** {report['role_context']}\n"
        if report.get('additional_context'):
            info_header += f"- **Additional Context:** {report['additional_context']}\n"
        info_header += "\n---\n\n"
        
        # Join outcome details with separator
        all_outcomes_markdown = "\n\n---\n\n".join(outcomes)
        
        # Assemble summary content
        summary_content = ""
        if summary_data:
            summary_content = f"\n\n---\n\n## **Summary & Strategic Integration of All {len(outcomes)} Outcomes**\n\n"
            summary_content += summary_data.get('summary_content', '')
            summary_content += f"\n\n---\n\n## **Key Takeaways & Next Steps**\n\n"
            summary_content += summary_data.get('takeaways_content', '')
        
        # Combine all parts
        final_markdown = (
            title
            + info_header
            + all_outcomes_markdown
            + summary_content
        )
        
        print(f"✅ Markdown assembled ({len(final_markdown)} characters)")
        
        # Create temporary files
        request_id = str(uuid.uuid4())
        safe_vendor_name = report['vendor_name'].replace(' ', '_').replace('/', '_')
        safe_customer_name = report['target_customer_name'].replace(' ', '_').replace('/', '_')
        current_date = datetime.now().strftime("%Y%m%d")
        base_filename = f"{safe_vendor_name}_{safe_customer_name}_POV_Report_{current_date}"
        md_path = os.path.join("temp", f"{base_filename}.md")
        docx_path = os.path.join("temp", f"{base_filename}.docx")
        temp_files.extend([md_path, docx_path])
        
        # Save markdown to temporary file
        print("💾 Saving markdown to temporary file...")
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(final_markdown)
        
        # Convert markdown to docx using pypandoc
        print("📄 Converting markdown to DOCX...")
        try:
            pypandoc.convert_file(md_path, 'docx', outputfile=docx_path)
            if not os.path.exists(docx_path):
                raise HTTPException(
                    status_code=500,
                    detail="Failed to generate DOCX file using Pandoc."
                )
            
            print("✅ DOCX file generated successfully")
            
            # Return DOCX file with background cleanup
            response = FileResponse(
                path=docx_path,
                filename=f"{base_filename}.docx",
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f"attachment; filename={base_filename}.docx"
                },
                background=create_cleanup_task(temp_files)
            )
            return response
        except Exception as pandoc_error:
            print(f"❌ Pandoc conversion error: {pandoc_error}")
            # Clean up files on Pandoc error
            for file in temp_files:
                if os.path.exists(file):
                    os.remove(file)
            raise HTTPException(
                status_code=500,
                detail=f"Error during DOCX conversion: {pandoc_error}. Ensure Pandoc is installed and accessible."
            )
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"💥 Error generating DOCX from database: {str(e)}")
        # Clean up files on error
        for file in temp_files:
            if os.path.exists(file):
                os.remove(file)
                
        import traceback
        print(f"🔍 Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating DOCX: {str(e)}"
        )

@app.post("/convert-to-docx")
async def convert_to_docx(
    request: MarkdownToDocxRequest,
    api_key: str = Depends(verify_api_key)
):
    temp_files = []
    try:
        # Generate a unique ID for the files
        request_id = str(uuid.uuid4())
        filename_base = os.path.splitext(request.filename)[0]
        safe_filename = filename_base.replace(' ', '_').replace('/', '_')
        
        # Create file paths
        md_path = os.path.join("temp", f"{safe_filename}_{request_id[:8]}.md")
        docx_path = os.path.join("temp", f"{safe_filename}_{request_id[:8]}.docx")
        temp_files.extend([md_path, docx_path])
        
        # Save markdown to a temporary file
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(request.markdown_content)
        
        # Convert markdown to docx using pypandoc
        try:
            pypandoc.convert_file(md_path, 'docx', outputfile=docx_path)
            if not os.path.exists(docx_path):
                raise HTTPException(
                    status_code=500,
                    detail="Failed to generate DOCX file using Pandoc."
                )
            
            # Return DOCX file with background cleanup
            response = FileResponse(
                path=docx_path,
                filename=f"{safe_filename}.docx",
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f"attachment; filename={safe_filename}.docx"
                },
                background=create_cleanup_task(temp_files)
            )
            return response
        except Exception as pandoc_error:
            # Clean up files on Pandoc error
            for file in temp_files:
                if os.path.exists(file):
                    os.remove(file)
            raise HTTPException(
                status_code=500,
                detail=f"Error during DOCX conversion: {pandoc_error}. Ensure Pandoc is installed and accessible."
            )
    except Exception as e:
        # Clean up files on error
        for file in temp_files:
            if os.path.exists(file):
                os.remove(file)
                
        import traceback
        error_details = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        raise HTTPException(
            status_code=500,
            detail=error_details
        )

# Add endpoint to download files
@app.get("/download-file")
async def download_file(file_path: str, file_name: str):
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )
    
    # Determine content type based on file extension
    file_extension = os.path.splitext(file_name)[1].lower()
    content_type = "application/octet-stream"  # Default
    
    if file_extension == ".docx":
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif file_extension == ".xlsx":
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif file_extension == ".md":
        content_type = "text/markdown"
    
    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type=content_type,
        headers={
            "Content-Disposition": f"attachment; filename={file_name}"
        }
    )

@app.post("/generate-pov-titles")
async def generate_pov_titles(
    request: POVTitlesRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Selective workflow Step 1: Generate POV outcome titles only and save to database.
    Returns the report ID and list of titles for user selection.
    """
    print(f"\n🎯 Starting selective POV workflow - Step 1: Titles only")
    print(f"📋 User ID: {request.user_id}")
    print(f"🏢 {request.vendor_name} -> {request.target_customer_name}")
    print(f"🎯 Number of outcomes: {request.num_outcomes}")
    
    try:
        # Check user report quota before proceeding
        print("🔍 Checking user report quota...")
        can_generate = await check_user_report_quota(request.user_id)
        if not can_generate:
            quota_status = await get_user_quota_status(request.user_id)
            print(f"❌ User quota exceeded: {quota_status}")
            raise HTTPException(
                status_code=429,  # Too Many Requests
                detail={
                    "message": "Report generation quota exceeded",
                    "quota_status": quota_status,
                    "type": "quota_exceeded"
                }
            )
        print("✅ User quota check passed")

        # Step 0: Automatic Grok Research (if enabled and available)
        grok_research_data = None
        if getattr(request, "use_grok_research", False) and _grok_available:
            print("🤖 Grok research enabled - conducting automatic target company research...")
            try:
                research_questions = await generate_research_questions_with_grok(
                    company_name=request.target_customer_name,
                    company_url=request.target_customer_url,
                    additional_context=request.additional_context
                )
                print(f"✅ Generated {len(research_questions)} research questions")

                research_results = await execute_parallel_research(
                    questions=research_questions,
                    company_name=request.target_customer_name
                )

                compiled_research = compile_research_results(
                    research_results=research_results,
                    company_name=request.target_customer_name
                )

                # Store compiled research for later database save
                grok_research_data = compiled_research

                print("✅ Grok research completed - will be stored separately")
            except Exception as grok_error:
                print(f"⚠️ Grok research failed: {str(grok_error)}")
                print("📝 Continuing with POV generation without enhanced research...")
        else:
            if getattr(request, "use_grok_research", False) and not _grok_available:
                print("⚠️ use_grok_research requested but Grok integration is not available")
            else:
                print("📝 Grok research disabled - using standard POV generation")

        # Create the report record first
        print("📝 Creating report record in database...")
        report_id = await create_pov_report(
            user_id=request.user_id,
            vendor_name=request.vendor_name,
            vendor_url=request.vendor_url,
            vendor_services=request.vendor_services,
            target_customer_name=request.target_customer_name,
            target_customer_url=request.target_customer_url,
            role_names=request.role_names,
            linkedin_urls=request.linkedin_urls,
            role_context=request.role_context,
            additional_context=request.additional_context,
            model_name=request.model_name
        )
        print(f"✅ Report created with ID: {report_id}")

        # NOTE: Quota will be charged only after successful generation to avoid charging for failed reports

        try:
            # Generate titles only
            print("🎯 Generating outcome titles...")
            result = await generate_pov_titles_only(
                vendor_name=request.vendor_name,
                vendor_url=request.vendor_url,
                vendor_services=request.vendor_services,
                target_customer_name=request.target_customer_name,
                target_customer_url=request.target_customer_url,
                roles_sold_to=request.role_names,
                linkedin_urls=request.linkedin_urls,
                role_names=request.role_names,
                role_context=request.role_context,
                additional_context=request.additional_context,
                model_name=request.model_name,
                num_outcomes=request.num_outcomes
            )
            
            outcome_titles = result["titles"]
            context_data = result["context_data"]
            
            # Save titles to database
            print("💾 Saving titles to database...")
            await save_outcome_titles(report_id, outcome_titles)
            print("✅ Titles saved to database")
            
            # Save Grok research data separately (if available)
            if grok_research_data:
                print("💾 Saving Grok research to separate table...")
                from database import create_grok_research
                await create_grok_research(
                    report_id=report_id,
                    user_id=request.user_id,
                    target_company_name=request.target_customer_name,
                    target_company_url=request.target_customer_url,
                    compiled_research=grok_research_data
                )
                print("✅ Grok research saved separately")
            
            # Save context data to avoid re-gathering in step 2
            print("💾 Saving context data to database...")
            await save_context_data(report_id, context_data)
            print("✅ Context data saved to database")

            # Update report status to titles_generated
            await update_report_status(report_id, "titles_generated")
            print("✅ Report status updated to 'titles_generated'")

            # Charge user quota only after successful completion
            print("📊 Incrementing user report count after successful generation...")
            await increment_user_report_count(request.user_id)
            print("✅ Report count incremented")

            print(f"🎉 Step 1 completed successfully!")
            print(f"📋 Report ID: {report_id}")
            print(f"📊 Generated {len(outcome_titles)} titles")
            
            return JSONResponse({
                "report_id": report_id,
                "status": "titles_generated",
                "titles": [{"title_index": i, "title": title, "selected": False} for i, title in enumerate(outcome_titles)],
                "message": f"Generated {len(outcome_titles)} outcome titles. Please select which ones to analyze in detail."
            })

        except Exception as generation_error:
            print(f"❌ Error during title generation: {str(generation_error)}")
            # Update report status to failed
            await update_report_status(report_id, "failed")
            raise HTTPException(
                status_code=500,
                detail=f"Error during title generation: {str(generation_error)}"
            )

    except Exception as e:
        print(f"💥 Fatal error in title generation: {str(e)}")
        import traceback
        print(f"🔍 Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error in title generation: {str(e)}"
        )

@app.put("/update-selected-titles/{report_id}")
async def update_selected_titles_endpoint(
    report_id: str,
    request: UpdateSelectedTitlesRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Update which outcome titles are selected for detailed analysis.
    """
    print(f"\n📝 Updating selected titles for report {report_id}")
    print(f"👤 User ID: {request.user_id}")
    print(f"🎯 Selected indices: {request.selected_indices}")
    
    try:
        # Update selected titles in database
        await update_selected_titles(report_id, request.user_id, request.selected_indices)
        print("✅ Selected titles updated successfully")
        
        return JSONResponse({
            "message": f"Updated selection for {len(request.selected_indices)} titles",
            "selected_indices": request.selected_indices
        })
        
    except Exception as e:
        print(f"❌ Error updating selected titles: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error updating selected titles: {str(e)}"
        )

@app.post("/generate-pov-outcomes/{report_id}")
async def generate_pov_outcomes(
    report_id: str,
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Selective workflow Step 2: Generate detailed analysis for selected outcome titles only.
    """
    print(f"\n🎯 Starting selective POV workflow - Step 2: Selected outcomes")
    print(f"📋 Report ID: {report_id}")
    print(f"👤 User ID: {user_id}")
    
    try:
        # Get the report data and selected titles
        print("📊 Retrieving report data and selected titles...")
        report_data = await get_report_titles_only(report_id, user_id)
        selected_titles = await get_selected_titles(report_id, user_id)
        
        # Get current selection summary for better logging
        selection_summary = await get_selection_summary(report_id, user_id)
        
        if not selected_titles:
            raise HTTPException(
                status_code=400,
                detail="No titles have been selected for detailed analysis. Please select titles first."
            )
        
        print(f"✅ Found {len(selected_titles)} selected titles")
        
        # Check if we're overwriting existing outcomes
        if selection_summary["existing_outcomes_count"] > 0:
            print(f"⚠️  OVERWRITE MODE: Replacing {selection_summary['existing_outcomes_count']} existing outcomes")
            print(f"   Previous outcome indices: {selection_summary['existing_outcome_indices']}")
            print(f"   New selected indices: {selection_summary['selected_indices']}")
        else:
            print("✨ FIRST RUN: No existing outcomes to overwrite")
        
        # Get report details for context
        report = report_data["report"]
        
        try:
            # Get Grok research for this report
            from database import get_grok_research_by_report
            grok_research = await get_grok_research_by_report(report_id, user_id)
            
            # Generate detailed analysis for selected outcomes only
            print(f"🔍 Generating detailed analysis for {len(selected_titles)} selected outcomes...")
            result = await generate_selected_outcomes_only(
                report_id=report_id,
                user_id=user_id,
                selected_titles=selected_titles,
                vendor_name=report["vendor_name"],
                vendor_url=report["vendor_url"],
                vendor_services=report["vendor_services"],
                target_customer_name=report["target_customer_name"],
                target_customer_url=report["target_customer_url"],
                roles_sold_to=report["role_names"],
                linkedin_urls=report["linkedin_urls"],
                role_names=report["role_names"],
                role_context=report["role_context"],
                additional_context=report["additional_context"],
                model_name=report["model_name"],
                grok_research=grok_research
            )
            
            # Save the selected outcomes to database
            print("💾 Saving selected outcome details to database...")
            outcomes_data = [
                {
                    "title_index": selected_titles[i]["title_index"],
                    "title": selected_titles[i]["title"],
                    "content": result["outcomes"][i]
                }
                for i in range(len(selected_titles))
            ]
            await save_selected_outcome_details(report_id, outcomes_data)
            print("✅ Selected outcome details saved to database")
            
            # Save summary to database
            print("💾 Saving summary to database...")
            await save_summary_and_takeaways(report_id, result["summary"])
            print("✅ Summary saved to database")

            # Update report status to completed
            await update_report_status(report_id, "completed")
            print("✅ Report status updated to 'completed'")

            print(f"🎉 Step 2 completed successfully!")
            print(f"📊 Generated details for {len(selected_titles)} selected outcomes")
            
            return JSONResponse({
                "report_id": report_id,
                "status": "completed",
                "selected_titles": selected_titles,
                "outcomes": result["outcomes"],
                "summary": result["summary"],
                "message": f"Generated detailed analysis for {len(selected_titles)} selected outcomes"
            })

        except Exception as generation_error:
            print(f"❌ Error during outcome generation: {str(generation_error)}")
            # Update report status to failed
            await update_report_status(report_id, "failed")
            raise HTTPException(
                status_code=500,
                detail=f"Error during outcome generation: {str(generation_error)}"
            )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"💥 Fatal error in outcome generation: {str(e)}")
        import traceback
        print(f"🔍 Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error in outcome generation: {str(e)}"
        )

@app.get("/get-report-titles/{report_id}")
async def get_report_titles(
    report_id: str,
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get report info and titles with selection status (for selective workflow frontend).
    """
    try:
        report_data = await get_report_titles_only(report_id, user_id)
        return JSONResponse(report_data)
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )

@app.get("/get-selection-summary/{report_id}")
async def get_selection_summary_endpoint(
    report_id: str,
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get summary of current selections and existing outcomes for iterative workflow.
    """
    try:
        summary = await get_selection_summary(report_id, user_id)
        return JSONResponse(summary)
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )

@app.get("/get-report-outcomes/{report_id}")
async def get_report_outcomes(
    report_id: str,
    user_id: str = None,
    current_user_id: str = Header(None, alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get all fleshed-out outcomes for a report (for viewing grid) with role-based authorization.
    """
    try:
        # Determine the requesting user ID
        requesting_user_id = current_user_id if current_user_id else user_id
        
        if not requesting_user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        # First get the report to find out who owns it
        report_result = supabase.table("pov_reports").select("*").eq("id", report_id).execute()
        if not report_result.data:
            raise HTTPException(status_code=404, detail="Report not found")
        
        report = report_result.data[0]
        report_owner_id = report["user_id"]
        
        # If requesting user is the owner, allow access
        if requesting_user_id != report_owner_id:
            # For different users, check admin authorization
            requesting_profile = await get_user_profile_by_id(requesting_user_id)
            if not requesting_profile:
                raise HTTPException(status_code=403, detail="Unauthorized: User profile not found")
            
            requesting_role = requesting_profile.get("role")
            
            # Super admins can see any report
            if requesting_role == "super_admin":
                pass  # Allow access
            elif requesting_role == "admin":
                # Admins can see reports from users in their organization
                report_owner_profile = await get_user_profile_by_id(report_owner_id)
                if not report_owner_profile:
                    raise HTTPException(status_code=404, detail="Report owner profile not found")
                
                requesting_org = requesting_profile.get("organization")
                owner_org = report_owner_profile.get("organization")
                
                if not (requesting_org and requesting_org == owner_org):
                    raise HTTPException(status_code=403, detail="Unauthorized: Can only view reports from users in your organization")
            else:
                # Regular users can only see their own reports
                raise HTTPException(status_code=403, detail="Unauthorized: Access denied")
        
        # Get all outcomes for this report
        outcomes_result = supabase.table("pov_outcomes").select("*").eq("report_id", report_id).order("outcome_index").execute()
        
        # Get summary if it exists
        summary_result = supabase.table("pov_summary").select("*").eq("report_id", report_id).execute()
        summary = summary_result.data[0] if summary_result.data else None
        
        return JSONResponse({
            "report": {
                "id": report["id"],
                "vendor_name": report["vendor_name"],
                "target_customer_name": report["target_customer_name"],
                "status": report["status"],
                "created_at": report["created_at"]
            },
            "outcomes": outcomes_result.data,
            "summary": summary,
            "total_outcomes": len(outcomes_result.data)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching report outcomes: {str(e)}"
        )

@app.delete("/delete-report/{report_id}")
async def delete_report(
    report_id: str,
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Delete a POV report and all its associated data
    """
    print(f"\n🗑️  Deleting report {report_id} for user {user_id}")
    
    try:
        # First verify the user owns this report
        report_result = supabase.table("pov_reports").select("*").eq("id", report_id).eq("user_id", user_id).execute()
        if not report_result.data:
            raise HTTPException(status_code=404, detail="Report not found or access denied")
        
        report = report_result.data[0]
        print(f"✅ Found report: {report['vendor_name']} → {report['target_customer_name']}")
        
        # Delete in order (child tables first due to foreign key constraints)
        
        # Delete outcomes
        outcomes_result = supabase.table("pov_outcomes").delete().eq("report_id", report_id).execute()
        print(f"🗑️  Deleted {len(outcomes_result.data) if outcomes_result.data else 0} outcomes")
        
        # Delete outcome titles
        titles_result = supabase.table("pov_outcome_titles").delete().eq("report_id", report_id).execute()
        print(f"🗑️  Deleted {len(titles_result.data) if titles_result.data else 0} outcome titles")
        
        # Delete summary
        summary_result = supabase.table("pov_summary").delete().eq("report_id", report_id).execute()
        print(f"🗑️  Deleted {len(summary_result.data) if summary_result.data else 0} summary records")
        
        # Finally delete the main report
        report_delete_result = supabase.table("pov_reports").delete().eq("id", report_id).eq("user_id", user_id).execute()
        print(f"🗑️  Deleted main report record")
        
        print(f"✅ Report {report_id} deleted successfully")
        
        return JSONResponse({
            "message": f"Report '{report['vendor_name']} → {report['target_customer_name']}' deleted successfully",
            "deleted_report_id": report_id
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting report: {str(e)}")
        import traceback
        print(f"🔍 Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting report: {str(e)}"
        )

# USER MANAGEMENT ENDPOINTS

@app.post("/users")
async def create_user(
    request: CreateUserRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Create a new user with profile information (role-based authorization)
    """
    try:
        result = await create_user_profile_with_auth(
            requesting_user_id=current_user_id,
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            role=request.role,
            organization=request.organization,
            organization_role=request.organization_role,
            phone=request.phone,
            department=request.department,
            avatar_url=request.avatar_url,
            is_active=request.is_active,
            metadata=request.metadata,
            # New account expiry and report quota parameters
            auto_expire_days=request.auto_expire_days,
            # New report quota parameters
            report_quota_total=request.report_quota_total,
            report_quota_monthly=request.report_quota_monthly,
            report_quota_daily=request.report_quota_daily
        )
        
        return JSONResponse({
            "message": "User created successfully",
            "user_id": result["user_id"],
            "profile": result["profile"],
            "auth_user_created": result["auth_user_created"]
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.put("/users/{user_id}")
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Update a user's profile information (role-based authorization)
    """
    print(f"\n✏️  Updating user: {user_id}")
    
    try:
        updated_profile = await update_user_profile_with_auth(
            requesting_user_id=current_user_id,
            target_user_id=user_id,
            email=request.email,
            full_name=request.full_name,
            role=request.role,
            organization=request.organization,
            organization_role=request.organization_role,
            phone=request.phone,
            department=request.department,
            avatar_url=request.avatar_url,
            is_active=request.is_active,
            metadata=request.metadata
        )
        
        print(f"✅ User updated successfully")
        
        return JSONResponse({
            "message": "User updated successfully",
            "profile": updated_profile
        })
        
    except Exception as e:
        print(f"❌ Error updating user: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    request: DeleteUserRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Delete or deactivate a user (role-based authorization)
    """
    action = "permanently deleting" if request.permanent else "deactivating"
    print(f"\n🗑️  {action.capitalize()} user: {user_id}")
    
    try:
        success = await delete_user_profile_with_auth(current_user_id, user_id, request.permanent)
        
        if success:
            message = f"User {'permanently deleted' if request.permanent else 'deactivated'} successfully"
            print(f"✅ {message}")
            
            return JSONResponse({
                "message": message,
                "user_id": user_id,
                "permanent": request.permanent
            })
        else:
            raise Exception("User not found or deletion failed")
        
    except Exception as e:
        print(f"❌ Error {action} user: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/users/{user_id}")
async def get_user(
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get a specific user's profile
    """
    try:
        profile = await get_user_profile(user_id)
        
        return JSONResponse({
            "profile": profile
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )

@app.get("/users")
async def get_users(
    active_only: bool = True,
    organization: Optional[str] = None,
    role: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    search: Optional[str] = None,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get users with role-based filtering (admins see their org, super-admins see all)
    """
    try:
        if search:
            # For search, still use role-based filtering
            requesting_profile = await get_user_profile_by_id(current_user_id)
            if not await check_admin_or_super_admin_access(current_user_id):
                raise HTTPException(status_code=403, detail="Unauthorized: Admin access required")
            
            profiles = await search_user_profiles(search, limit or 20)
            
            # Filter search results by organization for admins
            if requesting_profile.get("role") == "admin":
                admin_org = requesting_profile.get("organization")
                if admin_org:
                    profiles = [p for p in profiles if p.get("organization") == admin_org]
            else:
                profiles = []
        else:
            # Use role-based filtering
            profiles = await get_user_profiles_with_auth(
                requesting_user_id=current_user_id,
                active_only=active_only,
                organization=organization,
                role=role,
                limit=limit,
                offset=offset
            )
        
        return JSONResponse({
            "users": profiles,
            "total": len(profiles),
            "filters": {
                "active_only": active_only,
                "organization": organization,
                "role": role,
                "search": search
            }
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# SEAT MANAGEMENT AND TIME-BOXED ACCESS ENDPOINTS

# Seat management endpoint removed - using organization limits instead

@app.get("/admin/system-settings/{setting_key}")
async def get_system_setting_endpoint(
    setting_key: str,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get a system setting value (super-admin only)
    """
    try:
        # Check super-admin access
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile or requesting_profile.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Unauthorized: Super-admin access required")
        
        setting_value = await get_system_setting(setting_key)
        if setting_value is None:
            raise HTTPException(status_code=404, detail=f"Setting '{setting_key}' not found")
        
        return JSONResponse({
            "setting_key": setting_key,
            "setting_value": setting_value
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/admin/system-settings")
async def set_system_setting_endpoint(
    request: SystemSettingRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Set a system setting value (super-admin only)
    """
    try:
        # Check super-admin access
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile or requesting_profile.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Unauthorized: Super-admin access required")
        
        success = await set_system_setting(
            request.setting_key, 
            request.setting_value, 
            request.description
        )
        
        if success:
            return JSONResponse({
                "message": f"Setting '{request.setting_key}' updated successfully",
                "setting_key": request.setting_key,
                "setting_value": request.setting_value
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to update setting")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# Seat management settings endpoint removed - using organization limits instead

# ORGANIZATION USER LIMIT ENDPOINTS

@app.get("/admin/organization-limits")
async def get_organization_limits(
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get user limits for all organizations (super-admin only)
    """
    try:
        # Check super-admin access
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile or requesting_profile.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Unauthorized: Super-admin access required")
        
        organization_limits = await get_all_organization_limits()
        return JSONResponse({
            "organizations": organization_limits,
            "total_organizations": len(organization_limits)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/admin/organization-limits/{organization}")
async def get_organization_limit(
    organization: str,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get user limit for a specific organization (admin or super-admin)
    """
    try:
        # Check admin or super-admin access
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile or requesting_profile.get("role") not in ["admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Unauthorized: Admin or super-admin access required")
        
        # For admins, restrict to their organization
        if requesting_profile.get("role") == "admin":
            admin_org = requesting_profile.get("organization")
            if not admin_org or admin_org != organization:
                raise HTTPException(status_code=403, detail="Unauthorized: Can only view your own organization")
        
        org_info = await get_organization_user_info(organization)
        return JSONResponse(org_info)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/admin/organization-limits")
async def set_organization_limit(
    request: SetOrganizationUserLimitRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Set user limit for an organization (super-admin only)
    """
    try:
        # Check super-admin access
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile or requesting_profile.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Unauthorized: Super-admin access required")
        
        success = await set_organization_user_limit(request.organization, request.user_limit)
        
        if success:
            if request.user_limit is None:
                message = f"User limit removed for '{request.organization}' - now unlimited users allowed"
            else:
                message = f"User limit set to {request.user_limit} for '{request.organization}'"
            
            return JSONResponse({
                "message": message,
                "organization": request.organization,
                "user_limit": request.user_limit
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to set organization user limit")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/admin/expiry-settings")
async def get_expiry_settings_endpoint(
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get account expiry settings (super-admin only)
    """
    try:
        # Check super-admin access
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile or requesting_profile.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Unauthorized: Super-admin access required")
        
        expiry_settings = await get_expiry_settings()
        return JSONResponse(expiry_settings)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/admin/expiry-settings")
async def update_expiry_settings(
    request: ExpirySettingsRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Update account expiry settings (super-admin only)
    """
    try:
        # Check super-admin access
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile or requesting_profile.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Unauthorized: Super-admin access required")
        
        updates = []
        
        if request.default_account_expiry_days is not None:
            success = await set_system_setting("default_account_expiry_days", str(request.default_account_expiry_days))
            if success:
                updates.append(f"default_account_expiry_days = {request.default_account_expiry_days}")
        
        if request.auto_expiry_enabled is not None:
            success = await set_system_setting("auto_expiry_enabled", str(request.auto_expiry_enabled).lower())
            if success:
                updates.append(f"auto_expiry_enabled = {request.auto_expiry_enabled}")
        
        if not updates:
            raise HTTPException(status_code=400, detail="No settings provided to update")
        
        return JSONResponse({
            "message": "Expiry settings updated successfully",
            "updates": updates
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/admin/users/{user_id}/expiry")
async def set_user_expiry_endpoint(
    user_id: str,
    request: SetUserExpiryRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Set account expiry for a specific user (admin or super-admin)
    """
    try:
        # Check admin or super-admin access
        if not await check_admin_or_super_admin_access(current_user_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Admin or super-admin access required")
        
        # Check organization access for admins
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if requesting_profile.get("role") == "admin":
            target_profile = await get_user_profile_by_id(user_id)
            if not target_profile:
                raise HTTPException(status_code=404, detail="Target user not found")
            
            if requesting_profile.get("organization") != target_profile.get("organization"):
                raise HTTPException(status_code=403, detail="Unauthorized: Can only manage users in your organization")
        
        success = await set_user_expiry(
            user_id,
            expiry_days=request.expiry_days,
            expiry_date=request.expiry_date
        )
        
        if success:
            if request.expiry_days == 0 or (request.expiry_days is None and request.expiry_date is None):
                message = "User expiry removed - account will not expire"
            elif request.expiry_days:
                message = f"User will expire in {request.expiry_days} days"
            else:
                message = f"User will expire on {request.expiry_date}"
            
            return JSONResponse({
                "message": message,
                "user_id": user_id
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to set user expiry")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/admin/organization-expiry")
async def set_organization_expiry_endpoint(
    request: SetOrganizationExpiryRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Set account expiry for all users in an organization (super-admin only)
    """
    try:
        # Check super-admin access
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile or requesting_profile.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Unauthorized: Super-admin access required")
        
        # Get all users in the organization
        users_in_org = await get_user_profiles_with_auth(current_user_id, organization=request.organization)
        
        if not users_in_org:
            raise HTTPException(status_code=404, detail=f"No users found in organization: {request.organization}")
        
        # Set expiry for all users in the organization
        success_count = 0
        total_users = len(users_in_org)
        
        for user in users_in_org:
            success = await set_user_expiry(
                user["id"],
                expiry_days=request.expiry_days
            )
            if success:
                success_count += 1
        
        if success_count > 0:
            if request.expiry_days is None or request.expiry_days == 0:
                message = f"Account expiry removed for {success_count}/{total_users} users in '{request.organization}'"
            else:
                message = f"Account expiry set to {request.expiry_days} days for {success_count}/{total_users} users in '{request.organization}'"
            
            return JSONResponse({
                "message": message,
                "organization": request.organization,
                "users_updated": success_count,
                "total_users": total_users
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to set expiry for any users")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/admin/users/{user_id}/quotas")
async def set_user_quotas_endpoint(
    user_id: str,
    request: SetUserQuotasRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Set report quotas for a specific user (admin or super-admin)
    """
    try:
        # Check admin or super-admin access
        if not await check_admin_or_super_admin_access(current_user_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Admin or super-admin access required")
        
        # Check organization access for admins
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if requesting_profile.get("role") == "admin":
            target_profile = await get_user_profile_by_id(user_id)
            if not target_profile:
                raise HTTPException(status_code=404, detail="Target user not found")
            
            if requesting_profile.get("organization") != target_profile.get("organization"):
                raise HTTPException(status_code=403, detail="Unauthorized: Can only manage users in your organization")
        
        # Update user quotas
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if request.report_quota_total is not None:
            update_data["report_quota_total"] = request.report_quota_total
        if request.report_quota_monthly is not None:
            update_data["report_quota_monthly"] = request.report_quota_monthly
        if request.report_quota_daily is not None:
            update_data["report_quota_daily"] = request.report_quota_daily
        
        result = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
        
        if result.data:
            quotas_set = []
            if request.report_quota_total is not None:
                quotas_set.append(f"Total: {request.report_quota_total or 'Unlimited'}")
            if request.report_quota_monthly is not None:
                quotas_set.append(f"Monthly: {request.report_quota_monthly or 'Unlimited'}")
            if request.report_quota_daily is not None:
                quotas_set.append(f"Daily: {request.report_quota_daily or 'Unlimited'}")
            
            message = f"User quotas updated: {', '.join(quotas_set) if quotas_set else 'All unlimited'}"
            
            return JSONResponse({
                "message": message,
                "user_id": user_id
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to update user quotas")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/admin/organization-quotas")
async def set_organization_quotas_endpoint(
    request: SetOrganizationQuotasRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Set report quotas for all users in an organization (super-admin only)
    """
    try:
        # Check super-admin access
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile or requesting_profile.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Unauthorized: Super-admin access required")
        
        # Get all users in the organization
        users_in_org = await get_user_profiles_with_auth(current_user_id, organization=request.organization)
        
        if not users_in_org:
            raise HTTPException(status_code=404, detail=f"No users found in organization: {request.organization}")
        
        # Set quotas for all users in the organization
        success_count = 0
        total_users = len(users_in_org)
        
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if request.report_quota_total is not None:
            update_data["report_quota_total"] = request.report_quota_total
        if request.report_quota_monthly is not None:
            update_data["report_quota_monthly"] = request.report_quota_monthly
        if request.report_quota_daily is not None:
            update_data["report_quota_daily"] = request.report_quota_daily
        
        # Update all users in the organization
        result = supabase.table("profiles").update(update_data).eq("organization", request.organization).execute()
        
        if result.data:
            success_count = len(result.data)
            
            quotas_set = []
            if request.report_quota_total is not None:
                quotas_set.append(f"Total: {request.report_quota_total or 'Unlimited'}")
            if request.report_quota_monthly is not None:
                quotas_set.append(f"Monthly: {request.report_quota_monthly or 'Unlimited'}")
            if request.report_quota_daily is not None:
                quotas_set.append(f"Daily: {request.report_quota_daily or 'Unlimited'}")
            
            message = f"Report quotas updated for {success_count}/{total_users} users in '{request.organization}': {', '.join(quotas_set) if quotas_set else 'All unlimited'}"
            
            return JSONResponse({
                "message": message,
                "organization": request.organization,
                "users_updated": success_count,
                "total_users": total_users
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to update quotas for any users")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/admin/users/expiring-soon")
async def get_users_expiring_soon_endpoint(
    days_ahead: int = 7,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get users whose accounts will expire soon (admin or super-admin)
    """
    try:
        # Check admin or super-admin access
        if not await check_admin_or_super_admin_access(current_user_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Admin or super-admin access required")
        
        users = await get_users_expiring_soon(days_ahead)
        
        # Filter by organization for admins
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if requesting_profile.get("role") == "admin":
            admin_org = requesting_profile.get("organization")
            if admin_org:
                users = [u for u in users if u.get("organization") == admin_org]
            else:
                users = []
        
        return JSONResponse({
            "users": users,
            "total": len(users),
            "days_ahead": days_ahead
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/admin/expire-accounts")
async def expire_old_accounts_endpoint(
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Manually trigger account expiry process (super-admin only)
    """
    try:
        # Check super-admin access
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile or requesting_profile.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Unauthorized: Super-admin access required")
        
        expired_count = await expire_old_accounts()
        
        return JSONResponse({
            "message": f"Expired {expired_count} accounts",
            "expired_count": expired_count
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# REPORT QUOTA MANAGEMENT ENDPOINTS

@app.get("/admin/quota-settings")
async def get_quota_settings_endpoint(
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get report quota settings (super-admin only)
    """
    try:
        # Check super-admin access
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile or requesting_profile.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Unauthorized: Super-admin access required")
        
        quota_settings = await get_quota_settings()
        return JSONResponse(quota_settings)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/admin/quota-settings")
async def update_quota_settings(
    request: ReportQuotaSettingsRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Update report quota settings (super-admin only)
    """
    try:
        # Check super-admin access
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if not requesting_profile or requesting_profile.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Unauthorized: Super-admin access required")
        
        updates = []
        
        if request.default_report_quota_total is not None:
            value = str(request.default_report_quota_total) if request.default_report_quota_total > 0 else "null"
            success = await set_system_setting("default_report_quota_total", value)
            if success:
                updates.append(f"default_report_quota_total = {value}")
        
        if request.default_report_quota_monthly is not None:
            value = str(request.default_report_quota_monthly) if request.default_report_quota_monthly > 0 else "null"
            success = await set_system_setting("default_report_quota_monthly", value)
            if success:
                updates.append(f"default_report_quota_monthly = {value}")
        
        if request.default_report_quota_daily is not None:
            value = str(request.default_report_quota_daily) if request.default_report_quota_daily > 0 else "null"
            success = await set_system_setting("default_report_quota_daily", value)
            if success:
                updates.append(f"default_report_quota_daily = {value}")
        
        if request.report_quota_enabled is not None:
            success = await set_system_setting("report_quota_enabled", str(request.report_quota_enabled).lower())
            if success:
                updates.append(f"report_quota_enabled = {request.report_quota_enabled}")
        
        if not updates:
            raise HTTPException(status_code=400, detail="No settings provided to update")
        
        return JSONResponse({
            "message": "Report quota settings updated successfully",
            "updates": updates
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/users/{user_id}/quota-status")
async def get_user_quota_status_endpoint(
    user_id: str,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get quota status for a specific user (admin or super-admin)
    """
    try:
        # Check if user is accessing their own quota or has admin privileges
        if current_user_id != user_id:
            if not await check_admin_or_super_admin_access(current_user_id):
                raise HTTPException(status_code=403, detail="Unauthorized: Admin access required to view other users' quotas")
            
            # Check organization access for admins
            requesting_profile = await get_user_profile_by_id(current_user_id)
            if requesting_profile.get("role") == "admin":
                target_profile = await get_user_profile_by_id(user_id)
                if not target_profile:
                    raise HTTPException(status_code=404, detail="Target user not found")
                
                if requesting_profile.get("organization") != target_profile.get("organization"):
                    raise HTTPException(status_code=403, detail="Unauthorized: Can only view quotas for users in your organization")
        
        quota_status = await get_user_quota_status(user_id)
        return JSONResponse(quota_status)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/admin/users/{user_id}/quota")
async def set_user_quota_endpoint(
    user_id: str,
    request: SetUserQuotaRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Set report quotas for a specific user (admin or super-admin)
    """
    try:
        # Check admin or super-admin access
        if not await check_admin_or_super_admin_access(current_user_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Admin or super-admin access required")
        
        # Check organization access for admins
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if requesting_profile.get("role") == "admin":
            target_profile = await get_user_profile_by_id(user_id)
            if not target_profile:
                raise HTTPException(status_code=404, detail="Target user not found")
            
            if requesting_profile.get("organization") != target_profile.get("organization"):
                raise HTTPException(status_code=403, detail="Unauthorized: Can only manage quotas for users in your organization")
        
        success = await set_user_report_quotas(
            user_id,
            quota_total=request.quota_total,
            quota_monthly=request.quota_monthly,
            quota_daily=request.quota_daily
        )
        
        if success:
            quota_info = []
            if request.quota_total is not None:
                quota_info.append(f"total: {request.quota_total if request.quota_total > 0 else 'unlimited'}")
            if request.quota_monthly is not None:
                quota_info.append(f"monthly: {request.quota_monthly if request.quota_monthly > 0 else 'unlimited'}")
            if request.quota_daily is not None:
                quota_info.append(f"daily: {request.quota_daily if request.quota_daily > 0 else 'unlimited'}")
            
            message = f"User quotas updated: {', '.join(quota_info)}" if quota_info else "User quotas updated"
            
            return JSONResponse({
                "message": message,
                "user_id": user_id
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to set user quotas")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/admin/users/{user_id}/reset-quota")
async def reset_user_quota_endpoint(
    user_id: str,
    request: ResetQuotaRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Reset quota counters for a specific user (admin or super-admin)
    """
    try:
        # Check admin or super-admin access
        if not await check_admin_or_super_admin_access(current_user_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Admin or super-admin access required")
        
        # Check organization access for admins
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if requesting_profile.get("role") == "admin":
            target_profile = await get_user_profile_by_id(user_id)
            if not target_profile:
                raise HTTPException(status_code=404, detail="Target user not found")
            
            if requesting_profile.get("organization") != target_profile.get("organization"):
                raise HTTPException(status_code=403, detail="Unauthorized: Can only reset quotas for users in your organization")
        
        affected_rows = await reset_user_quotas(user_id, request.reset_type)
        
        if affected_rows > 0:
            return JSONResponse({
                "message": f"Reset {request.reset_type} quota counters for user",
                "user_id": user_id,
                "reset_type": request.reset_type
            })
        else:
            raise HTTPException(status_code=404, detail="User not found or no quotas to reset")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/admin/users/{user_id}/set-unlimited")
async def set_unlimited_quota(
    user_id: str,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Set a user to have unlimited quota (admin or super-admin)
    """
    try:
        # Check admin or super-admin access
        if not await check_admin_or_super_admin_access(current_user_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Admin or super-admin access required")
        
        # Check organization access for admins
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if requesting_profile.get("role") == "admin":
            target_profile = await get_user_profile_by_id(user_id)
            if not target_profile:
                raise HTTPException(status_code=404, detail="Target user not found")
            
            if requesting_profile.get("organization") != target_profile.get("organization"):
                raise HTTPException(status_code=403, detail="Unauthorized: Can only modify users in your organization")
        
        # Set quota to NULL (unlimited)
        result = supabase.table("profiles").update({
            "report_quota_total": None,
            "updated_at": "NOW()"
        }).eq("id", user_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return JSONResponse({
            "message": "User quota set to unlimited",
            "user_id": user_id,
            "quota_type": "unlimited"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to set unlimited quota: {str(e)}"
        )

@app.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: str,
    request: AdminPasswordResetRequest,
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Reset a user's password (admin/super-admin only)
    """
    try:
        print(f"🔐 Admin password reset for user: {user_id}")
        
        # Check admin or super-admin access
        if not await check_admin_or_super_admin_access(current_user_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Admin or super-admin access required")
        
        # Check organization access for admins (super-admins can reset any password)
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if requesting_profile.get("role") == "admin":
            target_profile = await get_user_profile_by_id(user_id)
            if not target_profile:
                raise HTTPException(status_code=404, detail="Target user not found")
            
            if requesting_profile.get("organization") != target_profile.get("organization"):
                raise HTTPException(status_code=403, detail="Unauthorized: Can only reset passwords for users in your organization")
        
        # Reset password using Supabase admin API
        print(f"🔑 Updating password for user: {user_id}")
        from database import supabase
        
        # Update the user's password in Supabase Auth
        auth_response = supabase.auth.admin.update_user_by_id(
            user_id, 
            {"password": request.new_password}
        )
        
        if auth_response.user:
            print(f"✅ Password reset successful for user: {user_id}")
            return JSONResponse({
                "message": "Password reset successfully",
                "user_id": user_id
            })
        else:
            raise HTTPException(status_code=404, detail="User not found in auth system")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error resetting password: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error resetting password: {str(e)}"
        )

@app.get("/admin/users/over-quota")
async def get_users_over_quota_endpoint(
    quota_type: str = "any",  # 'daily', 'monthly', 'total', 'any'
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Get users who have exceeded their quotas (admin or super-admin)
    """
    try:
        # Check admin or super-admin access
        if not await check_admin_or_super_admin_access(current_user_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Admin or super-admin access required")
        
        users = await get_users_over_quota(quota_type)
        
        # Filter by organization for admins
        requesting_profile = await get_user_profile_by_id(current_user_id)
        if requesting_profile.get("role") == "admin":
            admin_org = requesting_profile.get("organization")
            if admin_org:
                users = [u for u in users if u.get("organization") == admin_org]
            else:
                users = []
        
        return JSONResponse({
            "users": users,
            "total": len(users),
            "quota_type": quota_type
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/generate-email-proposal/{report_id}")
async def generate_email_proposal(
    report_id: str,
    request: GenerateEmailProposalRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Generate cold call email and proposal based on POV report data
    """
    try:
        print(f"📧 Generating email and proposal for report ID: {report_id}")
        print(f"👤 User ID: {request.user_id}")
        
        # Get the report data from database
        print("🔍 Retrieving report data from database...")
        report_data = await get_pov_report_data(report_id, request.user_id)
        
        if not report_data:
            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )
        
        print(f"📊 Report data retrieved successfully")
        
        # Prepare the prompt for AI generation
        custom_instructions = request.custom_instructions or ""
        
        email_prompt = f"""
        You are an expert sales professional writing a cold call email. Based on the following POV (Point of View) analysis, create a compelling cold call email that introduces the vendor's solution to the target customer.

        **Report Details:**
        - Vendor: {report_data['report']['vendor_name']}
        - Vendor Services: {report_data['report']['vendor_services']}
        - Target Customer: {report_data['report']['target_customer_name']}
        - Target Roles: {report_data['report'].get('role_names', 'Not specified')}
        - Additional Context: {report_data['report'].get('additional_context', 'Not specified')}

        **Key Outcomes from POV Analysis:**
        {chr(10).join([f"• {outcome}" for outcome in report_data['outcomes'][:5]])}

        **Custom Instructions:**
        {custom_instructions}

        **Email Requirements:**
        - Subject line that grabs attention
        - Professional but engaging tone
        - Reference specific outcomes from the POV analysis
        - Clear value proposition
        - Specific call to action
        - Keep it concise (under 200 words)
        - Include proper email formatting

        Generate a complete cold call email:
        """
        
        proposal_prompt = f"""
        You are an expert business development professional creating a proposal. Based on the following POV (Point of View) analysis, create a comprehensive business proposal that outlines how the vendor's solution can benefit the target customer.

        **Report Details:**
        - Vendor: {report_data['report']['vendor_name']}
        - Vendor Services: {report_data['report']['vendor_services']}
        - Target Customer: {report_data['report']['target_customer_name']}
        - Target Roles: {report_data['report'].get('role_names', 'Not specified')}
        - Additional Context: {report_data['report'].get('additional_context', 'Not specified')}

        **Key Outcomes from POV Analysis:**
        {chr(10).join([f"• {outcome}" for outcome in report_data['outcomes']])}

        **Custom Instructions:**
        {custom_instructions}

        **Proposal Requirements:**
        - Executive summary
        - Problem statement
        - Proposed solution
        - Key benefits and outcomes
        - Implementation approach
        - Next steps
        - Professional formatting
        - Use specific outcomes from the POV analysis

        Generate a comprehensive business proposal:
        """
        
        # Generate email and proposal using AI
        print("🤖 Generating email content...")
        from llm import llm_call
        
        email_responses, _ = await llm_call(
            instructions=[email_prompt],
            model=report_data['report'].get('model_name', 'gpt-4.1-mini')
        )
        email_content = email_responses[0]
        
        print("🤖 Generating proposal content...")
        proposal_responses, _ = await llm_call(
            instructions=[proposal_prompt],
            model=report_data['report'].get('model_name', 'gpt-4.1-mini')
        )
        proposal_content = proposal_responses[0]
        
        print("✅ Email and proposal generated successfully")
        
        return {
            "email": email_content,
            "proposal": proposal_content,
            "report_id": report_id,
            "vendor_name": report_data['report']['vendor_name'],
            "target_customer_name": report_data['report']['target_customer_name']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating email and proposal: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating email and proposal: {str(e)}"
        )

@app.post("/generate-cold-call-email/{report_id}")
async def generate_cold_call_email(
    report_id: str,
    request: GenerateColdCallEmailRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Generate cold call email based on selected POV report outcomes
    """
    try:
        print(f"📧 Generating cold call email for report ID: {report_id}")
        print(f"👤 User ID: {request.user_id}")
        print(f"🎯 Selected outcomes: {request.selected_outcomes}")
        
        # Get the report data from database
        print("🔍 Retrieving report data from database...")
        report_data = await get_pov_report_data(report_id, request.user_id)
        
        if not report_data:
            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )
        
        print(f"📊 Report data retrieved successfully")
        
        # Get selected outcomes based on indices
        # First, get the full outcome data from database
        from database import supabase
        outcomes_result = supabase.table("pov_outcomes").select("*").eq("report_id", report_id).order("outcome_index").execute()
        
        if not outcomes_result.data:
            raise HTTPException(
                status_code=400,
                detail="No outcomes found in report"
            )
        
        # Filter outcomes based on selected indices
        selected_outcome_details = []
        for index in request.selected_outcomes:
            if 0 <= index < len(outcomes_result.data):
                outcome = outcomes_result.data[index]
                # Extract key information from the outcome
                selected_outcome_details.append({
                    'title': outcome.get('title', f'Outcome {index + 1}'),
                    'content': outcome.get('content', ''),
                    'index': index
                })
        
        if not selected_outcome_details:
            raise HTTPException(
                status_code=400,
                detail="No valid outcomes selected or outcomes not found"
            )
        
        # Prepare the prompt for AI generation
        custom_instructions = request.custom_instructions or ""
        recipient_info = ""
        if request.recipient_name:
            recipient_info += f"Recipient: {request.recipient_name}"
        if request.recipient_company:
            recipient_info += f" at {request.recipient_company}"
        if request.recipient_email:
            recipient_info += f" ({request.recipient_email})"
        
        outcomes_text = ""
        for i, outcome in enumerate(selected_outcome_details, 1):
            outcomes_text += f"\n{i}. **{outcome['title']}**\n"
            # Extract first few lines of content as summary
            content_lines = outcome['content'].split('\n')[:5]  # Get first 5 lines as preview
            outcomes_text += f"   Summary: {' '.join(content_lines)}\n"
        
        greeting_name = request.recipient_name or "there"
        target_org = report_data['report']['target_customer_name']
        vendor_name = report_data['report']['vendor_name']
        
        # Include Grok research context if available
        grok_context = ""
        if report_data.get('grok_research') and report_data['grok_research'].get('pov_context_block'):
            grok_context = f"\n\nEnhanced Company Intelligence:\n{report_data['grok_research']['pov_context_block']}"
        
        email_prompt = f"""
        Write a cold outreach email that demonstrates deep understanding through specific insights, not generic claims.

        Context:
        - Vendor: {vendor_name}
        - Services: {report_data['report']['vendor_services']}
        - Target: {target_org}
        - Roles: {report_data['report']['role_names']}
        - User Context: {report_data['report']['additional_context'] or 'None'}
        {f"- Recipient: {recipient_info}" if recipient_info else ""}
        {grok_context}

        Selected POV Outcomes:
        {outcomes_text}

        Instructions: {custom_instructions or 'None'}

        Requirements (under 180 words):
        - Subject: Lead with specific value/outcome, not generic intro
        - Greeting: "Hi {greeting_name},"
        - Hook: Open with a specific insight about {target_org}'s situation (reference actual challenges/context when available)
        - Bridge: One sentence connecting their challenge to your POV solution
        - Value bullets: Two concrete outcomes from the POV analysis that directly address their context
        - Proof: One sentence making the value tangible for {target_org} specifically
        - CTA: Request a 20-minute conversation next week
        - Signature: [Your Name] / [Your Title] / [Your Contact] / [Website]

        Style: Specific over generic. Reference actual company context when available. Avoid "solutions," "leverage," "synergies." Use concrete language.

        Return JSON:
        {{
          "subject": "Specific value statement (8-12 words)",
          "body": "Complete email with concrete insights and signature placeholders"
        }}
        """
        
        # Generate email using AI
        print("🤖 Generating cold call email content...")
        from llm import call_gpt
        
        email_content, completion = call_gpt(
            prompt=email_prompt,
            system_prompt="You are an expert sales professional who writes compelling, personalized cold call emails.",
            format='json_object'
        )
        
        print("✅ Email generated successfully")
        
        # Parse the JSON response
        import json
        try:
            email_data = json.loads(email_content)
            subject = email_data.get('subject', 'Introduction and Collaboration Opportunity')
            body = email_data.get('body', email_content)  # Fallback to raw content if parsing fails
        except json.JSONDecodeError:
            # If JSON parsing fails, treat the entire response as the body
            subject = f"Introduction: {report_data['report']['vendor_name']} → {report_data['report']['target_customer_name']}"
            body = email_content
        
        # Auto-fill recipient company if not provided
        recipient_company = request.recipient_company or report_data['report']['target_customer_name']
        
        # Save the generated email to database
        print("💾 Saving email to database...")
        saved_email = await create_cold_call_email(
            report_id=report_id,
            user_id=request.user_id,
            subject=subject,
            email_body=body,
            recipient_name=request.recipient_name,
            recipient_email=request.recipient_email,
            recipient_company=recipient_company,
            selected_outcomes=request.selected_outcomes,
            custom_instructions=request.custom_instructions
        )
        
        print(f"✅ Email saved with ID: {saved_email['id']}")
        
        return {
            "message": "Cold call email generated successfully",
            "email_id": saved_email['id'],
            "subject": subject,
            "body": body,
            "recipient_name": request.recipient_name,
            "recipient_email": request.recipient_email,
            "recipient_company": recipient_company,
            "selected_outcomes_count": len(request.selected_outcomes),
            "report_id": report_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating cold call email: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/cold-call-emails/{report_id}")
async def get_cold_call_emails(
    report_id: str,
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get all cold call emails for a specific report
    """
    try:
        emails = await get_cold_call_emails_by_report(report_id, user_id)
        return {
            "emails": emails,
            "count": len(emails)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/chat-edit-cold-call-email/{email_id}")
async def chat_edit_cold_call_email(
    email_id: str,
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """
    Chat-based cold call email editing endpoint with version history
    """
    try:
        user_id = request.get("user_id")
        edit_request = request.get("message", "")
        current_content = request.get("current_content", "")
        current_subject = request.get("current_subject", "")
        
        if not edit_request.strip():
            raise HTTPException(status_code=400, detail="Edit request is required")
        
        # Get original email data including version history
        email_result = supabase.table("cold_call_emails").select("*").eq("id", email_id).eq("user_id", user_id).single().execute()
        if not email_result.data:
            raise HTTPException(status_code=404, detail="Cold call email not found")
        
        email_data = email_result.data
        report_data = await get_pov_report_data(email_data["report_id"], user_id)
        
        # Get current version history and version number
        version_history = email_data.get("version_history", [])
        current_version_num = email_data.get("current_version", 1)
        
        # Save current version to history before updating
        # For the first edit, save the original as version 1
        if current_version_num == 1 and len(version_history) == 0:
            original_entry = {
                "version": 1,
                "content": email_data["email_body"],
                "subject": email_data["subject"],
                "edited_at": email_data.get("created_at", datetime.now().isoformat()),
                "edit_message": "Original version",
                "edited_by": user_id
            }
            version_history.append(original_entry)
        
        # Build chat editing prompt
        prompt = f"""
        You are an expert editor helping to improve a cold call email. The user wants you to: {edit_request}

        Current email subject:
        {current_subject}
        
        Current email content:
        {current_content}
        
        Original POV context for reference:
        - Vendor: {report_data['report']['vendor_name']}
        - Customer: {report_data['report']['target_customer_name']}
        - POV Outcomes: {', '.join(report_data.get('titles', [])[:5])}
        
        Instructions:
        - Make the requested changes while maintaining professional email tone
        - Keep the email concise and focused
        - Ensure changes are relevant to the POV context
        - Return the complete updated email content
        - If the subject line needs updating based on the request, provide it as well
        
        Return in this format:
        SUBJECT: [updated subject if changed, or original subject]
        
        BODY:
        [updated email body]
        """
        
        from llm import call_gpt
        updated_response, _ = call_gpt(
            prompt=prompt,
            system_prompt="You are a professional email editor. Make precise, impactful improvements based on user requests.",
        )
        
        # Parse the response to extract subject and body
        lines = updated_response.strip().split('\n')
        updated_subject = current_subject
        updated_content = updated_response
        
        for i, line in enumerate(lines):
            if line.startswith("SUBJECT:"):
                updated_subject = line.replace("SUBJECT:", "").strip()
                # Find where BODY starts
                for j in range(i+1, len(lines)):
                    if lines[j].startswith("BODY:"):
                        updated_content = '\n'.join(lines[j+1:]).strip()
                        break
                break
        
        # Keep only last 20 versions to prevent excessive storage
        if len(version_history) > 20:
            version_history = version_history[-20:]
        
        # Update the email with new content and version history
        supabase.table("cold_call_emails").update({
            "email_body": updated_content,
            "subject": updated_subject,
            "version_history": version_history,
            "current_version": current_version_num + 1,
            "updated_at": datetime.now().isoformat()
        }).eq("id", email_id).eq("user_id", user_id).execute()
        
        return {
            "message": "Cold call email updated successfully",
            "updated_content": updated_content,
            "updated_subject": updated_subject,
            "edit_request": edit_request,
            "version": current_version_num + 1,
            "version_history": version_history
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cold-call-emails/{email_id}/versions")
async def get_cold_call_email_versions(
    email_id: str,
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get version history for a cold call email
    """
    try:
        result = supabase.table("cold_call_emails").select("version_history, current_version, subject").eq("id", email_id).eq("user_id", user_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Cold call email not found")
        
        return {
            "current_version": result.data.get("current_version", 1),
            "current_subject": result.data.get("subject", ""),
            "versions": result.data.get("version_history", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cold-call-emails/{email_id}/restore/{version_number}")
async def restore_cold_call_email_version(
    email_id: str,
    version_number: int,
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """
    Restore a previous version of a cold call email
    """
    try:
        user_id = request.get("user_id")
        
        # Get email with version history
        result = supabase.table("cold_call_emails").select("*").eq("id", email_id).eq("user_id", user_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Cold call email not found")
        
        email_data = result.data
        version_history = email_data.get("version_history", [])
        current_version_num = email_data.get("current_version", 1)
        
        # Find the version to restore
        version_to_restore = None
        for version in version_history:
            if version.get("version") == version_number:
                version_to_restore = version
                break
        
        if not version_to_restore:
            raise HTTPException(status_code=404, detail=f"Version {version_number} not found")
        
        # Save current version to history before restoring
        current_entry = {
            "version": current_version_num,
            "content": email_data["email_body"],
            "subject": email_data["subject"],
            "edited_at": email_data.get("updated_at", email_data.get("created_at")),
            "edit_message": f"Before restoring to version {version_number}",
            "edited_by": user_id
        }
        version_history.append(current_entry)
        
        # Keep only last 20 versions
        if len(version_history) > 20:
            version_history = version_history[-20:]
        
        # Restore the selected version
        supabase.table("cold_call_emails").update({
            "email_body": version_to_restore["content"],
            "subject": version_to_restore.get("subject", email_data["subject"]),
            "version_history": version_history,
            "current_version": current_version_num + 1,
            "updated_at": datetime.now().isoformat()
        }).eq("id", email_id).eq("user_id", user_id).execute()
        
        return {
            "message": f"Successfully restored version {version_number}",
            "restored_content": version_to_restore["content"],
            "restored_subject": version_to_restore.get("subject", email_data["subject"]),
            "new_version": current_version_num + 1
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===============================
# WHITEPAPER
# ===============================
@app.post("/generate-whitepaper/{report_id}")
async def generate_whitepaper(
    report_id: str,
    request: GenerateWhitepaperRequest,
    api_key: str = Depends(verify_api_key)
):
    try:
        print(f"📄 Generating whitepaper for report {report_id}")
        report_data = await get_pov_report_data(report_id, request.user_id)
        if not report_data:
            raise HTTPException(status_code=404, detail="Report not found")

        # Build prompt from POV data with selected outcomes and structured sections
        roles_str = report_data['report'].get('role_names','')
        all_titles = report_data.get('titles', [])
        pov_summary = report_data.get('summary', {})
        sum_content = pov_summary.get('summary_content', '') if pov_summary else ''
        sum_takeaways = pov_summary.get('takeaways_content', '') if pov_summary else ''

        # Derive selected outcomes text if indices provided
        selected_outcomes_text = ""
        try:
            source_outcomes = report_data.get('outcomes', []) or []
            selected_texts = []
            if request.selected_outcomes:
                for i in request.selected_outcomes:
                    if 0 <= i < len(source_outcomes):
                        o = source_outcomes[i]
                        if isinstance(o, dict):
                            selected_texts.append(str(o.get('title') or o.get('summary') or o))
                        else:
                            selected_texts.append(str(o))
            if selected_texts:
                selected_outcomes_text = "\n".join([f"- {t}" for t in selected_texts])
        except Exception:
            selected_outcomes_text = ""

        titles_text = "\n".join([f"- {t}" for t in all_titles]) if all_titles else ""

        prompt = f"""
        You are an expert enterprise analyst. Write a Classic White Paper in a clear, executive-ready style.

        Context:
        - Vendor: {report_data['report']['vendor_name']}
        - Services: {report_data['report']['vendor_services']}
        - Customer: {report_data['report']['target_customer_name']}
        - Roles: {roles_str}
        - POV Titles:\n{titles_text}
        - POV Summary: {sum_content}
        - POV Takeaways: {sum_takeaways}
        - Selected Outcomes:\n{selected_outcomes_text or '(Use the most relevant POV outcomes and titles as evidence)'}
        - Custom Instructions: {request.custom_instructions or 'None'}

        Output requirements (use Markdown headings exactly as below):
        # {request.title}

        ## Executive Summary
        Provide a tight summary tailored for executives.

        ## 1. The Strategic Challenge
        Describe the decision context, constraints, and risks (1-2 paragraphs).

        ## 2. Why This Matters Now
        Explain urgency, market dynamics, and competitive pressure.

        ## 3. Three Strategic Outcomes for {report_data['report']['target_customer_name']}
        - Outcome 1: name and 2-3 supporting points using selected outcomes.
        - Outcome 2: name and 2-3 supporting points using selected outcomes.
        - Outcome 3: name and 2-3 supporting points using selected outcomes.

        ## 4. The Human Dimension
        Address confidence, relief, pride, and adoption considerations.

        ## 5. Proposed Approach
        Lay out a pragmatic approach (phases or streams) grounded in the POV.

        ## 6. Evidence & Outcomes
        Tie recommendations to POV outcomes and titles; be specific.

        ## 7. Strategic Alignment
        Map to the customer's mission and KPIs.

        ## Conclusion & Call to Action
        Close with next steps suitable for executive sign-off.

        Style:
        - Be concise but authoritative. Use data points from POV where relevant.
        - Avoid fluff. Keep jargon minimal. Prefer active voice.
        """

        from llm import call_gpt
        content, _ = call_gpt(
            prompt=prompt,
            system_prompt="You are a senior analyst who writes enterprise-grade whitepapers.",
        )

        # Save to DB
        data = {
            "report_id": report_id,
            "user_id": request.user_id,
            "title": request.title,
            "content": content,
        }
        result = supabase.table("whitepapers").insert(data).execute()
        saved = result.data[0] if result.data else data
        return {"message": "Whitepaper generated", "id": saved.get("id"), "item": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/whitepapers/{report_id}")
async def get_whitepapers(report_id: str, user_id: str, api_key: str = Depends(verify_api_key)):
    try:
        res = supabase.table("whitepapers").select("*").eq("report_id", report_id).eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"items": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat-edit-whitepaper/{whitepaper_id}")
async def chat_edit_whitepaper(
    whitepaper_id: str,
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """
    Chat-based whitepaper editing endpoint with version history
    """
    try:
        user_id = request.get("user_id")
        edit_request = request.get("message", "")
        current_content = request.get("current_content", "")
        
        if not edit_request.strip():
            raise HTTPException(status_code=400, detail="Edit request is required")
        
        # Get original whitepaper data including version history
        whitepaper_result = supabase.table("whitepapers").select("*").eq("id", whitepaper_id).eq("user_id", user_id).single().execute()
        if not whitepaper_result.data:
            raise HTTPException(status_code=404, detail="Whitepaper not found")
        
        whitepaper = whitepaper_result.data
        report_data = await get_pov_report_data(whitepaper["report_id"], user_id)
        
        # Get current version history and version number
        version_history = whitepaper.get("version_history", [])
        current_version_num = whitepaper.get("current_version", 1)
        
        # Save current version to history before updating
        # For the first edit, save the original as version 1
        if current_version_num == 1 and len(version_history) == 0:
            original_entry = {
                "version": 1,
                "content": whitepaper["content"],
                "title": whitepaper["title"],
                "edited_at": whitepaper.get("created_at", datetime.now().isoformat()),
                "edit_message": "Original version",
                "edited_by": user_id
            }
            version_history.append(original_entry)
        
        # Build chat editing prompt
        prompt = f"""
        You are an expert editor helping to improve a whitepaper. The user wants you to: {edit_request}

        Current whitepaper content:
        {current_content}

        Original POV context for reference:
        - Vendor: {report_data['report']['vendor_name']}
        - Customer: {report_data['report']['target_customer_name']}
        - POV Outcomes: {', '.join(report_data.get('titles', [])[:5])}
        
        Instructions:
        - Make the requested changes while maintaining the whitepaper's professional tone
        - Keep the overall structure and flow intact unless specifically asked to change it
        - Ensure changes are relevant to the POV context
        - Return the complete updated whitepaper content
        - Preserve markdown formatting
        
        Updated whitepaper:
        """
        
        from llm import call_gpt
        updated_content, _ = call_gpt(
            prompt=prompt,
            system_prompt="You are a professional whitepaper editor. Make precise, thoughtful improvements based on user requests.",
        )
        
        # Keep only last 20 versions to prevent excessive storage
        if len(version_history) > 20:
            version_history = version_history[-20:]
        
        # Update the whitepaper with new content and version history
        supabase.table("whitepapers").update({
            "content": updated_content,
            "version_history": version_history,
            "current_version": current_version_num + 1,
            "updated_at": datetime.now().isoformat()
        }).eq("id", whitepaper_id).eq("user_id", user_id).execute()
        
        return {
            "message": "Whitepaper updated successfully",
            "updated_content": updated_content,
            "edit_request": edit_request,
            "version": current_version_num + 1,
            "version_history": version_history
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/whitepapers/{whitepaper_id}/versions")
async def get_whitepaper_versions(
    whitepaper_id: str,
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get version history for a whitepaper
    """
    try:
        result = supabase.table("whitepapers").select("version_history, current_version, title").eq("id", whitepaper_id).eq("user_id", user_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Whitepaper not found")
        
        return {
            "current_version": result.data.get("current_version", 1),
            "current_title": result.data.get("title", ""),
            "versions": result.data.get("version_history", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/whitepapers/{whitepaper_id}/restore/{version_number}")
async def restore_whitepaper_version(
    whitepaper_id: str,
    version_number: int,
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """
    Restore a previous version of a whitepaper
    """
    try:
        user_id = request.get("user_id")
        
        # Get whitepaper with version history
        result = supabase.table("whitepapers").select("*").eq("id", whitepaper_id).eq("user_id", user_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Whitepaper not found")
        
        whitepaper = result.data
        version_history = whitepaper.get("version_history", [])
        current_version_num = whitepaper.get("current_version", 1)
        
        # Find the version to restore
        version_to_restore = None
        for version in version_history:
            if version.get("version") == version_number:
                version_to_restore = version
                break
        
        if not version_to_restore:
            raise HTTPException(status_code=404, detail=f"Version {version_number} not found")
        
        # Save current version to history before restoring
        current_entry = {
            "version": current_version_num,
            "content": whitepaper["content"],
            "title": whitepaper["title"],
            "edited_at": whitepaper.get("updated_at", whitepaper.get("created_at")),
            "edit_message": f"Before restoring to version {version_number}",
            "edited_by": user_id
        }
        version_history.append(current_entry)
        
        # Keep only last 20 versions
        if len(version_history) > 20:
            version_history = version_history[-20:]
        
        # Restore the selected version
        supabase.table("whitepapers").update({
            "content": version_to_restore["content"],
            "title": version_to_restore.get("title", whitepaper["title"]),
            "version_history": version_history,
            "current_version": current_version_num + 1,
            "updated_at": datetime.now().isoformat()
        }).eq("id", whitepaper_id).eq("user_id", user_id).execute()
        
        return {
            "message": f"Successfully restored version {version_number}",
            "restored_content": version_to_restore["content"],
            "new_version": current_version_num + 1
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===============================
# MARKETING ASSETS
# ===============================
@app.post("/generate-marketing-asset/{report_id}")
async def generate_marketing_asset(
    report_id: str,
    request: GenerateMarketingAssetRequest,
    api_key: str = Depends(verify_api_key)
):
    try:
        print(f"📣 Generating marketing asset for report {report_id}")
        report_data = await get_pov_report_data(report_id, request.user_id)
        if not report_data:
            raise HTTPException(status_code=404, detail="Report not found")

        titles_text = "\n".join([f"- {t}" for t in report_data.get('titles', [])])
        selected_outcomes_text = ''
        try:
            source_outcomes = report_data.get('outcomes', []) or []
            if request.selected_outcomes:
                selected = []
                for i in request.selected_outcomes:
                    if 0 <= i < len(source_outcomes):
                        o = source_outcomes[i]
                        selected.append(str(o.get('title') if isinstance(o, dict) else o))
                if selected:
                    selected_outcomes_text = "\n".join([f"- {t}" for t in selected])
        except Exception:
            selected_outcomes_text = ''

        prompt = f"""
        Create a {request.asset_type} titled: {request.title}
        Context:
        - Vendor: {report_data['report']['vendor_name']}
        - Services: {report_data['report']['vendor_services']}
        - Customer: {report_data['report']['target_customer_name']}
        - Roles: {report_data['report'].get('role_names','')}
        - POV Titles:\n{titles_text}
        - Selected Outcomes:\n{selected_outcomes_text or '(Use the most relevant POV outcomes/titles)'}
        - Custom Instructions: {request.custom_instructions or 'None'}

        Requirements:
        - Return the content only, ready to paste.
        - Keep it concise and compelling, suitable for go-to-market use.
        - Include specific hooks or CTAs when appropriate.
        """
        from llm import call_gpt
        content, _ = call_gpt(prompt=prompt, system_prompt="You are a marketing writer generating concise, compelling content.")

        item = {
            "report_id": report_id,
            "user_id": request.user_id,
            "asset_type": request.asset_type,
            "title": request.title,
            "content": content,
        }
        result = supabase.table("marketing_assets").insert(item).execute()
        saved = result.data[0] if result.data else item
        return {"message": "Marketing asset generated", "id": saved.get("id"), "item": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/marketing-assets/{report_id}")
async def get_marketing_assets(report_id: str, user_id: str, api_key: str = Depends(verify_api_key)):
    try:
        res = supabase.table("marketing_assets").select("*").eq("report_id", report_id).eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"items": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat-edit-marketing-asset/{asset_id}")
async def chat_edit_marketing_asset(
    asset_id: str,
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """
    Chat-based marketing asset editing endpoint with version history
    """
    try:
        user_id = request.get("user_id")
        edit_request = request.get("message", "")
        current_content = request.get("current_content", "")
        
        if not edit_request.strip():
            raise HTTPException(status_code=400, detail="Edit request is required")
        
        # Get original asset data including version history
        asset_result = supabase.table("marketing_assets").select("*").eq("id", asset_id).eq("user_id", user_id).single().execute()
        if not asset_result.data:
            raise HTTPException(status_code=404, detail="Marketing asset not found")
        
        asset = asset_result.data
        report_data = await get_pov_report_data(asset["report_id"], user_id)
        
        # Get current version history and version number
        version_history = asset.get("version_history", [])
        current_version_num = asset.get("current_version", 1)
        
        # Save current version to history before updating
        # For the first edit, save the original as version 1
        if current_version_num == 1 and len(version_history) == 0:
            original_entry = {
                "version": 1,
                "content": asset["content"],
                "title": asset["title"],
                "edited_at": asset.get("created_at", datetime.now().isoformat()),
                "edit_message": "Original version",
                "edited_by": user_id
            }
            version_history.append(original_entry)
        
        # Build chat editing prompt
        prompt = f"""
        You are an expert editor helping to improve a marketing asset. The user wants you to: {edit_request}

        Current marketing asset content:
        {current_content}

        Asset Type: {asset.get('asset_type', 'general')}
        
        Original POV context for reference:
        - Vendor: {report_data['report']['vendor_name']}
        - Customer: {report_data['report']['target_customer_name']}
        - POV Outcomes: {', '.join(report_data.get('titles', [])[:5])}
        
        Instructions:
        - Make the requested changes while maintaining the professional tone
        - Keep the format appropriate for the asset type ({asset.get('asset_type', 'general')})
        - Ensure changes are relevant to the POV context
        - Return the complete updated marketing asset content
        - Preserve formatting appropriate for the asset type
        
        Updated content:
        """
        
        from llm import call_gpt
        updated_content, _ = call_gpt(
            prompt=prompt,
            system_prompt="You are a professional marketing content editor. Make precise, impactful improvements based on user requests.",
        )
        
        # Keep only last 20 versions to prevent excessive storage
        if len(version_history) > 20:
            version_history = version_history[-20:]
        
        # Update the asset with new content and version history
        supabase.table("marketing_assets").update({
            "content": updated_content,
            "version_history": version_history,
            "current_version": current_version_num + 1,
            "updated_at": datetime.now().isoformat()
        }).eq("id", asset_id).eq("user_id", user_id).execute()
        
        return {
            "message": "Marketing asset updated successfully",
            "updated_content": updated_content,
            "edit_request": edit_request,
            "version": current_version_num + 1,
            "version_history": version_history
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/marketing-assets/{asset_id}/versions")
async def get_marketing_asset_versions(
    asset_id: str,
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get version history for a marketing asset
    """
    try:
        result = supabase.table("marketing_assets").select("version_history, current_version, title").eq("id", asset_id).eq("user_id", user_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Marketing asset not found")
        
        return {
            "current_version": result.data.get("current_version", 1),
            "current_title": result.data.get("title", ""),
            "versions": result.data.get("version_history", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/marketing-assets/{asset_id}/restore/{version_number}")
async def restore_marketing_asset_version(
    asset_id: str,
    version_number: int,
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """
    Restore a previous version of a marketing asset
    """
    try:
        user_id = request.get("user_id")
        
        # Get asset with version history
        result = supabase.table("marketing_assets").select("*").eq("id", asset_id).eq("user_id", user_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Marketing asset not found")
        
        asset = result.data
        version_history = asset.get("version_history", [])
        current_version_num = asset.get("current_version", 1)
        
        # Find the version to restore
        version_to_restore = None
        for version in version_history:
            if version.get("version") == version_number:
                version_to_restore = version
                break
        
        if not version_to_restore:
            raise HTTPException(status_code=404, detail=f"Version {version_number} not found")
        
        # Save current version to history before restoring
        current_entry = {
            "version": current_version_num,
            "content": asset["content"],
            "title": asset["title"],
            "edited_at": asset.get("updated_at", asset.get("created_at")),
            "edit_message": f"Before restoring to version {version_number}",
            "edited_by": user_id
        }
        version_history.append(current_entry)
        
        # Keep only last 20 versions
        if len(version_history) > 20:
            version_history = version_history[-20:]
        
        # Restore the selected version
        supabase.table("marketing_assets").update({
            "content": version_to_restore["content"],
            "title": version_to_restore.get("title", asset["title"]),
            "version_history": version_history,
            "current_version": current_version_num + 1,
            "updated_at": datetime.now().isoformat()
        }).eq("id", asset_id).eq("user_id", user_id).execute()
        
        return {
            "message": f"Successfully restored version {version_number}",
            "restored_content": version_to_restore["content"],
            "new_version": current_version_num + 1
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===============================
# SALES SCRIPTS
# ===============================
@app.post("/generate-sales-script/{report_id}")
async def generate_sales_script(
    report_id: str,
    request: GenerateSalesScriptRequest,
    api_key: str = Depends(verify_api_key)
):
    try:
        print(f"🗣️ Generating sales script for report {report_id}")
        report_data = await get_pov_report_data(report_id, request.user_id)
        if not report_data:
            raise HTTPException(status_code=404, detail="Report not found")

        titles_text = "\n".join([f"- {t}" for t in report_data.get('titles', [])])
        selected_outcomes_text = ''
        try:
            source_outcomes = report_data.get('outcomes', []) or []
            if request.selected_outcomes:
                selected = []
                for i in request.selected_outcomes:
                    if 0 <= i < len(source_outcomes):
                        o = source_outcomes[i]
                        selected.append(str(o.get('title') if isinstance(o, dict) else o))
                if selected:
                    selected_outcomes_text = "\n".join([f"- {t}" for t in selected])
        except Exception:
            selected_outcomes_text = ''

        prompt = f"""
        You are a sales coach. Write a {request.scenario} sales script titled: {request.title} with the structure and tone below.

        Modelling Considerations
        Data Sources used in generating the script:
        - POV Sales Role
        - POV CEO Role
        - Sales Rubric
        - Grok (web research, if available)

        Context:
        - Vendor: {report_data['report']['vendor_name']}
        - Services: {report_data['report']['vendor_services']}
        - Customer: {report_data['report']['target_customer_name']}
        - Roles: {report_data['report'].get('role_names','')}
        - POV Titles:\n{titles_text}
        - Selected Outcomes:\n{selected_outcomes_text or '(Use the most relevant POV outcomes/titles)'}
        - Custom Instructions: {request.custom_instructions or 'None'}

        Output format (use these exact sections and casing):
        Sales Script Version 1
        {request.title}
        TARGET AUDIENCE: derive from roles and buyer context
        SPEAKER: {report_data['report']['vendor_name']} sales consultant
        ESTIMATED DURATION: 60–120 seconds
        WORD COUNT: 150–220 words

        Then provide the script content using bracketed cues like [PAUSE], [EMPHASIS] where impactful.

        After the script, include:
        KEY TALKING POINTS FOR REFERENCE:
        - Primary pain point: one sentence
        - Core outcome promised: one sentence
        - Main differentiator: one sentence
        - Success metric mentioned: one sentence (tie to POV evidence when possible)

        Tone:
        - Credible, specific, and outcome-driven. Avoid generic claims.
        - Use concrete examples aligned to the POV when helpful.
        """
        from llm import call_gpt
        script, _ = call_gpt(prompt=prompt, system_prompt="You are a sales coach writing practical scripts.")

        item = {
            "report_id": report_id,
            "user_id": request.user_id,
            "scenario": request.scenario,
            "title": request.title,
            "script_body": script,
        }
        result = supabase.table("sales_scripts").insert(item).execute()
        saved = result.data[0] if result.data else item
        return {"message": "Sales script generated", "id": saved.get("id"), "item": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sales-scripts/{report_id}")
async def get_sales_scripts(report_id: str, user_id: str, api_key: str = Depends(verify_api_key)):
    try:
        res = supabase.table("sales_scripts").select("*").eq("report_id", report_id).eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"items": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat-edit-sales-script/{script_id}")
async def chat_edit_sales_script(
    script_id: str,
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """
    Chat-based sales script editing endpoint with version history
    """
    try:
        user_id = request.get("user_id")
        edit_request = request.get("message", "")
        current_content = request.get("current_content", "")
        
        if not edit_request.strip():
            raise HTTPException(status_code=400, detail="Edit request is required")
        
        # Get original script data including version history
        script_result = supabase.table("sales_scripts").select("*").eq("id", script_id).eq("user_id", user_id).single().execute()
        if not script_result.data:
            raise HTTPException(status_code=404, detail="Sales script not found")
        
        script = script_result.data
        report_data = await get_pov_report_data(script["report_id"], user_id)
        
        # Get current version history and version number
        version_history = script.get("version_history", [])
        current_version_num = script.get("current_version", 1)
        
        # Save current version to history before updating
        # For the first edit, save the original as version 1
        if current_version_num == 1 and len(version_history) == 0:
            original_entry = {
                "version": 1,
                "content": script["script_body"],
                "title": script["title"],
                "edited_at": script.get("created_at", datetime.now().isoformat()),
                "edit_message": "Original version",
                "edited_by": user_id
            }
            version_history.append(original_entry)
        
        # Build chat editing prompt
        prompt = f"""
        You are an expert editor helping to improve a sales script. The user wants you to: {edit_request}

        Current sales script content:
        {current_content}

        Script Scenario: {script.get('scenario', 'general')}
        
        Original POV context for reference:
        - Vendor: {report_data['report']['vendor_name']}
        - Customer: {report_data['report']['target_customer_name']}
        - POV Outcomes: {', '.join(report_data.get('titles', [])[:5])}
        
        Instructions:
        - Make the requested changes while maintaining conversational and professional tone
        - Keep the script appropriate for the scenario type ({script.get('scenario', 'general')})
        - Ensure changes are relevant to the POV context
        - Return the complete updated sales script content
        - Preserve dialogue formatting and speaker indicators
        
        Updated script:
        """
        
        from llm import call_gpt
        updated_content, _ = call_gpt(
            prompt=prompt,
            system_prompt="You are a professional sales script editor. Make precise, persuasive improvements based on user requests.",
        )
        
        # Keep only last 20 versions to prevent excessive storage
        if len(version_history) > 20:
            version_history = version_history[-20:]
        
        # Update the script with new content and version history
        supabase.table("sales_scripts").update({
            "script_body": updated_content,
            "version_history": version_history,
            "current_version": current_version_num + 1,
            "updated_at": datetime.now().isoformat()
        }).eq("id", script_id).eq("user_id", user_id).execute()
        
        return {
            "message": "Sales script updated successfully",
            "updated_content": updated_content,
            "edit_request": edit_request,
            "version": current_version_num + 1,
            "version_history": version_history
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sales-scripts/{script_id}/versions")
async def get_sales_script_versions(
    script_id: str,
    user_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get version history for a sales script
    """
    try:
        result = supabase.table("sales_scripts").select("version_history, current_version, title").eq("id", script_id).eq("user_id", user_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Sales script not found")
        
        return {
            "current_version": result.data.get("current_version", 1),
            "current_title": result.data.get("title", ""),
            "versions": result.data.get("version_history", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sales-scripts/{script_id}/restore/{version_number}")
async def restore_sales_script_version(
    script_id: str,
    version_number: int,
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """
    Restore a previous version of a sales script
    """
    try:
        user_id = request.get("user_id")
        
        # Get script with version history
        result = supabase.table("sales_scripts").select("*").eq("id", script_id).eq("user_id", user_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Sales script not found")
        
        script = result.data
        version_history = script.get("version_history", [])
        current_version_num = script.get("current_version", 1)
        
        # Find the version to restore
        version_to_restore = None
        for version in version_history:
            if version.get("version") == version_number:
                version_to_restore = version
                break
        
        if not version_to_restore:
            raise HTTPException(status_code=404, detail=f"Version {version_number} not found")
        
        # Save current version to history before restoring
        current_entry = {
            "version": current_version_num,
            "content": script["script_body"],
            "title": script["title"],
            "edited_at": script.get("updated_at", script.get("created_at")),
            "edit_message": f"Before restoring to version {version_number}",
            "edited_by": user_id
        }
        version_history.append(current_entry)
        
        # Keep only last 20 versions
        if len(version_history) > 20:
            version_history = version_history[-20:]
        
        # Restore the selected version
        supabase.table("sales_scripts").update({
            "script_body": version_to_restore["content"],
            "title": version_to_restore.get("title", script["title"]),
            "version_history": version_history,
            "current_version": current_version_num + 1,
            "updated_at": datetime.now().isoformat()
        }).eq("id", script_id).eq("user_id", user_id).execute()
        
        return {
            "message": f"Successfully restored version {version_number}",
            "restored_content": version_to_restore["content"],
            "new_version": current_version_num + 1
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/company/{company_name}/financial-data")
async def get_company_financial_data(
    company_name: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get financial/stock data for a company
    """
    try:
        from financial_service import get_company_financial_data
        
        # Decode the company name from URL encoding
        import urllib.parse
        decoded_company_name = urllib.parse.unquote(company_name)
        
        # Fetch financial data
        financial_data = await get_company_financial_data(decoded_company_name)
        
        if financial_data:
            return {
                "company_name": decoded_company_name,
                "financial_data": financial_data,
                "is_public": True
            }
        else:
            return {
                "company_name": decoded_company_name,
                "financial_data": None,
                "is_public": False,
                "message": "No financial data found - likely a private company or ticker not recognized"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching financial data: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/cleanup")
async def cleanup_temp_files():
    """Cleanup temporary files older than 1 hour"""
    import time
    current_time = time.time()
    cleaned = 0
    
    for filename in os.listdir("temp"):
        filepath = os.path.join("temp", filename)
        try:
            # Get file's last modification time
            file_time = os.path.getmtime(filepath)
            # If file is older than 1 hour
            if current_time - file_time > 3600:
                os.remove(filepath)
                cleaned += 1
        except OSError:
            continue
            
    return {"message": f"Cleaned up {cleaned} old temporary files"}

@app.get("/cleanup")
async def cleanup():
    return {"message": "Cleanup endpoint"}

@app.post("/admin/sync-report-counters")
async def sync_report_counters(
    current_user_id: str = Header(..., alias="X-User-ID"),
    api_key: str = Depends(verify_api_key)
):
    """
    Sync report quota counters with actual report counts (super-admin only)
    This fixes the bug where some reports weren't counted due to missing increment calls
    """
    try:
        # Check super-admin access
        if not await check_super_admin_access(current_user_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Super-admin access required")
        
        print("🔄 Starting report counter synchronization...")
        
        # Get all users
        users_result = supabase.table("profiles").select("id, email, full_name, reports_generated_total").execute()
        users = users_result.data
        
        sync_results = []
        total_synced = 0
        
        for user in users:
            user_id = user["id"]
            current_quota_count = user.get("reports_generated_total", 0) or 0
            
            # Get actual report count from pov_reports table
            reports_result = supabase.table("pov_reports").select("id", count="exact").eq("user_id", user_id).execute()
            actual_report_count = reports_result.count or 0
            
            # If there's a discrepancy, update the counter
            if actual_report_count != current_quota_count:
                print(f"👤 {user.get('email', user_id)}: {current_quota_count} → {actual_report_count}")
                
                # Update the quota counters to match actual report count
                update_result = supabase.table("profiles").update({
                    "reports_generated_total": actual_report_count,
                    "updated_at": datetime.now().isoformat()
                }).eq("id", user_id).execute()
                
                sync_results.append({
                    "user_id": user_id,
                    "email": user.get("email", "N/A"),
                    "old_count": current_quota_count,
                    "new_count": actual_report_count,
                    "difference": actual_report_count - current_quota_count
                })
                total_synced += 1
        
        print(f"✅ Synchronization complete. {total_synced} users updated.")
        
        return {
            "message": f"Report counters synchronized for {total_synced} users",
            "total_users_checked": len(users),
            "users_synced": total_synced,
            "sync_details": sync_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error syncing report counters: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error syncing report counters: {str(e)}"
        )

# Add this block to run the server directly with `python main.py`
if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="127.0.0.1", 
        port=8081, 
        reload=True # Enable reload for development convenience
    ) 