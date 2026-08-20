// src/components/BulkImportModal.jsx - COMPLETE ULTIMATE VERSION
// Supports: Sanatoriyam format, Excel exports, and any other format

import React, { useState, useRef, useMemo } from 'react';
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, AlertCircle, FileText, AlertTriangle, Download, ArrowLeft, ArrowRight } from 'lucide-react';
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
  PREVIEW_ROWS: 50,
  MAX_PREVIEW_ROWS: 100,
};

// ============================================================
// FIELD SYNONYMS - Comprehensive coverage
// ============================================================
const FIELD_SYNONYMS = {
  full_name: [
    'full name', 'fullname', 'member name', 'membername', 'name', 
    'customer name', 'customer', 'client name', 'client', 'person name',
    'complete name', 'display name', 'candidate name', 'employee name',
    'patient name', 'student name', 'user name', 'username',
    // Sanatoriyam format
    'member_name', 'membername', 'member name'
  ],
  first_name: ['first name', 'firstname', 'given name', 'first', 'fname'],
  last_name: ['last name', 'lastname', 'surname', 'family name', 'lname'],
  phone: [
    'phone', 'mobile', 'cell', 'contact', 'telephone', 'phone number',
    'mobile number', 'contact number', 'cell phone', 'phone no', 'mob',
    'mobile no', 'contact no', 'telephone number', 'phone#', 'mobile#',
    'whatsapp', 'whatsapp number', 'primary phone', 'secondary phone',
    // Sanatoriyam format
    'member_contact', 'membercontact', 'contact'
  ],
  email: [
    'email', 'e-mail', 'email address', 'mail', 'email id', 'e-mail id',
    // Sanatoriyam format
    'member_email_id', 'memberemail', 'member_email', 'email id'
  ],
  plan_name: [
    'plan', 'membership', 'plan name', 'membership plan', 'package',
    'subscription', 'plan type', 'member plan', 'plan category',
    'membership type', 'subscription plan', 'package name', 'tier',
    'membership level', 'plan id', 'member type', 'category',
    // Sanatoriyam format
    'package_name', 'packagename', 'package'
  ],
  status: ['status', 'active', 'member status', 'membership status', 'is active', 'active status', 'state'],
  gender: ['gender', 'sex', 'gender identity'],
  address: ['address', 'addr', 'street', 'location', 'residence', 'home address', 'mailing address'],
  date_of_birth: ['dob', 'birth date', 'date of birth', 'birthday', 'birth', 'born', 'date of birth'],
  joined_date: [
    'joined date', 'join date', 'start date', 'membership start', 
    'valid from', 'from date', 'begin date', 'effective date',
    'enrollment date', 'registration date', 'signup date', 'start',
    'membership from', 'activate date', 'member since',
    // Sanatoriyam format
    'start_date', 'startdate'
  ],
  membership_end: [
    'end date', 'expiry date', 'membership end', 'valid to', 'to date',
    'expiration', 'expires', 'membership until', 'until', 'valid till',
    'expiration date', 'renewal date', 'due date', 'membership expiry',
    // Sanatoriyam format
    'end_date', 'enddate'
  ],
  base_cost: [
    'base cost', 'original cost', 'base price', 'original price', 
    'list price', 'mrp', 'base amount', 'gross amount', 'gross',
    'subtotal', 'before discount', 'regular price', 'standard price',
    'plan cost', 'membership cost',
    // Sanatoriyam format
    'package_fees', 'packagefees', 'fees'
  ],
  net_cost: [
    'net cost', 'net price', 'discounted cost', 'amount', 'fee', 
    'total', 'price', 'cost', 'net amount', 'net', 'payable',
    'total amount', 'amount paid', 'payment amount', 'final price',
    'discounted price', 'special price', 'offer price', 'billing amount',
    'invoice amount', 'payable amount', 'due amount',
    // Sanatoriyam format
    'final_paid', 'finalpaid', 'paid', 'rate'
  ],
  discount: [
    'discount', 'discount applied', 'discount amount', 'disc',
    // Sanatoriyam format
    'discount'
  ],
  member_id: [
    'member id', 'member_id', 'memberid', 'id', 'user id',
    // Sanatoriyam format
    'member_id'
  ],
  invoice_id: [
    'invoice id', 'invoice_id', 'invoiceid', 'invoice number',
    // Sanatoriyam format
    'invoice_id', 'invoice id'
  ],
  plan_type: [
    'plan type', 'plan_type', 'membership type', 'package type',
    // Sanatoriyam format
    'package_type', 'packagetype'
  ],
  duration_days: [
    'duration', 'duration days', 'duration_days', 'validity',
    // Sanatoriyam format
    'duration_days', 'durationdays'
  ],
  session_count: [
    'sessions', 'session count', 'total sessions',
    // Sanatoriyam format
    'session'
  ],
  balance: [
    'balance', 'balance due', 'final balance', 'pending',
    // Sanatoriyam format
    'final_balance', 'finalbalance'
  ],
  emergency_contact_name: [
    'emergency contact', 'emergency name', 'emergency contact name',
    'emergency person', 'next of kin', 'contact person', 'relative',
    'emergency', 'guardian', 'emergency contact person'
  ],
  emergency_contact_phone: [
    'emergency phone', 'emergency contact number', 'emergency mobile',
    'emergency contact phone', 'next of kin phone', 'guardian phone',
    'emergency number', 'emergency contact no'
  ],
  medical_conditions: [
    'medical conditions', 'medical', 'health issues', 'condition',
    'health condition', 'existing conditions', 'diagnosis', 'illness',
    'disease', 'medical history', 'health conditions'
  ],
  allergies: ['allergies', 'allergy', 'allergic', 'allergens'],
  medications: ['medications', 'medication', 'drugs', 'current medicines', 'prescription', 'meds', 'medicines'],
};

// ============================================================
// FIELD GROUPS FOR MAPPING UI
// ============================================================
const MAPPING_FIELDS = [
  { key: 'full_name', label: 'Full Name', required: true },
  { key: 'phone', label: 'Phone Number', required: true },
  { key: 'plan_name', label: 'Plan Name', required: true },
  { key: 'joined_date', label: 'Start Date (Valid From)', required: false },
  { key: 'membership_end', label: 'End Date (Valid To)', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'base_cost', label: 'Base Cost', required: false },
  { key: 'net_cost', label: 'Net Cost (Final Paid)', required: false },
  { key: 'date_of_birth', label: 'Date of Birth', required: false },
  { key: 'gender', label: 'Gender', required: false },
  { key: 'address', label: 'Address', required: false },
  { key: 'member_id', label: 'Member ID (optional)', required: false },
  { key: 'invoice_id', label: 'Invoice ID (optional)', required: false },
  { key: 'plan_type', label: 'Plan Type (Gym/PT)', required: false },
  { key: 'discount', label: 'Discount Amount', required: false },
  { key: 'emergency_contact_name', label: 'Emergency Contact Name', required: false },
  { key: 'emergency_contact_phone', label: 'Emergency Contact Phone', required: false },
  { key: 'medical_conditions', label: 'Medical Conditions', required: false },
  { key: 'allergies', label: 'Allergies', required: false },
  { key: 'medications', label: 'Medications', required: false },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
const BulkImportModal = ({ isOpen, onClose, onImportComplete }) => {
  // ─── State ──────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [step, setStep] = useState(1); // 1=upload, 2=mapping, 3=preview, 4=complete
  const [plansCreated, setPlansCreated] = useState([]);
  const [dateFormatDetected, setDateFormatDetected] = useState('');
  const [costFormatDetected, setCostFormatDetected] = useState('');
  const [skippedRows, setSkippedRows] = useState([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [invalidRows, setInvalidRows] = useState([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [fieldMapping, setFieldMapping] = useState({});
  const [mappingConfidence, setMappingConfidence] = useState({});
  const [showMappingHelp, setShowMappingHelp] = useState(false);
  const [autoDetectedFields, setAutoDetectedFields] = useState([]);
  const [fileStats, setFileStats] = useState({ rows: 0, columns: 0, sampleRows: [] });
  
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

  const safeLowerCase = (value) => {
    const str = safeString(value);
    return str.toLowerCase();
  };

  const isEmpty = (value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    return false;
  };

  // ============================================================
  // 🧠 SMART COST PARSER
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
      
      const hasDecimal = cleaned.includes('.');
      const numValue = parseFloat(cleaned);
      if (isNaN(numValue) || numValue <= 0) {
        return null;
      }

      if (!hasDecimal && numValue > 10000) {
        return numValue / 100;
      }

      if (hasDecimal) {
        return numValue;
      }

      return numValue;
    }

    return null;
  };

  // ============================================================
  // SMART COST DETECTION
  // ============================================================
  const detectCostFormat = (rows) => {
    const costFields = ['Package_Fees', 'Final_paid', 'Rate', 'Base Cost', 'Net Cost', 'Amount', 'Cost', 'Price'];
    let paisaCount = 0;
    let rupeeCount = 0;

    for (const row of rows) {
      for (const field of costFields) {
        const val = row[field];
        if (!isEmpty(val)) {
          const numVal = typeof val === 'number' ? val : parseFloat(safeString(val).replace(/[₹$,€£¥]/g, '').replace(/,/g, ''));
          if (!isNaN(numVal) && numVal > 0) {
            if (numVal > 10000) {
              paisaCount++;
            } else {
              rupeeCount++;
            }
            break;
          }
        }
      }
    }

    const total = paisaCount + rupeeCount;
    if (total > 0) {
      if (paisaCount / total > 0.5) {
        return 'paisa';
      }
    }
    return 'rupee';
  };

  // ============================================================
  // 🧠 SUPER SMART DATE PARSER
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

      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }

      const nativeDate = new Date(dateStr);
      if (!isNaN(nativeDate.getTime()) && nativeDate.getFullYear() > 1900 && nativeDate.getFullYear() < 2100) {
        return nativeDate.toISOString().split('T')[0];
      }
    }
    
    if (typeof dateStr === 'number' && dateStr > 0) {
      if (dateStr > 25569 && dateStr < 50000) {
        const excelDate = new Date((dateStr - 25569) * 86400 * 1000);
        if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() > 1900 && excelDate.getFullYear() < 2100) {
          return excelDate.toISOString().split('T')[0];
        }
      }
    }

    if (typeof dateStr === 'string' && !isNaN(dateStr) && Number(dateStr) > 0) {
      const numVal = Number(dateStr);
      if (numVal > 25569 && numVal < 50000) {
        const excelDate = new Date((numVal - 25569) * 86400 * 1000);
        if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() > 1900 && excelDate.getFullYear() < 2100) {
          return excelDate.toISOString().split('T')[0];
        }
      }
    }

    if (typeof dateStr === 'string') {
      let cleaned = dateStr.replace(/\s+/g, ' ').trim();
      
      const patterns = [
        { regex: /^(\d{1,2})[-/](\w{3,9})[-/](\d{2,4})$/i, groups: ['day', 'monthName', 'year'] },
        { regex: /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/, groups: ['day', 'month', 'year'] },
        { regex: /^(\d{2,4})[-/](\d{1,2})[-/](\d{1,2})$/, groups: ['year', 'month', 'day'] },
        { regex: /^(\w{3,9})\s+(\d{1,2}),?\s*(\d{2,4})$/i, groups: ['monthName', 'day', 'year'] },
        { regex: /^(\d{1,2})\s+(\w{3,9})\s+(\d{2,4})$/i, groups: ['day', 'monthName', 'year'] },
        { regex: /^(\d{2,4})\s+(\w{3,9})\s+(\d{1,2})$/i, groups: ['year', 'monthName', 'day'] },
        { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, groups: ['day', 'month', 'year'] },
        { regex: /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/, groups: ['year', 'month', 'day'] },
        { regex: /^(\d{1,2})[-/](\w{3,9})[-/](\d{2})$/i, groups: ['day', 'monthName', 'yearShort'] },
        { regex: /^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/, groups: ['day', 'month', 'yearShort'] },
      ];

      const monthMap = {
        'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
        'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
        'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
        'nov': 11, 'november': 11, 'dec': 12, 'december': 12
      };

      const getMonthNumber = (monthStr) => {
        const month = safeLowerCase(monthStr);
        return monthMap[month] || parseInt(month) || 1;
      };

      const normalizeYear = (year, isShort = false) => {
        const numYear = parseInt(year);
        if (isShort && numYear < 100) {
          return 2000 + numYear;
        }
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
              } else if (groupName === 'yearShort') {
                year = normalizeYear(value, true);
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

      // Handle dd/mm/yyyy vs mm/dd/yyyy ambiguity
      if (cleaned.includes('/') || cleaned.includes('-')) {
        const parts = cleaned.split(/[/-]/);
        if (parts.length === 3) {
          const a = parseInt(parts[0]);
          const b = parseInt(parts[1]);
          const c = parseInt(parts[2]);
          if (!isNaN(a) && !isNaN(b) && !isNaN(c) && c > 1900 && c < 2100) {
            // If a > 12, it's definitely dd/mm/yyyy
            if (a > 12) {
              const dateObj = new Date(c, b - 1, a);
              if (!isNaN(dateObj.getTime())) {
                return dateObj.toISOString().split('T')[0];
              }
            }
            // If b > 12, it's mm/dd/yyyy
            if (b > 12) {
              const dateObj = new Date(c, a - 1, b);
              if (!isNaN(dateObj.getTime())) {
                return dateObj.toISOString().split('T')[0];
              }
            }
          }
        }
      }
    }

    return null;
  };

  // ============================================================
  // VALIDATE EMAIL & PHONE
  // ============================================================
  const isValidEmail = (email) => {
    if (!email || isEmpty(email)) return false;
    const str = safeString(email);
    if (!str) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(str);
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
  // 🔍 SMART COLUMN MAPPING WITH FUZZY MATCHING
  // ============================================================
  const findBestKey = (keys, synonyms, fieldKey) => {
    let bestScore = 0;
    let bestKey = null;
    let matchedSynonym = '';

    // First pass: exact matches
    for (const key of keys) {
      const lowerKey = safeLowerCase(key);
      for (const syn of synonyms) {
        if (lowerKey === safeLowerCase(syn)) {
          return { key, score: 100, synonym: syn };
        }
      }
    }

    // Second pass: substring matches with scoring
    for (const key of keys) {
      const lowerKey = safeLowerCase(key);
      for (const syn of synonyms) {
        const lowerSyn = safeLowerCase(syn);
        
        if (lowerKey.includes(lowerSyn) || lowerSyn.includes(lowerKey)) {
          const lengthRatio = Math.max(lowerKey.length, lowerSyn.length) / Math.min(lowerKey.length, lowerSyn.length);
          const specificity = lowerSyn.length > 3 ? 1.2 : 1.0;
          const score = (1 / lengthRatio) * 100 * specificity;
          
          if (score > bestScore) {
            bestScore = score;
            bestKey = key;
            matchedSynonym = syn;
          }
        }
      }
    }

    // Third pass: check if key contains any synonym as a word
    for (const key of keys) {
      const lowerKey = safeLowerCase(key);
      const words = lowerKey.split(/[\s_\-]+/);
      for (const word of words) {
        if (word.length < 3) continue;
        for (const syn of synonyms) {
          const lowerSyn = safeLowerCase(syn);
          if (word === lowerSyn || word.includes(lowerSyn) || lowerSyn.includes(word)) {
            const score = 60 + (word.length / lowerSyn.length) * 20;
            if (score > bestScore) {
              bestScore = score;
              bestKey = key;
              matchedSynonym = syn;
            }
          }
        }
      }
    }

    return { key: bestKey, score: bestScore, synonym: matchedSynonym };
  };

  // ============================================================
  // AUTO-MAP COLUMNS
  // ============================================================
  const autoMapColumns = (rowKeys) => {
    const mapping = {};
    const confidence = {};
    const detected = [];

    for (const field of MAPPING_FIELDS) {
      const synonyms = FIELD_SYNONYMS[field.key] || [];
      const result = findBestKey(rowKeys, synonyms, field.key);
      
      if (result.key && result.score > 30) {
        mapping[field.key] = result.key;
        confidence[field.key] = Math.round(result.score);
        detected.push(field.key);
      } else {
        // Special handling for full_name: check first_name + last_name
        if (field.key === 'full_name') {
          const firstNameKey = findBestKey(rowKeys, FIELD_SYNONYMS.first_name, 'first_name');
          const lastNameKey = findBestKey(rowKeys, FIELD_SYNONYMS.last_name, 'last_name');
          if (firstNameKey.key && lastNameKey.key) {
            mapping[field.key] = 'COMBINE_FIRST_LAST';
            confidence[field.key] = 80;
            detected.push(field.key);
            continue;
          }
        }
        
        // Special handling for phone
        if (field.key === 'phone') {
          const phoneKey = rowKeys.find(k => 
            /^[\d\s\-()+.]{7,}$/.test(safeString(k)) || 
            /phone|mobile|cell|contact/i.test(k)
          );
          if (phoneKey) {
            mapping[field.key] = phoneKey;
            confidence[field.key] = 40;
            detected.push(field.key);
          }
        }
      }
    }

    return { mapping, confidence, detected };
  };

  // ============================================================
  // MAP A SINGLE ROW USING THE MAPPING
  // ============================================================
  const mapRow = (row, mapping) => {
    const mapped = {
      _raw: row,
      _mapped: true,
      _isValid: true,
      _validationErrors: [],
      _warnings: [],
    };

    for (const field of MAPPING_FIELDS) {
      const key = mapping[field.key];
      
      if (key === 'COMBINE_FIRST_LAST') {
        const firstNameKey = findBestKey(Object.keys(row), FIELD_SYNONYMS.first_name, 'first_name').key;
        const lastNameKey = findBestKey(Object.keys(row), FIELD_SYNONYMS.last_name, 'last_name').key;
        const first = firstNameKey ? safeString(row[firstNameKey]) : '';
        const last = lastNameKey ? safeString(row[lastNameKey]) : '';
        mapped[field.key] = `${first} ${last}`.trim();
      } else if (key && row[key] !== undefined) {
        const value = row[key];
        
        if (field.key === 'phone') {
          mapped[field.key] = cleanPhone(value);
        } else if (field.key === 'email') {
          const email = safeString(value);
          mapped[field.key] = isValidEmail(email) ? email : '';
        } else if (field.key === 'base_cost' || field.key === 'net_cost' || field.key === 'discount') {
          mapped[field.key] = parseCost(value);
        } else if (field.key === 'date_of_birth' || field.key === 'joined_date' || field.key === 'membership_end') {
          mapped[field.key] = value;
        } else {
          mapped[field.key] = safeString(value);
        }
      } else {
        mapped[field.key] = '';
      }
    }

    // 🆕 Smart plan name enhancement: Combine Package_Type + Package_Name
    if (mapped.plan_name && mapped.plan_type) {
      // If plan_type is 'PT' or 'Gym', prepend it to plan name for clarity
      const planType = safeString(mapped.plan_type);
      if (planType && (planType.toLowerCase() === 'pt' || planType.toLowerCase() === 'gym')) {
        // Already has both, keep as is but make plan_name more descriptive
        if (!mapped.plan_name.toLowerCase().includes(planType.toLowerCase())) {
          mapped.plan_name = `${planType} - ${mapped.plan_name}`;
        }
      }
    }

    return mapped;
  };

  // ============================================================
  // VALIDATE A SINGLE ROW
  // ============================================================
  const validateRow = (row, mapping) => {
    const errors = [];
    const warnings = [];

    if (!row.full_name || row.full_name.trim() === '') {
      errors.push('Missing Full Name');
    }

    if (!row.phone || row.phone.trim() === '') {
      errors.push('Missing Phone Number');
    } else if (!isValidPhone(row.phone)) {
      errors.push(`Invalid Phone Number: "${row.phone}" (must be 7-15 digits)`);
    }

    if (!row.plan_name || row.plan_name.trim() === '') {
      errors.push('Missing Plan Name');
    }

    if (row.email && row.email.trim() !== '' && !isValidEmail(row.email)) {
      errors.push(`Invalid Email Format: "${row.email}"`);
    }

    const parsedStart = parseDate(row.joined_date);
    const parsedEnd = parseDate(row.membership_end);

    if (!parsedStart && !parsedEnd) {
      warnings.push('Missing both Start Date and End Date - will use today as start if plan exists');
    }

    if (row.base_cost !== null && row.base_cost !== undefined && row.base_cost !== '') {
      const cost = parseCost(row.base_cost);
      if (cost === null || cost <= 0) {
        warnings.push(`Invalid Base Cost: "${row.base_cost}" - will be treated as 0`);
      }
    }

    if (row.net_cost !== null && row.net_cost !== undefined && row.net_cost !== '') {
      const cost = parseCost(row.net_cost);
      if (cost === null || cost <= 0) {
        warnings.push(`Invalid Net Cost: "${row.net_cost}" - will be treated as 0`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      parsedStart,
      parsedEnd,
      row
    };
  };

  // ============================================================
  // DETECT DATE FORMAT
  // ============================================================
  const detectDateFormat = (rows) => {
    const dateFields = ['Start_Date', 'End_Date', 'Valid From', 'Valid To', 'Joined Date', 'Date of Birth', 'DOB'];
    let formats = [];
    
    for (const row of rows) {
      for (const field of dateFields) {
        const val = row[field];
        if (!isEmpty(val)) {
          if (typeof val === 'number' && val > 0 && val > 25569 && val < 50000) {
            formats.push('Excel Serial Number');
          } else if (typeof val === 'string') {
            if (val.match(/^\d{4}-\d{2}-\d{2}/)) {
              formats.push('YYYY-MM-DD');
            } else if (val.match(/^\d{1,2}[-/]\w{3,9}[-/]\d{2,4}$/i)) {
              formats.push('DD-MMM-YYYY');
            } else if (val.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/)) {
              formats.push('DD/MM/YYYY');
            } else if (val.match(/^\w{3,9}\s+\d{1,2},?\s+\d{2,4}$/i)) {
              formats.push('Month DD, YYYY');
            }
          }
          break;
        }
      }
    }
    
    const uniqueFormats = [...new Set(formats)];
    return uniqueFormats.length > 0 ? uniqueFormats.join(' / ') : 'Auto-detected';
  };

  // ============================================================
  // EXTRACT DURATION FROM PLAN NAME
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

    // Check for specific numbers in plan name (e.g., "3 Months", "1 Year")
    const numberMatch = safeName.match(/(\d+)\s*(month|year|day)/i);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      const unit = numberMatch[2].toLowerCase();
      if (unit === 'year') return { durationDays: num * 365, planType: 'yearly' };
      if (unit === 'month') return { durationDays: num * 30, planType: num >= 12 ? 'yearly' : 'monthly' };
      if (unit === 'day') return { durationDays: num, planType: 'monthly' };
    }
    
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
  // PARSE FILE
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
  // HANDLE FILE UPLOAD
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
    setFileType(extension);
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
        
        // 🆕 Detect if this is a Sanatoriyam format file
        const isSanatoriyamFormat = headers.some(h => 
          /member_name|member_contact|package_name|start_date|end_date|package_fees|final_paid/i.test(h)
        );
        
        if (isSanatoriyamFormat) {
          console.log('📋 Detected Sanatoriyam format - applying special handling');
        }
        
        const { mapping, confidence, detected } = autoMapColumns(headers);
        
        const requiredFields = ['full_name', 'phone', 'plan_name'];
        const missingRequired = requiredFields.filter(f => !mapping[f]);
        const foundCount = Object.keys(mapping).length;

        const lowConfidence = Object.values(confidence).filter(c => c < 50);
        const hasLowConfidence = lowConfidence.length > 0;

        setRawData(data);
        setHeaders(headers);
        setFieldMapping(mapping);
        setMappingConfidence(confidence);
        setAutoDetectedFields(detected);
        
        setFileStats({
          rows: data.length,
          columns: headers.length,
          sampleRows: data.slice(0, 5),
        });

        if (missingRequired.length > 0 || hasLowConfidence) {
          setStep(2);
          toast.info(
            `⚠️ Some fields need your attention. Please verify the column mapping.`,
            { duration: 4000 }
          );
          return;
        }

        processMappedData(data, mapping);
        
      })
      .catch((error) => {
        toast.dismiss('file-reading');
        console.error('Error parsing file:', error);
        toast.error(error.message || 'Failed to parse file. Please check the format.');
      });
  };

  // ============================================================
  // PROCESS MAPPED DATA
  // ============================================================
  const processMappedData = (data, mapping) => {
    const mappedData = data.map(row => mapRow(row, mapping));
    
    const validData = mappedData.filter(m => m.full_name && m.phone);
    
    if (validData.length === 0) {
      toast.error('No valid rows found. Please ensure "Full Name" and "Phone" columns are correctly mapped.');
      return;
    }

    const validatedData = [];
    const invalidData = [];
    
    for (const row of validData) {
      const validation = validateRow(row, mapping);
      if (validation.isValid) {
        validatedData.push({
          ...row,
          _parsedStart: validation.parsedStart,
          _parsedEnd: validation.parsedEnd,
          _validationErrors: [],
          _warnings: validation.warnings || [],
        });
      } else {
        invalidData.push({
          ...row,
          _validationErrors: validation.errors,
          _isValid: false,
          _warnings: validation.warnings || [],
        });
      }
    }

    setInvalidRows(invalidData);
    setInvalidCount(invalidData.length);

    const filteredData = [];
    const skippedData = [];
    
    for (const row of validatedData) {
      const hasPlan = row.plan_name && row.plan_name.trim() !== '';
      const hasValidStart = row._parsedStart !== null;
      const hasValidEnd = row._parsedEnd !== null;
      
      if (hasPlan && (hasValidStart || hasValidEnd)) {
        filteredData.push(row);
      } else {
        skippedData.push({
          ...row,
          _skipReason: !hasPlan ? 'Missing Plan Name' : 'Missing Valid From/To dates',
        });
      }
    }

    setSkippedRows(skippedData);
    setSkippedCount(skippedData.length);

    const dateFormat = detectDateFormat(data);
    setDateFormatDetected(dateFormat);

    const costFormat = detectCostFormat(data);
    setCostFormatDetected(costFormat === 'paisa' ? 'Paisa (₹)' : 'Rupee (₹)');

    const parsedData = filteredData.map(m => ({
      ...m,
      joined_date: m._parsedStart || parseDate(m.joined_date) || new Date().toISOString().split('T')[0],
      membership_end: m._parsedEnd || parseDate(m.membership_end),
      date_of_birth: parseDate(m.date_of_birth),
      base_cost: parseCost(m.base_cost),
      net_cost: parseCost(m.net_cost),
      discount: parseCost(m.discount),
    }));

    const membersWithCost = parsedData.filter(m => m.base_cost !== null && m.base_cost > 0);
    const totalCost = membersWithCost.reduce((sum, m) => sum + (m.base_cost || 0), 0);

    console.log(`📊 Import Stats:`);
    console.log(`  - Total rows: ${data.length}`);
    console.log(`  - Invalid rows: ${invalidData.length}`);
    console.log(`  - Valid rows: ${validatedData.length}`);
    console.log(`  - Skipped rows (no plan/dates): ${skippedData.length}`);
    console.log(`  - Final rows: ${parsedData.length}`);
    console.log(`  - Rows with cost: ${membersWithCost.length}`);
    console.log(`  - Total cost: ₹${totalCost}`);

    setPreviewData(parsedData);
    setFile(data);
    setStep(3);
    setResults(null);
    
    let message = `✅ Loaded ${parsedData.length} valid members`;
    if (invalidData.length > 0) {
      message += `, ⚠️ ${invalidData.length} invalid rows skipped (check errors)`;
    }
    if (skippedData.length > 0) {
      message += `, ⏭️ ${skippedData.length} rows skipped (missing plan/dates)`;
    }
    if (costFormat === 'paisa') {
      message += ' (Cost converted from paisa to rupee)';
    }
    toast.success(message, { duration: 5000 });
  };

  // ============================================================
  // HANDLE MANUAL MAPPING
  // ============================================================
  const handleMappingChange = (fieldKey, columnKey) => {
    setFieldMapping(prev => ({
      ...prev,
      [fieldKey]: columnKey === 'skip' ? null : columnKey,
    }));
  };

  const handleApplyMapping = () => {
    const requiredFields = ['full_name', 'phone', 'plan_name'];
    const missingRequired = requiredFields.filter(f => !fieldMapping[f]);
    
    if (missingRequired.length > 0) {
      toast.error(`Please map these required fields: ${missingRequired.join(', ')}`);
      return;
    }

    processMappedData(rawData, fieldMapping);
  };

  const exportSkippedRows = () => {
    if (skippedRows.length === 0 && invalidRows.length === 0) {
      toast.info('No skipped rows to export');
      return;
    }

    const allSkipped = [
      ...skippedRows.map(r => ({ ...r, _reason: r._skipReason || 'Missing Plan or Dates' })),
      ...invalidRows.map(r => ({ ...r, _reason: r._validationErrors.join(', ') })),
    ];

    const csvRows = [
      ['Row', 'Full Name', 'Phone', 'Plan', 'Reason', 'Data'],
    ];

    allSkipped.forEach((row, idx) => {
      csvRows.push([
        idx + 1,
        row.full_name || '',
        row.phone || '',
        row.plan_name || '',
        row._reason || 'Unknown',
        JSON.stringify(row._raw || {}).slice(0, 100),
      ]);
    });

    const csv = csvRows.map(row => row.join(',')).join('\n');
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
  // HANDLE IMPORT (same as before, kept for brevity)
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
          existingPlanMap[safeLowerCase(p.name)] = p.id;
        }
      });

      const uniquePlans = [...new Set(previewData.map(m => safeString(m.plan_name)).filter(Boolean))];
      const plansToCreate = uniquePlans.filter(name => {
        if (!name) return false;
        const cleanName = safeLowerCase(name);
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
              existingPlanMap[safeLowerCase(newPlan.name)] = newPlan.id;
            }
            createdPlans.push(planName);
            
          } catch (error) {
            console.error(`❌ Failed to create plan ${planName}:`, error);
            results.errors.push({
              member: 'SYSTEM',
              error: `Failed to create plan: ${planName} - ${error.response?.data?.detail || error.message}`
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
          planIdMap[safeLowerCase(p.name)] = p.id;
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

        const validation = validateRow(member, fieldMapping);
        if (!validation.isValid) {
          results.skipped++;
          results.errors.push({
            member: member.full_name || 'Unknown',
            error: `Invalid data: ${validation.errors.join(', ')}`
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

        let importSuccess = false;

        try {
          const shouldBeActive = member.status !== false && member.status !== 'inactive';
          
          const memberData = {
            full_name: safeString(member.full_name),
            phone: phone,
            gender: safeString(member.gender) || 'male',
            is_active: shouldBeActive,
            joined_date: member.joined_date || new Date().toISOString().split('T')[0],
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
          
          importSuccess = true;
          successfullyImportedPhones.add(phone);

          let planId = null;
          let planName = safeString(member.plan_name);
          
          if (planName) {
            const cleanPlanName = safeLowerCase(planName);
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

          if (shouldBeActive && planId) {
            try {
              let startDate = member.joined_date || new Date().toISOString().split('T')[0];
              
              let endDate = member.membership_end;
              
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
              results.errors.push({
                member: member.full_name,
                error: `Membership failed: ${membershipError.response?.data?.detail || membershipError.message}`
              });
            }
          }

          results.success++;

        } catch (error) {
          console.error('Error importing member:', error);
          
          const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
          
          const isDuplicateError = safeLowerCase(errorMsg).includes('already exists') || 
                                   safeLowerCase(errorMsg).includes('duplicate') || 
                                   safeLowerCase(errorMsg).includes('phone');
          
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
              error: errorMsg
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
      if (skippedCount > 0) summaryMessage += ` ⏭️ ${skippedCount} rows skipped (no plan/dates).`;
      if (results.skipped > 0) summaryMessage += ` ⏭️ ${results.skipped} duplicates skipped.`;
      if (createdPlans.length > 0) summaryMessage += ` 📋 ${createdPlans.length} plans created.`;
      if (results.failed > 0) summaryMessage += ` ❌ ${results.failed} failed.`;
      
      toast.success(summaryMessage, { duration: 6000 });
      
    } catch (error) {
      if (error.name === 'AbortError' || isCancelledRef.current) {
        toast.info('Import cancelled.');
      } else {
        console.error('Import error:', error);
        toast.error('Failed to import members: ' + (error.response?.data?.detail || error.message));
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
    setFileType('');
    setRawData([]);
    setHeaders([]);
    setPreviewData([]);
    setResults(null);
    setPlansCreated([]);
    setStep(1);
    setImportProgress({ current: 0, total: 0 });
    setUploading(false);
    setDateFormatDetected('');
    setCostFormatDetected('');
    setSkippedRows([]);
    setSkippedCount(0);
    setInvalidRows([]);
    setInvalidCount(0);
    setFieldMapping({});
    setMappingConfidence({});
    setAutoDetectedFields([]);
    setFileStats({ rows: 0, columns: 0, sampleRows: [] });
    if (onImportComplete) onImportComplete();
    onClose();
  };

  // ============================================================
  // RENDER FUNCTIONS (same as previous version)
  // ============================================================
  const renderStep1 = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileSpreadsheet className="h-10 w-10 text-blue-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Your File</h3>
      <p className="text-sm text-gray-500 mb-6">
        Upload Excel (.xlsx, .xls) or CSV (.csv) file with member data.
        <br />
        <strong className="text-gray-700">Required:</strong> Full Name, Phone, Plan Name
        <br />
        <span className="text-gray-400">Optional: Email, Base Cost, Net Cost, Status, Gender, Address, DOB, etc.</span>
        <br />
        <span className="text-xs text-blue-500">The system will auto-detect column names and data formats</span>
        <br />
        <span className="text-xs text-green-500">✓ Supports Sanatoriyam format (Member_Name, Member_Contact, Package_Name, etc.)</span>
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

      <div className="mt-4 text-left bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <span className="text-green-600">✓</span> Smart Features:
        </p>
        <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc list-inside">
          <li><strong>Auto-detects</strong> column names using fuzzy matching</li>
          <li>Supports <strong>Sanatoriyam format</strong> (Member_Name, Member_Contact, Package_Name, etc.)</li>
          <li>Supports <strong>First Name + Last Name</strong> combined automatically</li>
          <li><strong>Auto-filters:</strong> Skips rows without Plan Name OR Valid From/To dates</li>
          <li><strong>Auto-validation:</strong> Skips rows with invalid data (phone, email, costs)</li>
          <li>Auto-detects cost format (Paisa or Rupee)</li>
          <li>Auto-detects <strong>10+ date formats</strong> (DD/MM/YYYY, DD-MMM-YY, Month DD, YYYY, etc.)</li>
          <li>Supports both <strong>Base Cost</strong> (original) and <strong>Net Cost</strong> (discounted)</li>
          <li>Auto-creates membership plans if they don't exist</li>
          <li>Skips duplicate phone numbers automatically</li>
          <li><strong>Manual mapping fallback</strong> if auto-detection fails</li>
        </ul>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Column Mapping
          </h3>
          <p className="text-sm text-gray-500">
            Map your file columns to the required fields. <strong>Required</strong> fields are marked with *
          </p>
        </div>
        <button
          onClick={() => setShowMappingHelp(!showMappingHelp)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showMappingHelp ? 'Hide Help' : 'Show Help'}
        </button>
      </div>

      {showMappingHelp && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700 font-medium mb-2">📋 Mapping Tips:</p>
          <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
            <li>If you have separate <strong>First Name</strong> and <strong>Last Name</strong> columns, map <strong>Full Name</strong> to combine them automatically</li>
            <li>For <strong>Phone</strong>, the system will auto-clean formatting</li>
            <li><strong>Plan Name</strong> will auto-create new plans if they don't exist</li>
            <li>Leave a field as <strong>"Skip"</strong> if the column doesn't exist in your file</li>
            <li>The system will auto-detect date formats from your data</li>
            <li><strong>Sanatoriyam format:</strong> Member_Name → Full Name, Member_Contact → Phone, Package_Name → Plan Name</li>
          </ul>
        </div>
      )}

      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border">Field</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border">Map to Column</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {MAPPING_FIELDS.map((field) => {
              const isRequired = field.required;
              const currentValue = fieldMapping[field.key] || '';
              const confidence = mappingConfidence[field.key] || 0;
              const isAutoDetected = autoDetectedFields.includes(field.key);
              
              return (
                <tr key={field.key} className={isRequired ? 'bg-blue-50/30' : ''}>
                  <td className="px-4 py-2 text-sm text-gray-700 border">
                    {field.label}
                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                    {isAutoDetected && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        Auto
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 border">
                    <select
                      value={currentValue}
                      onChange={(e) => handleMappingChange(field.key, e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">-- Skip --</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                          {currentValue === header && ' ✓'}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 border">
                    {confidence > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              confidence >= 70 ? 'bg-green-500' : 
                              confidence >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{confidence}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Manual</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
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

      <div className="mt-4 text-xs text-gray-400">
        {rawData.length} rows loaded • {headers.length} columns detected
      </div>
    </div>
  );

  const renderStep3 = () => {
    const phoneCounts = {};
    previewData.forEach(m => {
      const phone = safeString(m.phone);
      phoneCounts[phone] = (phoneCounts[phone] || 0) + 1;
    });
    const duplicates = Object.entries(phoneCounts).filter(([phone, count]) => count > 1);
    const membersWithCost = previewData.filter(m => m.base_cost !== null && m.base_cost > 0);
    const totalCost = membersWithCost.reduce((sum, m) => sum + (m.base_cost || 0), 0);

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">📋 Preview Import Data</h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm text-gray-500">{previewData.length} valid members found</span>
              {invalidCount > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  ⚠️ {invalidCount} invalid rows skipped
                </span>
              )}
              {skippedCount > 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  ⏭️ {skippedCount} rows skipped (no plan/dates)
                </span>
              )}
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {fileName}
              </span>
              {dateFormatDetected && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  📅 {dateFormatDetected}
                </span>
              )}
              {costFormatDetected && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  costFormatDetected === 'Paisa (₹)' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  💰 Cost: {costFormatDetected}
                </span>
              )}
              {membersWithCost.length > 0 && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  Total Cost: ₹{totalCost.toLocaleString('en-IN')} ({membersWithCost.length} members)
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {(invalidCount > 0 || skippedCount > 0) && (
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
            <button
              onClick={() => setStep(1)}
              className="text-sm text-gray-500 hover:text-gray-700"
              disabled={uploading}
            >
              Upload different file
            </button>
          </div>
        </div>

        {invalidCount > 0 && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700 flex items-start gap-2">
              <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>⚠️ {invalidCount} invalid rows were skipped</strong> due to:
                <ul className="list-disc list-inside mt-1 text-xs text-red-600">
                  <li>Missing or invalid phone numbers (must be 7-15 digits)</li>
                  <li>Invalid email format (if provided)</li>
                  <li>Invalid cost values</li>
                  <li>Missing required fields (Name, Phone, Plan)</li>
                </ul>
              </span>
            </p>
          </div>
        )}

        {skippedCount > 0 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>ℹ️ {skippedCount} rows were skipped</strong> because they don't have a 
                Plan Name OR Valid From/Valid To dates. Only rows with complete information 
                will be imported.
              </span>
            </p>
          </div>
        )}

        {duplicates.length > 0 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>⚠️ Duplicate Phone Numbers Found:</strong> 
                {duplicates.map(([phone, count]) => (
                  <span key={phone} className="ml-2 inline-block">
                    {phone} ({count} times)
                  </span>
                ))}
                <br />
                <span className="text-xs text-yellow-600">
                  Only the first occurrence will be imported. Other duplicates will be skipped.
                </span>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start (Valid From)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End (Valid To)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {previewData.slice(0, UPLOAD_CONFIG.PREVIEW_ROWS).map((member, index) => {
                const phone = safeString(member.phone);
                const isDuplicate = previewData.filter(m => safeString(m.phone) === phone).length > 1;
                const isFirstOccurrence = previewData.findIndex(m => safeString(m.phone) === phone) === index;
                const hasWarnings = member._warnings && member._warnings.length > 0;
                
                return (
                  <tr key={index} className={`${isDuplicate && !isFirstOccurrence ? 'bg-yellow-50' : ''} ${hasWarnings ? 'border-l-4 border-l-yellow-400' : ''}`}>
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
                    <td className="px-4 py-3 text-sm text-gray-500">{member.joined_date || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{member.membership_end || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {member.base_cost !== null && member.base_cost > 0 ? (
                        <span className="text-green-600 font-medium">
                          ₹{member.base_cost.toLocaleString('en-IN')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${member.status !== false && member.status !== 'inactive' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {member.status !== false && member.status !== 'inactive' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {previewData.length > UPLOAD_CONFIG.PREVIEW_ROWS && (
            <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 text-center">
              Showing first {UPLOAD_CONFIG.PREVIEW_ROWS} of {previewData.length} valid members
            </div>
          )}
        </div>

        <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
          <p className="text-sm text-blue-700 space-y-1">
            <div><strong>ℹ️ What will happen:</strong></div>
            <div>• Only rows with <strong>Plan Name</strong> AND <strong>Valid From/To</strong> dates will be imported</div>
            <div>• Invalid rows (bad phone, email, etc.) will be automatically skipped</div>
            <div>• Plans will be auto-created if they don't exist</div>
            <div>• Duplicate phone numbers in the file will be skipped (only first imported)</div>
            <div>• Existing members in the database will be skipped</div>
            <div>• <strong>Net Cost (if available) will be used as membership amount</strong></div>
          </p>
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

  const renderStep4 = () => (
    <div>
      <div className="text-center mb-6">
        {results.failed === 0 && results.skipped === 0 && skippedCount === 0 && invalidCount === 0 ? (
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
            <p className="text-sm text-gray-500">Duplicates Skipped</p>
            <p className="text-2xl font-bold text-yellow-600">{results.skipped || 0}</p>
          </div>
          {invalidCount > 0 && (
            <div>
              <p className="text-sm text-gray-500">Invalid Rows</p>
              <p className="text-2xl font-bold text-red-400">{invalidCount}</p>
            </div>
          )}
          {skippedCount > 0 && (
            <div>
              <p className="text-sm text-gray-500">No Plan/Dates</p>
              <p className="text-2xl font-bold text-orange-600">{skippedCount}</p>
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
  // MAIN RENDER
  // ============================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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