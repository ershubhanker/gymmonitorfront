// src/components/BulkImportModal.jsx - SMART FILTERING VERSION

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
  
  const isCancelledRef = useRef(false);
  const abortControllerRef = useRef(null);

  if (!isOpen) return null;

  // ============================================================
  // 🧠 SMART COST PARSER - Detects paisa vs rupee
  // ============================================================
  const parseCost = (value) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      if (value > 10000) {
        return value / 100;
      }
      return value;
    }

    if (typeof value === 'string') {
      let cleaned = value.trim();
      cleaned = cleaned.replace(/[₹$,]/g, '').trim();
      
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
    const costFields = ['Base Cost', 'Base_Cost', 'base_cost', 'Net Cost', 'Net_Cost', 'net_cost', 'Amount', 'amount', 'Cost', 'cost', 'Price', 'price'];
    let paisaCount = 0;
    let rupeeCount = 0;

    for (const row of rows) {
      for (const field of costFields) {
        const val = row[field];
        if (val !== undefined && val !== null && val !== '') {
          const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace(/[₹$,]/g, ''));
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

      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }

      const nativeDate = new Date(dateStr);
      if (!isNaN(nativeDate.getTime()) && nativeDate.getFullYear() > 1900 && nativeDate.getFullYear() < 2100) {
        return nativeDate.toISOString().split('T')[0];
      }
    }
    
    if (typeof dateStr === 'number' && dateStr > 0) {
      const excelDate = new Date((dateStr - 25569) * 86400 * 1000);
      if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() > 1900 && excelDate.getFullYear() < 2100) {
        setHasExcelDateSerial(true);
        return excelDate.toISOString().split('T')[0];
      }
    }

    if (typeof dateStr === 'string' && !isNaN(dateStr) && Number(dateStr) > 0) {
      const numVal = Number(dateStr);
      const excelDate = new Date((numVal - 25569) * 86400 * 1000);
      if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() > 1900 && excelDate.getFullYear() < 2100) {
        setHasExcelDateSerial(true);
        return excelDate.toISOString().split('T')[0];
      }
    }

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
  // SMART COLUMN MAPPING
  // ============================================================
  const mapColumns = (row) => {
    const keys = Object.keys(row);
    
    const findKey = (patterns) => {
      for (const pattern of patterns) {
        const found = keys.find(k => k.toLowerCase().trim() === pattern.toLowerCase().trim());
        if (found) return found;
      }
      for (const pattern of patterns) {
        const found = keys.find(k => k.toLowerCase().trim().includes(pattern.toLowerCase().trim()));
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

    return {
      full_name: nameKey ? String(row[nameKey]).trim() : '',
      phone: phoneKey ? String(row[phoneKey]).trim() : '',
      email: emailKey ? String(row[emailKey]).trim() : '',
      plan_name: planKey ? String(row[planKey]).trim() : '',
      status: statusKey ? row[statusKey] : 'active',
      gender: genderKey ? String(row[genderKey]).trim() : 'male',
      address: addressKey ? String(row[addressKey]).trim() : '',
      date_of_birth: dobKey ? row[dobKey] : '',
      joined_date: startDateKey ? row[startDateKey] : '',
      membership_end: endDateKey ? row[endDateKey] : '',
      base_cost: baseCost,
      net_cost: netCost,
      emergency_contact_name: emergencyNameKey ? String(row[emergencyNameKey]).trim() : '',
      emergency_contact_phone: emergencyPhoneKey ? String(row[emergencyPhoneKey]).trim() : '',
      medical_conditions: medicalKey ? String(row[medicalKey]).trim() : '',
      allergies: allergiesKey ? String(row[allergiesKey]).trim() : '',
      medications: medicationsKey ? String(row[medicationsKey]).trim() : '',
      _raw: row,
      _mapped: true
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
          if (typeof val === 'number' && val > 0) {
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
  // CHECK IF ROW IS VALID (has plan AND valid date range)
  // ============================================================
  const isValidRow = (row) => {
    // Check if there's a plan name
    const hasPlan = row.plan_name && row.plan_name.trim() !== '';
    
    // Check if there's a start date
    const hasStartDate = row.joined_date && row.joined_date.trim() !== '';
    
    // Check if there's an end date
    const hasEndDate = row.membership_end && row.membership_end.trim() !== '';
    
    // Check if dates are valid (parsed correctly)
    const parsedStart = parseDate(row.joined_date);
    const parsedEnd = parseDate(row.membership_end);
    
    const hasValidStart = parsedStart !== null;
    const hasValidEnd = parsedEnd !== null;
    
    // A row is valid if it has a plan AND (start date AND end date)
    // OR if it has a plan and at least one valid date (we'll derive the other)
    const isValid = hasPlan && (hasValidStart || hasValidEnd);
    
    return isValid;
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
              transformHeader: (header) => header.trim(),
              dynamicTyping: false,
            });

            const rows = result.data.filter(row => 
              Object.values(row).some(val => val && String(val).trim())
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
                } else if (typeof value === 'number' && value > 0) {
                  const excelDate = new Date((value - 25569) * 86400 * 1000);
                  if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() > 1900 && excelDate.getFullYear() < 2100) {
                    cleaned[key] = value;
                  } else {
                    cleaned[key] = String(value);
                  }
                } else {
                  cleaned[key] = value !== undefined && value !== null ? String(value) : '';
                }
              }
              return cleaned;
            }).filter(row => 
              Object.values(row).some(val => val && String(val).trim())
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
  // EXTRACT DURATION FROM PLAN NAME
  // ============================================================
  const extractDuration = (planName) => {
    if (!planName) return { durationDays: 30, planType: 'monthly' };
    
    const lower = planName.toLowerCase();
    
    if (lower.includes('day')) {
      const match = planName.match(/(\d+)\s*day/i);
      if (match) {
        return { durationDays: parseInt(match[1]), planType: 'monthly' };
      }
    }
    
    if (lower.includes('month') || lower.includes('mon')) {
      const match = planName.match(/(\d+)\s*month/i);
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
      const match = planName.match(/(\d+)\s*year/i);
      if (match) {
        const years = parseInt(match[1]);
        return { durationDays: years * 365, planType: 'yearly' };
      }
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
    
    return { durationDays: 30, planType: 'monthly' };
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
        // 🔥 SMART FILTERING: Skip rows without plan OR valid dates
        // ============================================================
        const filteredData = [];
        const skippedData = [];
        
        for (const row of validData) {
          if (isValidRow(row)) {
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
          joined_date: parseDate(m.joined_date),
          membership_end: parseDate(m.membership_end),
          date_of_birth: parseDate(m.date_of_birth),
        }));

        // Show preview with cost info
        const membersWithCost = parsedData.filter(m => m.base_cost !== null);
        const totalCost = membersWithCost.reduce((sum, m) => sum + (m.base_cost || 0), 0);

        console.log(`📊 Import Stats:`);
        console.log(`  - Total rows: ${validData.length}`);
        console.log(`  - Valid rows: ${filteredData.length}`);
        console.log(`  - Skipped rows: ${skippedData.length}`);
        console.log(`  - Rows with cost: ${membersWithCost.length}`);
        console.log(`  - Total cost: ₹${totalCost}`);

        setPreviewData(parsedData);
        setFile(selectedFile);
        setStep(2);
        setResults(null);
        
        let message = `Loaded ${parsedData.length} valid members from ${selectedFile.name}`;
        if (skippedData.length > 0) {
          message += ` (${skippedData.length} rows skipped due to missing plan or dates)`;
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
        existingPlanMap[p.name?.toLowerCase().trim()] = p.id;
      });

      const uniquePlans = [...new Set(previewData.map(m => m.plan_name).filter(Boolean))];
      const plansToCreate = uniquePlans.filter(name => {
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
            
            existingPlanMap[planName.toLowerCase().trim()] = newPlan.id;
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
        planIdMap[p.name?.toLowerCase().trim()] = p.id;
      });

      const defaultPlan = allPlans.find(p => p.is_active) || allPlans[0];

      const successfullyImportedPhones = new Set();
      
      for (let i = 0; i < previewData.length; i++) {
        if (isCancelledRef.current) {
          toast.info('Import cancelled.');
          setUploading(false);
          return;
        }

        const member = previewData[i];
        setImportProgress({ current: i + 1, total: previewData.length });

        if (successfullyImportedPhones.has(member.phone)) {
          results.skipped++;
          results.errors.push({
            member: member.full_name,
            error: `Duplicate phone number: ${member.phone} (already imported earlier in this file)`
          });
          continue;
        }

        let importSuccess = false;

        try {
          const shouldBeActive = member.status !== false;
          
          const memberData = {
            full_name: member.full_name,
            phone: member.phone,
            gender: member.gender || 'male',
            is_active: shouldBeActive,
          };

          if (member.base_cost !== null) {
            memberData.membership_fee = member.base_cost;
          } else if (member.net_cost !== null) {
            memberData.membership_fee = member.net_cost;
          }

          if (member.email && member.email.includes('@')) {
            memberData.email = member.email;
          }

          if (member.address) memberData.address = member.address;
          if (member.date_of_birth) {
            const dob = parseDate(member.date_of_birth);
            if (dob) memberData.date_of_birth = dob;
          }
          if (member.emergency_contact_name) memberData.emergency_contact_name = member.emergency_contact_name;
          if (member.emergency_contact_phone) memberData.emergency_contact_phone = member.emergency_contact_phone;
          if (member.medical_conditions) memberData.medical_conditions = member.medical_conditions;
          if (member.allergies) memberData.allergies = member.allergies;
          if (member.medications) memberData.medications = member.medications;
          
          if (member.joined_date) {
            memberData.joined_date = member.joined_date;
          } else {
            memberData.joined_date = new Date().toISOString().split('T')[0];
          }

          const memberResponse = await api.post('/gym/members', memberData);
          const newMember = memberResponse.data;
          
          importSuccess = true;
          successfullyImportedPhones.add(member.phone);

          let planId = null;
          let planName = member.plan_name;
          
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
                if (member.net_cost !== null) {
                  amountPaid = member.net_cost;
                } else if (member.base_cost !== null) {
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
            }
          }

          results.success++;

        } catch (error) {
          console.error('Error importing member:', error);
          
          const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
          
          const isDuplicateError = errorMsg.toLowerCase().includes('already exists') || 
                                   errorMsg.toLowerCase().includes('duplicate') || 
                                   errorMsg.toLowerCase().includes('phone');
          
          if (isDuplicateError) {
            results.skipped++;
            results.errors.push({
              member: member.full_name,
              error: `Member already exists with phone: ${member.phone} (skipped)`
            });
          } else {
            results.failed++;
            results.errors.push({
              member: member.full_name,
              error: errorMsg
            });
          }
        }

        await new Promise(resolve => setTimeout(resolve, 150));
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
      if (skippedCount > 0) summaryMessage += ` ⏭️ ${skippedCount} rows skipped (no plan/dates).`;
      if (results.skipped > 0) summaryMessage += ` ⏭️ ${results.skipped} duplicate phones skipped.`;
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
    if (onImportComplete) onImportComplete();
    onClose();
  };

  // ============================================================
  // RENDER FUNCTIONS
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
          <li><strong className="text-blue-600">Auto-detects cost format:</strong> Paisa or Rupee</li>
          <li>Auto-detects date formats (DD/MM/YYYY, DD-MMM-YY, Month DD, YYYY, etc.)</li>
          <li>Supports both <strong>Base Cost</strong> (original price) and <strong>Net Cost</strong> (discounted price)</li>
          <li>Auto-creates membership plans if they don't exist</li>
          <li>Skips duplicate phone numbers automatically</li>
          <li>Supports .xlsx, .xls, .csv, .tsv files</li>
        </ul>
        <div className="mt-3 bg-blue-50 rounded p-2">
          <p className="text-xs text-blue-700">
            📝 Example: <span className="font-mono">John Doe, 9876543210, john@email.com, 2026-06-15, 2026-11-30, 55000000, 45000000, WS 6 MONTHS PLAN, active</span>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            💰 Base Cost 5,50,00,000 paisa = ₹5,50,000.00 | Net Cost 4,50,00,000 paisa = ₹4,50,000.00
          </p>
          <p className="text-xs text-green-600 mt-1">
            ✅ Members without Plan Name or Valid From/To dates will be automatically skipped
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const phoneCounts = {};
    previewData.forEach(m => {
      phoneCounts[m.phone] = (phoneCounts[m.phone] || 0) + 1;
    });
    const duplicates = Object.entries(phoneCounts).filter(([phone, count]) => count > 1);
    const membersWithCost = previewData.filter(m => m.base_cost !== null);
    const totalCost = membersWithCost.reduce((sum, m) => sum + (m.base_cost || 0), 0);

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">📋 Preview Import Data</h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm text-gray-500">{previewData.length} valid members found</span>
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
              {hasExcelDateSerial && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  ⚡ Excel Date Serial Numbers Detected
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {previewData.slice(0, 50).map((member, index) => {
                const isDuplicate = previewData.filter(m => m.phone === member.phone).length > 1;
                const isFirstOccurrence = previewData.findIndex(m => m.phone === member.phone) === index;
                const isValid = member.plan_name && member.plan_name.trim() !== '' && 
                               (member.joined_date || member.membership_end);
                
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
                      <span className={`px-2 py-1 rounded-full text-xs ${member.status !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {member.status !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isValid ? (
                        <span className="text-xs text-green-600">✅ Valid</span>
                      ) : (
                        <span className="text-xs text-red-400">⚠️ Skipped</span>
                      )}
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
            <div>• Plans will be auto-created if they don't exist</div>
            <div>• Duplicate phone numbers in the file will be skipped (only first imported)</div>
            <div>• Existing members in the database will be skipped</div>
            <div>• <strong>Net Cost (if available) will be used as membership amount</strong></div>
            <div>• Valid From and Valid To dates will be used for membership period</div>
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

  const renderStep3 = () => (
    <div>
      <div className="text-center mb-6">
        {results.failed === 0 && results.skipped === 0 ? (
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
        <div className="flex justify-center gap-8 mt-2">
          <div>
            <p className="text-sm text-gray-500">Successful</p>
            <p className="text-2xl font-bold text-green-600">{results.success}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Skipped (Duplicates)</p>
            <p className="text-2xl font-bold text-yellow-600">{results.skipped || 0}</p>
          </div>
          {skippedCount > 0 && (
            <div>
              <p className="text-sm text-gray-500">Skipped (Invalid)</p>
              <p className="text-2xl font-bold text-orange-600">{skippedCount}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">{results.failed}</p>
          </div>
        </div>
        {plansCreated.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-blue-600">
              ✅ {plansCreated.length} new plan{plansCreated.length > 1 ? 's' : ''} created
            </p>
          </div>
        )}
        {skippedCount > 0 && (
          <div className="mt-2">
            <p className="text-sm text-orange-600">
              ⏭️ {skippedCount} rows skipped (missing plan or dates)
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
              {results.errors.map((error, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900">{error.member}</td>
                  <td className="px-4 py-2 text-sm text-red-600">{error.error}</td>
                </tr>
              ))}
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