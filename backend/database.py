import os
from supabase import create_client, Client
from typing import Dict, List, Optional
import uuid
from datetime import datetime, timedelta
import time

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role for server-side operations
supabase: Client = create_client(supabase_url, supabase_key)

# ROLE-BASED AUTHORIZATION FUNCTIONS

async def get_user_profile_by_id(user_id: str) -> Optional[Dict]:
    """
    Get user profile by ID for authorization checks
    """
    try:
        result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        return result.data if result.data else None
    except Exception:
        return None

async def check_super_admin_access(requesting_user_id: str) -> bool:
    """
    Check if user has super-admin privileges
    """
    profile = await get_user_profile_by_id(requesting_user_id)
    return profile and profile.get("role") == "super_admin"

async def check_admin_or_super_admin_access(requesting_user_id: str) -> bool:
    """
    Check if user has admin or super-admin privileges
    """
    profile = await get_user_profile_by_id(requesting_user_id)
    return profile and profile.get("role") in ["admin", "super_admin"]

async def check_organization_access(requesting_user_id: str, target_user_id: str) -> bool:
    """
    Check if requesting user can access target user (same organization for admins, any for super-admins)
    """
    requesting_profile = await get_user_profile_by_id(requesting_user_id)
    if not requesting_profile:
        return False
    
    # Super-admins can access anyone
    if requesting_profile.get("role") == "super_admin":
        return True
    
    # Admins can only access users in their organization
    if requesting_profile.get("role") == "admin":
        target_profile = await get_user_profile_by_id(target_user_id)
        if not target_profile:
            return False
        return requesting_profile.get("organization") == target_profile.get("organization")
    
    return False

async def check_role_assignment_permission(requesting_user_id: str, target_role: str) -> bool:
    """
    Check if requesting user can assign the target role
    """
    requesting_profile = await get_user_profile_by_id(requesting_user_id)
    if not requesting_profile:
        return False
    
    requesting_role = requesting_profile.get("role")
    
    # Super-admins can assign any role
    if requesting_role == "super_admin":
        return True
    
    # Admins can only assign user role
    if requesting_role == "admin":
        return target_role in ["user", "viewer"]
    
    return False

async def create_pov_report(
    user_id: str,
    vendor_name: str,
    vendor_url: str,
    vendor_services: str,
    target_customer_name: str,
    target_customer_url: str,
    role_names: Optional[str] = None,
    linkedin_urls: Optional[str] = None,
    role_context: Optional[str] = None,
    additional_context: Optional[str] = None,
    model_name: str = 'gpt-4.1-mini'
) -> str:
    """
    Create a new POV report record and return the report ID
    """
    report_data = {
        "user_id": user_id,
        "vendor_name": vendor_name,
        "vendor_url": vendor_url,
        "vendor_services": vendor_services,
        "target_customer_name": target_customer_name,
        "target_customer_url": target_customer_url,
        "role_names": role_names,
        "linkedin_urls": linkedin_urls,
        "role_context": role_context,
        "additional_context": additional_context,
        "model_name": model_name,
        "status": "processing"
    }
    
    result = supabase.table("pov_reports").insert(report_data).execute()
    
    if result.data:
        return result.data[0]["id"]
    else:
        raise Exception("Failed to create POV report")

async def save_outcome_titles(report_id: str, titles: List[str]) -> bool:
    """
    Save the outcome titles to the database
    """
    title_data = [
        {
            "report_id": report_id,
            "title_index": i,
            "title": title,
            "selected": False  # Default to not selected for selective workflow
        }
        for i, title in enumerate(titles)
    ]
    
    result = supabase.table("pov_outcome_titles").insert(title_data).execute()
    return len(result.data) == len(titles)

async def save_outcome_details(report_id: str, outcomes: List[str]) -> bool:
    """
    Save the detailed outcome analysis to the database
    """
    outcome_data = [
        {
            "report_id": report_id,
            "outcome_index": i,
            "title": f"Outcome {i+1}",  # We'll extract the actual title from the content if needed
            "content": outcome
        }
        for i, outcome in enumerate(outcomes)
    ]
    
    result = supabase.table("pov_outcomes").insert(outcome_data).execute()
    return len(result.data) == len(outcomes)

async def save_summary_and_takeaways(report_id: str, summary_content: str) -> bool:
    """
    Save the summary and takeaways content to the database
    This function handles overwrites by deleting existing summary first
    """
    # First, delete any existing summary for this report
    supabase.table("pov_summary").delete().eq("report_id", report_id).execute()
    
    # Split the summary content into summary and takeaways sections
    parts = summary_content.split("## **Key Takeaways & Next Steps**")
    summary_part = parts[0]
    
    # Remove the summary header if it exists (it will be added back in the final assembly)
    import re
    summary_part = re.sub(r'^## \*\*Summary & Strategic Integration of All \d+ Outcomes\*\*\s*', '', summary_part, flags=re.MULTILINE).strip()
    
    takeaways_part = parts[1].strip() if len(parts) > 1 else ""
    
    summary_data = {
        "report_id": report_id,
        "summary_content": summary_part,
        "takeaways_content": takeaways_part
    }
    
    result = supabase.table("pov_summary").insert(summary_data).execute()
    return len(result.data) > 0

async def update_report_status(report_id: str, status: str) -> bool:
    """
    Update the status of a POV report
    """
    result = supabase.table("pov_reports").update({"status": status, "updated_at": datetime.now().isoformat()}).eq("id", report_id).execute()
    return len(result.data) > 0

async def get_pov_report_data(report_id: str, user_id: str) -> Dict:
    """
    Retrieve all POV report data for a given report ID and user ID
    """
    # Get report details
    report_result = supabase.table("pov_reports").select("*").eq("id", report_id).eq("user_id", user_id).execute()
    
    if not report_result.data:
        raise Exception("Report not found or access denied")
    
    report = report_result.data[0]
    
    # Get outcome titles
    titles_result = supabase.table("pov_outcome_titles").select("*").eq("report_id", report_id).order("title_index").execute()
    
    # Get outcome details
    outcomes_result = supabase.table("pov_outcomes").select("*").eq("report_id", report_id).order("outcome_index").execute()
    
    # Get summary
    summary_result = supabase.table("pov_summary").select("*").eq("report_id", report_id).execute()
    
    # Get Grok research if available
    grok_research = await get_grok_research_by_report(report_id, user_id)
    
    return {
        "report": report,
        "titles": [item["title"] for item in titles_result.data],
        "outcomes": [item["content"] for item in outcomes_result.data],
        "summary": summary_result.data[0] if summary_result.data else None,
        "grok_research": grok_research
    }

async def get_pov_report_data_with_auth(report_id: str, requesting_user_id: str) -> Dict:
    """
    Retrieve all POV report data for a given report ID with role-based authorization
    Users can see their own reports, admins can see reports from their org users, super-admins can see all
    """
    # First get the report to find out who owns it
    report_result = supabase.table("pov_reports").select("*").eq("id", report_id).execute()
    
    if not report_result.data:
        raise Exception("Report not found")
    
    report = report_result.data[0]
    report_owner_id = report["user_id"]
    
    # If requesting user is the owner, allow access
    if requesting_user_id == report_owner_id:
        # Get outcome titles
        titles_result = supabase.table("pov_outcome_titles").select("*").eq("report_id", report_id).order("title_index").execute()
        
        # Get outcome details
        outcomes_result = supabase.table("pov_outcomes").select("*").eq("report_id", report_id).order("outcome_index").execute()
        
        # Get summary
        summary_result = supabase.table("pov_summary").select("*").eq("report_id", report_id).execute()
        
        return {
            "report": report,
            "titles": [item["title"] for item in titles_result.data],
            "outcomes": [item["content"] for item in outcomes_result.data],
            "summary": summary_result.data[0] if summary_result.data else None
        }
    
    # For different users, check admin authorization
    requesting_profile = await get_user_profile_by_id(requesting_user_id)
    if not requesting_profile:
        raise Exception("Unauthorized: User profile not found")
    
    requesting_role = requesting_profile.get("role")
    
    # Super admins can see any report
    if requesting_role == "super_admin":
        # Get outcome titles
        titles_result = supabase.table("pov_outcome_titles").select("*").eq("report_id", report_id).order("title_index").execute()
        
        # Get outcome details
        outcomes_result = supabase.table("pov_outcomes").select("*").eq("report_id", report_id).order("outcome_index").execute()
        
        # Get summary
        summary_result = supabase.table("pov_summary").select("*").eq("report_id", report_id).execute()
        
        return {
            "report": report,
            "titles": [item["title"] for item in titles_result.data],
            "outcomes": [item["content"] for item in outcomes_result.data],
            "summary": summary_result.data[0] if summary_result.data else None
        }
    
    # Admins can see reports from users in their organization
    if requesting_role == "admin":
        report_owner_profile = await get_user_profile_by_id(report_owner_id)
        if not report_owner_profile:
            raise Exception("Report owner profile not found")
        
        requesting_org = requesting_profile.get("organization")
        owner_org = report_owner_profile.get("organization")
        
        if requesting_org and requesting_org == owner_org:
            # Get outcome titles
            titles_result = supabase.table("pov_outcome_titles").select("*").eq("report_id", report_id).order("title_index").execute()
            
            # Get outcome details
            outcomes_result = supabase.table("pov_outcomes").select("*").eq("report_id", report_id).order("outcome_index").execute()
            
            # Get summary
            summary_result = supabase.table("pov_summary").select("*").eq("report_id", report_id).execute()
            
            # Get Grok research if available
            grok_research = await get_grok_research_by_report(report_id, report_owner_id)
            
            return {
                "report": report,
                "titles": [item["title"] for item in titles_result.data],
                "outcomes": [item["content"] for item in outcomes_result.data],
                "summary": summary_result.data[0] if summary_result.data else None,
                "grok_research": grok_research
            }
        else:
            raise Exception("Unauthorized: Can only view reports from users in your organization")
    
    # Regular users can only see their own reports
    raise Exception("Unauthorized: Access denied")

async def get_user_reports(user_id: str) -> List[Dict]:
    """
    Get all POV reports for a user
    """
    result = supabase.table("pov_reports").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return result.data

async def update_selected_titles(report_id: str, user_id: str, selected_indices: List[int]) -> bool:
    """
    Update which outcome titles are selected for detailed analysis
    """
    # First verify the user owns this report
    report_result = supabase.table("pov_reports").select("id").eq("id", report_id).eq("user_id", user_id).execute()
    if not report_result.data:
        raise Exception("Report not found or access denied")
    
    # Reset all titles to not selected
    supabase.table("pov_outcome_titles").update({"selected": False}).eq("report_id", report_id).execute()
    
    # Set selected titles to true
    if selected_indices:
        for index in selected_indices:
            supabase.table("pov_outcome_titles").update({"selected": True}).eq("report_id", report_id).eq("title_index", index).execute()
    
    return True

async def get_selected_titles(report_id: str, user_id: str) -> List[Dict]:
    """
    Get the selected outcome titles for a report
    """
    # First verify the user owns this report
    report_result = supabase.table("pov_reports").select("id").eq("id", report_id).eq("user_id", user_id).execute()
    if not report_result.data:
        raise Exception("Report not found or access denied")
    
    # Get selected titles
    result = supabase.table("pov_outcome_titles").select("*").eq("report_id", report_id).eq("selected", True).order("title_index").execute()
    return result.data

async def save_selected_outcome_details(report_id: str, outcomes_data: List[Dict]) -> bool:
    """
    Save detailed outcome analysis for selected titles only
    This function handles overwrites by deleting existing outcomes first
    outcomes_data should be a list of dicts with 'title_index', 'title', and 'content'
    """
    # First, delete any existing outcome details for this report
    supabase.table("pov_outcomes").delete().eq("report_id", report_id).execute()
    
    # Then insert the new outcome data
    outcome_data = [
        {
            "report_id": report_id,
            "outcome_index": item["title_index"],
            "title": item["title"],
            "content": item["content"]
        }
        for item in outcomes_data
    ]
    
    result = supabase.table("pov_outcomes").insert(outcome_data).execute()
    return len(result.data) == len(outcomes_data)

async def get_report_titles_only(report_id: str, user_id: str) -> Dict:
    """
    Get just the report info and titles (for the selective workflow step 1)
    """
    # Get report details
    report_result = supabase.table("pov_reports").select("*").eq("id", report_id).eq("user_id", user_id).execute()
    
    if not report_result.data:
        raise Exception("Report not found or access denied")
    
    report = report_result.data[0]
    
    # Get outcome titles with selection status
    titles_result = supabase.table("pov_outcome_titles").select("*").eq("report_id", report_id).order("title_index").execute()
    
    return {
        "report": report,
        "titles": titles_result.data
    }

async def save_context_data(report_id: str, context_data: Dict) -> bool:
    """
    Save the gathered context data to avoid re-gathering in step 2
    """
    result = supabase.table("pov_reports").update({"context_data": context_data}).eq("id", report_id).execute()
    return len(result.data) > 0

async def get_context_data(report_id: str, user_id: str) -> Dict:
    """
    Retrieve the stored context data for a report
    """
    # First verify the user owns this report
    report_result = supabase.table("pov_reports").select("context_data").eq("id", report_id).eq("user_id", user_id).execute()
    if not report_result.data:
        raise Exception("Report not found or access denied")
    
    context_data = report_result.data[0].get("context_data")
    if not context_data:
        raise Exception("No context data found for this report")
    
    return context_data

async def get_selection_summary(report_id: str, user_id: str) -> Dict:
    """
    Get a summary of current selections and existing outcomes for a report
    """
    # First verify the user owns this report
    report_result = supabase.table("pov_reports").select("id").eq("id", report_id).eq("user_id", user_id).execute()
    if not report_result.data:
        raise Exception("Report not found or access denied")
    
    # Get all titles with selection status
    titles_result = supabase.table("pov_outcome_titles").select("*").eq("report_id", report_id).order("title_index").execute()
    
    # Get existing outcomes
    outcomes_result = supabase.table("pov_outcomes").select("outcome_index").eq("report_id", report_id).execute()
    existing_outcome_indices = [item["outcome_index"] for item in outcomes_result.data]
    
    # Get summary status
    summary_result = supabase.table("pov_summary").select("id").eq("report_id", report_id).execute()
    has_summary = len(summary_result.data) > 0
    
    selected_titles = [item for item in titles_result.data if item.get("selected", False)]
    
    return {
        "total_titles": len(titles_result.data),
        "selected_count": len(selected_titles),
        "selected_indices": [item["title_index"] for item in selected_titles],
        "existing_outcomes_count": len(existing_outcome_indices),
        "existing_outcome_indices": existing_outcome_indices,
        "has_summary": has_summary,
        "selected_titles": selected_titles
    }

# USER MANAGEMENT FUNCTIONS WITH ROLE-BASED ACCESS

async def create_user_profile_with_auth(
    requesting_user_id: str,
    email: str,
    password: Optional[str] = None,
    full_name: Optional[str] = None,
    role: Optional[str] = None,
    organization: Optional[str] = None,
    organization_role: Optional[str] = None,
    phone: Optional[str] = None,
    department: Optional[str] = None,
    avatar_url: Optional[str] = None,
    is_active: bool = True,
    metadata: Optional[Dict] = None,
    # New parameters for account expiry and report quotas
    auto_expire_days: Optional[int] = None,
    report_quota_total: Optional[int] = None,
    report_quota_monthly: Optional[int] = None,
    report_quota_daily: Optional[int] = None
) -> Dict:
    """
    Create a new user with auth and profile information (with organization limits and expiry)
    """
    try:
        # Check authorization
        if not await check_admin_or_super_admin_access(requesting_user_id):
            raise Exception("Unauthorized: Admin or super-admin access required")
        
        # Get requesting user's profile
        requesting_profile = await get_user_profile_by_id(requesting_user_id)
        requesting_role = requesting_profile.get("role")
        
        # Check role assignment permission
        if role and not await check_role_assignment_permission(requesting_user_id, role):
            raise Exception(f"Unauthorized: Cannot assign role '{role}'")
        
        # For admins, enforce organization restrictions
        if requesting_role == "admin":
            admin_org = requesting_profile.get("organization")
            if not admin_org:
                raise Exception("Admin user has no organization set")
            
            # Force admin's organization for created users
            if organization and organization != admin_org:
                raise Exception("Unauthorized: Admins can only create users in their own organization")
            organization = admin_org  # Ensure organization is set to admin's org
        
        # Check if a user with this email already exists in profiles table first
        try:
            existing_profile_check = supabase.table("profiles").select("*").eq("email", email).execute()
            if existing_profile_check.data:
                raise Exception(f"A user with this email already exists in the system")
        except Exception as email_check_error:
            if "already exists in the system" in str(email_check_error):
                raise email_check_error  # Re-raise the "already exists" error
            # Other errors (like connection issues) can be ignored for now
            print(f"⚠️ Could not check existing email: {email_check_error}")

        # Check organization user limit if organization is specified
        if organization:
            if not await check_organization_user_limit(organization):
                org_info = await get_organization_user_info(organization)
                raise Exception(f"Organization user limit reached. Current: {org_info['current_users']}, Limit: {org_info['user_limit']}")
        
        # Create the user profile
        user_id = None
        auth_user_created = False
        
        # Create auth user and profile with better error handling
        if password:
            try:
                # Try to create auth user
                auth_response = supabase.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True
                })
                
                if auth_response.user:
                    user_id = auth_response.user.id
                    auth_user_created = True
                else:
                    raise Exception("Auth user creation returned no user object")
                    
            except Exception as auth_error:
                auth_error_str = str(auth_error)
                
                # Handle existing user case
                if "already been registered" in auth_error_str or "already exists" in auth_error_str:
                    try:
                        # Find existing auth user
                        existing_users = supabase.auth.admin.list_users()
                        for existing_user in existing_users:
                            if existing_user.email == email:
                                user_id = existing_user.id
                                auth_user_created = False
                                break
                        
                        if not user_id:
                            raise Exception(f"User with email {email} reported as existing but not found")
                            
                    except Exception:
                        raise Exception(f"Failed to create or find auth user: {auth_error_str}")
                else:
                    raise Exception(f"Failed to create auth user: {auth_error_str}")
        else:
            raise Exception("Password is required for user creation")

        # Ensure we have a valid user_id before proceeding
        if not user_id:
            raise Exception("No valid user ID obtained - cannot proceed with profile creation")

        # Prepare profile data
        profile_data = {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": role,
            "organization": organization,
            "organization_role": organization_role,
            "phone": phone,
            "department": department,
            "avatar_url": avatar_url,
            "is_active": is_active,
            "metadata": metadata
        }
        
        # Add expiry settings if specified
        if auto_expire_days is not None:
            expiry_date = (datetime.now() + timedelta(days=auto_expire_days)).isoformat()
            profile_data["account_expires_at"] = expiry_date
        elif is_active:
            # Apply default expiry: 365 days from now
            expiry_date = (datetime.now() + timedelta(days=365)).isoformat()
            profile_data["account_expires_at"] = expiry_date
        
        # Add report quota settings if specified, otherwise use sensible defaults
        profile_data["report_quota_total"] = report_quota_total  # Can be None for unlimited
        profile_data["report_quota_monthly"] = report_quota_monthly  # Can be None for unlimited  
        profile_data["report_quota_daily"] = report_quota_daily  # Can be None for unlimited
        
        # Initialize usage counters to zero
        profile_data["reports_generated_total"] = 0
        profile_data["reports_generated_this_month"] = 0
        profile_data["reports_generated_today"] = 0
        profile_data["quota_reset_date"] = datetime.now().date().isoformat()
        
        try:
            # First, check if a profile was auto-created by Supabase
            existing_profile = supabase.table("profiles").select("*").eq("id", user_id).execute()
            
            if existing_profile.data:
                # Profile was auto-created, update it with our desired values
                print(f"🔄 Updating auto-created profile for: {email}")
                profile_result = supabase.table("profiles").update(profile_data).eq("id", user_id).execute()
            else:
                # No auto-created profile, create a new one
                print(f"➕ Creating new profile for: {email}")
                profile_result = supabase.table("profiles").insert(profile_data).execute()
            
            if profile_result.data:
                print(f"✅ User created successfully: {email}")
                return {
                    "user_id": user_id,
                    "profile": profile_result.data[0],
                    "auth_user_created": auth_user_created
                }
            else:
                raise Exception("Profile operation returned no data")
                
        except Exception as profile_error:
            profile_error_str = str(profile_error)
            
            # If profile operation failed and we created the auth user, clean it up
            if auth_user_created:
                try:
                    supabase.auth.admin.delete_user(user_id)
                    print(f"🧹 Cleaned up auth user due to profile operation failure")
                except Exception as cleanup_error:
                    print(f"⚠️ Failed to cleanup auth user: {cleanup_error}")
            
            # Provide more specific error message
            if "duplicate key value violates unique constraint" in profile_error_str:
                raise Exception("A user with this email already exists in the system")
            else:
                raise Exception(f"Failed to create user profile: {profile_error_str}")
            
    except Exception as e:
        raise Exception(f"Error creating user: {str(e)}")


# COLD CALL EMAIL FUNCTIONS

async def create_cold_call_email(
    report_id: str,
    user_id: str,
    subject: str,
    email_body: str,
    recipient_name: Optional[str] = None,
    recipient_email: Optional[str] = None,
    recipient_company: Optional[str] = None,
    selected_outcomes: List[int] = None,
    custom_instructions: Optional[str] = None
) -> Dict:
    """
    Create a new cold call email record
    """
    try:
        if selected_outcomes is None:
            selected_outcomes = []
            
        email_data = {
            "report_id": report_id,
            "user_id": user_id,
            "subject": subject,
            "email_body": email_body,
            "recipient_name": recipient_name,
            "recipient_email": recipient_email,
            "recipient_company": recipient_company,
            "selected_outcomes": selected_outcomes,
            "custom_instructions": custom_instructions,
            "status": "draft"
        }
        
        result = supabase.table("cold_call_emails").insert(email_data).execute()
        
        if result.data:
            return result.data[0]
        else:
            raise Exception("Failed to create cold call email")
            
    except Exception as e:
        raise Exception(f"Error creating cold call email: {str(e)}")

async def get_cold_call_emails_by_report(report_id: str, user_id: str) -> List[Dict]:
    """
    Get all cold call emails for a specific report
    """
    try:
        result = supabase.table("cold_call_emails")\
            .select("*")\
            .eq("report_id", report_id)\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        
        return result.data if result.data else []
        
    except Exception as e:
        raise Exception(f"Error getting cold call emails: {str(e)}")

async def get_cold_call_email_by_id(email_id: str, user_id: str) -> Optional[Dict]:
    """
    Get a specific cold call email by ID
    """
    try:
        result = supabase.table("cold_call_emails")\
            .select("*")\
            .eq("id", email_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        return result.data if result.data else None
        
    except Exception as e:
        raise Exception(f"Error getting cold call email: {str(e)}")

async def update_cold_call_email_status(email_id: str, user_id: str, status: str) -> bool:
    """
    Update the status of a cold call email
    """
    try:
        update_data = {"status": status}
        if status == "sent":
            update_data["sent_at"] = datetime.utcnow().isoformat()
            
        result = supabase.table("cold_call_emails")\
            .update(update_data)\
            .eq("id", email_id)\
            .eq("user_id", user_id)\
            .execute()
        
        return bool(result.data)
        
    except Exception as e:
        raise Exception(f"Error updating cold call email status: {str(e)}")

async def delete_cold_call_email(email_id: str, user_id: str) -> bool:
    """
    Delete a cold call email
    """
    try:
        result = supabase.table("cold_call_emails")\
            .delete()\
            .eq("id", email_id)\
            .eq("user_id", user_id)\
            .execute()
        
        return bool(result.data)
        
    except Exception as e:
        raise Exception(f"Error deleting cold call email: {str(e)}")

async def update_user_profile_with_auth(
    requesting_user_id: str,
    target_user_id: str,
    email: Optional[str] = None,
    full_name: Optional[str] = None,
    role: Optional[str] = None,
    organization: Optional[str] = None,
    organization_role: Optional[str] = None,
    phone: Optional[str] = None,
    department: Optional[str] = None,
    avatar_url: Optional[str] = None,
    is_active: Optional[bool] = None,
    metadata: Optional[Dict] = None
) -> Dict:
    """
    Update user profile information (with role-based authorization)
    """
    try:
        # Check authorization - must be admin/super-admin or editing own profile
        if requesting_user_id != target_user_id:
            if not await check_admin_or_super_admin_access(requesting_user_id):
                raise Exception("Unauthorized: Admin access required to edit other users")
            
            # Check organization access
            if not await check_organization_access(requesting_user_id, target_user_id):
                raise Exception("Unauthorized: Cannot access user from different organization")
        
        # Check role assignment permission
        if role and not await check_role_assignment_permission(requesting_user_id, role):
            raise Exception(f"Unauthorized: Cannot assign role '{role}'")
        
        # Prevent admins from changing organization
        requesting_profile = await get_user_profile_by_id(requesting_user_id)
        if requesting_profile.get("role") == "admin" and organization is not None:
            target_profile = await get_user_profile_by_id(target_user_id)
            if target_profile and organization != target_profile.get("organization"):
                raise Exception("Unauthorized: Admins cannot move users between organizations")
        
        # Build update data with only provided fields
        update_data = {}
        if email is not None:
            update_data["email"] = email
        if full_name is not None:
            update_data["full_name"] = full_name
        if role is not None:
            update_data["role"] = role
        if organization is not None:
            update_data["organization"] = organization
        if organization_role is not None:
            update_data["organization_role"] = organization_role
        if phone is not None:
            update_data["phone"] = phone
        if department is not None:
            update_data["department"] = department
        if avatar_url is not None:
            update_data["avatar_url"] = avatar_url
        if is_active is not None:
            update_data["is_active"] = is_active
        if metadata is not None:
            update_data["metadata"] = metadata
        
        if not update_data:
            raise Exception("No update data provided")
        
        # Update profile
        update_data["updated_at"] = datetime.now().isoformat()
        profile_result = supabase.table("profiles").update(update_data).eq("id", target_user_id).execute()
        
        # If email is being updated and user exists in auth, update auth user too
        if email is not None:
            try:
                supabase.auth.admin.update_user_by_id(target_user_id, {"email": email})
            except:
                # Ignore auth update errors - user might not exist in auth table
                pass
        
        if profile_result.data:
            return profile_result.data[0]
        else:
            raise Exception("User not found or update failed")
            
    except Exception as e:
        raise Exception(f"Error updating user: {str(e)}")

async def delete_user_profile_with_auth(
    requesting_user_id: str, 
    target_user_id: str, 
    permanent: bool = False
) -> bool:
    """
    Delete or deactivate a user profile (with role-based authorization)
    """
    try:
        # Check authorization
        if not await check_admin_or_super_admin_access(requesting_user_id):
            raise Exception("Unauthorized: Admin or super-admin access required")
        
        # Check organization access
        if not await check_organization_access(requesting_user_id, target_user_id):
            raise Exception("Unauthorized: Cannot access user from different organization")
        
        # Prevent self-deletion
        if requesting_user_id == target_user_id:
            raise Exception("Cannot delete your own account")
        
        if permanent:
            # Delete from profiles table
            profile_result = supabase.table("profiles").delete().eq("id", target_user_id).execute()
            
            # Try to delete from auth table (might not exist)
            try:
                supabase.auth.admin.delete_user(target_user_id)
            except:
                # Ignore auth deletion errors - user might not exist in auth table
                pass
                
            return len(profile_result.data) > 0
        else:
            # Just deactivate
            update_result = supabase.table("profiles").update({
                "is_active": False,
                "updated_at": datetime.now().isoformat()
            }).eq("id", target_user_id).execute()
            
            return len(update_result.data) > 0
            
    except Exception as e:
        raise Exception(f"Error deleting user: {str(e)}")

async def get_user_profiles_with_auth(
    requesting_user_id: str,
    active_only: bool = True,
    organization: Optional[str] = None,
    role: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None
) -> List[Dict]:
    """
    Get user profiles with role-based filtering
    """
    try:
        # Check authorization
        if not await check_admin_or_super_admin_access(requesting_user_id):
            raise Exception("Unauthorized: Admin or super-admin access required")
        
        requesting_profile = await get_user_profile_by_id(requesting_user_id)
        requesting_role = requesting_profile.get("role")
        
        query = supabase.table("profiles").select("*")
        
        if active_only:
            query = query.eq("is_active", True)
        
        # For admins, restrict to their organization only
        if requesting_role == "admin":
            admin_org = requesting_profile.get("organization")
            if admin_org:
                query = query.eq("organization", admin_org)
            else:
                # Admin without organization can't see any users
                return []
        
        # For super-admins, allow organization filter
        if requesting_role == "super_admin" and organization:
            query = query.eq("organization", organization)
            
        if role:
            query = query.eq("role", role)
        
        query = query.order("created_at", desc=True)
        
        if limit:
            query = query.limit(limit)
            
        if offset:
            query = query.offset(offset)
        
        result = query.execute()
        return result.data
        
    except Exception as e:
        raise Exception(f"Error getting users: {str(e)}")

async def get_all_reports_with_auth(
    requesting_user_id: str,
    organization: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None
) -> List[Dict]:
    """
    Get POV reports with role-based access (super-admins can see all, others see their own)
    """
    try:
        requesting_profile = await get_user_profile_by_id(requesting_user_id)
        requesting_role = requesting_profile.get("role")
        
        query = supabase.table("pov_reports").select("""
            *,
            profiles!pov_reports_user_id_fkey(email, full_name, organization)
        """)
        
        # Super-admins can see all reports
        if requesting_role == "super_admin":
            if organization:
                # Filter by organization through the profile join
                query = query.eq("profiles.organization", organization)
        else:
            # Everyone else can only see their own reports
            query = query.eq("user_id", requesting_user_id)
        
        query = query.order("created_at", desc=True)
        
        if limit:
            query = query.limit(limit)
            
        if offset:
            query = query.offset(offset)
        
        result = query.execute()
        return result.data
        
    except Exception as e:
        raise Exception(f"Error getting reports: {str(e)}")

# Keep original functions for backward compatibility
async def create_user_profile(
    email: str,
    password: Optional[str] = None,
    full_name: Optional[str] = None,
    role: Optional[str] = None,
    organization: Optional[str] = None,
    organization_role: Optional[str] = None,
    phone: Optional[str] = None,
    department: Optional[str] = None,
    avatar_url: Optional[str] = None,
    is_active: bool = True,
    metadata: Optional[Dict] = None
) -> Dict:
    """
    Create a new user with auth and profile information (backward compatibility)
    """
    try:
        user_id = None
        auth_user_created = False
        
        # Create user in auth.users table first (required for foreign key constraint)
        if password:
            try:
                print(f"🔑 Creating auth user for: {email}")
                auth_response = supabase.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True
                })
                
                if auth_response.user:
                    user_id = auth_response.user.id
                    auth_user_created = True
                    print(f"✅ Auth user created successfully with ID: {user_id}")
                else:
                    raise Exception("Auth user creation returned no user object")
                    
            except Exception as auth_error:
                print(f"❌ Failed to create auth user: {auth_error}")
                raise Exception(f"Failed to create auth user: {auth_error}")
        else:
            # For users without passwords, we still need to create them in auth system
            # but we can create them as disabled or use a different approach
            raise Exception("Password is required for user creation due to foreign key constraints")

        # Now create profile with the auth user ID
        profile_data = {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": role,
            "organization": organization,
            "organization_role": organization_role,
            "phone": phone,
            "department": department,
            "avatar_url": avatar_url,
            "is_active": is_active,
            "metadata": metadata
        }
        
        print(f"📝 Creating profile for auth user ID: {user_id}")
        profile_result = supabase.table("profiles").insert(profile_data).execute()
        
        if profile_result.data:
            print(f"✅ Profile created successfully")
            return {
                "user_id": user_id,
                "profile": profile_result.data[0],
                "auth_user_created": auth_user_created
            }
        else:
            # If profile creation failed, clean up auth user
            if auth_user_created:
                try:
                    print(f"🧹 Cleaning up auth user due to profile creation failure")
                    supabase.auth.admin.delete_user(user_id)
                except Exception as cleanup_error:
                    print(f"⚠️ Failed to cleanup auth user: {cleanup_error}")
            raise Exception("Failed to create user profile")
            
    except Exception as e:
        print(f"❌ Error in create_user_profile: {str(e)}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Error creating user: {str(e)}")

async def update_user_profile(
    user_id: str,
    email: Optional[str] = None,
    full_name: Optional[str] = None,
    role: Optional[str] = None,
    organization: Optional[str] = None,
    organization_role: Optional[str] = None,
    phone: Optional[str] = None,
    department: Optional[str] = None,
    avatar_url: Optional[str] = None,
    is_active: Optional[bool] = None,
    metadata: Optional[Dict] = None
) -> Dict:
    """
    Update user profile information (backward compatibility)
    """
    try:
        # Build update data with only provided fields
        update_data = {}
        if email is not None:
            update_data["email"] = email
        if full_name is not None:
            update_data["full_name"] = full_name
        if role is not None:
            update_data["role"] = role
        if organization is not None:
            update_data["organization"] = organization
        if organization_role is not None:
            update_data["organization_role"] = organization_role
        if phone is not None:
            update_data["phone"] = phone
        if department is not None:
            update_data["department"] = department
        if avatar_url is not None:
            update_data["avatar_url"] = avatar_url
        if is_active is not None:
            update_data["is_active"] = is_active
        if metadata is not None:
            update_data["metadata"] = metadata
        
        if not update_data:
            raise Exception("No update data provided")
        
        # Update profile
        update_data["updated_at"] = datetime.now().isoformat()
        profile_result = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
        
        # If email is being updated and user exists in auth, update auth user too
        if email is not None:
            try:
                supabase.auth.admin.update_user_by_id(user_id, {"email": email})
            except:
                # Ignore auth update errors - user might not exist in auth table
                pass
        
        if profile_result.data:
            return profile_result.data[0]
        else:
            raise Exception("User not found or update failed")
            
    except Exception as e:
        raise Exception(f"Error updating user: {str(e)}")

async def delete_user_profile(user_id: str, permanent: bool = False) -> bool:
    """
    Delete or deactivate a user profile (backward compatibility)
    """
    try:
        if permanent:
            # Delete from profiles table
            profile_result = supabase.table("profiles").delete().eq("id", user_id).execute()
            
            # Try to delete from auth table (might not exist)
            try:
                supabase.auth.admin.delete_user(user_id)
            except:
                # Ignore auth deletion errors - user might not exist in auth table
                pass
                
            return len(profile_result.data) > 0
        else:
            # Just deactivate
            update_result = supabase.table("profiles").update({
                "is_active": False,
                "updated_at": datetime.now().isoformat()
            }).eq("id", user_id).execute()
            
            return len(update_result.data) > 0
            
    except Exception as e:
        raise Exception(f"Error deleting user: {str(e)}")

async def get_user_profile(user_id: str) -> Dict:
    """
    Get a user profile by ID
    """
    try:
        result = supabase.table("profiles").select("*").eq("id", user_id).execute()
        
        if result.data:
            return result.data[0]
        else:
            raise Exception("User not found")
            
    except Exception as e:
        raise Exception(f"Error getting user: {str(e)}")

async def get_all_user_profiles(
    active_only: bool = True,
    organization: Optional[str] = None,
    role: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None
) -> List[Dict]:
    """
    Get all user profiles with optional filtering (backward compatibility)
    """
    try:
        query = supabase.table("profiles").select("*")
        
        if active_only:
            query = query.eq("is_active", True)
        
        if organization:
            query = query.eq("organization", organization)
            
        if role:
            query = query.eq("role", role)
        
        query = query.order("created_at", desc=True)
        
        if limit:
            query = query.limit(limit)
            
        if offset:
            query = query.offset(offset)
        
        result = query.execute()
        return result.data
        
    except Exception as e:
        raise Exception(f"Error getting users: {str(e)}")

async def search_user_profiles(search_term: str, limit: int = 20) -> List[Dict]:
    """
    Search user profiles by email, name, or organization
    """
    try:
        # Use text search across multiple fields
        result = supabase.table("profiles").select("*").or_(
            f"email.ilike.%{search_term}%,"
            f"full_name.ilike.%{search_term}%,"
            f"organization.ilike.%{search_term}%"
        ).eq("is_active", True).limit(limit).execute()
        
        return result.data
        
    except Exception as e:
        raise Exception(f"Error searching users: {str(e)}") 

# SEAT MANAGEMENT AND TIME-BOXED ACCESS FUNCTIONS

async def get_system_setting(setting_key: str) -> Optional[str]:
    """
    Get a system setting value from environment variables (simplified approach)
    """
    try:
        # Map setting keys to environment variables with defaults
        env_mapping = {
            "max_active_seats": ("MAX_ACTIVE_SEATS", "100"),
            "seat_management_enabled": ("SEAT_MANAGEMENT_ENABLED", "true"), 
            "default_account_expiry_days": ("DEFAULT_ACCOUNT_EXPIRY_DAYS", "365"),
            "auto_expiry_enabled": ("AUTO_EXPIRY_ENABLED", "true"),
            "default_report_quota_total": ("DEFAULT_REPORT_QUOTA_TOTAL", "null"),
            "default_report_quota_monthly": ("DEFAULT_REPORT_QUOTA_MONTHLY", "null"),
            "default_report_quota_daily": ("DEFAULT_REPORT_QUOTA_DAILY", "null"),
            "report_quota_enabled": ("REPORT_QUOTA_ENABLED", "true")
        }
        
        if setting_key in env_mapping:
            env_var, default_value = env_mapping[setting_key]
            return os.getenv(env_var, default_value)
        return None
    except Exception as e:
        print(f"Error getting system setting {setting_key}: {e}")
        return None

async def set_system_setting(setting_key: str, setting_value: str, description: Optional[str] = None) -> bool:
    """
    Set a system setting value (Note: With simplified approach, this should be done via environment variables)
    This function is kept for backward compatibility but will not persist changes.
    """
    try:
        print(f"⚠️ Warning: set_system_setting called for '{setting_key}' = '{setting_value}'")
        print(f"   With the simplified approach, please set environment variable instead:")
        
        # Map setting keys to environment variables
        env_mapping = {
            "max_active_seats": "MAX_ACTIVE_SEATS",
            "seat_management_enabled": "SEAT_MANAGEMENT_ENABLED", 
            "default_account_expiry_days": "DEFAULT_ACCOUNT_EXPIRY_DAYS",
            "auto_expiry_enabled": "AUTO_EXPIRY_ENABLED",
            "default_report_quota_total": "DEFAULT_REPORT_QUOTA_TOTAL",
            "default_report_quota_monthly": "DEFAULT_REPORT_QUOTA_MONTHLY",
            "default_report_quota_daily": "DEFAULT_REPORT_QUOTA_DAILY",
            "report_quota_enabled": "REPORT_QUOTA_ENABLED"
        }
        
        env_var = env_mapping.get(setting_key)
        if env_var:
            print(f"   Set: {env_var}={setting_value}")
        
        # Return True to maintain compatibility, but setting is not persisted
        return True
    except Exception as e:
        print(f"Error in set_system_setting: {e}")
        return False

# Seat management functions removed - using organization limits instead

async def expire_old_accounts() -> int:
    """
    Expire accounts that have passed their expiry date
    """
    try:
        result = supabase.rpc("expire_old_accounts").execute()
        return result.data if result.data is not None else 0
    except Exception as e:
        print(f"Error expiring old accounts: {e}")
        return 0

async def get_expiry_settings() -> Dict:
    """
    Get account expiry settings
    """
    try:
        default_days_str = await get_system_setting("default_account_expiry_days")
        auto_expiry_enabled_str = await get_system_setting("auto_expiry_enabled")
        
        return {
            "default_expiry_days": int(default_days_str) if default_days_str else 365,
            "auto_expiry_enabled": auto_expiry_enabled_str == "true" if auto_expiry_enabled_str else True
        }
    except Exception as e:
        print(f"Error getting expiry settings: {e}")
        return {
            "default_expiry_days": 365,
            "auto_expiry_enabled": True
        }

async def set_user_expiry(user_id: str, expiry_days: Optional[int] = None, expiry_date: Optional[str] = None) -> bool:
    """
    Set account expiry for a specific user
    """
    try:
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if expiry_date:
            update_data["account_expires_at"] = expiry_date
        elif expiry_days is not None:
            if expiry_days > 0:
                expiry_timestamp = datetime.now() + timedelta(days=expiry_days)
                update_data["account_expires_at"] = expiry_timestamp.isoformat()
            else:
                update_data["account_expires_at"] = None
        
        result = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"Error setting user expiry: {e}")
        return False

async def get_users_expiring_soon(days_ahead: int = 7) -> List[Dict]:
    """
    Get users whose accounts will expire within the specified number of days using new SQL function
    """
    try:
        # Use the new SQL function that returns structured data with email, name, etc.
        result = supabase.rpc("get_users_expiring_soon", {"days_ahead": days_ahead}).execute()
        
        if result.data:
            # Convert the result to the expected format
            users = []
            for row in result.data:
                user_data = {
                    "id": row.get("user_id"),
                    "email": row.get("email"),
                    "full_name": row.get("full_name"),
                    "organization": row.get("organization"),
                    "account_expires_at": row.get("account_expires_at"),
                    "days_until_expiry": row.get("days_until_expiry")
                }
                users.append(user_data)
            return users
        return []
    except Exception as e:
        print(f"Error getting users expiring soon: {e}")
        # Fallback to old method if new function fails
        try:
            future_date = (datetime.now() + timedelta(days=days_ahead)).isoformat()
            
            result = supabase.table("profiles").select("*").gte(
                "account_expires_at", datetime.now().isoformat()
            ).lte(
                "account_expires_at", future_date
            ).eq("is_active", True).execute()
            
            return result.data
        except Exception as fallback_error:
            print(f"Fallback method also failed: {fallback_error}")
            return []

# REPORT QUOTA MANAGEMENT FUNCTIONS

async def check_user_report_quota(user_id: str) -> bool:
    """
    Check if user can generate another report based on quotas
    """
    try:
        result = supabase.rpc("check_user_report_quota", {"user_uuid": user_id}).execute()
        return result.data if result.data is not None else False
    except Exception as e:
        print(f"Error checking user report quota: {e}")
        return False

async def increment_user_report_count(user_id: str) -> bool:
    """
    Increment user's report generation counters
    """
    try:
        result = supabase.rpc("increment_user_report_count", {"user_uuid": user_id}).execute()
        return True
    except Exception as e:
        print(f"Error incrementing user report count: {e}")
        return False

async def get_user_quota_status(user_id: str) -> Dict:
    """
    Get detailed quota status for a user (simplified credit-based system)
    """
    try:
        result = supabase.rpc("get_user_quota_status", {"user_uuid": user_id}).execute()
        if result.data:
            # New simplified format from database with unlimited support
            db_data = result.data
            return {
                "quota_enabled": db_data.get("quota_enabled", False),
                "is_unlimited": db_data.get("is_unlimited", False),
                "total_credits": db_data.get("total_credits"),  # Can be null for unlimited
                "credits_used": db_data.get("credits_used", 0),
                "credits_remaining": db_data.get("credits_remaining", 0),
                "can_generate": db_data.get("can_generate", True)
            }
        return {
            "quota_enabled": False,
            "is_unlimited": False,
            "total_credits": 0,
            "credits_used": 0,
            "credits_remaining": 0,
            "can_generate": True
        }
    except Exception as e:
        print(f"Error getting user quota status: {e}")
        return {
            "quota_enabled": False,
            "is_unlimited": False,
            "total_credits": 0,
            "credits_used": 0,
            "credits_remaining": 0,
            "can_generate": False,
            "error": str(e)
        }

async def reset_user_quotas(user_id: Optional[str] = None, reset_type: str = "all") -> int:
    """
    Reset quota counters for user(s)
    reset_type: 'daily', 'monthly', 'total', 'all'
    """
    try:
        params = {"reset_type": reset_type}
        if user_id:
            params["user_uuid"] = user_id
        
        result = supabase.rpc("reset_user_quotas", params).execute()
        return result.data if result.data is not None else 0
    except Exception as e:
        print(f"Error resetting user quotas: {e}")
        return 0

async def get_quota_settings() -> Dict:
    """
    Get report quota settings
    """
    try:
        default_total_str = await get_system_setting("default_report_quota_total")
        default_monthly_str = await get_system_setting("default_report_quota_monthly")
        default_daily_str = await get_system_setting("default_report_quota_daily")
        quota_enabled_str = await get_system_setting("report_quota_enabled")
        
        return {
            "default_report_quota_total": int(default_total_str) if default_total_str and default_total_str != "null" else None,
            "default_report_quota_monthly": int(default_monthly_str) if default_monthly_str and default_monthly_str != "null" else None,
            "default_report_quota_daily": int(default_daily_str) if default_daily_str and default_daily_str != "null" else None,
            "report_quota_enabled": quota_enabled_str == "true" if quota_enabled_str else True
        }
    except Exception as e:
        print(f"Error getting quota settings: {e}")
        return {
            "default_report_quota_total": None,
            "default_report_quota_monthly": None,
            "default_report_quota_daily": None,
            "report_quota_enabled": True
        }

async def set_user_report_quotas(
    user_id: str, 
    quota_total: Optional[int] = None,
    quota_monthly: Optional[int] = None, 
    quota_daily: Optional[int] = None
) -> bool:
    """
    Set report quotas for a specific user
    """
    try:
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if quota_total is not None:
            update_data["report_quota_total"] = quota_total if quota_total > 0 else None
        if quota_monthly is not None:
            update_data["report_quota_monthly"] = quota_monthly if quota_monthly > 0 else None
        if quota_daily is not None:
            update_data["report_quota_daily"] = quota_daily if quota_daily > 0 else None
        
        result = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"Error setting user report quotas: {e}")
        return False

async def get_users_over_quota(quota_type: str = "any") -> List[Dict]:
    """
    Get users who have exceeded their quotas
    quota_type: 'daily', 'monthly', 'total', 'any'
    """
    try:
        # Build query based on quota type
        query = supabase.table("profiles").select("*").eq("is_active", True)
        
        if quota_type == "daily":
            query = query.filter("report_quota_daily", "not.is", "null").filter("reports_generated_today", "gte", "report_quota_daily")
        elif quota_type == "monthly":
            query = query.filter("report_quota_monthly", "not.is", "null").filter("reports_generated_this_month", "gte", "report_quota_monthly")
        elif quota_type == "total":
            query = query.filter("report_quota_total", "not.is", "null").filter("reports_generated_total", "gte", "report_quota_total")
        # For 'any', we'll filter in Python since complex OR conditions are harder in Supabase
        
        result = query.execute()
        users = result.data
        
        if quota_type == "any":
            # Filter users who have exceeded any quota
            filtered_users = []
            for user in users:
                exceeded = False
                
                if (user.get("report_quota_daily") and 
                    user.get("reports_generated_today", 0) >= user["report_quota_daily"]):
                    exceeded = True
                elif (user.get("report_quota_monthly") and 
                      user.get("reports_generated_this_month", 0) >= user["report_quota_monthly"]):
                    exceeded = True
                elif (user.get("report_quota_total") and 
                      user.get("reports_generated_total", 0) >= user["report_quota_total"]):
                    exceeded = True
                
                if exceeded:
                    filtered_users.append(user)
            
            users = filtered_users
        
        return users
    except Exception as e:
        print(f"Error getting users over quota: {e}")
        return []

# ORGANIZATION USER LIMIT FUNCTIONS

async def check_organization_user_limit(organization: str) -> bool:
    """
    Check if organization can add more users based on limit set by super admin
    """
    try:
        if not organization:
            return True  # No organization means no limit
            
        result = supabase.rpc("can_add_user_to_organization", {"org_name": organization}).execute()
        return result.data if result.data is not None else True
    except Exception as e:
        print(f"Error checking organization user limit: {e}")
        return True  # Default to allowing if check fails

async def get_organization_user_info(organization: str) -> Dict:
    """
    Get user count and limit information for an organization
    """
    try:
        result = supabase.rpc("get_organization_user_info", {"org_name": organization}).execute()
        return result.data if result.data else {
            "organization": organization,
            "current_users": 0,
            "user_limit": None,
            "available_slots": None,
            "limit_reached": False
        }
    except Exception as e:
        print(f"Error getting organization user info: {e}")
        return {
            "organization": organization,
            "current_users": 0,
            "user_limit": None,
            "available_slots": None,
            "limit_reached": False
        }

async def set_organization_user_limit(organization: str, user_limit: Optional[int]) -> bool:
    """
    Set user limit for an organization (super admin only)
    """
    try:
        # Always use the RPC function for consistency
        result = supabase.rpc("set_organization_user_limit", {
            "org_name": organization,
            "new_limit": user_limit  # SQL function should handle NULL properly
        }).execute()
        
        print(f"✅ Organization limit updated: {organization} -> {user_limit}")
        return True
    except Exception as e:
        print(f"❌ Error setting organization user limit: {e}")
        return False

async def get_all_organization_limits() -> List[Dict]:
    """
    Get user limits for all organizations (super admin view)
    """
    try:
        # Get all unique organizations and their limits
        result = supabase.table("profiles").select(
            "organization, organization_user_limit"
        ).not_.is_("organization", "null").execute()
        
        # Group by organization and get user counts
        organizations = {}
        for row in result.data:
            org = row["organization"]
            if org not in organizations:
                # Get user info for this organization
                org_info = await get_organization_user_info(org)
                organizations[org] = org_info
        
        return list(organizations.values())
    except Exception as e:
        print(f"Error getting all organization limits: {e}")
        return []

# Updated user creation function with quota support
async def create_user_profile_with_seat_management(
    requesting_user_id: str,
    email: str,
    password: Optional[str] = None,
    full_name: Optional[str] = None,
    role: Optional[str] = None,
    organization: Optional[str] = None,
    organization_role: Optional[str] = None,
    phone: Optional[str] = None,
    department: Optional[str] = None,
    avatar_url: Optional[str] = None,
    is_active: bool = True,
    is_seat_excluded: bool = False,
    auto_expire_days: Optional[int] = None,
    metadata: Optional[Dict] = None,
    # New parameters for report quotas
    report_quota_total: Optional[int] = None,
    report_quota_monthly: Optional[int] = None,
    report_quota_daily: Optional[int] = None
) -> Dict:
    """
    Create a new user with seat management, expiry, and report quota support
    """
    try:
        # Check authorization
        if not await check_admin_or_super_admin_access(requesting_user_id):
            raise Exception("Unauthorized: Admin or super-admin access required")
        
        # Check role assignment permission
        if role and not await check_role_assignment_permission(requesting_user_id, role):
            raise Exception(f"Unauthorized: Cannot assign role '{role}'")
        
        # Check organization user limit before creating user (replaces seat management)
        if organization and is_active:
            if not await check_organization_user_limit(organization):
                org_info = await get_organization_user_info(organization)
                raise Exception(f"User limit reached for organization '{organization}': {org_info['current_users']}/{org_info['user_limit']} users. Please contact your super administrator to increase the organization's user limit.")
        
        # For admins creating users, enforce same organization
        requesting_profile = await get_user_profile_by_id(requesting_user_id)
        if requesting_profile.get("role") == "admin":
            if not organization:
                organization = requesting_profile.get("organization")
            elif organization != requesting_profile.get("organization"):
                raise Exception("Unauthorized: Admins can only create users in their own organization")
        
        user_id = None
        auth_user_created = False
        
        # Check if user already exists in profiles table
        existing_profile = supabase.table("profiles").select("*").eq("email", email).execute()
        if existing_profile.data:
            print(f"⚠️ User profile already exists for email: {email}")
            return {
                "user_id": existing_profile.data[0]["id"],
                "profile": existing_profile.data[0],
                "auth_user_created": False,
                "message": "User already exists"
            }
        
        # Create user in auth.users table first
        if password:
            try:
                print(f"🔑 Creating auth user for: {email}")
                auth_response = supabase.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True
                })
                
                if auth_response.user:
                    user_id = auth_response.user.id
                    auth_user_created = True
                    print(f"✅ Auth user created successfully with ID: {user_id}")
                else:
                    raise Exception("Auth user creation returned no user object")
                    
            except Exception as auth_error:
                error_str = str(auth_error)
                print(f"❌ Failed to create auth user: {error_str}")
                
                # Check if it's a duplicate email error
                if "already" in error_str.lower() or "duplicate" in error_str.lower() or "exists" in error_str.lower():
                    print(f"🔍 Duplicate email detected, checking if user exists in auth...")
                    try:
                        existing_users = supabase.auth.admin.list_users()
                        for existing_user in existing_users:
                            if existing_user.email == email:
                                print(f"✅ Found existing auth user with ID: {existing_user.id}")
                                user_id = existing_user.id
                                auth_user_created = False
                                break
                        else:
                            raise Exception(f"User creation failed and could not find existing user: {error_str}")
                    except Exception as find_error:
                        raise Exception(f"Failed to create auth user and failed to find existing user: {error_str}")
                else:
                    raise Exception(f"Failed to create auth user: {error_str}")
        else:
            raise Exception("Password is required for user creation due to foreign key constraints")

        # Now create profile with the auth user ID
        profile_data = {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": role or "user",
            "organization": organization,
            "organization_role": organization_role,
            "phone": phone,
            "department": department,
            "avatar_url": avatar_url,
            "is_active": is_active,
            "is_seat_excluded": is_seat_excluded,
            "metadata": metadata,
            # Add report quota fields
            "report_quota_total": report_quota_total,
            "report_quota_monthly": report_quota_monthly,
            "report_quota_daily": report_quota_daily
        }
        
        # Add expiry settings if specified
        if auto_expire_days is not None:
            expiry_date = (datetime.now() + timedelta(days=auto_expire_days)).isoformat()
            profile_data["account_expires_at"] = expiry_date
        
        print(f"📝 Creating profile for auth user ID: {user_id}")
        try:
            profile_result = supabase.table("profiles").insert(profile_data).execute()
            
            if profile_result.data:
                print(f"✅ Profile created successfully")
                return {
                    "user_id": user_id,
                    "profile": profile_result.data[0],
                    "auth_user_created": auth_user_created
                }
            else:
                raise Exception("Profile insert returned no data")
                
        except Exception as profile_error:
            error_str = str(profile_error)
            print(f"❌ Failed to create profile: {error_str}")
            
            # If profile creation failed, clean up auth user
            if auth_user_created:
                try:
                    print(f"🧹 Cleaning up auth user due to profile creation failure")
                    supabase.auth.admin.delete_user(user_id)
                except Exception as cleanup_error:
                    print(f"⚠️ Failed to cleanup auth user: {cleanup_error}")
            raise Exception(f"Failed to create user profile: {error_str}")
            
    except Exception as e:
        print(f"❌ Error in create_user_profile_with_seat_management: {str(e)}")
        raise

# ===============================
# GROK RESEARCH FUNCTIONS
# ===============================

async def create_grok_research(
    report_id: str,
    user_id: str,
    target_company_name: str,
    target_company_url: str = None,
    compiled_research: Dict = None
) -> Dict:
    """
    Create a new Grok research record
    """
    try:
        start_time = time.time()
        
        research_data = {
            "report_id": report_id,
            "user_id": user_id,
            "target_company_name": target_company_name,
            "target_company_url": target_company_url,
            "research_status": "completed"
        }
        
        if compiled_research:
            # Extract data from compiled research
            research_summary = compiled_research.get("research_summary", {})
            structured_insights = compiled_research.get("structured_insights", {})
            
            research_data.update({
                "total_questions": research_summary.get("total_questions", 0),
                "successful_research_count": research_summary.get("successful_research", 0),
                "failed_questions": research_summary.get("failed_questions", []),
                "research_questions_used": compiled_research.get("research_questions_used", []),
                "compiled_intelligence": research_summary.get("compiled_intelligence", ""),
                "company_overview": structured_insights.get("company_overview", ""),
                "business_capabilities": structured_insights.get("business_capabilities", ""),
                "pain_points_challenges": structured_insights.get("pain_points_challenges", ""),
                "key_personnel_stakeholders": structured_insights.get("key_personnel_stakeholders", ""),
                "recent_developments": structured_insights.get("recent_developments", ""),
                "industry_market_context": structured_insights.get("industry_market_context", ""),
                "technology_infrastructure": structured_insights.get("technology_infrastructure", ""),
                "growth_opportunities": structured_insights.get("growth_opportunities", ""),
                "pov_context_block": compiled_research.get("pov_context_block", ""),
                "research_duration_seconds": int(time.time() - start_time)
            })
        
        result = supabase.table("grok_research").insert(research_data).execute()
        
        if result.data:
            print(f"✅ Grok research saved for report {report_id}")
            return result.data[0]
        else:
            raise Exception("Failed to save Grok research")
            
    except Exception as e:
        print(f"❌ Error creating Grok research: {str(e)}")
        raise

async def get_grok_research_by_report(report_id: str, user_id: str) -> Optional[Dict]:
    """
    Get Grok research data for a specific report
    """
    try:
        result = supabase.table("grok_research").select("*").eq("report_id", report_id).eq("user_id", user_id).single().execute()
        return result.data if result.data else None
    except Exception as e:
        print(f"❌ Error getting Grok research: {str(e)}")
        return None

async def update_grok_research_status(report_id: str, user_id: str, status: str) -> bool:
    """
    Update Grok research status
    """
    try:
        result = supabase.table("grok_research").update({"research_status": status}).eq("report_id", report_id).eq("user_id", user_id).execute()
        return bool(result.data)
    except Exception as e:
        print(f"❌ Error updating Grok research status: {str(e)}")
        return False 