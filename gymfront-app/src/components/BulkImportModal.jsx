// src/components/BulkImportModal.jsx
import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import api from '../services/api';

const BulkImportModal = ({ isOpen, onClose, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [step, setStep] = useState(1);
  const [plansCreated, setPlansCreated] = useState([]);
  
  // Use ref for cancellation to avoid state lag
  const isCancelledRef = useRef(false);
  const abortControllerRef = useRef(null);

  if (!isOpen) return null;

  // Helper: Parse date from DD/MM/YYYY to YYYY-MM-DD
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    
    const parts = dateStr.split(/[/-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) {
        year = `20${year}`;
      }
      return `${year}-${month}-${day}`;
    }
    
    if (!isNaN(dateStr)) {
      const excelDate = new Date((parseFloat(dateStr) - 25569) * 86400 * 1000);
      if (!isNaN(excelDate.getTime())) {
        return excelDate.toISOString().split('T')[0];
      }
    }
    
    const nativeDate = new Date(dateStr);
    if (!isNaN(nativeDate.getTime())) {
      return nativeDate.toISOString().split('T')[0];
    }
    
    return null;
  };

  // Helper: Extract duration from plan name
  const extractDuration = (planName) => {
    if (!planName) return { durationDays: 30, planType: 'monthly' };
    
    const lower = planName.toLowerCase();
    
    if (lower.includes('day')) {
      const match = planName.match(/(\d+)\s*day/);
      if (match) {
        return { durationDays: parseInt(match[1]), planType: 'monthly' };
      }
    }
    
    if (lower.includes('month') || lower.includes('mon')) {
      const match = planName.match(/(\d+)\s*month/);
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
    
    if (lower.includes('year')) {
      const match = planName.match(/(\d+)\s*year/);
      if (match) {
        const years = parseInt(match[1]);
        return { durationDays: years * 365, planType: 'yearly' };
      }
    }
    
    // Special cases
    if (lower.includes('1+1')) return { durationDays: 55, planType: 'monthly' };
    if (lower.includes('3+3')) return { durationDays: 180, planType: 'half_yearly' };
    if (lower.includes('6+6')) return { durationDays: 365, planType: 'yearly' };
    if (lower.includes('12+2')) return { durationDays: 420, planType: 'yearly' };
    if (lower.includes('12+1')) return { durationDays: 390, planType: 'yearly' };
    if (lower.includes('6+3')) return { durationDays: 235, planType: 'half_yearly' };
    if (lower.includes('6+4')) return { durationDays: 300, planType: 'yearly' };
    if (lower.includes('3+2')) return { durationDays: 150, planType: 'quarterly' };
    if (lower.includes('3+1')) return { durationDays: 120, planType: 'quarterly' };
    if (lower.includes('summer offer monthly')) return { durationDays: 30, planType: 'monthly' };
    if (lower.includes('pre monsoon')) return { durationDays: 60, planType: 'monthly' };
    
    return { durationDays: 30, planType: 'monthly' };
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Reset cancellation state when uploading new file
    isCancelledRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        const mappedData = jsonData.map(row => {
          const joinedDate = parseDate(row['Start Date'] || row['Start_Date'] || row['start_date'] || '');
          const membershipEnd = parseDate(row['End Date'] || row['End_Date'] || row['end_date'] || '');
          
          return {
            full_name: row['Full Name'] || row['Full_Name'] || row['full_name'] || '',
            email: row['Email'] || row['email'] || '',
            phone: row['Phone'] ? String(row['Phone']).trim() : '',
            joined_date: joinedDate,
            membership_end: membershipEnd,
            plan_name: row['Plan Name'] || row['Plan_Name'] || row['plan_name'] || row['Membership Type'] || '',
            status: row['Status']?.toLowerCase() === 'active' ? true : 
                    row['status']?.toLowerCase() === 'active' ? true : 
                    row['Status']?.toLowerCase() === 'inactive' ? false : true,
            gender: row['Gender'] || row['gender'] || 'male',
            address: row['Address'] || row['address'] || '',
            date_of_birth: row['Date of Birth'] || row['Date_Of_Birth'] || row['date_of_birth'] || '',
            emergency_contact_name: row['Emergency Contact'] || row['emergency_contact'] || '',
            emergency_contact_phone: row['Emergency Phone'] || row['emergency_phone'] || '',
            medical_conditions: row['Medical Conditions'] || row['medical_conditions'] || '',
            allergies: row['Allergies'] || row['allergies'] || '',
            medications: row['Medications'] || row['medications'] || '',
          };
        }).filter(m => m.full_name && m.phone);

        if (mappedData.length === 0) {
          toast.error('No valid data found. Please ensure "Full Name" and "Phone" columns exist.');
          return;
        }

        setPreviewData(mappedData);
        setStep(2);
        setResults(null);
        toast.success(`Loaded ${mappedData.length} members from file`);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse Excel file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
    setFile(selectedFile);
  };

  // Cancel import - stops the upload and goes back to preview
  const handleCancelImport = () => {
    // Set cancellation flag
    isCancelledRef.current = true;
    
    // Abort any ongoing API requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setUploading(false);
    toast.info('Import cancelled. You can review the data and try again.');
  };

  // Cancel and close - close the modal entirely
  const handleCancelAndClose = () => {
    if (uploading) {
      isCancelledRef.current = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setUploading(false);
    }
    handleClose();
  };

  const handleImport = async () => {
    // Reset cancellation flag
    isCancelledRef.current = false;
    setUploading(true);
    setImportProgress({ current: 0, total: previewData.length });
    const results = { success: 0, failed: 0, errors: [], plansCreated: [] };
    const createdPlans = [];
  
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
  
    try {
      // Step 1: Get existing plans
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
  
      // Step 2: Find unique plan names from Excel that don't exist
      const uniquePlans = [...new Set(previewData.map(m => m.plan_name).filter(Boolean))];
      const plansToCreate = uniquePlans.filter(name => {
        const cleanName = name.toLowerCase().trim();
        return !existingPlanMap[cleanName];
      });
  
      // Step 3: Create missing plans
      if (plansToCreate.length > 0 && !isCancelledRef.current) {
        toast.loading(`Creating ${plansToCreate.length} missing plans...`, { id: 'create-plans' });
        
        for (const planName of plansToCreate) {
          if (isCancelledRef.current) {
            toast.dismiss('create-plans');
            toast.info('Import cancelled during plan creation.');
            setUploading(false);
            setStep(2);
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
            
            console.log(`✅ Created plan: ${planName} (${durationDays} days, ${planType})`);
            
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
        setStep(2);
        return;
      }
  
      // Step 4: Get updated plan list
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
  
      // Step 5: Import members
      for (let i = 0; i < previewData.length; i++) {
        if (isCancelledRef.current) {
          toast.info('Import cancelled.');
          setUploading(false);
          setStep(2);
          return;
        }
  
        const member = previewData[i];
        setImportProgress({ current: i + 1, total: previewData.length });
  
        let membershipCreated = false;
  
        try {
          // Check if member already exists by phone
          const existingResponse = await api.get(`/gym/members?phone=${member.phone}`);
          const existingMembers = existingResponse.data || [];
          
          if (existingMembers.some(m => m.phone === member.phone)) {
            results.failed++;
            results.errors.push({ 
              member: member.full_name, 
              error: 'Member already exists with this phone number' 
            });
            continue;
          }
  
          // Determine if member should be active based on Excel status
          // If status is explicitly 'inactive' in Excel, set is_active to false
          // Otherwise, set to true (will be overridden by membership later)
          const shouldBeActive = member.status !== false;
          
          // Prepare member data
          const memberData = {
            full_name: member.full_name,
            phone: member.phone,
            gender: member.gender || 'male',
            // Set is_active based on Excel status, but backend will override based on membership
            is_active: shouldBeActive,
          };
  
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
  
          // Create member
          const memberResponse = await api.post('/gym/members', memberData);
          const newMember = memberResponse.data;
  
          // Find plan ID
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
  
          // Create membership ONLY if member should be active
          // If Excel status is 'inactive', don't create membership
          if (shouldBeActive && planId) {
            try {
              let startDate = member.joined_date;
              if (!startDate) {
                startDate = new Date().toISOString().split('T')[0];
              }
              
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
                const membershipPayload = {
                  member_id: newMember.id,
                  plan_id: planId,
                  start_date: startDate,
                  end_date: endDate,
                  amount_paid: 0,
                  discount_applied: 0,
                };
                
                await api.post('/gym/memberships', membershipPayload);
                membershipCreated = true;
                console.log(`✅ Created membership for ${member.full_name} with plan ${planName}`);
              } else {
                results.errors.push({
                  member: member.full_name,
                  error: 'No end date available for membership'
                });
              }
              
            } catch (membershipError) {
              console.error('Membership creation error:', membershipError);
              results.errors.push({
                member: member.full_name,
                error: `Membership assignment failed: ${membershipError.response?.data?.detail || membershipError.message}`
              });
            }
          } else if (shouldBeActive && !planId) {
            // Member should be active but no plan found
            results.errors.push({
              member: member.full_name,
              error: 'No plan found for membership'
            });
          } else {
            // Member is intentionally inactive - log it
            console.log(`ℹ️ Member ${member.full_name} imported as inactive (no membership created)`);
          }
  
          results.success++;
  
        } catch (error) {
          console.error('Error importing member:', error);
          results.failed++;
          results.errors.push({
            member: member.full_name,
            error: error.response?.data?.detail || error.message || 'Unknown error'
          });
        }
  
        await new Promise(resolve => setTimeout(resolve, 200));
      }
  
      if (isCancelledRef.current) {
        toast.info('Import cancelled.');
        setUploading(false);
        setStep(2);
        return;
      }
  
      setResults(results);
      setPlansCreated(createdPlans);
      setStep(3);
      
      let summaryMessage = `Import complete! ${results.success} members imported successfully.`;
      if (createdPlans.length > 0) {
        summaryMessage += ` Created ${createdPlans.length} new plans.`;
      }
      if (results.failed > 0) {
        summaryMessage += ` ${results.failed} failed.`;
      }
      toast.success(summaryMessage);
      
    } catch (error) {
      if (error.name === 'AbortError' || isCancelledRef.current) {
        toast.info('Import cancelled.');
        setStep(2);
      } else {
        console.error('Import error:', error);
        toast.error('Failed to import members: ' + (error.response?.data?.detail || error.message));
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleClose = () => {
    // Reset all state
    isCancelledRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setFile(null);
    setPreviewData([]);
    setResults(null);
    setPlansCreated([]);
    setStep(1);
    setImportProgress({ current: 0, total: 0 });
    setUploading(false);
    if (onImportComplete) onImportComplete();
    onClose();
  };

  // Render step 2 with Cancel button
  const renderStep2 = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Preview Import Data</h3>
          <p className="text-sm text-gray-500">{previewData.length} members found</p>
        </div>
        <button
          onClick={() => setStep(1)}
          className="text-sm text-blue-600 hover:text-blue-700"
          disabled={uploading}
        >
          Upload different file
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {previewData.slice(0, 50).map((member, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.full_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{member.phone}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{member.email || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{member.plan_name || '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${member.status !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {member.status !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {previewData.length > 50 && (
          <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 text-center">
            Showing first 50 of {previewData.length} members
          </div>
        )}
      </div>

      <div className="mt-4 bg-blue-50 rounded-lg p-3">
        <p className="text-sm text-blue-700">
          <strong>ℹ️ Import Process:</strong> Any plans that don't already exist in the system will be 
          automatically created with appropriate duration based on the plan name.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleCancelAndClose}
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
              <X className="h-4 w-4" />
              Stop Import ({importProgress.current}/{importProgress.total})
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

  // Render step 3 with Close button
  const renderStep3 = () => (
    <div>
      <div className="text-center mb-6">
        {results.failed === 0 ? (
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
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">{results.failed}</p>
          </div>
        </div>
        {plansCreated.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-blue-600">
              ✅ {plansCreated.length} new plans created
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Bulk Import Members
          </h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Excel File</h3>
              <p className="text-sm text-gray-500 mb-6">
                Upload an Excel file (.xlsx) with member data.
                <br />
                Required columns: <strong>Full Name, Phone</strong>
                <br />
                Optional: Email, Start Date, End Date, Plan Name, Status, Gender, Address, etc.
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">.xlsx, .xls files supported</p>
                </label>
              </div>

              <div className="mt-4 text-left bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700">Sample Format:</p>
                <pre className="text-xs text-gray-600 mt-2 overflow-x-auto whitespace-pre-wrap">
                  Full Name | Email | Phone | Start Date | End Date | Plan Name | Status
                  John Doe  | john@email.com | 9876543210 | 15/06/2026 | 30/11/2026 | WS 6 MONTHS PLAN | active
                </pre>
                <p className="text-xs text-gray-400 mt-2">
                  Note: Dates should be in DD/MM/YYYY format. Plans will be auto-created if they don't exist.
                </p>
              </div>
            </div>
          )}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;