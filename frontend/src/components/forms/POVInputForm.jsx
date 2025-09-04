import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Building, Users, Globe, FileText, Clock, Zap } from 'lucide-react';
import Button from '../ui/Button';
import LoadingOverlay from '../ui/LoadingOverlay';
import { DEFAULT_FORM_VALUES, EXAMPLE_DATA, MODEL_OPTIONS, VALIDATION_RULES, LOADING_MESSAGES } from '../../services/constants';

// Input field component - MOVED OUTSIDE to prevent recreation on every render
const InputField = ({ 
  name, 
  label, 
  type = 'text', 
  placeholder, 
  icon: Icon, 
  required = false,
  rows = null,
  formData,
  errors,
  touched,
  handleChange,
  handleBlur
}) => {
  const hasError = touched[name] && errors[name];
  const Component = rows ? 'textarea' : 'input';

  const handleFocus = (e) => {
    console.log(`🎯 Focus gained on ${name}`);
  };

  const handleBlurWithLogging = (e) => {
    console.log(`👋 Focus lost on ${name}`);
    handleBlur(e);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {Icon && <Icon className="inline w-4 h-4 mr-2" />}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Component
        type={type}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        onBlur={handleBlurWithLogging}
        onFocus={handleFocus}
        placeholder={placeholder}
        rows={rows}
        className={`
          w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'}
          ${rows ? 'resize-vertical min-h-[80px]' : ''}
        `}
      />
      {hasError && (
        <p className="text-sm text-red-600">{errors[name]}</p>
      )}
    </div>
  );
};

const POVInputForm = ({ onSubmit, loading = false, initialData = null }) => {
  const [formData, setFormData] = useState(initialData || DEFAULT_FORM_VALUES);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [lastSaved, setLastSaved] = useState(null);
  
  // Add refs for debugging
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  // Increment render count and log
  renderCount.current += 1;
  const currentTime = Date.now();
  const timeSinceLastRender = currentTime - lastRenderTime.current;
  lastRenderTime.current = currentTime;
  
  console.log(`🔄 POVInputForm render #${renderCount.current} (${timeSinceLastRender}ms since last render)`, {
    lastSaved: lastSaved?.toLocaleTimeString(),
    formDataKeys: Object.keys(formData),
    errorsCount: Object.keys(errors).length,
    touchedCount: Object.keys(touched).length,
    loading
  });

  // Draft saving key
  const DRAFT_KEY = 'pov-form-draft';

  // Load draft on component mount
  useEffect(() => {
    if (!initialData) {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          setFormData(draftData.formData);
          setLastSaved(new Date(draftData.timestamp));
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      }
    }
  }, [initialData]);

  // Validation function
  const validateField = (name, value) => {
    const rules = VALIDATION_RULES[name];
    if (!rules) return '';

    const isEmpty = typeof value === 'string' ? !value.trim() : !value;

    // Check required fields
    if (rules.required && isEmpty) {
      return `${name.replace('_', ' ')} is required`;
    }

    // Only validate length/range if field has content OR is required
    if (!isEmpty || rules.required) {
      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        return `${name.replace('_', ' ')} must be at least ${rules.minLength} characters`;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        return `${name.replace('_', ' ')} must be less than ${rules.maxLength} characters`;
      }

      if (rules.min && Number(value) < rules.min) {
        return `${name.replace('_', ' ')} must be at least ${rules.min}`;
      }

      if (rules.max && Number(value) > rules.max) {
        return `${name.replace('_', ' ')} must be at most ${rules.max}`;
      }
    }

    return '';
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`📝 Input change: ${name} = "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
    
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle blur events for validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  // Load example data
  const loadExampleData = () => {
    setFormData(EXAMPLE_DATA);
    setErrors({});
    setTouched({});
  };

  // Clear form
  const clearForm = () => {
    setFormData(DEFAULT_FORM_VALUES);
    setErrors({});
    setTouched({});
  };

  // Validate entire form
  const validateForm = () => {
    const newErrors = {};
    Object.keys(VALIDATION_RULES).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Clear draft when successfully submitting
      localStorage.removeItem(DRAFT_KEY);
      onSubmit(formData);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Create POV Analysis Report
          </h2>
          <p className="text-gray-600">
            Enter vendor and customer details to generate a targeted point-of-view analysis.
          </p>
          
          {/* Draft Loaded Notification */}
          {lastSaved && !initialData && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm text-blue-800">
                  Draft loaded from {lastSaved.toLocaleDateString()} at {lastSaved.toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-6 flex flex-wrap items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadExampleData}
              icon={Sparkles}
            >
                              Load Example
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearForm}
            >
              Clear Form
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Vendor Information */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2 text-blue-600" />
              Vendor Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                name="vendor_name"
                label="Vendor Name"
                placeholder="e.g., StrideShift"
                icon={Building}
                required
                formData={formData}
                errors={errors}
                touched={touched}
                handleChange={handleChange}
                handleBlur={handleBlur}
              />
              <InputField
                name="vendor_url"
                label="Vendor Website"
                placeholder="https://www.strideshift.ai/"
                icon={Globe}
                formData={formData}
                errors={errors}
                touched={touched}
                handleChange={handleChange}
                handleBlur={handleBlur}
              />
            </div>
            <div className="mt-6">
              <InputField
                name="vendor_services"
                label="Vendor Services & Capabilities"
                placeholder="AI-powered workforce optimization platform that helps organizations improve employee productivity, reduce turnover, and enhance team performance..."
                icon={FileText}
                rows={4}
                formData={formData}
                errors={errors}
                touched={touched}
                handleChange={handleChange}
                handleBlur={handleBlur}
              />
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-600" />
              Target Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                name="target_customer_name"
                label="Customer Name"
                placeholder="e.g., Netflix"
                icon={Building}
                required
                formData={formData}
                errors={errors}
                touched={touched}
                handleChange={handleChange}
                handleBlur={handleBlur}
              />
              <InputField
                name="target_customer_url"
                label="Customer Website"
                placeholder="https://www.netflix.com"
                icon={Globe}
                formData={formData}
                errors={errors}
                touched={touched}
                handleChange={handleChange}
                handleBlur={handleBlur}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <InputField
                name="role_names"
                label="Target Roles"
                placeholder="Head of People Analytics, VP of Engineering, Director of Content Operations"
                icon={Users}
                formData={formData}
                errors={errors}
                touched={touched}
                handleChange={handleChange}
                handleBlur={handleBlur}
              />
              <InputField
                name="linkedin_urls"
                label="LinkedIn URLs (Optional)"
                placeholder="https://www.linkedin.com/in/netflix-people-analytics, https://www.linkedin.com/in/netflix-engineering-vp"
                icon={Globe}
                formData={formData}
                errors={errors}
                touched={touched}
                handleChange={handleChange}
                handleBlur={handleBlur}
              />
            </div>
          </div>

          {/* Context & Configuration */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Context & Configuration
            </h3>
            <div className="space-y-6">
              <InputField
                name="role_context"
                label="Role Context"
                placeholder="Technology and content leadership team focused on scaling global operations, optimizing engineering productivity, and managing large distributed teams..."
                rows={3}
                formData={formData}
                errors={errors}
                touched={touched}
                handleChange={handleChange}
                handleBlur={handleBlur}
              />
              <InputField
                name="additional_context"
                label="Additional Context"
                placeholder="Netflix operates with a high-performance culture and needs to maintain engineering velocity while scaling content production globally..."
                rows={3}
                formData={formData}
                errors={errors}
                touched={touched}
                handleChange={handleChange}
                handleBlur={handleBlur}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Number of Outcomes *
                  </label>
                  <input
                    type="number"
                    name="num_outcomes"
                    value={formData.num_outcomes}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="15"
                  />
                </div>
                {/* Grok Research Toggle */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <Zap className="inline w-4 h-4 mr-2 text-purple-600" />
                    Enhanced Research
                  </label>
                  <div 
                    onClick={() => {
                      const newValue = !formData.use_grok_research;
                      setFormData(prev => ({ 
                        ...prev, 
                        use_grok_research: newValue 
                      }));
                    }}
                    className={`
                      flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 select-none
                      ${formData.use_grok_research 
                        ? 'border-purple-500 bg-purple-50 shadow-sm hover:bg-purple-100' 
                        : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                      }
                    `}
                    style={{ minHeight: '60px' }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                        ${formData.use_grok_research 
                          ? 'border-purple-500 bg-purple-500' 
                          : 'border-gray-300'
                        }
                     `}>
                        {formData.use_grok_research && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${formData.use_grok_research ? 'text-purple-700' : 'text-gray-700'}`}>
                          Grok Research
                        </div>
                        <div className="text-xs text-gray-500">
                          {formData.use_grok_research ? '+15-20 seconds' : 'Standard analysis'}
                        </div>
                      </div>
                    </div>
                    <Zap className={`w-5 h-5 ${formData.use_grok_research ? 'text-purple-500' : 'text-gray-400'}`} />
                  </div>
                </div>
              </div>
              {/* Hidden model input */}
              <input
                type="hidden"
                name="model_name"
                value={formData.model_name}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6 border-t">
            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="min-w-[200px]"
            >
              {formData.use_grok_research ? (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate with Grok Research
                </>
              ) : (
                'Generate Outcome Titles'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Loading Overlay */}
      <LoadingOverlay
        show={loading}
        message={LOADING_MESSAGES.GENERATING_TITLES}
        subtitle="This may take a few moments..."
        backdrop="none"
      />
    </div>
  );
};

export default POVInputForm; 