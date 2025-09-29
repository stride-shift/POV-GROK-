# 🎯 POV Analysis Platform

> **AI-Powered Point-of-View Sales Analysis Tool**  
> Transform vendor capabilities into compelling customer value propositions using Jobs-to-be-Done framework

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 🚀 What is POV?

**POV (Point-of-View) Analysis** is a sophisticated AI-powered platform that generates strategic sales reports by mapping vendor capabilities to customer needs. It transforms raw company data into actionable sales intelligence, helping vendors create compelling, data-driven proposals tailored to specific customer challenges.

### ✨ Key Features

- **🤖 AI-Powered Analysis** - Leverages multiple LLM models for intelligent insights
- **🔄 Dual Workflow Options** - Full pipeline or selective generation
- **🌐 Automated Research** - Web crawling and LinkedIn profile analysis  
- **📊 Rich Context Gathering** - File processing and document analysis
- **💼 Professional Reports** - Export as DOCX for client delivery
- **🎨 Modern UI** - Intuitive React-based interface with real-time updates
- **⚡ Enhanced Research** - Optional Grok integration for deeper insights

---

## 🏗️ Architecture Overview

```
POV Analysis Platform
├── 🖥️  Frontend (React + Tailwind CSS)
│   ├── Multi-step workflow interface
│   ├── Real-time progress tracking  
│   ├── Interactive title selection
│   ├── Professional report viewing
│   └── Campaign space integration
│
├── ⚙️  Backend (FastAPI + Python)
│   ├── AI/LLM integration layer
│   ├── Web research automation
│   ├── Document processing pipeline
│   ├── Parallel content generation
│   └── Professional export system
│
└── 🗄️  Database (Supabase)
    ├── User management & authentication
    ├── Report versioning & storage
    ├── Context data caching
    └── Row-level security
```

---

## 🎯 How POV Works

### **Input** → **AI Analysis** → **Strategic Output**

1. **📝 Input Details**
   - Vendor information (company, services, capabilities)
   - Target customer (company, decision makers, roles)
   - Context (LinkedIn profiles, uploaded documents)

2. **🤖 AI Processing**
   - Automated web research and analysis
   - Jobs-to-be-Done framework application
   - Parallel outcome generation
   - Strategic insight synthesis

3. **📊 Strategic Output**
   - 15+ targeted value propositions
   - Detailed analysis for selected outcomes
   - Executive summary with next steps
   - Professional DOCX export

---

## 🔄 Workflow Options

### **Option 1: Full Pipeline** (Traditional)
```
Input → Generate All Outcomes → Export Report
```
- Complete analysis in one step
- Best for comprehensive overviews

### **Option 2: Selective Pipeline** (Recommended)
```
Input → Generate Titles → Select Desired → Generate Details → Export
```
- ⚡ Faster iteration and refinement
- 🎯 Focus on most relevant outcomes
- 💰 Cost-effective LLM usage
- 🔄 Iterative improvement workflow

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **Pandoc** (for DOCX export)
- **Supabase account** (for database)
- **OpenAI API key** (or other LLM providers)

### 1. Clone Repository
```bash
git clone https://github.com/stride-shift/POV-GROK-.git
cd POV-GROK-
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys and database credentials

# Setup database
# Run sql_setup/create_all_tables.sql in your Supabase SQL editor

# Start backend
python main.py
```
**Backend runs on:** `http://127.0.0.1:8081`

### 3. Frontend Setup
```bash
cd frontend
npm install

# Start frontend
npm run dev
```
**Frontend runs on:** `http://localhost:5173`

### 4. Access Application
Open your browser to `http://localhost:5173` and start creating POV analyses!

---

## 📚 Detailed Documentation

### 🖥️ **Frontend Documentation**
**[📖 Read Frontend README](./frontend/README.md)**
- React + Vite + Tailwind CSS setup
- Component architecture and UI system
- Workflow implementation details
- API integration and state management

### ⚙️ **Backend Documentation**  
**[📖 Read Backend README](./backend/README.md)**
- FastAPI endpoints and workflows
- Database schema and operations
- AI/LLM integration details
- Export and file processing

---

## 🛠️ Project Structure

```
POV-GROK/
├── 📁 backend/                 # FastAPI backend
│   ├── main.py                # Main API application
│   ├── pov_function.py        # Core POV generation logic
│   ├── database.py            # Supabase operations
│   ├── llm.py                # LLM integration
│   ├── internet_research_functions.py  # Web crawling
│   ├── requirements.txt       # Python dependencies
│   └── sql_setup/            # Database setup scripts
│
├── 📁 frontend/               # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── forms/        # POV input forms
│   │   │   ├── titles/       # Title selection interface
│   │   │   ├── outcomes/     # Outcome display components
│   │   │   ├── ui/           # Reusable UI elements
│   │   │   └── navigation/   # Navigation components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API integration
│   │   └── contexts/         # React contexts
│   ├── package.json          # Node dependencies
│   └── vite.config.js        # Vite configuration
│
├── 📄 Bug_Report_Template.csv    # Bug tracking template
├── 📄 Feature_Coverage.csv      # Feature documentation
├── 📊 POV_Testing_Complete.xlsx # Testing documentation
└── 📋 README.md                 # This file
```

---

## 🌟 Advanced Features

### **🔍 Enhanced Research (Grok Integration)**
- Optional deep-dive research using Grok AI
- Enhanced customer and market insights
- Additional 15-20 seconds processing time
- Premium analysis depth

### **📈 Campaign Space**
- Multi-workflow management
- Email campaign generation
- Marketing asset creation
- Sales script development
- Whitepaper generation

### **💾 Smart Caching**
- Context data reuse across iterations
- Eliminates duplicate web crawling
- Faster subsequent generations
- Cost optimization

### **🎨 Professional Export**
- Markdown to DOCX conversion
- Branded report formatting
- Client-ready deliverables
- Multiple export formats

---

## 🧪 Testing

### Test Files Included
- **📄 Bug_Report_Template.csv** - Bug tracking system
- **📄 Feature_Coverage.csv** - Feature testing matrix
- **📊 POV_Testing_Complete.xlsx** - Comprehensive test suite
- **📋 POV_Testing_Template.csv** - Test case template

### Running Tests
```bash
# Backend tests
cd backend
python -m pytest tests/

# Frontend tests  
cd frontend
npm run test
```

---

## 🔐 Security & Authentication

- **🔑 API Key Authentication** - Secure endpoint access
- **👤 User-based Data Isolation** - Row-level security
- **🛡️ Input Validation** - Comprehensive data sanitization
- **🔒 Supabase RLS** - Database-level security policies

---

## 🚀 Deployment

### Production Deployment
1. **Backend**: Deploy FastAPI to your preferred platform (Railway, Heroku, AWS)
2. **Frontend**: Deploy React build to Vercel, Netlify, or CDN
3. **Database**: Configure Supabase production instance
4. **Environment**: Set production environment variables

### Environment Variables
```env
# Backend (.env)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
OPENAI_API_KEY=your-openai-key
API_KEY=your-api-key

# Optional LLM providers
ANTHROPIC_API_KEY=your-claude-key
GROK_API_KEY=your-grok-key
```

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open Pull Request**

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🙋‍♂️ Support

### Documentation
- **[Backend API Docs](./backend/README.md)** - Complete backend documentation
- **[Frontend Guide](./frontend/README.md)** - Frontend development guide
- **[Component Docs](./frontend/src/components/)** - Individual component documentation

### Getting Help
- 📧 **Email**: support@strideshift.ai
- 🐛 **Issues**: Use the issue tracker for bugs and feature requests
- 💬 **Discussions**: Join our community discussions

---

## 🎉 What's New

### Recent Updates
- ✅ **Campaign Space Integration** - Multi-workflow management
- ✅ **Grok Research Enhancement** - Deep AI-powered insights  
- ✅ **Professional Export** - Enhanced DOCX generation
- ✅ **Mobile Optimization** - Responsive design improvements
- ✅ **Performance Boost** - Parallel processing optimizations

### Coming Soon
- 🔄 **CRM Integration** - Salesforce and HubSpot connectivity
- 📊 **Analytics Dashboard** - Usage metrics and insights
- 🎨 **Custom Branding** - Personalized report templates
- 🔗 **API Webhooks** - Real-time integrations

---

<div align="center">

**⭐ Star this repository if POV Analysis Platform helps your sales process! ⭐**

Built with ❤️ by the StrideShift Team

</div>
