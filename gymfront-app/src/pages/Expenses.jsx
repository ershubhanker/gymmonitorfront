import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Edit, Trash2, X, Calendar,
  IndianRupee, Download, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, TrendingUp, TrendingDown,
  Wallet, Building, Wrench, Dumbbell, Users,
  Zap, ShoppingBag, GraduationCap, MoreHorizontal,
  Eye, Upload, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ExpenseModal = ({ isOpen, onClose, onSave, expense = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    category: 'maintenance',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    vendor_name: '',
    invoice_number: ''
  });
  const [saving, setSaving] = useState(false);

  const categories = [
    { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'text-orange-600' },
    { value: 'equipment', label: 'Equipment', icon: Dumbbell, color: 'text-blue-600' },
    { value: 'salary', label: 'Salary', icon: Users, color: 'text-green-600' },
    { value: 'utilities', label: 'Utilities', icon: Zap, color: 'text-yellow-600' },
    { value: 'rent', label: 'Rent', icon: Building, color: 'text-purple-600' },
    { value: 'marketing', label: 'Marketing', icon: TrendingUp, color: 'text-pink-600' },
    { value: 'supplies', label: 'Supplies', icon: ShoppingBag, color: 'text-indigo-600' },
    { value: 'training', label: 'Training', icon: GraduationCap, color: 'text-cyan-600' },
    { value: 'other', label: 'Other', icon: MoreHorizontal, color: 'text-gray-600' }
  ];

  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title || '',
        description: expense.description || '',
        amount: expense.amount?.toString() || '',
        category: expense.category || 'maintenance',
        expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
        payment_method: expense.payment_method || 'cash',
        vendor_name: expense.vendor_name || '',
        invoice_number: expense.invoice_number || ''
      });
    }
  }, [expense]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter expense title');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!formData.expense_date) {
      toast.error('Please select expense date');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., AC Repair, Staff Salary, New Treadmill"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                        formData.category === cat.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300 text-gray-600'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${formData.category === cat.value ? cat.color : 'text-gray-400'}`} />
                      <span className="text-sm">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Name
                </label>
                <input
                  type="text"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Vendor/Supplier name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice/Receipt Number
              </label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Additional details about this expense"
              />
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {expense ? 'Update Expense' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [summary, setSummary] = useState(null);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const categories = [
    { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'bg-orange-100 text-orange-700' },
    { value: 'equipment', label: 'Equipment', icon: Dumbbell, color: 'bg-blue-100 text-blue-700' },
    { value: 'salary', label: 'Salary', icon: Users, color: 'bg-green-100 text-green-700' },
    { value: 'utilities', label: 'Utilities', icon: Zap, color: 'bg-yellow-100 text-yellow-700' },
    { value: 'rent', label: 'Rent', icon: Building, color: 'bg-purple-100 text-purple-700' },
    { value: 'marketing', label: 'Marketing', icon: TrendingUp, color: 'bg-pink-100 text-pink-700' },
    { value: 'supplies', label: 'Supplies', icon: ShoppingBag, color: 'bg-indigo-100 text-indigo-700' },
    { value: 'training', label: 'Training', icon: GraduationCap, color: 'bg-cyan-100 text-cyan-700' },
    { value: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-700' }
  ];

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', '1000');

      const response = await api.get(`/gym/expenses?${params.toString()}`);
      setExpenses(response.data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response = await api.get(`/gym/expenses/summary?${params.toString()}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
  }, [startDate, endDate, selectedCategory, searchTerm]);

  const handleAddExpense = async (expenseData) => {
    try {
      const response = await api.post('/gym/expenses', expenseData);
      toast.success('Expense added successfully');
      fetchExpenses();
      fetchSummary();
      return response.data;
    } catch (error) {
      console.error('Add expense error:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to add expense';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleUpdateExpense = async (expenseData) => {
    try {
      const response = await api.put(`/gym/expenses/${selectedExpense.id}`, expenseData);
      toast.success('Expense updated successfully');
      fetchExpenses();
      fetchSummary();
      return response.data;
    } catch (error) {
      console.error('Update expense error:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update expense';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm(`Delete expense "${expense.title}"? This action cannot be undone.`)) return;
    
    try {
      await api.delete(`/gym/expenses/${expense.id}`);
      toast.success('Expense deleted successfully');
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      console.error('Delete expense error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete expense');
    }
  };

  const handleExport = () => {
    const filteredExpenses = expenses.filter(expense => {
      if (selectedCategory && expense.category !== selectedCategory) return false;
      if (searchTerm && !expense.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !expense.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    const csv = [
      ['Date', 'Title', 'Category', 'Amount (₹)', 'Payment Method', 'Vendor', 'Invoice #', 'Description'],
      ...filteredExpenses.map(e => [
        e.expense_date,
        e.title,
        e.category,
        e.amount,
        e.payment_method || '',
        e.vendor_name || '',
        e.invoice_number || '',
        e.description || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Export started');
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCategory('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const getCategoryDetails = (categoryValue) => {
    return categories.find(c => c.value === categoryValue) || categories[8];
  };

  const filteredExpenses = expenses.filter(expense => {
    if (selectedCategory && expense.category !== selectedCategory) return false;
    if (searchTerm && !expense.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !expense.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const averageAmount = filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
        <p className="text-gray-500 mt-1">Track and manage all gym expenses</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{filteredExpenses.length} transactions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Expense</p>
              <p className="text-2xl font-bold text-gray-900">₹{averageAmount.toFixed(0)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Per transaction</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.expenses_by_category ? Object.keys(summary.expenses_by_category).length : 0}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Filter className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Active categories</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Date Range</p>
              <p className="text-sm font-medium text-gray-900">
                {startDate || 'All time'} {endDate && `- ${endDate}`}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs text-blue-600 hover:text-blue-700 mt-2"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Start Date"
            />
          </div>

          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="End Date"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => { setSelectedExpense(null); setIsModalOpen(true); }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* Category-wise Breakdown */}
      {summary?.expenses_by_category && Object.keys(summary.expenses_by_category).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
            {Object.entries(summary.expenses_by_category).map(([category, amount]) => {
              const catDetails = getCategoryDetails(category);
              const Icon = catDetails.icon;
              return (
                <div key={category} className="p-3 bg-gray-50 rounded-lg text-center">
                  <Icon className={`h-6 w-6 mx-auto mb-2 ${catDetails.color.split(' ')[2]}`} />
                  <p className="text-xs text-gray-600">{catDetails.label}</p>
                  <p className="text-sm font-bold text-gray-900">₹{typeof amount === 'number' ? amount.toLocaleString() : amount}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : paginatedExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No expenses found
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((expense) => {
                  const catDetails = getCategoryDetails(expense.category);
                  const Icon = catDetails.icon;
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{expense.title}</p>
                          {expense.description && (
                            <p className="text-xs text-gray-500 mt-1">{expense.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${catDetails.color}`}>
                          <Icon className="h-3 w-3" />
                          {catDetails.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">₹{expense.amount.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {expense.payment_method || '-'}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {expense.vendor_name || '-'}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => { setSelectedExpense(expense); setIsModalOpen(true); }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                       </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of{' '}
              {filteredExpenses.length} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedExpense(null); }}
        onSave={selectedExpense ? handleUpdateExpense : handleAddExpense}
        expense={selectedExpense}
      />
    </div>
  );
};

export default Expenses;