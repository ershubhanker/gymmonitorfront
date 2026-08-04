// src/components/BulkImportModal.jsx - COMPLETE FIXED VERSION
// Features: Robust error handling, skips invalid members, handles all data types

import React, { useState, useRef, useMemo } from 'react';
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import api from '../services/api';
import Papa from 'papaparse';

const BulkImportModal = ({ isOpen, onClose, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [step, setStep] = useState(1);
  const [plansCreated, setPlansCreated] = useState([]);
  const [dateFormatDetected, setDateFormatDetected] = useState('');
  const [hasExcelDateSerial, setHasExcelDateSerial] = useState(false);
  const [costFormatDetected, setCostFormatDetected] = useState('');
  const [skippedRows, setSkippedRows] = useState([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [invalidRows, setInvalidRows] = useState([]);
  const [invalidCount, setInvalidCount] = useState(0);
  
  const isCancelledRef = useRef(false);
  const abortControllerRef = useRef(null);

  if (!isOpen) return null;

  // ============================================================
  // 🛡️ SAFE STRING HELPERS - Handle all data types safely
  // ============================================================
  const safeString = (value) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') {
      // Check if it's a date serial number (Excel dates are numbers > 25569)
      if (value > 25569 && value < 50000) {
        // This might be an Excel date serial, keep as number for date parsing
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

  // ============================================================
  // 🧠 SMART COST PARSER - Detects paisa vs rupee
  // ============================================================
  const parseCost = (value) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      // If value > 10000, it's likely in paisa
      if (value > 10000) {
        return value / 100;
      }
      return value;
    }

    if (typeof value === 'string') {
      let cleaned = value.trim();
      // Remove currency symbols and commas
      cleaned = cleaned.replace(/[₹$,]/g, '').trim();
      
      // Check if it's empty after cleaning
      if (!cleaned) return null;
      
      const hasDecimal = cleaned.includes('.');
      const numValue = parseFloat(cleaned);
      if (isNaN(numValue) || numValue <= 0) {
        return null;
      }

      // If no decimal and value > 10000, it's likely paisa
      if (!hasDecimal && numValue > 10000) {
        return numValue / 100;
      }

      // If has decimal, it's already in rupees
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
    const costFields = ['Base Cost', 'Base_Cost', 'base_cost', 'Net Cost', 'Net_Cost', 'net_cost', 'Amount', 'amount', 'Cost', 'cost', 'Price', 'price'];
    let paisaCount = 0;
    let rupeeCount = 0;

    for (const row of rows) {
      for (const field of costFields) {
        const val = row[field];
        if (val !== undefined && val !== null && val !== '') {
          const numVal = typeof val === 'number' ? val : parseFloat(safeString(val).replace(/[₹$,]/g, ''));
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
    if (!dateStr) return null;
    
    if (dateStr instanceof Date) {
      return dateStr.toISOString().split('T')[0];
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
    
    // Excel date serial number (number)
    if (typeof dateStr === 'number' && dateStr > 0) {
      // Excel serial number starts from 1 for 1900-01-01
      // Excel's 1900 system has a bug where it thinks 1900 is a leap year
      // But for dates after 1900-03-01, it works correctly
      if (dateStr > 25569 && dateStr < 50000) {
        const excelDate = new Date((dateStr - 25569) * 86400 * 1000);
        if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() > 1900 && excelDate.getFullYear() < 2100) {
          setHasExcelDateSerial(true);
          return excelDate.toISOString().split('T')[0];
        }
      }
    }

    // String that looks like a number (Excel serial as string)
    if (typeof dateStr === 'string' && !isNaN(dateStr) && Number(dateStr) > 0) {
      const numVal = Number(dateStr);
      if (numVal > 25569 && numVal < 50000) {
        const excelDate = new Date((numVal - 25569) * 86400 * 1000);
        if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() > 1900 && excelDate.getFullYear() < 2100) {
          setHasExcelDateSerial(true);
          return excelDate.toISOString().split('T')[0];
        }
      }
    }

    // Try various date string patterns
    if (typeof dateStr === 'string') {
      let cleaned = dateStr.replace(/\s+/g, ' ').trim();
      
      const patterns = [
        { regex: /^(\d{1,2})[-/](\w{3,9})[-/](\d{2,4})$/i, groups: ['day', 'monthName', 'year'] },
        { regex: /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/, groups: ['day', 'month', 'year'] },
        { regex: /^(\d{2,4})[-/](\w{3,9})[-/](\d{2,4})$/i, groups: ['year', 'monthName', 'day'] },
        { regex: /^(\w{3,9})\s+(\d{1,2}),?\s*(\d{2,4})$/i, groups: ['monthName', 'day', 'year'] },
        { regex: /^(\d{1,2})\s+(\w{3,9})\s+(\d{2,4})$/i, groups: ['day', 'monthName', 'year'] },
        { regex: /^(\d{2,4})\s+(\w{3,9})\s+(\d{1,2})$/i, groups: ['year', 'monthName', 'day'] },
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
              const dateObj = new Date(year, month - 1, day);
              if (!isNaN(dateObj.getTime())) {
                return dateObj.toISOString().split('T')[0];
              }
            }
          } catch (e) {
            // Continue to next pattern
          }
        }
      }
    }

    return null;
  };

  // ============================================================
  // VALIDATE EMAIL
  // ============================================================
  const isValidEmail = (email) => {
    if (!email) return false;
    const str = safeString(email);
    if (!str) return false;
    // Basic email validation - checks for @ and dot
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(str);
  };

  // ============================================================
  // VALIDATE PHONE NUMBER
  // ============================================================
  const isValidPhone = (phone) => {
    if (!phone) return false;
    const str = safeString(phone);
    if (!str) return false;
    // Accept various phone formats: numbers, +, spaces, hyphens
    // Minimum 7 digits, maximum 15 digits (international)
    const cleaned = str.replace(/[\s\-()+]/g, '');
    return cleaned.length >= 7 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
  };

  // ============================================================
  // SMART COLUMN MAPPING
  // ============================================================
  const mapColumns = (row) => {
    const keys = Object.keys(row);
    
    const findKey = (patterns) => {
      for (const pattern of patterns) {
        const found = keys.find(k => {
          if (!k || typeof k !== 'string') return false;
          return safeLowerCase(k) === safeLowerCase(pattern);
        });
        if (found) return found;
      }
      for (const pattern of patterns) {
        const found = keys.find(k => {
          if (!k || typeof k !== 'string') return false;
          return safeLowerCase(k).includes(safeLowerCase(pattern));
        });
        if (found) return found;
      }
      return null;
    };

    const nameKey = findKey(['Full Name', 'Full_Name', 'Name', 'full_name', 'Member Name', 'member_name']);
    const phoneKey = findKey(['Phone', 'Mobile', 'Contact', 'phone', 'mobile', 'contact_no', 'Contact No', 'contact number']);
    const emailKey = findKey(['Email', 'email', 'e-mail', 'E-mail']);
    const planKey = findKey(['Plan Name', 'Plan_Name', 'Plan', 'plan_name', 'plan', 'Membership Type', 'membership_type', 'membership']);
    const statusKey = findKey(['Status', 'status', 'Active', 'is_active']);
    const genderKey = findKey(['Gender', 'gender', 'Sex', 'sex']);
    const addressKey = findKey(['Address', 'address', 'addr', 'Addr']);
    const dobKey = findKey(['Date of Birth', 'DOB', 'dob', 'date_of_birth', 'Birth Date', 'birth_date']);
    
    const startDateKey = findKey([
      'Valid From', 'Valid_From', 'valid_from', 
      'Start Date', 'Start_Date', 'start_date', 
      'Start', 'Joined Date', 'joined_date', 
      'Join Date', 'Membership Start', 'membership_start'
    ]);
    
    const endDateKey = findKey([
      'Valid To', 'Valid_To', 'valid_to',
      'End Date', 'End_Date', 'end_date', 
      'End', 'Expiry Date', 'expiry_date',
      'Membership End', 'membership_end', 'Valid Till', 'valid_till'
    ]);
    
    const baseCostKey = findKey([
      'Base Cost', 'Base_Cost', 'base_cost',
      'Base Price', 'base_price', 'Base_Price',
      'Original Cost', 'original_cost',
    ]);

    const netCostKey = findKey([
      'Net Cost', 'Net_Cost', 'net_cost',
      'Net Price', 'net_price', 'Net_Price',
      'Discounted Cost', 'discounted_cost',
      'Amount', 'amount', 'Cost', 'cost', 'Price', 'price'
    ]);

    const emergencyNameKey = findKey(['Emergency Contact', 'emergency_contact', 'Emergency Name', 'emergency_name']);
    const emergencyPhoneKey = findKey(['Emergency Phone', 'emergency_phone', 'Emergency Contact No']);
    const medicalKey = findKey(['Medical Conditions', 'medical_conditions', 'Medical', 'medical']);
    const allergiesKey = findKey(['Allergies', 'allergies', 'Allergy']);
    const medicationsKey = findKey(['Medications', 'medications', 'Medication']);

    let baseCost = null;
    let netCost = null;

    if (baseCostKey) {
      const rawValue = row[baseCostKey];
      if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
        baseCost = parseCost(rawValue);
      }
    }

    if (netCostKey) {
      const rawValue = row[netCostKey];
      if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
        netCost = parseCost(rawValue);
      }
    }

    if (baseCost === null && netCost !== null) {
      baseCost = netCost;
    }

    // Get email and validate
    let email = '';
    if (emailKey) {
      const rawEmail = row[emailKey];
      if (rawEmail !== undefined && rawEmail !== null && rawEmail !== '') {
        email = safeString(rawEmail);
        // Only keep if it's a valid email
        if (!isValidEmail(email)) {
          email = '';
        }
      }
    }

    // Get phone and validate
    let phone = '';
    if (phoneKey) {
      const rawPhone = row[phoneKey];
      if (rawPhone !== undefined && rawPhone !== null && rawPhone !== '') {
        phone = safeString(rawPhone);
        // Clean phone number for storage
        phone = phone.replace(/[\s\-()]/g, '');
      }
    }

    return {
      full_name: nameKey ? safeString(row[nameKey]) : '',
      phone: phone,
      email: email,
      plan_name: planKey ? safeString(row[planKey]) : '',
      status: statusKey ? row[statusKey] : 'active',
      gender: genderKey ? safeString(row[genderKey]) : 'male',
      address: addressKey ? safeString(row[addressKey]) : '',
      date_of_birth: dobKey ? row[dobKey] : '',
      joined_date: startDateKey ? row[startDateKey] : '',
      membership_end: endDateKey ? row[endDateKey] : '',
      base_cost: baseCost,
      net_cost: netCost,
      emergency_contact_name: emergencyNameKey ? safeString(row[emergencyNameKey]) : '',
      emergency_contact_phone: emergencyPhoneKey ? safeString(row[emergencyPhoneKey]) : '',
      medical_conditions: medicalKey ? safeString(row[medicalKey]) : '',
      allergies: allergiesKey ? safeString(row[allergiesKey]) : '',
      medications: medicationsKey ? safeString(row[medicationsKey]) : '',
      _raw: row,
      _mapped: true,
      _isValid: true,
      _validationErrors: []
    };
  };

  // ============================================================
  // VALIDATE A SINGLE ROW
  // ============================================================
  const validateRow = (row) => {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!row.full_name || row.full_name.trim() === '') {
      errors.push('Missing Full Name');
    }

    if (!row.phone || row.phone.trim() === '') {
      errors.push('Missing Phone Number');
    } else if (!isValidPhone(row.phone)) {
      errors.push('Invalid Phone Number (must be 7-15 digits)');
    }

    if (!row.plan_name || row.plan_name.trim() === '') {
      errors.push('Missing Plan Name');
    }

    // Check if email is valid (if provided)
    if (row.email && row.email.trim() !== '' && !isValidEmail(row.email)) {
      errors.push('Invalid Email Format');
    }

    // Check dates
    const parsedStart = parseDate(row.joined_date);
    const parsedEnd = parseDate(row.membership_end);

    if (!parsedStart && !parsedEnd) {
      errors.push('Missing Valid From OR Valid To date');
    }

    // Check cost (warn if invalid)
    if (row.base_cost !== null && (isNaN(row.base_cost) || row.base_cost <= 0)) {
      errors.push('Invalid Cost Value');
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
    const dateFields = ['Valid From', 'Valid To', 'Start Date', 'End Date', 'Joined Date', 'Date of Birth', 'DOB'];
    let formats = [];
    
    for (const row of rows) {
      for (const field of dateFields) {
        const val = row[field];
        if (val !== undefined && val !== null && val !== '') {
          if (typeof val === 'number' && val > 0 && val > 25569 && val < 50000) {
            formats.push('Excel Serial Number');
          } else if (typeof val === 'string') {
            if (val.match(/^\d{1,2}[-/]\w{3,9}[-/]\d{2,4}$/i)) {
              formats.push('DD-MMM-YYYY');
            } else if (val.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/)) {
              formats.push('DD/MM/YYYY');
            } else if (val.match(/^\w{3,9}\s+\d{1,2},?\s+\d{2,4}$/i)) {
              formats.push('Month DD, YYYY');
            } else if (val.match(/^\d{2,4}[-/]\d{1,2}[-/]\d{1,2}$/)) {
              formats.push('YYYY-MM-DD');
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
    if (!planName) return { durationDays: 30, planType: 'monthly' };
    
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
    
    // Common plan patterns
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
                  // This might be an Excel date serial
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

    setFileName(selectedFile.name);
    setFileType(selectedFile.name.split('.').pop().toLowerCase());
    isCancelledRef.current = false;
    setHasExcelDateSerial(false);
    setCostFormatDetected('');
    setSkippedRows([]);
    setSkippedCount(0);
    setInvalidRows([]);
    setInvalidCount(0);

    toast.loading('Reading file...', { id: 'file-reading' });

    parseFile(selectedFile)
      .then(({ data }) => {
        toast.dismiss('file-reading');
        
        if (data.length === 0) {
          toast.error('No data found in the file.');
          return;
        }

        // Map columns smartly
        const mappedData = data.map(row => mapColumns(row));
        
        // Filter out rows without name or phone
        const validData = mappedData.filter(m => m.full_name && m.phone);
        
        if (validData.length === 0) {
          toast.error('No valid rows found. Please ensure "Full Name" and "Phone" columns exist.');
          return;
        }

        // ============================================================
        // 🔥 VALIDATE EACH ROW
        // ============================================================
        const validatedData = [];
        const invalidData = [];
        
        for (const row of validData) {
          const validation = validateRow(row);
          if (validation.isValid) {
            validatedData.push({
              ...row,
              _parsedStart: validation.parsedStart,
              _parsedEnd: validation.parsedEnd,
              _validationErrors: []
            });
          } else {
            invalidData.push({
              ...row,
              _validationErrors: validation.errors,
              _isValid: false
            });
          }
        }

        setInvalidRows(invalidData);
        setInvalidCount(invalidData.length);

        // ============================================================
        // 🔥 SMART FILTERING: Skip rows without plan OR valid dates
        // ============================================================
        const filteredData = [];
        const skippedData = [];
        
        for (const row of validatedData) {
          // Check if row has plan AND (start date OR end date)
          const hasPlan = row.plan_name && row.plan_name.trim() !== '';
          const hasValidStart = row._parsedStart !== null;
          const hasValidEnd = row._parsedEnd !== null;
          
          if (hasPlan && (hasValidStart || hasValidEnd)) {
            filteredData.push(row);
          } else {
            skippedData.push(row);
          }
        }

        setSkippedRows(skippedData);
        setSkippedCount(skippedData.length);

        // Detect date format
        const dateFormat = detectDateFormat(data);
        setDateFormatDetected(dateFormat);

        // Detect cost format
        const costFormat = detectCostFormat(data);
        setCostFormatDetected(costFormat === 'paisa' ? 'Paisa (₹)' : 'Rupee (₹)');

        // Parse dates and costs
        const parsedData = filteredData.map(m => ({
          ...m,
          joined_date: m._parsedStart || parseDate(m.joined_date),
          membership_end: m._parsedEnd || parseDate(m.membership_end),
          date_of_birth: parseDate(m.date_of_birth),
        }));

        // Show preview with cost info
        const membersWithCost = parsedData.filter(m => m.base_cost !== null);
        const totalCost = membersWithCost.reduce((sum, m) => sum + (m.base_cost || 0), 0);

        console.log(`📊 Import Stats:`);
        console.log(`  - Total rows: ${validData.length}`);
        console.log(`  - Invalid rows: ${invalidData.length}`);
        console.log(`  - Valid rows: ${validatedData.length}`);
        console.log(`  - Skipped rows (no plan/dates): ${skippedData.length}`);
        console.log(`  - Final rows: ${filteredData.length}`);
        console.log(`  - Rows with cost: ${membersWithCost.length}`);
        console.log(`  - Total cost: ₹${totalCost}`);

        setPreviewData(parsedData);
        setFile(selectedFile);
        setStep(2);
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
      })
      .catch((error) => {
        toast.dismiss('file-reading');
        console.error('Error parsing file:', error);
        toast.error(error.message || 'Failed to parse file. Please check the format.');
      });
  };

  // ============================================================
  // HANDLE IMPORT
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

        // Validate member before import
        const validation = validateRow(member);
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

          // ✅ Only add email if valid
          if (member.email && member.email.trim() !== '' && isValidEmail(member.email)) {
            memberData.email = safeString(member.email);
          }

          // ✅ Only add address if not empty
          if (member.address && member.address.trim() !== '') {
            memberData.address = safeString(member.address);
          }

          // ✅ Only add DOB if valid
          if (member.date_of_birth) {
            const dob = parseDate(member.date_of_birth);
            if (dob) memberData.date_of_birth = dob;
          }

          // ✅ Add optional fields if they exist
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

          // Create the member
          const memberResponse = await api.post('/gym/members', memberData);
          const newMember = memberResponse.data;
          
          importSuccess = true;
          successfullyImportedPhones.add(phone);

          // Find plan ID
          let planId = null;
          let planName = safeString(member.plan_name);
          
          if (planName) {
            const cleanPlanName = safeLowerCase(planName);
            planId = planIdMap[cleanPlanName];
            
            if (!planId) {
              // Try partial match
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

          // Create membership if member is active and has a plan
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
                  discount_applied: 0,
                };
                
                await api.post('/gym/memberships', membershipPayload);
              }
              
            } catch (membershipError) {
              console.error('Membership creation error:', membershipError);
              results.errors.push({
                member: member.full_name,
                error: `Membership failed: ${membershipError.response?.data?.detail || membershipError.message}`
              });
              // Don't increment failed count for membership errors, the member was created
            }
          }

          results.success++;

        } catch (error) {
          console.error('Error importing member:', error);
          
          const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
          
          // Check if this is a duplicate error
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

        // Small delay between imports to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (isCancelledRef.current) {
        toast.info('Import cancelled.');
        setUploading(false);
        return;
      }

      setResults(results);
      setPlansCreated(createdPlans);
      setStep(3);
      
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
    setPreviewData([]);
    setResults(null);
    setPlansCreated([]);
    setStep(1);
    setImportProgress({ current: 0, total: 0 });
    setUploading(false);
    setDateFormatDetected('');
    setHasExcelDateSerial(false);
    setCostFormatDetected('');
    setSkippedRows([]);
    setSkippedCount(0);
    setInvalidRows([]);
    setInvalidCount(0);
    if (onImportComplete) onImportComplete();
    onClose();
  };

  // ============================================================
  // RENDER STEP 1
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
        <strong className="text-gray-700">Required:</strong> Valid From OR Valid To date
        <br />
        <span className="text-gray-400">Optional: Email, Base Cost, Net Cost, Status, Gender, Address, DOB, etc.</span>
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
          <p className="text-xs text-gray-400 mt-1">Supports .xlsx, .xls, .csv, .tsv files</p>
        </label>
      </div>

      <div className="mt-4 text-left bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <span className="text-green-600">✓</span> Smart Features:
        </p>
        <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc list-inside">
          <li>Auto-detects column names (Valid From, Valid To, Base Cost, Net Cost, etc.)</li>
          <li><strong className="text-blue-600">Auto-filters:</strong> Skips rows without Plan Name OR Valid From/To dates</li>
          <li><strong className="text-red-600">Auto-validation:</strong> Skips rows with invalid data (phone, email, costs)</li>
          <li>Auto-detects cost format (Paisa or Rupee)</li>
          <li>Auto-detects date formats (DD/MM/YYYY, DD-MMM-YY, Month DD, YYYY, etc.)</li>
          <li>Supports both <strong>Base Cost</strong> (original price) and <strong>Net Cost</strong> (discounted price)</li>
          <li>Auto-creates membership plans if they don't exist</li>
          <li>Skips duplicate phone numbers automatically</li>
        </ul>
      </div>
    </div>
  );

  // ============================================================
  // RENDER STEP 2
  // ============================================================
  const renderStep2 = () => {
    const phoneCounts = {};
    previewData.forEach(m => {
      const phone = safeString(m.phone);
      phoneCounts[phone] = (phoneCounts[phone] || 0) + 1;
    });
    const duplicates = Object.entries(phoneCounts).filter(([phone, count]) => count > 1);
    const membersWithCost = previewData.filter(m => m.base_cost !== null);
    const totalCost = membersWithCost.reduce((sum, m) => sum + (m.base_cost || 0), 0);

    const totalValidRows = previewData.length + skippedCount + invalidCount;

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
          <button
            onClick={() => setStep(1)}
            className="text-sm text-blue-600 hover:text-blue-700"
            disabled={uploading}
          >
            Upload different file
          </button>
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
              {previewData.slice(0, 50).map((member, index) => {
                const phone = safeString(member.phone);
                const isDuplicate = previewData.filter(m => safeString(m.phone) === phone).length > 1;
                const isFirstOccurrence = previewData.findIndex(m => safeString(m.phone) === phone) === index;
                
                return (
                  <tr key={index} className={`${isDuplicate && !isFirstOccurrence ? 'bg-yellow-50' : ''}`}>
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
                      {member.base_cost !== null ? (
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
          {previewData.length > 50 && (
            <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 text-center">
              Showing first 50 of {previewData.length} valid members
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

  // ============================================================
  // RENDER STEP 3
  // ============================================================
  const renderStep3 = () => (
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-20">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Bulk Import Members
          </h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;