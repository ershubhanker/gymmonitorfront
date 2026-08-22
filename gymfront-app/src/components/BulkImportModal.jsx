// src/components/BulkImportModal.jsx - COMPLETE FIXED VERSION
// Users define column mappings manually for perfect imports every time

import React, { useState, useRef } from 'react';
import { 
  X, Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, 
  AlertCircle, FileText, Download, ArrowLeft, ArrowRight,
  HelpCircle, ChevronDown, ChevronUp, Calendar, Phone, Mail, User, Tag, DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import api from '../services/api';
import Papa from 'papaparse';

// ============================================================
// CONFIGURATION
// ============================================================
const UPLOAD_CONFIG = {
  MAX_FILE_SIZE_MB: 20,
  ALLOWED_EXTENSIONS: ['xlsx', 'xls', 'csv', 'tsv'],
  PREVIEW_ROWS: 10,
};

// ============================================================
// FIELD DEFINITIONS - These are the columns in your database
// ============================================================
const DB_FIELDS = [
  { 
    key: 'full_name', 
    label: 'Full Name', 
    required: true, 
    icon: User,
    description: 'Member\'s complete name',
    example: 'John Doe'
  },
  { 
    key: 'phone', 
    label: 'Phone Number', 
    required: true, 
    icon: Phone,
    description: '10-digit mobile number',
    example: '9876543210'
  },
  { 
    key: 'email', 
    label: 'Email', 
    required: false, 
    icon: Mail,
    description: 'Email address (optional)',
    example: 'john@example.com'
  },
  { 
    key: 'plan_name', 
    label: 'Plan Name', 
    required: true, 
    icon: Tag,
    description: 'Membership plan name (will auto-create if missing)',
    example: 'Monthly, Yearly, Premium'
  },
  { 
    key: 'start_date', 
    label: 'Start Date', 
    required: false, 
    icon: Calendar,
    description: 'Membership start date',
    example: '2024-01-01 or 01/01/2024'
  },
  { 
    key: 'end_date', 
    label: 'End Date', 
    required: false, 
    icon: Calendar,
    description: 'Membership end date (determines active status)',
    example: '2024-12-31 or 31/12/2024'
  },
  { 
    key: 'base_cost', 
    label: 'Base Cost', 
    required: false, 
    icon: DollarSign,
    description: 'Original price before discount',
    example: '5000'
  },
  { 
    key: 'net_cost', 
    label: 'Net Cost (Paid)', 
    required: false, 
    icon: DollarSign,
    description: 'Amount actually paid after discount',
    example: '4500'
  },
  { 
    key: 'discount', 
    label: 'Discount', 
    required: false, 
    icon: DollarSign,
    description: 'Discount amount applied',
    example: '500'
  },
  { 
    key: 'gender', 
    label: 'Gender', 
    required: false, 
    icon: User,
    description: 'Male / Female / Other',
    example: 'Male'
  },
  { 
    key: 'date_of_birth', 
    label: 'Date of Birth', 
    required: false, 
    icon: Calendar,
    description: 'Member\'s date of birth',
    example: '1990-05-15'
  },
  { 
    key: 'address', 
    label: 'Address', 
    required: false, 
    icon: FileText,
    description: 'Residential address',
    example: '123 Main Street'
  },
  { 
    key: 'emergency_contact_name', 
    label: 'Emergency Contact Name', 
    required: false, 
    icon: User,
    description: 'Name of emergency contact person',
    example: 'Jane Doe'
  },
  { 
    key: 'emergency_contact_phone', 
    label: 'Emergency Contact Phone', 
    required: false, 
    icon: Phone,
    description: 'Emergency contact number',
    example: '9876543211'
  },
  { 
    key: 'medical_conditions', 
    label: 'Medical Conditions', 
    required: false, 
    icon: FileText,
    description: 'Any medical conditions to be aware of',
    example: 'Diabetes, Hypertension'
  },
  { 
    key: 'allergies', 
    label: 'Allergies', 
    required: false, 
    icon: FileText,
    description: 'Any allergies',
    example: 'Peanuts, Latex'
  },
  { 
    key: 'medications', 
    label: 'Medications', 
    required: false, 
    icon: FileText,
    description: 'Current medications',
    example: 'Metformin 500mg'
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
const BulkImportModal = ({ isOpen, onClose, onImportComplete }) => {
  // ─── State ──────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [step, setStep] = useState(1); // 1=upload, 2=mapping, 3=preview, 4=complete
  
  // ─── MAPPING STATE ──────────────────────────────────────────
  const [fieldMapping, setFieldMapping] = useState({});
  const [expandedFields, setExpandedFields] = useState({});
  const [skipRowsWithMissingRequired, setSkipRowsWithMissingRequired] = useState(true);
  const [autoDetectDates, setAutoDetectDates] = useState(true);
  const [statusBasedOnEndDate, setStatusBasedOnEndDate] = useState(true);
  
  // ─── RESULTS STATE ──────────────────────────────────────────
  const [plansCreated, setPlansCreated] = useState([]);
  const [skippedRows, setSkippedRows] = useState([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [invalidRows, setInvalidRows] = useState([]);
  const [invalidCount, setInvalidCount] = useState(0);

  const isCancelledRef = useRef(false);
  const abortControllerRef = useRef(null);

  if (!isOpen) return null;

  // ============================================================
  // 🛡️ SAFE STRING HELPERS
  // ============================================================
  const safeString = (value) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') {
      if (value > 25569 && value < 50000) {
        return String(value);
      }
      return String(value);
    }
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (typeof value === 'boolean') return String(value);
    return String(value);
  };

  const isEmpty = (value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    return false;
  };

  // ============================================================
  // 📅 DATE PARSER
  // ============================================================
  const parseDate = (dateStr) => {
    if (!dateStr || isEmpty(dateStr)) return null;
    
    if (dateStr instanceof Date) {
      const d = dateStr;
      if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100) {
        return d.toISOString().split('T')[0];
      }
      return null;
    }
    
    if (typeof dateStr === 'string') {
      dateStr = dateStr.trim();
      if (!dateStr) return null;

      // Already in YYYY-MM-DD format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }

      // Try native Date parsing
      const nativeDate = new Date(dateStr);
      if (!isNaN(nativeDate.getTime()) && nativeDate.getFullYear() > 1900 && nativeDate.getFullYear() < 2100) {
        return nativeDate.toISOString().split('T')[0];
      }
    }
    
    // Excel date serial number
    if (typeof dateStr === 'number' && dateStr > 0 && dateStr > 25569 && dateStr < 50000) {
      const excelDate = new Date((dateStr - 25569) * 86400 * 1000);
      if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() > 1900 && excelDate.getFullYear() < 2100) {
        return excelDate.toISOString().split('T')[0];
      }
    }

    // Try various formats
    if (typeof dateStr === 'string') {
      let cleaned = dateStr.replace(/\s+/g, ' ').trim();
      
      const patterns = [
        { regex: /^(\d{1,2})[-/](\w{3,9})[-/](\d{2,4})$/i, groups: ['day', 'monthName', 'year'] },
        { regex: /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/, groups: ['day', 'month', 'year'] },
        { regex: /^(\d{2,4})[-/](\d{1,2})[-/](\d{1,2})$/, groups: ['year', 'month', 'day'] },
        { regex: /^(\w{3,9})\s+(\d{1,2}),?\s*(\d{2,4})$/i, groups: ['monthName', 'day', 'year'] },
        { regex: /^(\d{1,2})\s+(\w{3,9})\s+(\d{2,4})$/i, groups: ['day', 'monthName', 'year'] },
        { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, groups: ['day', 'month', 'year'] },
      ];

      const monthMap = {
        'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
        'apr': 4, 'april': 4, 'may': 5, 'june': 6, 'jun': 6, 'july': 7,
        'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
        'nov': 11, 'november': 11, 'dec': 12, 'december': 12
      };

      const getMonthNumber = (monthStr) => {
        const month = monthStr.toLowerCase().trim();
        return monthMap[month] || parseInt(month) || 1;
      };

      const normalizeYear = (year) => {
        const numYear = parseInt(year);
        if (numYear < 100) {
          return 2000 + numYear;
        }
        return numYear;
      };

      for (const pattern of patterns) {
        const match = cleaned.match(pattern.regex);
        if (match) {
          try {
            let year, month, day;
            const parts = match.slice(1);

            for (const [i, groupName] of pattern.groups.entries()) {
              const value = parts[i] || '';
              if (groupName === 'year') {
                year = normalizeYear(value);
              } else if (groupName === 'day') {
                day = parseInt(value);
              } else if (groupName === 'month') {
                month = parseInt(value);
              } else if (groupName === 'monthName') {
                month = getMonthNumber(value);
              }
            }

            if (year && month && day && year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
              const daysInMonth = new Date(year, month, 0).getDate();
              if (day <= daysInMonth) {
                const dateObj = new Date(year, month - 1, day);
                if (!isNaN(dateObj.getTime())) {
                  return dateObj.toISOString().split('T')[0];
                }
              }
            }
          } catch (e) {
            // Continue
          }
        }
      }
    }

    return null;
  };

  // ============================================================
  // 💰 COST PARSER
  // ============================================================
  const parseCost = (value) => {
    if (isEmpty(value)) return null;

    if (typeof value === 'number') {
      if (value > 10000) {
        return value / 100;
      }
      return value;
    }

    if (typeof value === 'string') {
      let cleaned = value.trim();
      cleaned = cleaned.replace(/[₹$,€£¥]/g, '').replace(/,/g, '').trim();
      
      if (!cleaned) return null;
      
      const numValue = parseFloat(cleaned);
      if (isNaN(numValue) || numValue <= 0) {
        return null;
      }

      return numValue;
    }

    return null;
  };

  // ============================================================
  // 📱 PHONE & EMAIL VALIDATION (FIXED)
  // ============================================================
  const isValidEmail = (email) => {
    if (!email || isEmpty(email)) return false;
    const str = safeString(email);
    if (!str) return false;
    
    // More lenient email validation for bulk import
    const cleaned = str.toLowerCase().trim();
    if (!cleaned.includes('@')) return false;
    
    const parts = cleaned.split('@');
    if (parts.length !== 2) return false;
    
    const localPart = parts[0];
    const domainPart = parts[1];
    
    if (!localPart || localPart.length === 0) return false;
    if (!domainPart || domainPart.length < 3) return false;
    if (!domainPart.includes('.')) return false;
    
    return true;
  };

  const isValidPhone = (phone) => {
    if (!phone || isEmpty(phone)) return false;
    const str = safeString(phone);
    if (!str) return false;
    const cleaned = str.replace(/[\s\-()+.]/g, '');
    return cleaned.length >= 7 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
  };

  const cleanPhone = (phone) => {
    if (!phone || isEmpty(phone)) return '';
    return safeString(phone).replace(/[\s\-()+.]/g, '');
  };

  // ============================================================
  // 📁 PARSE FILE
  // ============================================================
  const parseFile = (file) => {
    return new Promise((resolve, reject) => {
      const fileType = file.name.split('.').pop().toLowerCase();
      const reader = new FileReader();

      if (fileType === 'csv' || fileType === 'tsv') {
        reader.onload = (e) => {
          try {
            const csvData = e.target.result;
            const delimiter = fileType === 'tsv' ? '\t' : ',';
            
            const result = Papa.parse(csvData, {
              header: true,
              skipEmptyLines: true,
              trimHeaders: true,
              delimiter: delimiter,
              transformHeader: (header) => safeString(header),
              dynamicTyping: false,
            });

            const rows = result.data.filter(row => 
              Object.values(row).some(val => val && safeString(val))
            );

            resolve({ data: rows, type: 'csv' });
          } catch (error) {
            reject(new Error(`Failed to parse CSV: ${error.message}`));
          }
        };
        reader.readAsText(file);
      } else {
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { 
              type: 'array',
              cellDates: true,
              dateNF: 'yyyy-mm-dd'
            });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
              raw: true,
              defval: '',
            });
            
            const rows = jsonData.map(row => {
              const cleaned = {};
              for (const [key, value] of Object.entries(row)) {
                if (value instanceof Date) {
                  cleaned[key] = value.toISOString().split('T')[0];
                } else if (typeof value === 'number' && value > 0 && value > 25569 && value < 50000) {
                  cleaned[key] = value;
                } else {
                  cleaned[key] = value !== undefined && value !== null ? String(value) : '';
                }
              }
              return cleaned;
            }).filter(row => 
              Object.values(row).some(val => val && safeString(val))
            );

            resolve({ data: rows, type: 'excel' });
          } catch (error) {
            reject(new Error(`Failed to parse Excel file: ${error.message}`));
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });
  };

  // ============================================================
  // 🔄 HANDLE FILE UPLOAD
  // ============================================================
  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop().toLowerCase();
    if (!UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error(`Unsupported file type: ${extension}. Please use .xlsx, .xls, .csv, or .tsv`);
      return;
    }

    if (selectedFile.size > UPLOAD_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large: ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB. Maximum ${UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setFileName(selectedFile.name);
    isCancelledRef.current = false;

    toast.loading('Reading file...', { id: 'file-reading' });

    parseFile(selectedFile)
      .then(({ data }) => {
        toast.dismiss('file-reading');
        
        if (data.length === 0) {
          toast.error('No data found in the file.');
          return;
        }

        const headers = Object.keys(data[0] || {});
        
        // Initialize mapping with empty values
        const initialMapping = {};
        DB_FIELDS.forEach(field => {
          initialMapping[field.key] = '';
        });

        setRawData(data);
        setHeaders(headers);
        setFieldMapping(initialMapping);
        setStep(2);
        
        toast.success(`Loaded ${data.length} rows with ${headers.length} columns. Please map your columns.`);
      })
      .catch((error) => {
        toast.dismiss('file-reading');
        console.error('Error parsing file:', error);
        toast.error(error.message || 'Failed to parse file. Please check the format.');
      });
  };

  // ============================================================
  // 🔄 HANDLE MAPPING CHANGE
  // ============================================================
  const handleMappingChange = (fieldKey, columnName) => {
    setFieldMapping(prev => ({
      ...prev,
      [fieldKey]: columnName
    }));
  };

  const toggleFieldExpand = (fieldKey) => {
    setExpandedFields(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  // ============================================================
  // 🔄 APPLY MAPPING & PREVIEW
  // ============================================================
  const handleApplyMapping = () => {
    // Check required fields
    const requiredFields = DB_FIELDS.filter(f => f.required);
    const missingRequired = requiredFields.filter(f => !fieldMapping[f.key]);
    
    if (missingRequired.length > 0) {
      toast.error(`Please map these required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    // Map the data
    const mappedData = rawData.map((row, index) => {
      const mapped = {
        _rowIndex: index,
        _raw: row,
        _isValid: true,
        _errors: [],
        _warnings: [],
      };

      // Map each field
      for (const field of DB_FIELDS) {
        const columnName = fieldMapping[field.key];
        if (columnName && row[columnName] !== undefined) {
          let value = row[columnName];
          
          // Special handling for different field types
          if (field.key === 'phone') {
            mapped[field.key] = cleanPhone(value);
          } else if (field.key === 'email') {
            const email = safeString(value);
            mapped[field.key] = isValidEmail(email) ? email : '';
          } else if (field.key === 'start_date' || field.key === 'end_date' || field.key === 'date_of_birth') {
            if (autoDetectDates) {
              mapped[field.key] = parseDate(value) || safeString(value);
            } else {
              mapped[field.key] = safeString(value);
            }
          } else if (field.key === 'base_cost' || field.key === 'net_cost' || field.key === 'discount') {
            mapped[field.key] = parseCost(value);
          } else {
            mapped[field.key] = safeString(value);
          }
        } else {
          mapped[field.key] = '';
        }
      }

      // Validate the row
      if (!mapped.full_name || mapped.full_name.trim() === '') {
        mapped._isValid = false;
        mapped._errors.push('Missing Full Name');
      }

      if (!mapped.phone || mapped.phone.trim() === '') {
        mapped._isValid = false;
        mapped._errors.push('Missing Phone Number');
      } else if (!isValidPhone(mapped.phone)) {
        mapped._isValid = false;
        mapped._errors.push(`Invalid Phone: "${mapped.phone}"`);
      }

      if (!mapped.plan_name || mapped.plan_name.trim() === '') {
        mapped._isValid = false;
        mapped._errors.push('Missing Plan Name');
      }

      // Determine active status based on end date
      if (statusBasedOnEndDate && mapped.end_date) {
        const endDate = parseDate(mapped.end_date);
        if (endDate) {
          const today = new Date().toISOString().split('T')[0];
          mapped._isActive = endDate >= today;
          mapped._status = mapped._isActive ? 'active' : 'inactive';
        } else {
          mapped._status = 'unknown';
        }
      } else {
        mapped._status = 'active';
      }

      return mapped;
    });

    // Separate valid and invalid rows
    const validRows = mappedData.filter(row => row._isValid);
    const invalidRows = mappedData.filter(row => !row._isValid);

    setInvalidRows(invalidRows);
    setInvalidCount(invalidRows.length);
    setPreviewData(validRows);
    setStep(3);

    toast.success(
      `✅ ${validRows.length} valid rows ready to import. ` +
      `${invalidRows.length} invalid rows will be skipped.`
    );
  };

  // ============================================================
  // 📊 EXPORT SKIPPED ROWS
  // ============================================================
  const exportSkippedRows = () => {
    if (invalidRows.length === 0 && skippedRows.length === 0) {
      toast.info('No skipped rows to export');
      return;
    }

    const allSkipped = [
      ...invalidRows.map(row => ({
        ...row._raw,
        _errors: row._errors.join(', '),
        _reason: 'Validation Error'
      })),
      ...skippedRows.map(row => ({
        ...row._raw,
        _reason: row._skipReason || 'Skipped'
      }))
    ];

    const allHeaders = [...headers, '_errors', '_reason'];
    const csvRows = [allHeaders.join(',')];

    allSkipped.forEach(row => {
      const rowData = allHeaders.map(h => {
        const val = row[h] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(rowData.join(','));
    });

    const csv = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skipped_rows_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${allSkipped.length} skipped rows`);
  };

  // ============================================================
  // 🚀 EXTRACT DURATION FROM PLAN NAME
  // ============================================================
  const extractDuration = (planName) => {
    if (!planName || isEmpty(planName)) return { durationDays: 30, planType: 'monthly' };
    
    const safeName = safeString(planName);
    if (!safeName) return { durationDays: 30, planType: 'monthly' };
    
    const lower = safeName.toLowerCase();
    
    if (lower.includes('day')) {
      const match = safeName.match(/(\d+)\s*day/i);
      if (match) {
        return { durationDays: parseInt(match[1]), planType: 'monthly' };
      }
    }
    
    if (lower.includes('month') || lower.includes('mon')) {
      const match = safeName.match(/(\d+)\s*month/i);
      if (match) {
        const months = parseInt(match[1]);
        const durationDays = months * 30;
        let planType = 'monthly';
        if (months >= 12) planType = 'yearly';
        else if (months >= 6) planType = 'half_yearly';
        else if (months >= 3) planType = 'quarterly';
        return { durationDays, planType };
      }
    }
    
    if (lower.includes('year') || lower.includes('yr')) {
      const match = safeName.match(/(\d+)\s*year/i);
      if (match) {
        const years = parseInt(match[1]);
        return { durationDays: years * 365, planType: 'yearly' };
      }
    }

    // Check for specific numbers in plan name
    const numberMatch = safeName.match(/(\d+)\s*(month|year|day)/i);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      const unit = numberMatch[2].toLowerCase();
      if (unit === 'year') return { durationDays: num * 365, planType: 'yearly' };
      if (unit === 'month') return { durationDays: num * 30, planType: num >= 12 ? 'yearly' : 'monthly' };
      if (unit === 'day') return { durationDays: num, planType: 'monthly' };
    }
    
    // Common offer patterns
    const offerMap = {
      '1+1': { days: 55, type: 'monthly' },
      '3+3': { days: 180, type: 'half_yearly' },
      '6+6': { days: 365, type: 'yearly' },
      '12+2': { days: 420, type: 'yearly' },
      '12+1': { days: 390, type: 'yearly' },
      '6+3': { days: 235, type: 'half_yearly' },
      '6+4': { days: 300, type: 'yearly' },
      '3+2': { days: 150, type: 'quarterly' },
      '3+1': { days: 120, type: 'quarterly' },
    };

    for (const [key, value] of Object.entries(offerMap)) {
      if (lower.includes(key)) {
        return { durationDays: value.days, planType: value.type };
      }
    }
    
    if (lower.includes('yearly') || lower.includes('annual')) {
      return { durationDays: 365, planType: 'yearly' };
    }
    if (lower.includes('half') || lower.includes('6 month')) {
      return { durationDays: 180, planType: 'half_yearly' };
    }
    if (lower.includes('quarter') || lower.includes('3 month')) {
      return { durationDays: 90, planType: 'quarterly' };
    }
    
    return { durationDays: 30, planType: 'monthly' };
  };

  // ============================================================
  // 🚀 HANDLE IMPORT (FIXED ERROR HANDLING)
  // ============================================================
  const handleImport = async () => {
    isCancelledRef.current = false;
    setUploading(true);
    setImportProgress({ current: 0, total: previewData.length });
    
    const results = { success: 0, failed: 0, skipped: 0, errors: [], plansCreated: [] };
    const createdPlans = [];

    abortControllerRef.current = new AbortController();

    try {
      let existingPlans = [];
      try {
        const plansResponse = await api.get('/gym/plans');
        existingPlans = plansResponse.data || [];
      } catch (planError) {
        console.warn('Could not fetch existing plans:', planError);
      }

      const existingPlanMap = {};
      existingPlans.forEach(p => {
        if (p && p.name) {
          existingPlanMap[p.name.toLowerCase().trim()] = p.id;
        }
      });

      const uniquePlans = [...new Set(previewData.map(m => safeString(m.plan_name)).filter(Boolean))];
      const plansToCreate = uniquePlans.filter(name => {
        if (!name) return false;
        const cleanName = name.toLowerCase().trim();
        return !existingPlanMap[cleanName];
      });

      if (plansToCreate.length > 0 && !isCancelledRef.current) {
        toast.loading(`Creating ${plansToCreate.length} missing plans...`, { id: 'create-plans' });
        
        for (const planName of plansToCreate) {
          if (isCancelledRef.current) {
            toast.dismiss('create-plans');
            toast.info('Import cancelled during plan creation.');
            setUploading(false);
            return;
          }
          
          try {
            const { durationDays, planType } = extractDuration(planName);
            
            const planData = {
              name: planName,
              description: `Imported plan: ${planName}`,
              plan_type: planType,
              duration_days: durationDays,
              price: 0,
              discounted_price: 0,
              is_active: true,
              features: JSON.stringify([`${durationDays} days membership`])
            };

            const newPlanResponse = await api.post('/gym/plans', planData);
            const newPlan = newPlanResponse.data;
            
            if (newPlan && newPlan.name) {
              existingPlanMap[newPlan.name.toLowerCase().trim()] = newPlan.id;
            }
            createdPlans.push(planName);
            
          } catch (error) {
            console.error(`❌ Failed to create plan ${planName}:`, error);
            const errorMsg = error?.response?.data?.detail || error?.message || 'Unknown error';
            const errorText = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
            results.errors.push({
              member: 'SYSTEM',
              error: `Failed to create plan: ${planName} - ${errorText}`
            });
          }
        }
        
        toast.dismiss('create-plans');
        if (createdPlans.length > 0 && !isCancelledRef.current) {
          toast.success(`Created ${createdPlans.length} new plans`);
        }
      }

      if (isCancelledRef.current) {
        setUploading(false);
        return;
      }

      let allPlans = [];
      try {
        const plansResponse = await api.get('/gym/plans');
        allPlans = plansResponse.data || [];
      } catch (error) {
        console.warn('Could not fetch updated plans:', error);
      }

      const planIdMap = {};
      allPlans.forEach(p => {
        if (p && p.name) {
          planIdMap[p.name.toLowerCase().trim()] = p.id;
        }
      });

      const defaultPlan = allPlans.find(p => p.is_active) || allPlans[0];

      const successfullyImportedPhones = new Set();
      const failedPhoneNumbers = new Set();
      
      for (let i = 0; i < previewData.length; i++) {
        if (isCancelledRef.current) {
          toast.info('Import cancelled.');
          setUploading(false);
          return;
        }

        const member = previewData[i];
        setImportProgress({ current: i + 1, total: previewData.length });

        if (!member._isValid) {
          results.skipped++;
          results.errors.push({
            member: member.full_name || 'Unknown',
            error: member._errors.join(', ')
          });
          continue;
        }

        const phone = safeString(member.phone);
        if (successfullyImportedPhones.has(phone)) {
          results.skipped++;
          results.errors.push({
            member: member.full_name,
            error: `Duplicate phone number: ${phone} (already imported earlier in this file)`
          });
          continue;
        }

        if (failedPhoneNumbers.has(phone)) {
          results.skipped++;
          results.errors.push({
            member: member.full_name,
            error: `Phone number ${phone} failed previously in this import`
          });
          continue;
        }

        try {
          // Determine if member should be active based on end date
          const shouldBeActive = statusBasedOnEndDate && member.end_date 
            ? parseDate(member.end_date) >= new Date().toISOString().split('T')[0]
            : true;
          
          const memberData = {
            full_name: safeString(member.full_name),
            phone: phone,
            gender: safeString(member.gender) || 'male',
            is_active: shouldBeActive,
            joined_date: member.start_date ? parseDate(member.start_date) || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          };

          if (member.email && member.email.trim() !== '' && isValidEmail(member.email)) {
            memberData.email = safeString(member.email);
          }

          if (member.address && member.address.trim() !== '') {
            memberData.address = safeString(member.address);
          }

          if (member.date_of_birth) {
            const dob = parseDate(member.date_of_birth);
            if (dob) memberData.date_of_birth = dob;
          }

          if (member.emergency_contact_name && member.emergency_contact_name.trim() !== '') {
            memberData.emergency_contact_name = safeString(member.emergency_contact_name);
          }
          if (member.emergency_contact_phone && member.emergency_contact_phone.trim() !== '') {
            memberData.emergency_contact_phone = safeString(member.emergency_contact_phone);
          }
          if (member.medical_conditions && member.medical_conditions.trim() !== '') {
            memberData.medical_conditions = safeString(member.medical_conditions);
          }
          if (member.allergies && member.allergies.trim() !== '') {
            memberData.allergies = safeString(member.allergies);
          }
          if (member.medications && member.medications.trim() !== '') {
            memberData.medications = safeString(member.medications);
          }

          const memberResponse = await api.post('/gym/members', memberData);
          const newMember = memberResponse.data;
          
          successfullyImportedPhones.add(phone);

          let planId = null;
          let planName = safeString(member.plan_name);
          
          if (planName) {
            const cleanPlanName = planName.toLowerCase().trim();
            planId = planIdMap[cleanPlanName];
            
            if (!planId) {
              for (const [key, id] of Object.entries(planIdMap)) {
                if (key.includes(cleanPlanName) || cleanPlanName.includes(key)) {
                  planId = id;
                  break;
                }
              }
            }
          }
          
          if (!planId && defaultPlan) {
            planId = defaultPlan.id;
            planName = defaultPlan.name;
          }

          if (planId) {
            try {
              let startDate = member.start_date ? parseDate(member.start_date) || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
              
              let endDate = member.end_date ? parseDate(member.end_date) : null;
              
              if (!endDate) {
                const plan = allPlans.find(p => p.id === planId);
                if (plan) {
                  const start = new Date(startDate);
                  endDate = new Date(start);
                  endDate.setDate(endDate.getDate() + plan.duration_days);
                  endDate = endDate.toISOString().split('T')[0];
                }
              }
              
              if (endDate) {
                let amountPaid = 0;
                if (member.net_cost !== null && member.net_cost > 0) {
                  amountPaid = member.net_cost;
                } else if (member.base_cost !== null && member.base_cost > 0) {
                  amountPaid = member.base_cost;
                }
                
                const membershipPayload = {
                  member_id: newMember.id,
                  plan_id: planId,
                  start_date: startDate,
                  end_date: endDate,
                  amount_paid: amountPaid,
                  discount_applied: member.discount || 0,
                };
                
                await api.post('/gym/memberships', membershipPayload);
              }
              
            } catch (membershipError) {
              console.error('Membership creation error:', membershipError);
              const errorMsg = membershipError?.response?.data?.detail || membershipError?.message || 'Unknown error';
              const errorText = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
              results.errors.push({
                member: member.full_name,
                error: `Membership failed: ${errorText}`
              });
            }
          }

          results.success++;

        } catch (error) {
          console.error('Error importing member:', error);
          
          let errorMsg = 'Unknown error';
          if (error?.response?.data?.detail) {
            errorMsg = typeof error.response.data.detail === 'string' 
              ? error.response.data.detail 
              : JSON.stringify(error.response.data.detail);
          } else if (error?.message) {
            errorMsg = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
          }
          
          const errorText = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
          
          const isDuplicateError = errorText.toLowerCase().includes('already exists') || 
                                   errorText.toLowerCase().includes('duplicate') || 
                                   errorText.toLowerCase().includes('phone') ||
                                   errorText.toLowerCase().includes('email');
          
          if (isDuplicateError) {
            results.skipped++;
            failedPhoneNumbers.add(phone);
            results.errors.push({
              member: member.full_name,
              error: `Member already exists with phone: ${phone} (skipped)`
            });
          } else {
            results.failed++;
            failedPhoneNumbers.add(phone);
            results.errors.push({
              member: member.full_name,
              error: errorText
            });
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (isCancelledRef.current) {
        toast.info('Import cancelled.');
        setUploading(false);
        return;
      }

      setResults(results);
      setPlansCreated(createdPlans);
      setStep(4);
      
      let summaryMessage = `✅ Import complete! ${results.success} members imported.`;
      if (invalidCount > 0) summaryMessage += ` ⚠️ ${invalidCount} invalid rows skipped.`;
      if (results.skipped > 0) summaryMessage += ` ⏭️ ${results.skipped} duplicates skipped.`;
      if (createdPlans.length > 0) summaryMessage += ` 📋 ${createdPlans.length} plans created.`;
      if (results.failed > 0) summaryMessage += ` ❌ ${results.failed} failed.`;
      
      toast.success(summaryMessage, { duration: 6000 });
      
    } catch (error) {
      let errorText = 'Unknown error occurred';
      if (error?.response?.data?.detail) {
        errorText = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail);
      } else if (error?.message) {
        errorText = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
      } else if (typeof error === 'string') {
        errorText = error;
      }
      
      if (error.name === 'AbortError' || isCancelledRef.current) {
        toast.info('Import cancelled.');
      } else {
        console.error('Import error:', error);
        toast.error('Failed to import members: ' + errorText);
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelImport = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploading(false);
    toast.info('Import cancelled.');
  };

  const handleClose = () => {
    isCancelledRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setFile(null);
    setFileName('');
    setRawData([]);
    setHeaders([]);
    setPreviewData([]);
    setResults(null);
    setPlansCreated([]);
    setStep(1);
    setImportProgress({ current: 0, total: 0 });
    setUploading(false);
    setFieldMapping({});
    setInvalidRows([]);
    setInvalidCount(0);
    setSkippedRows([]);
    setSkippedCount(0);
    if (onImportComplete) onImportComplete();
    onClose();
  };

  // ============================================================
  // 🎨 RENDER FUNCTIONS
  // ============================================================

  // ─── STEP 1: Upload ──────────────────────────────────────────
  const renderStep1 = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileSpreadsheet className="h-10 w-10 text-blue-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Your File</h3>
      <p className="text-sm text-gray-500 mb-6">
        Upload Excel (.xlsx, .xls) or CSV (.csv) file with member data.
        <br />
        <span className="text-xs text-blue-500">After uploading, you'll map your columns to our database fields.</span>
      </p>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer">
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.tsv"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-400 mt-1">Supports .xlsx, .xls, .csv, .tsv files (Max {UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB)</p>
        </label>
      </div>

      <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm font-medium text-blue-700 flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          How it works:
        </p>
        <ol className="text-xs text-blue-600 mt-2 space-y-1 list-decimal list-inside">
          <li>Upload your file (Excel or CSV)</li>
          <li>Map your columns to our database fields</li>
          <li>Preview the data before importing</li>
          <li>Import with one click!</li>
        </ol>
      </div>
    </div>
  );

  // ─── STEP 2: Column Mapping ────────────────────────────────
  const renderStep2 = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Column Mapping
          </h3>
          <p className="text-sm text-gray-500">
            Map your file columns to the corresponding database fields.
            <span className="text-red-500 ml-1">*</span> = Required
          </p>
        </div>
        <div className="text-sm text-gray-400">
          {rawData.length} rows • {headers.length} columns
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-yellow-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Tip:</strong> Map the correct columns from your file to the fields below.
            The system will <strong>auto-detect dates</strong> and <strong>set active status based on End Date</strong>.
          </span>
        </p>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">Field</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">Map to Column</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {DB_FIELDS.map((field) => {
              const isExpanded = expandedFields[field.key];
              const Icon = field.icon;
              
              return (
                <tr key={field.key} className={field.required ? 'bg-blue-50/20' : ''}>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <Icon className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-800">
                            {field.label}
                          </span>
                          {field.required && (
                            <span className="text-red-500 text-xs font-bold">*</span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleFieldExpand(field.key)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                            <p><strong>Description:</strong> {field.description}</p>
                            <p><strong>Example:</strong> {field.example}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={fieldMapping[field.key] || ''}
                      onChange={(e) => handleMappingChange(field.key, e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white ${
                        field.required && !fieldMapping[field.key] 
                          ? 'border-red-300 ring-1 ring-red-100' 
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="">-- Select Column --</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                    {field.required && !fieldMapping[field.key] && (
                      <p className="text-xs text-red-500 mt-1">Required field</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Options */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoDetectDates}
              onChange={(e) => setAutoDetectDates(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Auto-detect date formats
            <span className="text-xs text-gray-400">(DD/MM, MM/DD, Excel serial)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={statusBasedOnEndDate}
              onChange={(e) => setStatusBasedOnEndDate(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Set status based on End Date
            <span className="text-xs text-gray-400">(Active if end date is in future)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={skipRowsWithMissingRequired}
              onChange={(e) => setSkipRowsWithMissingRequired(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Skip rows with missing required fields
          </label>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setStep(1)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          Back
        </button>
        <button
          onClick={handleApplyMapping}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          Apply Mapping & Preview
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  // ─── STEP 3: Preview ─────────────────────────────────────────
  const renderStep3 = () => {
    const membersWithCost = previewData.filter(m => m.base_cost !== null && m.base_cost > 0);
    const totalCost = membersWithCost.reduce((sum, m) => sum + (m.base_cost || 0), 0);
    const activeCount = previewData.filter(m => m._isActive === true).length;

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">📋 Preview Import Data</h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm text-gray-500">{previewData.length} valid rows</span>
              {invalidCount > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  ⚠️ {invalidCount} invalid rows will be skipped
                </span>
              )}
              {statusBasedOnEndDate && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  ✅ {activeCount} active members (based on end date)
                </span>
              )}
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {fileName}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {invalidCount > 0 && (
              <button
                onClick={exportSkippedRows}
                className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Export Skipped
              </button>
            )}
            <button
              onClick={() => setStep(2)}
              className="text-sm text-blue-600 hover:text-blue-700"
              disabled={uploading}
            >
              Adjust Mapping
            </button>
          </div>
        </div>

        {invalidCount > 0 && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700 flex items-start gap-2">
              <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>⚠️ {invalidCount} invalid rows will be skipped</strong> due to:
                <ul className="list-disc list-inside mt-1 text-xs text-red-600">
                  <li>Missing required fields (Name, Phone, Plan)</li>
                  <li>Invalid phone numbers</li>
                  <li>Invalid email formats</li>
                </ul>
              </span>
            </p>
          </div>
        )}

        {statusBasedOnEndDate && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 flex items-start gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Status based on End Date:</strong>
                Members with end date <strong>in the future</strong> will be marked as <strong>Active</strong>.
                Members with end date <strong>in the past</strong> will be marked as <strong>Inactive</strong>.
              </span>
            </p>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {previewData.slice(0, UPLOAD_CONFIG.PREVIEW_ROWS).map((member, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.full_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{member.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {member.plan_name ? (
                      <span className="font-medium text-blue-600">{member.plan_name}</span>
                    ) : (
                      <span className="text-red-400">⚠️ Missing</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{member.start_date || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{member.end_date || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {member.base_cost !== null && member.base_cost > 0 ? (
                      <span className="text-green-600 font-medium">
                        ₹{member.base_cost.toLocaleString('en-IN')}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      member._isActive === true 
                        ? 'bg-green-100 text-green-800' 
                        : member._isActive === false 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member._isActive === true ? 'Active' : member._isActive === false ? 'Inactive' : 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {previewData.length > UPLOAD_CONFIG.PREVIEW_ROWS && (
            <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 text-center">
              Showing first {UPLOAD_CONFIG.PREVIEW_ROWS} of {previewData.length} rows
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {membersWithCost.length > 0 && (
              <span>
                Total Cost: <strong className="text-purple-600">₹{totalCost.toLocaleString('en-IN')}</strong>
                {' '}({membersWithCost.length} members with cost)
              </span>
            )}
          </div>
          <div className="text-sm text-gray-400">
            {previewData.length} rows ready for import
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={uploading ? handleCancelImport : handleImport}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors ${
              uploading 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing ({importProgress.current}/{importProgress.total})
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import {previewData.length} Members
              </>
            )}
          </button>
        </div>
        
        {uploading && (
          <div className="mt-3">
            <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Importing {importProgress.current} of {importProgress.total} members
            </p>
            <button
              onClick={handleCancelImport}
              className="mt-2 w-full text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Click here to stop import
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── STEP 4: Complete ────────────────────────────────────────
  const renderStep4 = () => (
    <div>
      <div className="text-center mb-6">
        {results.failed === 0 && results.skipped === 0 && invalidCount === 0 ? (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        ) : results.success === 0 ? (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        ) : (
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
        )}
        <h3 className="text-lg font-bold text-gray-900">Import Complete</h3>
        <div className="flex justify-center gap-8 mt-2 flex-wrap">
          <div>
            <p className="text-sm text-gray-500">Successful</p>
            <p className="text-2xl font-bold text-green-600">{results.success}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">{results.failed}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Skipped</p>
            <p className="text-2xl font-bold text-yellow-600">{results.skipped || 0}</p>
          </div>
          {invalidCount > 0 && (
            <div>
              <p className="text-sm text-gray-500">Invalid Rows</p>
              <p className="text-2xl font-bold text-red-400">{invalidCount}</p>
            </div>
          )}
        </div>
        {plansCreated.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-blue-600">
              ✅ {plansCreated.length} new plan{plansCreated.length > 1 ? 's' : ''} created
            </p>
          </div>
        )}
      </div>

      {results.errors.length > 0 && (
        <div className="max-h-48 overflow-y-auto border rounded-lg mb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.errors.slice(0, 50).map((error, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900">{error.member}</td>
                  <td className="px-4 py-2 text-sm text-red-600">{error.error}</td>
                </tr>
              ))}
              {results.errors.length > 50 && (
                <tr>
                  <td colSpan="2" className="px-4 py-2 text-sm text-gray-500 text-center">
                    ... and {results.errors.length - 50} more errors
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleClose}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Done
        </button>
      </div>
    </div>
  );

  // ============================================================
  // 🏠 MAIN RENDER
  // ============================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-20">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Bulk Import Members
            {step > 1 && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                Step {step - 1} of {step === 2 ? 'Mapping' : step === 3 ? 'Preview' : 'Complete'}
              </span>
            )}
          </h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;