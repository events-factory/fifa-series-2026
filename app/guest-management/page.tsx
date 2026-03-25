'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchableSelect from '@/components/SearchableSelect';
import { registrationApi, RegistrationCategory, FormInputGroup } from '@/lib/api';

type AttendanceType = 'PHYSICAL' | 'VIRTUAL';
interface FormValues { [key: string]: string | string[]; }

const NOC_CATEGORY_ID = 193;

function isImageField(name: string) {
  return /picture|photo|image|photo/i.test(name);
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToRawBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function GuestManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attendanceType, setAttendanceType] = useState<AttendanceType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RegistrationCategory | null>(null);
  const [formGroups, setFormGroups] = useState<FormInputGroup[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [fileValues, setFileValues] = useState<Record<string, File>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => { loadPage(); }, []);

  const loadPage = async () => {
    setLoading(true);
    try {
      const response = await registrationApi.getRegistrationPage();
      const evType = response.event_description.event_type;
      const type: AttendanceType = evType !== 'HYBRID' ? (evType as AttendanceType) : 'PHYSICAL';
      setAttendanceType(type);
      const formResponse = await registrationApi.getCategoryForm(NOC_CATEGORY_ID, type);
      setFormGroups(formResponse.data || []);
      setSelectedCategory({ id: NOC_CATEGORY_ID, name_english: 'Guest Management', name_french: 'Guest Management', fee: 'USD 0', early_payment_date: '', end_date: '' });
    } catch {
      setError('Failed to load registration form. Please try again.');
    }
    setLoading(false);
  };

  const handleInputChange = (code: string, value: string | string[]) => {
    setFormValues((prev) => {
      const next = { ...prev, [code]: value };
      const allInputs = formGroups.flatMap((g) => g.inputs);
      const catInput = allInputs.find(({ input }) => /^category$/i.test(input.nameEnglish));
      if (catInput && code === catInput.input.inputcode && value !== 'LOC') {
        const subCatInput = allInputs.find(({ input }) => /sub.?category/i.test(input.nameEnglish));
        if (subCatInput) delete next[subCatInput.input.inputcode];
      }
      return next;
    });
    if (fieldErrors[code]) setFieldErrors((prev) => { const e = { ...prev }; delete e[code]; return e; });
  };

  const handleFileChange = (code: string, file: File | null) => {
    if (!file) return;
    setFileValues((prev) => ({ ...prev, [code]: file }));
    const url = URL.createObjectURL(file);
    setFilePreviews((prev) => ({ ...prev, [code]: url }));
    if (fieldErrors[code]) setFieldErrors((prev) => { const e = { ...prev }; delete e[code]; return e; });
  };

  const validateStep = useCallback(() => {
    const currentGroup = formGroups[currentStep];
    if (!currentGroup) return true;

    const errors: string[] = [];
    const fieldErrs: Record<string, string> = {};

    currentGroup.inputs.forEach(({ input }) => {
      if (input.is_mandatory !== 'YES') return;

      if (/sub.?category/i.test(input.nameEnglish)) {
        const catInput = currentGroup.inputs.find(({ input: inp }) => /^category$/i.test(inp.nameEnglish));
        const catValue = catInput ? formValues[catInput.input.inputcode] : '';
        if (catValue !== 'LOC') return;
      }

      if (isImageField(input.nameEnglish)) {
        if (!fileValues[input.inputcode]) {
          const msg = `${input.nameEnglish} is required`;
          errors.push(msg);
          fieldErrs[input.inputcode] = msg;
        }
        return;
      }

      const value = formValues[input.inputcode];
      const isEmpty = !value || (Array.isArray(value) && !value.length) || (typeof value === 'string' && !value.trim());
      if (isEmpty) {
        const msg = `${input.nameEnglish} is required`;
        errors.push(msg);
        fieldErrs[input.inputcode] = msg;
        return;
      }

      if (typeof value === 'string') {
        if (input.inputtype.id === 5 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          const msg = `${input.nameEnglish} must be a valid email address`;
          errors.push(msg);
          fieldErrs[input.inputcode] = msg;
        }
        if (input.inputtype.id === 12 && (!/^[\d\s+()-]+$/.test(value) || value.replace(/\D/g, '').length < 7)) {
          const msg = `${input.nameEnglish} must be a valid phone number`;
          errors.push(msg);
          fieldErrs[input.inputcode] = msg;
        }
      }
    });

    setFormErrors(errors);
    setFieldErrors(fieldErrs);
    if (errors.length) window.scrollTo({ top: 0, behavior: 'smooth' });
    return !errors.length;
  }, [currentStep, formGroups, formValues, fileValues]);

  const nextStep = () => {
    if (validateStep()) { setFormErrors([]); setFieldErrors({}); setCurrentStep((p) => p + 1); }
  };
  const prevStep = () => { setFormErrors([]); setFieldErrors({}); setCurrentStep((p) => p - 1); };

  const handleSubmit = async () => {
    if (!validateStep() || !selectedCategory) return;
    setSubmitting(true);
    setFormErrors([]);

    try {
      const formData = new FormData();
      const delegateData: Array<{ input_code: string; input_type: string; input_value: string; input_name: string }> = [];

      for (const group of formGroups) {
        for (const { input } of group.inputs) {
          const isFile = isImageField(input.nameEnglish) || input.inputtype.id === 7 || input.inputtype.id === 6;
          if (isFile) {
            const file = fileValues[input.inputcode];
            if (file) {
              const base64 = input.inputtype.id === 6
                ? await fileToRawBase64(file)
                : await compressImage(file);
              delegateData.push({
                input_code: input.inputcode,
                input_type: String(input.inputtype.id),
                input_value: base64,
                input_name: input.nameEnglish,
              });
            }
            continue;
          }
          const value = formValues[input.inputcode];
          if (value) {
            const valueStr = Array.isArray(value) ? value.join(', ') : value;
            delegateData.push({ input_code: input.inputcode, input_type: String(input.inputtype.id), input_value: valueStr, input_name: input.nameEnglish });
            if (input.inputcode === 'input_id_52307') formData.append('registration_email', valueStr);
            if (input.inputcode === 'input_id_21576') formData.append('first_name', valueStr);
            if (input.inputcode === 'input_id_35129') formData.append('last_name', valueStr);
          }
        }
      }

      formData.append('delegate_data', JSON.stringify(delegateData));
      formData.append('ticket_id', String(selectedCategory.id));
      formData.append('attendence_type', attendanceType || 'PHYSICAL');
      formData.append('user_language', 'english');
      formData.append('accompanied', 'NO');
      formData.append('registration_type', 'single');
      formData.append('order_id', '');
      formData.append('payment_token', '');
      formData.append('payment_session', '');
      formData.append('acknowleadgment', '');

      const logEntries: Record<string, string> = {};
      formData.forEach((v, k) => {
        logEntries[k] = typeof v === 'string'
          ? (v.length > 200 ? v.substring(0, 200) + `... (${v.length} chars)` : v)
          : `[File: ${(v as File).name}]`;
      });
      console.log('[Submit Registration] FormData:', logEntries);
      console.log('[Submit Registration] delegate_data items:', delegateData.map(d => ({
        code: d.input_code, type: d.input_type, name: d.input_name, valueLen: d.input_value.length,
      })));

      const response = await registrationApi.submitRegistration(formData);
      if (response.success) {
        setSubmitted(true);
      } else {
        const msgs = Array.isArray(response.message) ? response.message : [response.message];
        setFormErrors(msgs);
      }
    } catch {
      setFormErrors(['Failed to submit registration. Please try again.']);
    }
    setSubmitting(false);
  };

  const ec = (code: string) => fieldErrors[code]
    ? 'border-red-400 focus:ring-red-400 bg-red-50'
    : 'border-gray-200 focus:ring-primary-400 bg-white';

  const inputBase = (code: string) => `w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 text-gray-800 placeholder-gray-400 transition ${ec(code)}`;

  const renderInput = (input: FormInputGroup['inputs'][0]['input'], options: FormInputGroup['inputs'][0]['options'], defaultValue: string) => {
    const val = formValues[input.inputcode] || defaultValue || '';
    const required = input.is_mandatory === 'YES';
    const err = fieldErrors[input.inputcode] && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>{fieldErrors[input.inputcode]}</p>;

    if (isImageField(input.nameEnglish)) {
      return <ImageUpload code={input.inputcode} required={required} preview={filePreviews[input.inputcode]} onChange={(f) => handleFileChange(input.inputcode, f)} hasError={!!fieldErrors[input.inputcode]} errorMsg={fieldErrors[input.inputcode]} />;
    }

    switch (input.inputtype.id) {
      case 1: case 8:
        return (<><input type={input.inputtype.id === 8 ? 'number' : 'text'} id={input.inputcode} value={val as string} onChange={(e) => handleInputChange(input.inputcode, e.target.value)} className={inputBase(input.inputcode)} required={required} />{err}</>);
      case 2:
        return (<><SearchableSelect id={input.inputcode} value={val as string} onChange={(v) => handleInputChange(input.inputcode, v)} options={options} required={required} hasError={!!fieldErrors[input.inputcode]} className={inputBase(input.inputcode)} />{err}</>);
      case 4:
        return (<><input type="date" id={input.inputcode} value={val as string} onChange={(e) => handleInputChange(input.inputcode, e.target.value)} className={inputBase(input.inputcode)} required={required} />{err}</>);
      case 5:
        return (<><input type="email" id={input.inputcode} value={val as string} onChange={(e) => handleInputChange(input.inputcode, e.target.value)} className={inputBase(input.inputcode)} required={required} />{err}</>);
      case 12:
        return (<><input type="tel" id={input.inputcode} value={val as string} onChange={(e) => handleInputChange(input.inputcode, e.target.value)} className={inputBase(input.inputcode)} required={required} />{err}</>);
      case 15:
        return (<><textarea id={input.inputcode} value={val as string} onChange={(e) => handleInputChange(input.inputcode, e.target.value)} rows={4} className={inputBase(input.inputcode)} required={required} />{err}</>);
      case 10:
        return (
          <>
            <div className={`space-y-3 ${fieldErrors[input.inputcode] ? 'p-3 border border-red-400 rounded-xl bg-red-50' : ''}`}>
              {options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name={input.inputcode} value={opt.contentEnglish} checked={val === opt.contentEnglish} onChange={(e) => handleInputChange(input.inputcode, e.target.value)} className="w-4 h-4 text-primary-600 accent-primary-600" required={required} />
                  <span className="text-gray-700 text-sm">{opt.contentEnglish}</span>
                </label>
              ))}
            </div>
            {err}
          </>
        );
      case 16:
        return (
          <>
            <div className={`space-y-3 ${fieldErrors[input.inputcode] ? 'p-3 border border-red-400 rounded-xl bg-red-50' : ''}`}>
              {options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" value={opt.contentEnglish}
                    checked={Array.isArray(val) ? val.includes(opt.contentEnglish) : val === opt.contentEnglish}
                    onChange={(e) => {
                      const cur = Array.isArray(val) ? val : val ? [val as string] : [];
                      handleInputChange(input.inputcode, e.target.checked ? [...cur, e.target.value] : cur.filter((v) => v !== e.target.value));
                    }}
                    className="w-4 h-4 text-primary-600 accent-primary-600 rounded" />
                  <span className="text-gray-700 text-sm">{opt.contentEnglish}</span>
                </label>
              ))}
            </div>
            {err}
          </>
        );
      case 17:
        return <p className="text-gray-600 bg-gray-50 p-4 rounded-xl text-sm">{input.nameEnglish}</p>;
      default:
        return (<><input type="text" id={input.inputcode} value={val as string} onChange={(e) => handleInputChange(input.inputcode, e.target.value)} className={inputBase(input.inputcode)} required={required} />{err}</>);
    }
  };

  // Success
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            <p className="text-gray-500 text-sm mb-7">Thank you for registering. A confirmation email will be sent to you shortly.</p>
            <button
              onClick={() => { setSubmitted(false); setFormValues({}); setFileValues({}); setFilePreviews({}); setCurrentStep(0); }}
              className="w-full py-3 bg-primary-700 text-white rounded-xl font-bold hover:bg-primary-600 transition-colors"
            >
              Register Another
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const totalSteps = formGroups.length;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-1 px-4 py-6 sm:py-10">
        <div className="max-w-2xl mx-auto">
          {/* Page title */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-primary-700">FIFA Series Rwanda Registration</h1>
            <p className="text-gray-500 text-sm mt-1">Complete the form below to secure your spot</p>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading form...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <button onClick={loadPage} className="px-5 py-2.5 bg-primary-700 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors">Try Again</button>
            </div>
          ) : selectedCategory && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Step tabs */}
              {totalSteps > 1 && (
                <div className="flex border-b border-gray-100">
                  {formGroups.map((group, index) => (
                    <button
                      key={group.group.id}
                      type="button"
                      onClick={() => { if (index < currentStep) setCurrentStep(index); }}
                      className={`flex-1 py-3.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 ${
                        index === currentStep
                          ? 'border-primary-600 text-primary-700 bg-primary-50'
                          : index < currentStep
                            ? 'border-transparent text-primary-400 hover:text-primary-600'
                            : 'border-transparent text-gray-400 cursor-default'
                      }`}
                    >
                      <span className="hidden sm:inline">{group.group.name}</span>
                      <span className="sm:hidden">Step {index + 1}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Progress bar */}
              {totalSteps > 1 && (
                <div className="h-1 bg-gray-100">
                  <div
                    className="h-1 bg-primary-600 transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                  />
                </div>
              )}

              <form className="p-5 sm:p-7" onSubmit={(e) => e.preventDefault()}>
                {/* Step label on mobile */}
                {totalSteps > 1 && (
                  <p className="text-xs text-gray-400 mb-4 sm:hidden">
                    Step {currentStep + 1} of {totalSteps} — {formGroups[currentStep]?.group.name}
                  </p>
                )}

                {/* Errors */}
                {formErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                    <p className="text-sm font-semibold text-red-700 mb-1">Please fix the following:</p>
                    <ul className="text-red-600 text-sm space-y-0.5 list-disc list-inside">
                      {formErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}

                {/* Fields */}
                <div className="space-y-5">
                  {formGroups[currentStep]?.inputs.map(({ input, options, value }) => {
                    const isSubCategory = /sub.?category/i.test(input.nameEnglish);
                    if (isSubCategory) {
                      const catInput = formGroups[currentStep]?.inputs.find(
                        ({ input: inp }) => /^category$/i.test(inp.nameEnglish)
                      );
                      const catValue = catInput ? formValues[catInput.input.inputcode] : '';
                      if (catValue !== 'LOC') return null;
                    }
                    return (
                      <div key={input.inputcode}>
                        {input.inputtype.id !== 17 && (
                          <label htmlFor={input.inputcode} className="block text-sm font-medium text-gray-700 mb-1.5">
                            {input.nameEnglish}
                            {input.is_mandatory === 'YES' && <span className="text-red-500 ml-1">*</span>}
                          </label>
                        )}
                        {renderInput(input, options, value)}
                      </div>
                    );
                  })}
                </div>
              </form>

              {/* Navigation — outside form to prevent accidental submission */}
              <div className="px-5 sm:px-7 pb-5 sm:pb-7 pt-0 border-t border-gray-100 flex items-center gap-3 mt-0">
                {currentStep > 0 && (
                  <button type="button" onClick={prevStep} className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Previous
                  </button>
                )}

                {!isLastStep ? (
                  <button type="button" onClick={nextStep} className="flex items-center justify-center gap-1.5 flex-1 py-2.5 bg-primary-700 text-white rounded-xl text-sm font-bold hover:bg-primary-600 transition-colors">
                    Next
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} disabled={submitting} className="flex items-center justify-center gap-2 flex-1 sm:flex-none sm:px-6 py-2.5 bg-primary-700 text-white rounded-xl text-sm font-bold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap min-w-0">
                    {submitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit</span>
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

// --- Image Upload Component ---
function ImageUpload({ code, required, preview, onChange, hasError, errorMsg }: {
  code: string; required: boolean; preview?: string;
  onChange: (f: File | null) => void; hasError: boolean; errorMsg?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input ref={inputRef} type="file" id={code} accept="image/*" className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)} required={required && !preview} />

      {preview ? (
        <div className="relative w-28 h-28 sm:w-32 sm:h-32">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Profile preview" className="w-full h-full object-cover rounded-xl border-2 border-primary-200" />
          <button
            type="button"
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ''; }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <button type="button" onClick={() => inputRef.current?.click()}
            className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium block">
            Change photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 transition-colors ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-primary-400 hover:bg-primary-50'}`}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${hasError ? 'bg-red-100' : 'bg-primary-100'}`}>
            <svg className={`w-6 h-6 ${hasError ? 'text-red-500' : 'text-primary-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Upload profile photo</p>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or WEBP · Max 5MB</p>
          </div>
        </button>
      )}
      {errorMsg && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>{errorMsg}</p>}
    </div>
  );
}
