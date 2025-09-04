# POV Analysis API Backend

A FastAPI-based backend for generating Point-of-View (POV) sales analysis reports that map vendor capabilities to customer needs using a Jobs-to-be-Done framework.

## 🚀 Features

- **Two Workflow Options:**
  - **Full Pipeline**: Generate all outcomes at once
  - **Selective Pipeline**: Generate titles first, select desired ones, then generate detailed analysis
- **Database Integration**: Supabase for persistent storage
- **Multiple Output Formats**: JSON, Markdown, DOCX
- **Context Gathering**: Website crawling, LinkedIn profile extraction, file processing
- **Iterative Refinement**: Modify selections and regenerate outcomes

## 📁 Project Structure

```
backend/
├── main.py                           # FastAPI application with all endpoints
├── database.py                       # Supabase database operations
├── pov_function.py                   # Core POV generation logic
├── llm.py                           # LLM integration and prompt functions
├── internet_research_functions.py    # Website crawling and analysis
├── fetch_linkedin_profiles.py       # LinkedIn profile extraction
├── file_upload.py                   # File processing utilities
├── requirements.txt                 # Python dependencies
├── .env                            # Environment variables
├── temp/                           # Temporary files directory
└── sql_setup/                      # Database setup SQL files
    ├── create_all_tables.sql       # Complete schema creation (fresh setup)
    ├── drop_all_tables.sql         # Drop all tables (clean slate)
    ├── complete_sql_updates.sql    # Updates for existing database
    ├── fix_status_constraint.sql   # Status constraint fix
    └── add_context_storage.sql     # Context storage setup
```

## 🛠 Setup Instructions

### 1. Create Virtual Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Install Pandoc (for DOCX conversion)
```bash
# macOS
brew install pandoc

# Ubuntu/Debian
sudo apt-get install pandoc

# Windows
# Download from https://pandoc.org/installing.html
```

### 4. Environment Variables
Create/update `.env` file with:
```env
API_KEY=your-api-key-here
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
OPENAI_API_KEY=your-openai-api-key
# Add other LLM API keys as needed
```

### 5. Database Setup

**Option A: Fresh Database Setup (Recommended)**
Run `sql_setup/create_all_tables.sql` in your Supabase SQL editor to create all tables from scratch.

**Option B: Update Existing Database**
Run the SQL commands in `sql_setup/complete_sql_updates.sql` in your Supabase SQL editor:
```sql
-- 1. Fix the status constraint to include 'titles_generated'
ALTER TABLE pov_reports DROP CONSTRAINT IF EXISTS pov_reports_status_check;
ALTER TABLE pov_reports ADD CONSTRAINT pov_reports_status_check 
CHECK (status IN ('processing', 'completed', 'failed', 'titles_generated'));

-- 2. Add the selected column to pov_outcome_titles
ALTER TABLE pov_outcome_titles ADD COLUMN IF NOT EXISTS selected BOOLEAN DEFAULT FALSE;

-- 3. Add context storage to avoid duplication
ALTER TABLE pov_reports ADD COLUMN IF NOT EXISTS context_data JSONB;

-- 4. Add index for better performance on context queries
CREATE INDEX IF NOT EXISTS idx_pov_reports_context ON pov_reports USING GIN (context_data);
```

### 6. Start the Server
```bash
python main.py
```
Server will run on `http://127.0.0.1:8081`

## 🔄 Workflow Options

### Workflow 1: Full Pipeline
Generate all outcomes at once (traditional approach).

**Endpoint:** `POST /generate-pov-to-database`

### Workflow 2: Selective Pipeline
1. Generate titles only
2. User selects desired titles
3. Generate detailed analysis for selected titles only
4. Iterate as needed

**Endpoints:**
- `POST /generate-pov-titles` (Step 1)
- `PUT /update-selected-titles/{report_id}` (Step 2)
- `POST /generate-pov-outcomes/{report_id}` (Step 3)

## 📚 API Endpoints

### Core Generation
- `POST /generate-pov-to-database` - Full pipeline workflow
- `POST /generate-pov-titles` - Selective workflow step 1
- `PUT /update-selected-titles/{report_id}` - Update title selections
- `POST /generate-pov-outcomes/{report_id}` - Generate selected outcomes

### Data Retrieval
- `GET /get-pov-report/{report_id}` - Get complete report data
- `GET /get-user-reports/{user_id}` - Get all user reports
- `GET /get-report-titles/{report_id}` - Get titles with selection status
- `GET /get-selection-summary/{report_id}` - Get selection summary

### Export
- `GET /generate-docx-from-db/{report_id}` - Export report as DOCX
- `POST /convert-to-docx` - Convert markdown to DOCX

### Utility
- `GET /health` - Health check
- `GET /cleanup` - Clean temporary files

## 🔧 Example Usage

### Selective Workflow Example
```bash
# Step 1: Generate titles
curl -X POST "http://127.0.0.1:8081/generate-pov-titles" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "user_id": "user-uuid",
    "vendor_name": "Pragma",
    "vendor_url": "https://www.pragmaworld.net",
    "vendor_services": "Asset management consulting",
    "target_customer_name": "Endeavour Mining",
    "target_customer_url": "https://www.endeavourmining.com",
    "role_names": "Asset Management Team",
    "num_outcomes": 5
  }'

# Step 2: Select titles (indices 0, 2, 4)
curl -X PUT "http://127.0.0.1:8081/update-selected-titles/{REPORT_ID}" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "user_id": "user-uuid",
    "selected_indices": [0, 2, 4]
  }'

# Step 3: Generate selected outcomes
curl -X POST "http://127.0.0.1:8081/generate-pov-outcomes/{REPORT_ID}?user_id=user-uuid" \
  -H "X-API-Key: your-api-key"

# Export as DOCX
curl -X GET "http://127.0.0.1:8081/generate-docx-from-db/{REPORT_ID}?user_id=user-uuid" \
  -H "X-API-Key: your-api-key" \
  --output "report.docx"
```

## 🔄 Iterative Refinement

The selective workflow supports multiple iterations:
1. Change selections with `PUT /update-selected-titles/{report_id}`
2. Regenerate outcomes with `POST /generate-pov-outcomes/{report_id}`
3. Previous outcomes are automatically overwritten
4. Context data is reused (no duplicate web crawling)

## 🗄 Database Schema

### Tables
- `pov_reports` - Main report metadata
- `pov_outcome_titles` - Generated outcome titles with selection status
- `pov_outcomes` - Detailed outcome analysis
- `pov_summary` - Summary and takeaways

### Key Features
- Row Level Security (RLS) for user data protection
- JSONB storage for context data (performance optimized)
- Automatic overwrites for iterative workflows

## 🚨 Troubleshooting

### Common Issues
1. **Pandoc not found**: Install pandoc system-wide
2. **Database constraint errors**: Run SQL setup scripts
3. **API key errors**: Check `.env` file configuration
4. **Import errors**: Ensure all dependencies are installed

### Logs
The application provides detailed console logging with emojis for easy tracking of generation progress.

## 🔒 Security

- API key authentication required for all endpoints
- User ID validation for data access
- Row Level Security in database
- Input validation and sanitization

## 📈 Performance

- Context data caching eliminates duplicate web crawling
- Parallel LLM calls for outcome generation
- Database indexing for fast queries
- Automatic cleanup of temporary files 