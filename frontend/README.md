# POV Analysis Frontend

A React + Vite frontend for the POV Analysis Tool with Tailwind CSS v4.

## 🚀 Current Status

### ✅ Completed
- **Project Setup**: Vite + React + Tailwind CSS v4
- **API Service Layer**: Complete integration with backend endpoints
- **Constants & Configuration**: All app constants and settings
- **UI Components**: 
  - LoadingSpinner (with different sizes and colors)
  - ProgressBar (workflow step indicator)
  - Button (reusable with variants and loading states)

### 🔧 Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── forms/          # Form components (TODO)
│   │   ├── titles/         # Title selection components (TODO)
│   │   ├── outcomes/       # Outcome display components (TODO)
│   │   ├── ui/             # ✅ Reusable UI components
│   │   └── layout/         # Layout components (TODO)
│   ├── pages/              # Page components (TODO)
│   ├── hooks/              # Custom React hooks (TODO)
│   ├── services/           # ✅ API service and constants
│   ├── utils/              # Utility functions (TODO)
│   └── styles/             # Additional styles (TODO)
├── package.json
├── vite.config.js          # ✅ Configured with Tailwind CSS v4
└── tailwind.config.js      # ✅ Tailwind CSS v4 setup
```

## 🎯 Next Steps

### Phase 1: Core Workflow Components
1. **POV Input Form** (`src/components/forms/POVInputForm.jsx`)
   - Vendor and customer details
   - Form validation
   - Example data loading

2. **Title Selection Interface** (`src/components/titles/`)
   - TitlesList.jsx - Display generated titles
   - TitleCard.jsx - Individual title with checkbox
   - SelectionSummary.jsx - Selection counter

3. **Main Workflow Page** (`src/pages/CreateReport.jsx`)
   - Multi-step workflow
   - State management
   - Progress tracking

### Phase 2: Advanced Features
1. **Outcome Display** (`src/components/outcomes/`)
   - OutcomesList.jsx - Display generated outcomes
   - OutcomeCard.jsx - Individual outcome
   - SummaryCard.jsx - Summary and takeaways

2. **Export Functionality**
   - DOCX download
   - Export status tracking

3. **Dashboard** (`src/pages/Dashboard.jsx`)
   - User reports list
   - Report management

## 🛠 Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔗 API Integration

The frontend is configured to connect to the backend API at:
- **Base URL**: `http://127.0.0.1:8081`
- **API Key**: `agents-in-the-field`
- **User ID**: `73c92ce7-0ff6-468f-b35d-a3d11841c119`

All API endpoints are implemented in `src/services/api.js` with:
- Request/response logging
- Error handling
- Loading states
- File download support

## 🎨 Design System

### Colors
- **Primary**: Blue (600/700)
- **Success**: Green (600/700)
- **Danger**: Red (600/700)
- **Gray**: Various shades for text and backgrounds

### Components
- **Buttons**: Multiple variants (primary, secondary, success, danger, outline, ghost)
- **Loading**: Spinner with different sizes and colors
- **Progress**: Step-by-step workflow indicator

## 📱 Responsive Design

Built with mobile-first approach using Tailwind CSS:
- Flexible grid system
- Responsive breakpoints
- Touch-friendly interactions

## 🔄 Workflow Integration

The frontend implements the **Selective Workflow (Workflow 2)**:
1. **Step 1**: Input vendor/customer details
2. **Step 2**: Generate and select outcome titles
3. **Step 3**: Generate detailed analysis for selected titles
4. **Step 4**: Export report as DOCX

## 🚨 Error Handling

Comprehensive error handling with:
- Network error detection
- Server error messages
- User-friendly error displays
- Retry mechanisms

## 📦 Dependencies

- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS v4**: Styling framework
- **Axios**: HTTP client
- **Lucide React**: Icons
- **React Hot Toast**: Notifications (to be added)
- **React Router DOM**: Routing (to be added)

## 🎯 Ready to Continue!

The foundation is solid! Ready to build the form components and complete the workflow. The API service layer is fully implemented and tested, so we can focus on creating an amazing user experience.

Would you like to continue with:
1. **POV Input Form** - The starting point of the workflow
2. **Title Selection Interface** - The core of the selective workflow
3. **Main Workflow Page** - Bringing it all together

Let's keep building! 🚀
