// src/components/LeadBulkImportModal.jsx
// Bulk import leads with mapping, preview, validation and sample template download

import React, { useState, useRef } from 'react';
import { 
  X, Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, 
  AlertCircle, FileText, Download, ArrowLeft, ArrowRight,
  HelpCircle, ChevronDown, ChevronUp, Calendar, Phone, Mail, User, 
  Tag, DollarSign, Star, MessageSquare
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
  BATCH_SIZE: 50,
};

// ============================================================
// FIELD DEFINITIONS - 16 Headers requested
// ============================================================
const DB_FIELDS = [
  { 
    key: 'enquiry_id', 
    label: 'Enquiry ID', 
    header: 'Enquiry_ID',
    required: false, 
    icon: Tag,
    description: 'Unique inquiry identifier from external CRM or spreadsheet',
    example: 'ENQ-1001, 101'
  },
  { 
    key: 'date', 
    label: 'Inquiry Date', 
    header: 'Date',
    required: false, 
    icon: Calendar,
    description: 'Date inquiry was received (defaults to today)',
    example: '2026-01-15, 15/01/2026'
  },
  { 
    key: 'name', 
    label: 'Full Name', 
    header: 'Name',
    required: true, 
    icon: User,
    description: 'Prospect / Lead full name',
    example: 'Rahul Sharma'
  },
  { 
    key: 'contact', 
    label: 'Contact Number', 
    header: 'Contact',
    required: true, 
    icon: Phone,
    description: 'Primary 10-digit mobile number',
    example: '9876543210'
  },
  { 
    key: 'gender', 
    label: 'Gender', 
    header: 'Gender',
    required: false, 
    icon: User,
    description: 'Male / Female / Other',
    example: 'Male'
  },
  { 
    key: 'email', 
    label: 'Email', 
    header: 'Email',
    required: false, 
    icon: Mail,
    description: 'Email address (optional)',
    example: 'rahul@example.com'
  },
  { 
    key: 'address', 
    label: 'Address', 
    header: 'Address',
    required: false, 
    icon: FileText,
    description: 'Residential address / locality',
    example: 'A-45, Green Park, South Delhi'
  },
  { 
    key: 'alternate_no', 
    label: 'Alternate Number', 
    header: 'Alternate_No',
    required: false, 
    icon: Phone,
    description: 'Secondary mobile or landline number',
    example: '9811223344'
  },
  { 
    key: 'comment', 
    label: 'Comment / Notes', 
    header: 'Comment',
    required: false, 
    icon: MessageSquare,
    description: 'Initial inquiry notes or conversation remarks',
    example: 'Interested in weight loss & personal training'
  },
  { 
    key: 'followup_type', 
    label: 'Follow-up Type / Source', 
    header: 'FollowupType',
    required: false, 
    icon: Tag,
    description: 'Mode or source: Walk-in, Phone Call, WhatsApp, Instagram, etc.',
    example: 'Walk-in, Phone Call, WhatsApp'
  },
  { 
    key: 'rating', 
    label: 'Rating / Quality', 
    header: 'Rating',
    required: false, 
    icon: Star,
    description: 'Lead priority: Hot, Warm, Cold (or 1 to 5)',
    example: 'Hot, Warm, Cold'
  },
  { 
    key: 'call_response', 
    label: 'Call Response / Status', 
    header: 'CallResponse',
    required: false, 
    icon: Phone,
    description: 'Call outcome: Interested, Contacted, Not Interested, Converted, Lost',
    example: 'Interested, Contacted'
  },
  { 
    key: 'next_followup_date', 
    label: 'Next Follow-up Date', 
    header: 'NextFollowup_Date',
    required: false, 
    icon: Calendar,
    description: 'Scheduled next date for follow-up',
    example: '2026-01-20'
  },
  { 
    key: 'budget', 
    label: 'Budget', 
    header: 'Budget',
    required: false, 
    icon: DollarSign,
    description: 'Expected budget or package budget in rupees',
    example: '5000'
  },
  { 
    key: 'image', 
    label: 'Image', 
    header: 'Image',
    required: false, 
    icon: FileText,
    description: 'Photo URL or image filename',
    example: 'https://example.com/photo.jpg'
  },
  { 
    key: 'enquiry_owner_executive', 
    label: 'Enquiry Owner Executive', 
    header: 'EnquiryOwnerExecutive',
    required: false, 
    icon: User,
    description: 'Staff member / sales executive handling this inquiry',
    example: 'Aman Sharma'
  }
];

// Search keys for intelligent auto-matching
const SEARCH_KEYS = {
  enquiry_id: ['enquiry_id', 'enquiry id', 'enquiryid', 'lead id', 'enquiry no', 'enquiry number', 'lead_id', 'id', 'enq id', 'enqid', 'enq_id'],
  date: ['date', 'enquiry date', 'inquiry date', 'created date', 'lead date', 'created_at', 'doj', 'entry date'],
  name: ['name', 'full name', 'fullname', 'lead name', 'prospect name', 'client name', 'customer name', 'candidate name'],
  contact: ['contact', 'phone', 'mobile', 'mobile no', 'contact no', 'phone number', 'mobile number', 'cell', 'whatsapp', 'phone_number'],
  gender: ['gender', 'sex'],
  email: ['email', 'email id', 'email address', 'mail'],
  address: ['address', 'location', 'city', 'area', 'residence', 'street'],
  alternate_no: ['alternate_no', 'alternate no', 'alternate number', 'alt no', 'alt phone', 'alt contact', 'other phone', 'secondary phone', 'alt_no', 'alternate contact'],
  comment: ['comment', 'comments', 'remark', 'remarks', 'notes', 'note', 'description', 'feedback'],
  followup_type: ['followuptype', 'followup type', 'follow up type', 'source', 'lead source', 'channel', 'mode', 'inquiry mode', 'inquiry type'],
  rating: ['rating', 'lead quality', 'quality', 'priority', 'grade', 'status rating', 'star'],
  call_response: ['callresponse', 'call response', 'status', 'lead status', 'response', 'outcome', 'result', 'stage', 'current status'],
  next_followup_date: ['nextfollowup_date', 'next followup date', 'next follow-up date', 'next follow up', 'next followup', 'followup date', 'next call', 'followup_date'],
  budget: ['budget', 'expected budget', 'fee', 'amount', 'price', 'fees'],
  image: ['image', 'photo', 'picture', 'avatar', 'img', 'photo url', 'image url'],
  enquiry_owner_executive: ['enquiryownerexecutive', 'enquiry owner executive', 'executive', 'owner', 'assigned to', 'staff', 'sales executive', 'counselor', 'agent', 'handled by', 'assigned executive']
};

const LeadBulkImportModal = ({ isOpen, onClose, onImportComplete, staffList = [] }) => {
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
  
  // ─── MAPPING & OPTIONS STATE ────────────────────────────────
  const [fieldMapping, setFieldMapping] = useState({});
  const [expandedFields, setExpandedFields] = useState({});
  const [skipMissingRequired, setSkipMissingRequired] = useState(true);
  const [autoDetectDates, setAutoDetectDates] = useState(true);
  const [autoMapStatus, setAutoMapStatus] = useState(true);
  const [assignMatchingStaff, setAssignMatchingStaff] = useState(true);

  // ─── RESULTS STATE ──────────────────────────────────────────
  const [skippedRows, setSkippedRows] = useState([]);
  const [invalidRows, setInvalidRows] = useState([]);
  const [invalidCount, setInvalidCount] = useState(0);

  const isCancelledRef = useRef(false);
  const abortControllerRef = useRef(null);

  if (!isOpen) return null;

  // ============================================================
  // 🛡️ SAFE PARSERS & HELPERS
  // ============================================================
  const safeString = (value) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value.trim();
    if (value instanceof Date) return value.toISOString().split('T')[0];
    return String(value).trim();
  };

  const isEmpty = (value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    return false;
  };

  const parseCost = (value) => {
    if (isEmpty(value)) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[₹$,€£¥]/g, '').replace(/,/g, '').trim();
      const num = parseFloat(cleaned);
      return isNaN(num) || num < 0 ? null : num;
    }
    return null;
  };

  const isValidEmail = (email) => {
    if (!email || isEmpty(email)) return false;
    const str = safeString(email).toLowerCase();
    return str.includes('@') && str.split('@')[1]?.includes('.');
  };

  const cleanPhone = (phone) => {
    if (!phone || isEmpty(phone)) return '';
    return safeString(phone).replace(/[\s\-()+.]/g, '');
  };

  const isValidPhone = (phone) => {
    if (!phone || isEmpty(phone)) return false;
    const cleaned = cleanPhone(phone);
    return cleaned.length >= 7 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
  };

  const parseDate = (dateStr) => {
    if (!dateStr || isEmpty(dateStr)) return null;
    
    if (dateStr instanceof Date) {
      if (!isNaN(dateStr.getTime()) && dateStr.getFullYear() > 1900 && dateStr.getFullYear() < 2100) {
        return dateStr.toISOString().split('T')[0];
      }
      return null;
    }

    if (typeof dateStr === 'number' && dateStr > 25569 && dateStr < 50000) {
      const excelDate = new Date((dateStr - 25569) * 86400 * 1000);
      if (!isNaN(excelDate.getTime())) {
        return excelDate.toISOString().split('T')[0];
      }
    }

    if (typeof dateStr === 'string') {
      const s = dateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

      // Match DD/MM/YYYY or DD-MM-YYYY
      const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
      if (dmy) {
        let day = parseInt(dmy[1], 10);
        let month = parseInt(dmy[2], 10);
        let year = parseInt(dmy[3], 10);
        if (year < 100) year += 2000;
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }

      const parsed = new Date(s);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
        return parsed.toISOString().split('T')[0];
      }
    }

    return null;
  };

  // Map followup type string to backend LeadSource enum
  const mapFollowupToSource = (val) => {
    if (!val) return 'walk_in';
    const s = String(val).toLowerCase();
    if (s.includes('phone') || s.includes('call') || s.includes('tele')) return 'phone_call';
    if (s.includes('whats') || s.includes('wa')) return 'whatsapp';
    if (s.includes('insta')) return 'instagram';
    if (s.includes('face') || s.includes('fb')) return 'facebook';
    if (s.includes('goog')) return 'google';
    if (s.includes('refer') || s.includes('friend')) return 'referral';
    if (s.includes('web') || s.includes('site')) return 'website';
    if (s.includes('form')) return 'public_form';
    if (s.includes('walk') || s.includes('visit')) return 'walk_in';
    return 'other';
  };

  // Map rating to lead quality (hot/warm/cold)
  const mapRatingToQuality = (val) => {
    if (!val) return 'warm';
    const s = String(val).toLowerCase();
    if (s.includes('hot') || s === '5' || s === '4' || s.includes('high')) return 'hot';
    if (s.includes('cold') || s === '1' || s === '2' || s.includes('low')) return 'cold';
    return 'warm';
  };

  // Map call response to lead status
  const mapCallResponseToStatus = (val) => {
    if (!val) return 'new';
    const s = String(val).toLowerCase();
    if (s.includes('convert') || s.includes('join') || s.includes('admit') || s.includes('enrol')) return 'converted';
    if (s.includes('interest') || s.includes('trial') || s.includes('demo')) return 'interested';
    if (s.includes('not interest') || s.includes('not_interest') || s.includes('reject') || s.includes('decline')) return 'not_interested';
    if (s.includes('lost') || s.includes('drop')) return 'lost';
    if (s.includes('contact') || s.includes('spoke') || s.includes('busy') || s.includes('call') || s.includes('follow') || s.includes('ring')) return 'contacted';
    return 'new';
  };

  // Normalize gender
  const normalizeGender = (val) => {
    if (!val) return null;
    const s = String(val).trim().toLowerCase();
    if (s.startsWith('m')) return 'Male';
    if (s.startsWith('f')) return 'Female';
    return 'Other';
  };

  // ============================================================
  // 📁 PARSE FILE (CSV or Excel)
  // ============================================================
  const parseFile = (uploadFile) => {
    return new Promise((resolve, reject) => {
      const fileType = uploadFile.name.split('.').pop().toLowerCase();
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
              transformHeader: (h) => safeString(h),
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
        reader.readAsText(uploadFile);
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
                } else if (typeof value === 'number' && value > 25569 && value < 50000) {
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
        reader.readAsArrayBuffer(uploadFile);
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
      toast.error(`Unsupported file type: .${extension}. Please use .xlsx, .xls, .csv, or .tsv`);
      return;
    }

    if (selectedFile.size > UPLOAD_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large: ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB. Maximum ${UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    isCancelledRef.current = false;

    toast.loading('Reading file...', { id: 'lead-file-reading' });

    parseFile(selectedFile)
      .then(({ data }) => {
        toast.dismiss('lead-file-reading');
        
        if (data.length === 0) {
          toast.error('No data rows found in the uploaded file.');
          return;
        }

        const fileHeaders = Object.keys(data[0] || {});
        
        // Intelligent auto-match of headers to DB_FIELDS
        const initialMapping = {};
        DB_FIELDS.forEach(field => {
          initialMapping[field.key] = '';
          const exactHeader = field.header;
          const aliases = SEARCH_KEYS[field.key] || [field.label.toLowerCase()];

          // 1. Direct exact or case-insensitive match with exactHeader
          const exactMatch = fileHeaders.find(h => 
            h.trim().toLowerCase() === exactHeader.toLowerCase()
          );

          if (exactMatch) {
            initialMapping[field.key] = exactMatch;
            return;
          }

          // 2. Alias match
          const matchedHeader = fileHeaders.find(h => {
            const cleanH = h.toLowerCase().trim().replace(/[_\s-]+/g, ' ');
            return aliases.some(alias => cleanH === alias || cleanH.includes(alias));
          });

          if (matchedHeader) {
            initialMapping[field.key] = matchedHeader;
          }
        });

        setRawData(data);
        setHeaders(fileHeaders);
        setFieldMapping(initialMapping);
        setStep(2);
        
        toast.success(`Loaded ${data.length} rows with ${fileHeaders.length} columns.`);
      })
      .catch((error) => {
        toast.dismiss('lead-file-reading');
        console.error('Error parsing file:', error);
        toast.error(error.message || 'Failed to parse file.');
      });
  };

  // ============================================================
  // 📥 DOWNLOAD SAMPLE TEMPLATE (EXACT 16 HEADERS)
  // ============================================================
  const downloadSampleTemplate = () => {
    const sampleHeaders = DB_FIELDS.map(f => f.header);

    const sampleRows = [
      [
        'ENQ-1001',
        '2026-01-10',
        'Aarav Mehta',
        '9876543210',
        'Male',
        'aarav@example.com',
        'A-45, Green Park, South Delhi',
        '9811223344',
        'Interested in weight loss and personal training program',
        'Walk-in',
        'Hot',
        'Interested',
        '2026-01-15',
        '12000',
        '',
        'Admin'
      ],
      [
        'ENQ-1002',
        '2026-01-12',
        'Priya Sharma',
        '9812345678',
        'Female',
        'priya.s@example.com',
        'Flat 204, Lotus Apartments, Sector 18',
        '',
        'Asked for evening Zumba and Yoga batch pricing',
        'Phone Call',
        'Warm',
        'Contacted',
        '2026-01-18',
        '6000',
        '',
        ''
      ]
    ];

    const wsData = [sampleHeaders, ...sampleRows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto-fit column widths
    ws['!cols'] = sampleHeaders.map(h => ({ wch: Math.max(h.length + 4, 15) }));

    XLSX.utils.book_append_sheet(wb, ws, 'Leads_Template');
    XLSX.writeFile(wb, 'gym_leads_import_template.xlsx');
    toast.success('Sample template downloaded with all 16 headers!');
  };

  // ============================================================
  // 🔄 APPLY MAPPING & PREVIEW
  // ============================================================
  const handleApplyMapping = () => {
    const requiredFields = DB_FIELDS.filter(f => f.required);
    const missingRequired = requiredFields.filter(f => !fieldMapping[f.key]);
    
    if (missingRequired.length > 0) {
      toast.error(`Please map these required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    const mappedData = rawData.map((row, index) => {
      const mapped = {
        _rowIndex: index,
        _raw: row,
        _isValid: true,
        _errors: [],
      };

      for (const field of DB_FIELDS) {
        const col = fieldMapping[field.key];
        const val = col && row[col] !== undefined ? row[col] : '';

        if (field.key === 'contact') {
          mapped.contact = cleanPhone(val);
        } else if (field.key === 'email') {
          const emailStr = safeString(val);
          mapped.email = isValidEmail(emailStr) ? emailStr : '';
        } else if (field.key === 'date' || field.key === 'next_followup_date') {
          mapped[field.key] = autoDetectDates ? parseDate(val) || safeString(val) : safeString(val);
        } else if (field.key === 'budget') {
          mapped.budget = parseCost(val);
        } else if (field.key === 'gender') {
          mapped.gender = normalizeGender(val);
        } else {
          mapped[field.key] = safeString(val);
        }
      }

      // Validations
      if (!mapped.name || mapped.name.trim() === '') {
        mapped._isValid = false;
        mapped._errors.push('Missing Name');
      }

      if (!mapped.contact || mapped.contact.trim() === '') {
        mapped._isValid = false;
        mapped._errors.push('Missing Contact Number');
      } else if (!isValidPhone(mapped.contact)) {
        mapped._isValid = false;
        mapped._errors.push(`Invalid Phone: "${mapped.contact}"`);
      }

      // Computed fields for preview & payload
      mapped._source = mapFollowupToSource(mapped.followup_type);
      mapped._quality = mapRatingToQuality(mapped.rating);
      mapped._status = autoMapStatus ? mapCallResponseToStatus(mapped.call_response) : 'new';

      // Match staff executive
      mapped._assignedStaffId = null;
      if (assignMatchingStaff && mapped.enquiry_owner_executive && staffList.length > 0) {
        const execName = mapped.enquiry_owner_executive.toLowerCase().trim();
        const found = staffList.find(s => {
          const sName = (s.full_name || s.name || '').toLowerCase().trim();
          const sEmail = (s.email || '').toLowerCase().trim();
          return sName.includes(execName) || execName.includes(sName) || sEmail === execName;
        });
        if (found) {
          mapped._assignedStaffId = found.user_id || found.id;
          mapped._assignedStaffName = found.full_name || found.name;
        }
      }

      return mapped;
    });

    const valid = mappedData.filter(r => r._isValid);
    const invalid = mappedData.filter(r => !r._isValid);

    setInvalidRows(invalid);
    setInvalidCount(invalid.length);
    setPreviewData(valid);
    setStep(3);

    toast.success(`${valid.length} valid rows ready to import. ${invalid.length} invalid rows detected.`);
  };

  // ============================================================
  // 📊 EXPORT SKIPPED ROWS
  // ============================================================
  const exportSkippedRows = () => {
    const allSkipped = [
      ...invalidRows.map(r => ({ ...r._raw, _errors: r._errors.join(', '), _reason: 'Validation Error' })),
      ...skippedRows.map(r => ({ ...r._raw, _reason: r._skipReason || 'Skipped' }))
    ];

    if (allSkipped.length === 0) {
      toast.info('No skipped or invalid rows to export.');
      return;
    }

    const allHeaders = [...headers, '_errors', '_reason'];
    const csvRows = [allHeaders.join(',')];

    allSkipped.forEach(row => {
      const rowData = allHeaders.map(h => {
        const val = row[h] !== undefined && row[h] !== null ? row[h] : '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(rowData.join(','));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skipped_leads_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${allSkipped.length} skipped rows.`);
  };

  // ============================================================
  // 🚀 HANDLE IMPORT
  // ============================================================
  const handleImport = async () => {
    isCancelledRef.current = false;
    setUploading(true);
    setImportProgress({ current: 0, total: previewData.length });

    const importResults = { success: 0, failed: 0, skipped: 0, errors: [] };
    const seenPhonesInBatch = new Set();
    abortControllerRef.current = new AbortController();

    // Prepare all lead items
    const preparedItems = [];
    for (const lead of previewData) {
      if (!lead._isValid) {
        importResults.skipped++;
        continue;
      }

      if (seenPhonesInBatch.has(lead.contact)) {
        importResults.skipped++;
        importResults.errors.push({
          lead: lead.name,
          error: `Duplicate phone number in file: ${lead.contact}`
        });
        continue;
      }
      seenPhonesInBatch.add(lead.contact);

      // Build composite notes
      const notesArr = [];
      if (lead.comment && lead.comment.trim()) notesArr.push(lead.comment.trim());
      if (lead.enquiry_id && lead.enquiry_id.trim()) notesArr.push(`Enquiry ID: ${lead.enquiry_id.trim()}`);
      if (lead.address && lead.address.trim()) notesArr.push(`Address: ${lead.address.trim()}`);
      if (lead.alternate_no && lead.alternate_no.trim()) notesArr.push(`Alt Contact: ${cleanPhone(lead.alternate_no)}`);
      if (lead.call_response && lead.call_response.trim()) notesArr.push(`Call Response: ${lead.call_response.trim()}`);
      if (lead.image && lead.image.trim()) notesArr.push(`Image: ${lead.image.trim()}`);
      if (lead.enquiry_owner_executive && lead.enquiry_owner_executive.trim()) notesArr.push(`Executive: ${lead.enquiry_owner_executive.trim()}`);

      const finalNotes = notesArr.join(' | ') || null;

      preparedItems.push({
        rawLead: lead,
        payload: {
          enquiry_id: lead.enquiry_id || null,
          date: lead.date ? parseDate(lead.date) : null,
          name: lead.name,
          contact: lead.contact,
          gender: lead.gender || null,
          email: lead.email || null,
          address: lead.address || null,
          alternate_no: lead.alternate_no || null,
          comment: lead.comment || null,
          followup_type: lead.followup_type || null,
          rating: lead.rating || null,
          call_response: lead.call_response || null,
          next_followup_date: lead.next_followup_date ? parseDate(lead.next_followup_date) : null,
          budget: lead.budget || null,
          image: lead.image || null,
          enquiry_owner_executive: lead.enquiry_owner_executive || null,
          assigned_to: lead._assignedStaffId || null,
          status: lead._status || 'new',
          source: lead._source || 'walk_in',
          lead_quality: lead._quality || 'warm',
          notes: finalNotes,
        }
      });
    }

    try {
      // Attempt batch import endpoint first
      let usedBulkEndpoint = false;
      const batchSize = UPLOAD_CONFIG.BATCH_SIZE;

      for (let i = 0; i < preparedItems.length; i += batchSize) {
        if (isCancelledRef.current) {
          toast.info('Import cancelled by user.');
          setUploading(false);
          return;
        }

        const currentChunk = preparedItems.slice(i, i + batchSize);
        const chunkPayload = currentChunk.map(item => item.payload);

        try {
          const res = await api.post('/gym/leads/bulk-import', { leads: chunkPayload }, {
            signal: abortControllerRef.current?.signal
          });

          if (res.data && res.data.success !== undefined) {
            usedBulkEndpoint = true;
            importResults.success += (res.data.imported || 0);
            importResults.failed += (res.data.failed || 0);
            if (res.data.errors && res.data.errors.length > 0) {
              importResults.errors.push(...res.data.errors);
            }
          }
        } catch (bulkErr) {
          // If bulk endpoint is not supported (404/405), fallback to item-by-item
          console.warn('Bulk endpoint failed or unavailable, falling back to item-by-item:', bulkErr);
          usedBulkEndpoint = false;
          break;
        }

        setImportProgress({
          current: Math.min(i + batchSize, preparedItems.length),
          total: preparedItems.length
        });
      }

      // If bulk endpoint wasn't used or failed, run item-by-item fallback
      if (!usedBulkEndpoint && !isCancelledRef.current) {
        for (let i = 0; i < preparedItems.length; i++) {
          if (isCancelledRef.current) {
            toast.info('Import cancelled.');
            setUploading(false);
            return;
          }

          const { rawLead, payload } = preparedItems[i];
          setImportProgress({ current: i + 1, total: preparedItems.length });

          try {
            const singlePayload = {
              full_name: payload.name,
              phone: payload.contact,
              email: payload.email,
              gender: payload.gender,
              source: payload.source,
              status: payload.status,
              lead_quality: payload.lead_quality,
              budget: payload.budget,
              created_date: payload.date,
              next_follow_up: payload.next_followup_date ? `${payload.next_followup_date}T10:00:00` : null,
              notes: payload.notes,
              assigned_to: payload.assigned_to,
            };

            const createdRes = await api.post('/gym/leads', singlePayload, {
              signal: abortControllerRef.current?.signal
            });

            // If status is not 'new', ensure status is updated
            if (payload.status && payload.status !== 'new' && createdRes.data?.id) {
              try {
                await api.put(`/gym/leads/${createdRes.data.id}`, { status: payload.status });
              } catch (e) {
                console.warn('Status update sync error:', e);
              }
            }

            // If comment exists, also create comment
            if (payload.comment && payload.comment.trim() && createdRes.data?.id) {
              try {
                await api.post(`/gym/leads/${createdRes.data.id}/comments`, { comment: payload.comment.trim() });
              } catch (e) {
                console.warn('Comment creation error:', e);
              }
            }

            importResults.success++;
          } catch (err) {
            console.error('Lead creation error:', err);
            importResults.failed++;
            const errMsg = err.response?.data?.detail || err.message || 'Unknown error';
            importResults.errors.push({
              lead: rawLead.name,
              error: errMsg
            });
          }
        }
      }
    } catch (globalErr) {
      if (globalErr.name !== 'CanceledError') {
        console.error('Fatal import error:', globalErr);
        toast.error('Import stopped due to an error.');
      }
    } finally {
      setUploading(false);
      setResults(importResults);
      setStep(4);
      if (onImportComplete) onImportComplete();
    }
  };

  const handleCancelImport = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    toast.info('Stopping import...');
  };

  const handleClose = () => {
    if (uploading) {
      if (!window.confirm('Import is currently in progress. Are you sure you want to cancel?')) {
        return;
      }
      handleCancelImport();
    }
    setStep(1);
    setFile(null);
    setFileName('');
    setRawData([]);
    setHeaders([]);
    setPreviewData([]);
    setResults(null);
    setInvalidRows([]);
    setInvalidCount(0);
    onClose();
  };

  // ============================================================
  // ─── STEP 1: Upload File & Template ─────────────────────────
  // ============================================================
  const renderStep1 = () => (
    <div className="text-center py-6">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileSpreadsheet className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">Bulk Import Leads</h3>
      <p className="text-sm text-gray-500 mb-5 max-w-lg mx-auto">
        Upload your Excel (.xlsx, .xls) or CSV file with lead inquiries.
        You can map your columns to our standard 16 headers or download our pre-formatted template.
      </p>

      {/* Download Template Button */}
      <div className="mb-6 flex justify-center">
        <button
          type="button"
          onClick={downloadSampleTemplate}
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <Download className="h-4 w-4 text-blue-600" />
          Download Sample Template (16 Lead Headers)
        </button>
      </div>

      {/* File Upload Box */}
      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer max-w-xl mx-auto">
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.tsv"
          onChange={handleFileUpload}
          className="hidden"
          id="lead-file-upload"
        />
        <label htmlFor="lead-file-upload" className="cursor-pointer block">
          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold text-sm">Click to upload or drag & drop</p>
          <p className="text-xs text-gray-400 mt-1">
            Supports .xlsx, .xls, .csv, .tsv (Max {UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB)
          </p>
        </label>
      </div>

      {/* Required Headers List */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200 text-left max-w-xl mx-auto">
        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
          Recognized Headers:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DB_FIELDS.map(f => (
            <span 
              key={f.key} 
              className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                f.required ? 'bg-red-50 text-red-700 border border-red-200 font-bold' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {f.header} {f.required && '*'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================================
  // ─── STEP 2: Column Mapping ─────────────────────────────────
  // ============================================================
  const renderStep2 = () => (
    <div>
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Map Columns to Database Fields
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Confirm or change which column from your file corresponds to each field. <span className="text-red-500 font-bold">*</span> = Required
          </p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg">
          {rawData.length} rows • {headers.length} columns detected
        </span>
      </div>

      {/* Mapping Table */}
      <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-xl">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10 text-xs font-semibold text-gray-500 uppercase border-b">
            <tr>
              <th className="px-4 py-2.5 text-left">Database Field</th>
              <th className="px-4 py-2.5 text-left">Template Header</th>
              <th className="px-4 py-2.5 text-left">Your File Column</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {DB_FIELDS.map((field) => {
              const Icon = field.icon;
              const isExpanded = expandedFields[field.key];
              const isSelected = !!fieldMapping[field.key];
              
              return (
                <tr key={field.key} className={field.required ? 'bg-blue-50/20' : ''}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-800 text-xs sm:text-sm">
                            {field.label}
                          </span>
                          {field.required && (
                            <span className="text-red-500 font-bold text-xs">*</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedFields(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                            <p>{field.description}</p>
                            <p className="text-gray-400">Ex: {field.example}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-mono px-2 py-0.5 bg-gray-100 text-gray-700 rounded border">
                      {field.header}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={fieldMapping[field.key] || ''}
                      onChange={(e) => setFieldMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs sm:text-sm outline-none bg-white transition-all ${
                        field.required && !isSelected
                          ? 'border-red-300 ring-1 ring-red-100'
                          : isSelected
                            ? 'border-blue-400 bg-blue-50/10'
                            : 'border-gray-200'
                      }`}
                    >
                      <option value="">-- Don't Map --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Options Row */}
      <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-700">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoDetectDates}
            onChange={(e) => setAutoDetectDates(e.target.checked)}
            className="rounded text-blue-600 border-gray-300"
          />
          Auto-detect dates (YYYY-MM-DD, DD/MM/YYYY)
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoMapStatus}
            onChange={(e) => setAutoMapStatus(e.target.checked)}
            className="rounded text-blue-600 border-gray-300"
          />
          Map Call Response to Status
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={assignMatchingStaff}
            onChange={(e) => setAssignMatchingStaff(e.target.checked)}
            className="rounded text-blue-600 border-gray-300"
          />
          Auto-assign to matching executive
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={skipMissingRequired}
            onChange={(e) => setSkipMissingRequired(e.target.checked)}
            className="rounded text-blue-600 border-gray-300"
          />
          Skip rows with missing Name or Contact
        </label>
      </div>

      {/* Buttons */}
      <div className="mt-5 flex gap-3">
        <button
          onClick={() => setStep(1)}
          className="px-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          Back
        </button>
        <button
          onClick={handleApplyMapping}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm"
        >
          Apply Mapping & Preview Leads
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  // ============================================================
  // ─── STEP 3: Preview Data ───────────────────────────────────
  // ============================================================
  const renderStep3 = () => (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Preview Leads Data</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
            <span className="bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full">
              {previewData.length} Valid Leads
            </span>
            {invalidCount > 0 && (
              <span className="bg-red-100 text-red-700 font-semibold px-2.5 py-0.5 rounded-full">
                ⚠️ {invalidCount} Invalid Rows (Will be skipped)
              </span>
            )}
            <span className="text-gray-400">File: {fileName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invalidCount > 0 && (
            <button
              onClick={exportSkippedRows}
              className="px-3 py-1.5 text-xs text-orange-600 border border-orange-200 hover:bg-orange-50 rounded-lg flex items-center gap-1 font-medium"
            >
              <Download className="h-3.5 w-3.5" />
              Export Skipped ({invalidCount})
            </button>
          )}
          <button
            onClick={() => setStep(2)}
            disabled={uploading}
            className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg font-medium"
          >
            Adjust Mapping
          </button>
        </div>
      </div>

      {/* Preview Table */}
      <div className="max-h-[48vh] overflow-y-auto border border-gray-200 rounded-xl">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50 sticky top-0 z-10 uppercase text-gray-500 font-semibold">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Contact</th>
              <th className="px-3 py-2 text-left">Gender</th>
              <th className="px-3 py-2 text-left">Source (Type)</th>
              <th className="px-3 py-2 text-left">Rating</th>
              <th className="px-3 py-2 text-left">Status (Call Resp)</th>
              <th className="px-3 py-2 text-left">Next Follow-up</th>
              <th className="px-3 py-2 text-left">Budget</th>
              <th className="px-3 py-2 text-left">Executive</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {previewData.slice(0, UPLOAD_CONFIG.PREVIEW_ROWS).map((lead, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{lead.date || '—'}</td>
                <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{lead.name}</td>
                <td className="px-3 py-2 text-blue-600 font-mono whitespace-nowrap">{lead.contact}</td>
                <td className="px-3 py-2 text-gray-600">{lead.gender || '—'}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 capitalize">
                    {lead.followup_type || lead._source}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    lead._quality === 'hot' ? 'bg-red-100 text-red-700' :
                    lead._quality === 'cold' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {lead.rating || lead._quality}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full capitalize ${
                    lead._status === 'converted' ? 'bg-purple-100 text-purple-700' :
                    lead._status === 'interested' ? 'bg-green-100 text-green-700' :
                    lead._status === 'not_interested' ? 'bg-red-100 text-red-700' :
                    lead._status === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {lead.call_response || lead._status}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{lead.next_followup_date || '—'}</td>
                <td className="px-3 py-2 font-medium text-green-600">
                  {lead.budget ? `₹${lead.budget.toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                  {lead._assignedStaffName || lead.enquiry_owner_executive || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {previewData.length > UPLOAD_CONFIG.PREVIEW_ROWS && (
          <div className="py-2 text-xs text-gray-500 bg-gray-50 text-center border-t">
            Showing first {UPLOAD_CONFIG.PREVIEW_ROWS} of {previewData.length} valid leads
          </div>
        )}
      </div>

      {/* Action / Progress Box */}
      <div className="mt-5">
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={uploading ? handleCancelImport : handleImport}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-xs sm:text-sm shadow-md transition-all ${
              uploading ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing ({importProgress.current}/{importProgress.total})
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import {previewData.length} Leads Now
              </>
            )}
          </button>
        </div>

        {uploading && (
          <div className="mt-4 p-3 bg-blue-50/60 rounded-xl border border-blue-200">
            <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(importProgress.current / Math.max(1, importProgress.total)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-gray-600 mt-2">
              <span>Imported {importProgress.current} of {importProgress.total}</span>
              <button
                onClick={handleCancelImport}
                className="text-red-600 hover:underline font-semibold"
              >
                Stop Import
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================
  // ─── STEP 4: Import Complete Summary ────────────────────────
  // ============================================================
  const renderStep4 = () => (
    <div className="text-center py-4">
      {results?.failed === 0 && results?.skipped === 0 && invalidCount === 0 ? (
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
      ) : results?.success === 0 ? (
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
      ) : (
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="h-8 w-8 text-yellow-600" />
        </div>
      )}

      <h3 className="text-xl font-bold text-gray-900 mb-1">Lead Import Completed</h3>
      <p className="text-xs text-gray-500 mb-6">Summary of lead import results</p>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-xs text-green-700 font-semibold uppercase">Imported</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{results?.success || 0}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs text-red-700 font-semibold uppercase">Failed</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{results?.failed || 0}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-xs text-yellow-700 font-semibold uppercase">Skipped</p>
          <p className="text-2xl font-bold text-yellow-800 mt-1">{results?.skipped || 0}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-600 font-semibold uppercase">Invalid Rows</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{invalidCount}</p>
        </div>
      </div>

      {/* Error Breakdown if any */}
      {results?.errors && results.errors.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl mb-5 text-left text-xs max-w-2xl mx-auto">
          <div className="bg-gray-50 px-4 py-2 border-b font-semibold text-gray-700 sticky top-0">
            Error Details ({results.errors.length})
          </div>
          <table className="min-w-full divide-y divide-gray-100">
            <tbody className="divide-y divide-gray-100">
              {results.errors.slice(0, 50).map((err, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-medium text-gray-800">{err.lead}</td>
                  <td className="px-4 py-2 text-red-600">{err.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 max-w-md mx-auto">
        {(invalidCount > 0 || (results?.errors && results.errors.length > 0)) && (
          <button
            onClick={exportSkippedRows}
            className="flex-1 px-4 py-2.5 border border-orange-300 text-orange-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-orange-50 flex items-center justify-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export Skipped
          </button>
        )}
        <button
          onClick={handleClose}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm"
        >
          Done
        </button>
      </div>
    </div>
  );

  // ============================================================
  // 🏠 MAIN MODAL RENDER
  // ============================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-green-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Bulk Import Leads</h2>
              <p className="text-xs text-gray-400">
                {step === 1 && 'Upload file or download sample template'}
                {step === 2 && 'Step 1 of 3: Column Mapping'}
                {step === 3 && 'Step 2 of 3: Preview Data'}
                {step === 4 && 'Step 3 of 3: Import Complete'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
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

export default LeadBulkImportModal;
