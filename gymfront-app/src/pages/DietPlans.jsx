// src/pages/DietPlans.jsx - Complete Diet Plans and Body Measurements Page
// Updated with member search functionality

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Send,
  User,
  Calendar,
  Weight,
  Ruler,
  Activity,
  Utensils,
  Apple,
  Coffee,
  Sun,
  Moon,
  Droplet,
  Pill,
  X,
  Loader,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Menu as MenuIcon,
  ChevronDown,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  Users,
  Scale,
  Dumbbell,
  Heart,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DietPlans = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Diet Plans
  const [dietPlans, setDietPlans] = useState([]);
  const [selectedDietPlan, setSelectedDietPlan] = useState(null);
  const [showDietPlanModal, setShowDietPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Member Diet Plans
  const [memberDietPlans, setMemberDietPlans] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // Body Measurements
  const [measurements, setMeasurements] = useState([]);
  const [latestMeasurement, setLatestMeasurement] = useState(null);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState(null);
  
  // Summary
  const [summary, setSummary] = useState({
    totalDietPlans: 0,
    activeDietPlans: 0,
    membersWithDietPlans: 0,
    recentAssignments: []
  });
  
  // Form States
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    meal_plan: {
      breakfast: '',
      lunch: '',
      snack: '',
      dinner: '',
      hydration: '',
      supplements: '',
      notes: ''
    },
    calories: '',
    protein: '',
    carbs: '',
    fats: ''
  });
  
  const [assignmentForm, setAssignmentForm] = useState({
    member_id: '',
    diet_plan_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    custom_meal_plan: null,
    restrictions: '',
    goals: '',
    notes: ''
  });
  
  const [measurementForm, setMeasurementForm] = useState({
    measurement_date: new Date().toISOString().split('T')[0],
    weight: '',
    height: '',
    chest: '',
    waist: '',
    hips: '',
    biceps_left: '',
    biceps_right: '',
    thighs_left: '',
    thighs_right: '',
    calves_left: '',
    calves_right: '',
    neck: '',
    shoulders: '',
    forearms_left: '',
    forearms_right: '',
    body_fat_percentage: '',
    muscle_mass: '',
    visceral_fat: '',
    basal_metabolic_rate: '',
    notes: '',
    photos: []
  });

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch members with search
  const fetchMembers = useCallback(async (search = '') => {
    setMembersLoading(true);
    try {
      const params = search ? { search, limit: 20 } : { limit: 20 };
      const response = await api.get('/gym/members/optimized', { params });
      if (response.data && response.data.items) {
        setMembers(response.data.items);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2 || searchTerm === '') {
        fetchMembers(searchTerm);
        if (searchTerm.length >= 2) {
          setShowMemberDropdown(true);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchMembers]);

  // Fetch diet plans
  const fetchDietPlans = useCallback(async () => {
    try {
      const response = await api.get('/gym/diet-plans');
      setDietPlans(response.data || []);
    } catch (error) {
      console.error('Error fetching diet plans:', error);
      toast.error('Failed to load diet plans');
    }
  }, []);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.get('/gym/diet-plans/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, []);

  // Fetch member diet plans when a member is selected
  const fetchMemberDietPlans = useCallback(async (memberId) => {
    if (!memberId) return;
    try {
      const response = await api.get(`/gym/members/${memberId}/diet-plans`);
      setMemberDietPlans(response.data || []);
    } catch (error) {
      console.error('Error fetching member diet plans:', error);
      toast.error('Failed to load member diet plans');
    }
  }, []);

  // Fetch measurements for a member
  const fetchMeasurements = useCallback(async (memberId) => {
    if (!memberId) return;
    try {
      const response = await api.get(`/gym/members/${memberId}/measurements?limit=20`);
      setMeasurements(response.data || []);
      
      // Get latest measurement
      if (response.data && response.data.length > 0) {
        setLatestMeasurement(response.data[0]);
      } else {
        setLatestMeasurement(null);
      }
    } catch (error) {
      console.error('Error fetching measurements:', error);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    fetchDietPlans();
    fetchSummary();
    fetchMembers();
  }, [fetchDietPlans, fetchSummary, fetchMembers]);

  // Create diet plan
  const createDietPlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        ...planForm,
        meal_plan: planForm.meal_plan
      };
      
      const response = await api.post('/gym/diet-plans', payload);
      toast.success('Diet plan created successfully');
      setShowDietPlanModal(false);
      resetPlanForm();
      fetchDietPlans();
      fetchSummary();
    } catch (error) {
      console.error('Error creating diet plan:', error);
      toast.error(error.response?.data?.detail || 'Failed to create diet plan');
    } finally {
      setLoading(false);
    }
  };

  // Update diet plan
  const updateDietPlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        ...planForm,
        meal_plan: planForm.meal_plan
      };
      
      await api.put(`/gym/diet-plans/${editingPlan.id}`, payload);
      toast.success('Diet plan updated successfully');
      setShowDietPlanModal(false);
      resetPlanForm();
      fetchDietPlans();
      fetchSummary();
    } catch (error) {
      console.error('Error updating diet plan:', error);
      toast.error(error.response?.data?.detail || 'Failed to update diet plan');
    } finally {
      setLoading(false);
    }
  };

  // Delete diet plan
  const deleteDietPlan = async (planId) => {
    if (!confirm('Are you sure you want to delete this diet plan?')) return;
    
    try {
      await api.delete(`/gym/diet-plans/${planId}`);
      toast.success('Diet plan deleted successfully');
      fetchDietPlans();
      fetchSummary();
    } catch (error) {
      console.error('Error deleting diet plan:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete diet plan');
    }
  };

  // Assign diet plan to member
  const assignDietPlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        member_id: parseInt(assignmentForm.member_id),
        diet_plan_id: parseInt(assignmentForm.diet_plan_id),
        start_date: assignmentForm.start_date,
        end_date: assignmentForm.end_date || null,
        custom_meal_plan: assignmentForm.custom_meal_plan,
        restrictions: assignmentForm.restrictions || null,
        goals: assignmentForm.goals || null,
        notes: assignmentForm.notes || null,
        assigned_date: new Date().toISOString().split('T')[0]
      };
      
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          payload[key] = null;
        }
      });
      
      const response = await api.post(`/gym/members/${payload.member_id}/diet-plans`, payload);
      console.log('Assignment response:', response.data);
      
      // Check if WhatsApp was sent
      if (response.data.whatsapp_sent) {
        toast.success('Diet plan assigned successfully! Diet chart sent via WhatsApp 📱');
      } else {
        const errorMsg = response.data.whatsapp_error || 'Unknown error';
        toast.success(`Diet plan assigned successfully! But WhatsApp message failed: ${errorMsg}`);
        console.warn('WhatsApp send failed:', errorMsg);
      }
      
      setShowAssignModal(false);
      resetAssignmentForm();
      fetchSummary();
      
      if (selectedMember) {
        fetchMemberDietPlans(selectedMember.id);
      }
    } catch (error) {
      console.error('Error assigning diet plan:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to assign diet plan');
    } finally {
      setLoading(false);
    }
  };
  

  // Send diet chart via WhatsApp
  const sendDietChart = async (memberId, assignmentId, memberName) => {
    if (!confirm(`Send diet chart to ${memberName} via WhatsApp?`)) return;
    
    try {
      const response = await api.post(`/gym/members/${memberId}/diet-plans/${assignmentId}/send`);
      toast.success('Diet chart sent successfully via WhatsApp');
    } catch (error) {
      console.error('Error sending diet chart:', error);
      toast.error(error.response?.data?.detail || 'Failed to send diet chart');
    }
  };

  // Add measurement
  const addMeasurement = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        measurement_date: measurementForm.measurement_date,
        weight: measurementForm.weight ? parseFloat(measurementForm.weight) : null,
        height: measurementForm.height ? parseFloat(measurementForm.height) : null,
        chest: measurementForm.chest ? parseFloat(measurementForm.chest) : null,
        waist: measurementForm.waist ? parseFloat(measurementForm.waist) : null,
        hips: measurementForm.hips ? parseFloat(measurementForm.hips) : null,
        biceps_left: measurementForm.biceps_left ? parseFloat(measurementForm.biceps_left) : null,
        biceps_right: measurementForm.biceps_right ? parseFloat(measurementForm.biceps_right) : null,
        thighs_left: measurementForm.thighs_left ? parseFloat(measurementForm.thighs_left) : null,
        thighs_right: measurementForm.thighs_right ? parseFloat(measurementForm.thighs_right) : null,
        calves_left: measurementForm.calves_left ? parseFloat(measurementForm.calves_left) : null,
        calves_right: measurementForm.calves_right ? parseFloat(measurementForm.calves_right) : null,
        neck: measurementForm.neck ? parseFloat(measurementForm.neck) : null,
        shoulders: measurementForm.shoulders ? parseFloat(measurementForm.shoulders) : null,
        forearms_left: measurementForm.forearms_left ? parseFloat(measurementForm.forearms_left) : null,
        forearms_right: measurementForm.forearms_right ? parseFloat(measurementForm.forearms_right) : null,
        body_fat_percentage: measurementForm.body_fat_percentage ? parseFloat(measurementForm.body_fat_percentage) : null,
        muscle_mass: measurementForm.muscle_mass ? parseFloat(measurementForm.muscle_mass) : null,
        visceral_fat: measurementForm.visceral_fat ? parseFloat(measurementForm.visceral_fat) : null,
        basal_metabolic_rate: measurementForm.basal_metabolic_rate ? parseInt(measurementForm.basal_metabolic_rate) : null,
        notes: measurementForm.notes || '',
        photos: measurementForm.photos || []
      };
      
      // Calculate BMI if weight and height provided
      if (payload.weight && payload.height) {
        const heightM = payload.height / 100;
        if (heightM > 0) {
          payload.bmi = Math.round((payload.weight / (heightM * heightM)) * 10) / 10;
        }
      }
      
      // Filter out any remaining empty strings
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          payload[key] = null;
        }
      });
      
      const response = await api.post(`/gym/members/${selectedMember.id}/measurements`, payload);
      toast.success('Measurement added successfully');
      setShowMeasurementModal(false);
      resetMeasurementForm();
      fetchMeasurements(selectedMember.id);
    } catch (error) {
      console.error('Error adding measurement:', error);
      toast.error(error.response?.data?.detail || 'Failed to add measurement');
    } finally {
      setLoading(false);
    }
  };

  // Reset forms
  const resetPlanForm = () => {
    setPlanForm({
      name: '',
      description: '',
      meal_plan: {
        breakfast: '',
        lunch: '',
        snack: '',
        dinner: '',
        hydration: '',
        supplements: '',
        notes: ''
      },
      calories: '',
      protein: '',
      carbs: '',
      fats: ''
    });
    setEditingPlan(null);
  };

  const resetAssignmentForm = () => {
    setAssignmentForm({
      member_id: '',
      diet_plan_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      custom_meal_plan: null,
      restrictions: '',
      goals: '',
      notes: ''
    });
  };

  const resetMeasurementForm = () => {
    setMeasurementForm({
      measurement_date: new Date().toISOString().split('T')[0],
      weight: '',
      height: '',
      chest: '',
      waist: '',
      hips: '',
      biceps_left: '',
      biceps_right: '',
      thighs_left: '',
      thighs_right: '',
      calves_left: '',
      calves_right: '',
      neck: '',
      shoulders: '',
      forearms_left: '',
      forearms_right: '',
      body_fat_percentage: '',
      muscle_mass: '',
      visceral_fat: '',
      basal_metabolic_rate: '',
      notes: '',
      photos: []
    });
    setEditingMeasurement(null);
  };

  // Edit plan handler
  const editPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      meal_plan: typeof plan.meal_plan === 'string' ? JSON.parse(plan.meal_plan) : plan.meal_plan,
      calories: plan.calories || '',
      protein: plan.protein || '',
      carbs: plan.carbs || '',
      fats: plan.fats || ''
    });
    setShowDietPlanModal(true);
  };

  // Select member handler
  const selectMember = (member) => {
    setSelectedMember(member);
    setSearchTerm(member.full_name);
    setShowMemberDropdown(false);
    fetchMemberDietPlans(member.id);
    fetchMeasurements(member.id);
    
    // Also update assignment form if it's open
    setAssignmentForm(prev => ({
      ...prev,
      member_id: member.id.toString()
    }));
  };

  // Render member dropdown
  const renderMemberDropdown = () => {
    if (!showMemberDropdown) return null;
    
    const filteredMembers = members.filter(m => 
      m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone?.includes(searchTerm) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id?.toString() === searchTerm
    );
    
    if (filteredMembers.length === 0) {
      return (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          <div className="p-4 text-center text-gray-500">
            {membersLoading ? (
              <Loader className="h-6 w-6 animate-spin mx-auto" />
            ) : (
              'No members found'
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto" ref={dropdownRef}>
        {filteredMembers.map((member) => (
          <button
            key={member.id}
            onClick={() => {
              // Update both selectedMember and assignment form
              setSelectedMember(member);
              setSearchTerm(member.full_name);
              setShowMemberDropdown(false);
              
              // If assignment modal is open, update the form
              if (showAssignModal) {
                setAssignmentForm(prev => ({
                  ...prev,
                  member_id: member.id.toString()
                }));
              }
              
              // Fetch data for the member
              fetchMemberDietPlans(member.id);
              fetchMeasurements(member.id);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              {member.full_name?.charAt(0) || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{member.full_name}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {member.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {member.phone}
                  </span>
                )}
                {member.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {member.status || 'inactive'}
                </span>
              </div>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </div>
    );
  };

  // Render diet plan card
  const renderDietPlanCard = (plan) => {
    const mealPlan = typeof plan.meal_plan === 'string' ? JSON.parse(plan.meal_plan) : plan.meal_plan;
    const mealCount = Object.values(mealPlan).filter(v => v && v.trim()).length;
    
    return (
      <div key={plan.id} className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-all border border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 truncate">{plan.name}</h4>
            {plan.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{plan.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button
              onClick={() => editPlan(plan)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => deleteDietPlan(plan.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Utensils className="h-4 w-4 text-gray-400" />
            <span>{mealCount} meal sections</span>
            {plan.calories && (
              <>
                <span className="text-gray-300">|</span>
                <span>{plan.calories} kcal</span>
              </>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1">
            {plan.protein && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Protein: {plan.protein}g</span>
            )}
            {plan.carbs && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Carbs: {plan.carbs}g</span>
            )}
            {plan.fats && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Fats: {plan.fats}g</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render measurements
  const renderMeasurements = () => {
    if (!measurements.length) {
      return (
        <div className="text-center py-12">
          <Scale className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No measurements recorded yet</p>
          <button
            onClick={() => setShowMeasurementModal(true)}
            className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Add first measurement →
          </button>
        </div>
      );
    }

    return (
      <div>
        {/* Latest measurement summary */}
        {latestMeasurement && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Latest Measurement</span>
                <span className="text-sm text-gray-500">
                  {format(new Date(latestMeasurement.measurement_date), 'MMM d, yyyy')}
                </span>
              </div>
              <button
                onClick={() => setShowMeasurementModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add New
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {latestMeasurement.weight && (
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Weight</p>
                  <p className="font-bold text-blue-600">{latestMeasurement.weight} kg</p>
                </div>
              )}
              {latestMeasurement.bmi && (
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">BMI</p>
                  <p className="font-bold text-blue-600">{latestMeasurement.bmi}</p>
                </div>
              )}
              {latestMeasurement.body_fat_percentage && (
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Body Fat</p>
                  <p className="font-bold text-blue-600">{latestMeasurement.body_fat_percentage}%</p>
                </div>
              )}
              {latestMeasurement.chest && latestMeasurement.waist && (
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Chest/Waist</p>
                  <p className="font-bold text-blue-600">{latestMeasurement.chest}/{latestMeasurement.waist}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Measurement history */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Weight</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">BMI</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Chest</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Waist</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Hips</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Body Fat</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">{format(new Date(m.measurement_date), 'MMM d, yyyy')}</td>
                  <td className="py-2 px-3 font-medium">{m.weight || '-'} kg</td>
                  <td className="py-2 px-3">{m.bmi || '-'}</td>
                  <td className="py-2 px-3">{m.chest || '-'}</td>
                  <td className="py-2 px-3">{m.waist || '-'}</td>
                  <td className="py-2 px-3">{m.hips || '-'}</td>
                  <td className="py-2 px-3">{m.body_fat_percentage || '-'}%</td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => {
                        toast.info(`Measurement from ${format(new Date(m.measurement_date), 'MMM d, yyyy')}`);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Overview tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Diet Plans</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalDietPlans || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Utensils className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Plans</p>
              <p className="text-2xl font-bold text-gray-900">{summary.activeDietPlans || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Members with Diet Plans</p>
              <p className="text-2xl font-bold text-gray-900">{summary.membersWithDietPlans || 0}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Recent Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{summary.recentAssignments?.length || 0}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Assignments */}
      {summary.recentAssignments && summary.recentAssignments.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Recent Diet Plan Assignments
          </h3>
          <div className="space-y-3">
            {summary.recentAssignments.slice(0, 5).map((assignment, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                    {assignment.member_name?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{assignment.member_name}</p>
                    <p className="text-sm text-gray-500">{assignment.diet_plan_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {format(new Date(assignment.assigned_date), 'MMM d, yyyy')}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    assignment.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {assignment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => {
            setEditingPlan(null);
            resetPlanForm();
            setShowDietPlanModal(true);
          }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 hover:shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <Plus className="h-6 w-6" />
            <div className="text-left">
              <p className="font-semibold">Create Diet Plan</p>
              <p className="text-sm text-blue-100">Design a new diet template</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => setShowAssignModal(true)}
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4 hover:shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <User className="h-6 w-6" />
            <div className="text-left">
              <p className="font-semibold">Assign Diet Plan</p>
              <p className="text-sm text-purple-100">Assign to a member</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => {
            setShowMeasurementModal(true);
          }}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4 hover:shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6" />
            <div className="text-left">
              <p className="font-semibold">Add Measurement</p>
              <p className="text-sm text-green-100">Track member progress</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  // Diet Plans tab
  const renderDietPlansTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search diet plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setEditingPlan(null);
            resetPlanForm();
            setShowDietPlanModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          New Diet Plan
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dietPlans
          .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(renderDietPlanCard)}
      </div>
      
      {dietPlans.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <Utensils className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">No Diet Plans Yet</h3>
          <p className="text-gray-500 mt-2">Create your first diet plan to get started</p>
          <button
            onClick={() => {
              setEditingPlan(null);
              resetPlanForm();
              setShowDietPlanModal(true);
            }}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Diet Plan
          </button>
        </div>
      )}
    </div>
  );

  // Measurements tab (needs member selection)
  const renderMeasurementsTab = () => (
    <div className="space-y-4">
      {/* Member selector with search */}
      <div className="bg-white rounded-xl shadow-lg p-5">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Member</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, phone, email or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  if (searchTerm.length >= 2) {
                    setShowMemberDropdown(true);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {selectedMember && (
                <button
                  onClick={() => {
                    setSelectedMember(null);
                    setSearchTerm('');
                    setMemberDietPlans([]);
                    setMeasurements([]);
                    setLatestMeasurement(null);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {membersLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              )}
            </div>
            {renderMemberDropdown()}
          </div>
          
          {selectedMember && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                  {selectedMember.full_name?.charAt(0) || 'M'}
                </div>
                <span className="font-medium text-gray-900">{selectedMember.full_name}</span>
              </div>
              <button
                onClick={() => setShowMeasurementModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Add Measurement
              </button>
              <button
                onClick={() => {
                  toast.info(`Viewing progress for ${selectedMember.full_name}`);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <BarChart3 className="h-4 w-4" />
                Progress
              </button>
            </div>
          )}
        </div>
      </div>
      
      {selectedMember ? (
        <>
          {/* Member Diet Plans */}
          {memberDietPlans.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Utensils className="h-5 w-5 text-blue-600" />
                Active Diet Plan
              </h3>
              {memberDietPlans.filter(p => p.status === 'active').map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="font-medium text-gray-900">{plan.diet_plan_name}</p>
                    <p className="text-sm text-gray-600">
                      Assigned: {format(new Date(plan.assigned_date), 'MMM d, yyyy')}
                    </p>
                    {plan.end_date && (
                      <p className="text-sm text-gray-600">
                        Until: {format(new Date(plan.end_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => sendDietChart(selectedMember.id, plan.id, selectedMember.full_name)}
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                  >
                    <Send className="h-3 w-3" />
                    Send Diet Chart
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Measurements */}
          <div className="bg-white rounded-xl shadow-lg p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Scale className="h-5 w-5 text-purple-600" />
              Body Measurements
            </h3>
            {renderMeasurements()}
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">Select a Member</h3>
          <p className="text-gray-500 mt-2">Search and select a member to view and manage their measurements</p>
        </div>
      )}
    </div>
  );

  // Diet Plan Modal
  const renderDietPlanModal = () => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {editingPlan ? 'Edit Diet Plan' : 'Create New Diet Plan'}
          </h2>
          <button
            onClick={() => setShowDietPlanModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={editingPlan ? updateDietPlan : createDietPlan} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
              <input
                type="text"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
              <input
                type="number"
                value={planForm.calories}
                onChange={(e) => setPlanForm({ ...planForm, calories: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="kcal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Protein</label>
              <input
                type="number"
                value={planForm.protein}
                onChange={(e) => setPlanForm({ ...planForm, protein: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="g"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carbs</label>
              <input
                type="number"
                value={planForm.carbs}
                onChange={(e) => setPlanForm({ ...planForm, carbs: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="g"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fats</label>
              <input
                type="number"
                value={planForm.fats}
                onChange={(e) => setPlanForm({ ...planForm, fats: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="g"
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-orange-500" />
              <label className="text-sm font-medium text-gray-700">Breakfast</label>
            </div>
            <textarea
              value={planForm.meal_plan.breakfast}
              onChange={(e) => setPlanForm({
                ...planForm,
                meal_plan: { ...planForm.meal_plan, breakfast: e.target.value }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="e.g., 2 eggs, 30g oats, 1 banana"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-yellow-500" />
              <label className="text-sm font-medium text-gray-700">Lunch</label>
            </div>
            <textarea
              value={planForm.meal_plan.lunch}
              onChange={(e) => setPlanForm({
                ...planForm,
                meal_plan: { ...planForm.meal_plan, lunch: e.target.value }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="e.g., 200g chicken, 100g rice, salad"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Apple className="h-5 w-5 text-red-500" />
              <label className="text-sm font-medium text-gray-700">Snack</label>
            </div>
            <textarea
              value={planForm.meal_plan.snack}
              onChange={(e) => setPlanForm({
                ...planForm,
                meal_plan: { ...planForm.meal_plan, snack: e.target.value }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="e.g., 1 apple, 10 almonds, Greek yogurt"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-500" />
              <label className="text-sm font-medium text-gray-700">Dinner</label>
            </div>
            <textarea
              value={planForm.meal_plan.dinner}
              onChange={(e) => setPlanForm({
                ...planForm,
                meal_plan: { ...planForm.meal_plan, dinner: e.target.value }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="e.g., 150g fish, vegetables"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Droplet className="h-5 w-5 text-blue-500" />
              <label className="text-sm font-medium text-gray-700">Hydration</label>
            </div>
            <textarea
              value={planForm.meal_plan.hydration}
              onChange={(e) => setPlanForm({
                ...planForm,
                meal_plan: { ...planForm.meal_plan, hydration: e.target.value }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="e.g., 2-3 liters water, herbal tea"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-purple-500" />
              <label className="text-sm font-medium text-gray-700">Supplements</label>
            </div>
            <textarea
              value={planForm.meal_plan.supplements}
              onChange={(e) => setPlanForm({
                ...planForm,
                meal_plan: { ...planForm.meal_plan, supplements: e.target.value }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="e.g., Whey protein, Multivitamin, Omega-3"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Additional Notes</label>
            </div>
            <textarea
              value={planForm.meal_plan.notes}
              onChange={(e) => setPlanForm({
                ...planForm,
                meal_plan: { ...planForm.meal_plan, notes: e.target.value }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="Any additional notes..."
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowDietPlanModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader className="h-4 w-4 animate-spin" />}
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Assign Diet Plan Modal
const renderAssignModal = () => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Assign Diet Plan</h2>
          <button
            onClick={() => {
              setShowAssignModal(false);
              setSearchTerm(''); // Reset search term when closing
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={assignDietPlan} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef} // Add this ref
                type="text"
                placeholder="Search by name, phone, email or ID..."
                value={searchTerm} // Bind to searchTerm state
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // Clear member selection if search term changes
                  if (assignmentForm.member_id) {
                    setAssignmentForm({ ...assignmentForm, member_id: '' });
                  }
                }}
                onFocus={() => {
                  if (searchTerm.length >= 2) {
                    setShowMemberDropdown(true);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              {assignmentForm.member_id && (
                <button
                  onClick={() => {
                    setAssignmentForm({ ...assignmentForm, member_id: '' });
                    setSearchTerm('');
                  }}
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {membersLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              )}
            </div>
            {renderMemberDropdown()} {/* This will show the dropdown */}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diet Plan *</label>
            <select
              value={assignmentForm.diet_plan_id}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, diet_plan_id: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a diet plan...</option>
              {dietPlans.filter(p => p.status === 'active').map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={assignmentForm.start_date}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, start_date: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={assignmentForm.end_date}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, end_date: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Restrictions</label>
            <textarea
              value={assignmentForm.restrictions}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, restrictions: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="e.g., Allergic to nuts, Lactose intolerant"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
            <textarea
              value={assignmentForm.goals}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, goals: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="e.g., Weight loss 10kg, Build muscle, Improve endurance"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={assignmentForm.notes}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="Any additional notes..."
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowAssignModal(false);
                setSearchTerm('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader className="h-4 w-4 animate-spin" />}
              Assign Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Measurement Modal
  const renderMeasurementModal = () => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {selectedMember ? `Add Measurement for ${selectedMember.full_name}` : 'Add Body Measurement'}
          </h2>
          <button
            onClick={() => setShowMeasurementModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={addMeasurement} className="p-6 space-y-4">
          {!selectedMember && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search member..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value.length >= 2) {
                      setShowMemberDropdown(true);
                    }
                  }}
                  onFocus={() => {
                    if (searchTerm.length >= 2) {
                      setShowMemberDropdown(true);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                {renderMemberDropdown()}
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Date *</label>
            <input
              type="date"
              value={measurementForm.measurement_date}
              onChange={(e) => setMeasurementForm({ ...measurementForm, measurement_date: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={measurementForm.weight ?? ''}
                onChange={(e) => setMeasurementForm({ ...measurementForm, weight: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 75.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
              <input
                type="number"
                step="0.1"
                value={measurementForm.height ?? ''}
                onChange={(e) => setMeasurementForm({ ...measurementForm, height: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 175"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body Fat %</label>
              <input
                type="number"
                step="0.1"
                value={measurementForm.body_fat_percentage ?? ''}
                onChange={(e) => setMeasurementForm({ ...measurementForm, body_fat_percentage: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 18.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Muscle Mass (kg)</label>
              <input
                type="number"
                step="0.1"
                value={measurementForm.muscle_mass ?? ''}
                onChange={(e) => setMeasurementForm({ ...measurementForm, muscle_mass: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 35"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chest (cm)</label>
              <input
                type="number"
                step="0.5"
                value={measurementForm.chest ?? ''}
                onChange={(e) => setMeasurementForm({ ...measurementForm, chest: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 110"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Waist (cm)</label>
              <input
                type="number"
                step="0.5"
                value={measurementForm.waist ?? ''}
                onChange={(e) => setMeasurementForm({ ...measurementForm, waist: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 85"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hips (cm)</label>
              <input
                type="number"
                step="0.5"
                value={measurementForm.hips ?? ''}
                onChange={(e) => setMeasurementForm({ ...measurementForm, hips: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Biceps L (cm)</label>
              <input
                type="number"
                step="0.5"
                value={measurementForm.biceps_left ?? ''}
                onChange={(e) => setMeasurementForm({ ...measurementForm, biceps_left: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 35"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Biceps R (cm)</label>
              <input
                type="number"
                step="0.5"
                value={measurementForm.biceps_right ?? ''}
                onChange={(e) => setMeasurementForm({ ...measurementForm, biceps_right: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 35"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Neck (cm)</label>
              <input
                type="number"
                step="0.5"
                value={measurementForm.neck ?? ''}
                onChange={(e) => setMeasurementForm({ ...measurementForm, neck: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 38"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={measurementForm.notes}
              onChange={(e) => setMeasurementForm({ ...measurementForm, notes: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="Any notes about this measurement..."
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowMeasurementModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader className="h-4 w-4 animate-spin" />}
              Add Measurement
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg p-1 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </div>
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'plans'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Diet Plans
          </div>
        </button>
        <button
          onClick={() => setActiveTab('measurements')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'measurements'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Measurements
          </div>
        </button>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'plans' && renderDietPlansTab()}
      {activeTab === 'measurements' && renderMeasurementsTab()}
      
      {/* Modals */}
      {showDietPlanModal && renderDietPlanModal()}
      {showAssignModal && renderAssignModal()}
      {showMeasurementModal && renderMeasurementModal()}
    </div>
  );
};

export default DietPlans;