// src/components/TrainerSchedule.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  Dumbbell,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Calendar as CalendarIcon,
  List,
  Grid,
  Filter,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Phone,
  Mail, BarChart
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// Helper: Get day name
const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

// Helper: Format time
const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  try {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  } catch {
    return timeStr;
  }
};

// Helper: Get month name
const getMonthName = (month) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month];
};

// Time slot configuration
const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00'
];

const TrainerSchedule = () => {
  const [viewMode, setViewMode] = useState('week'); // 'day', 'week', 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trainers, setTrainers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [expandedTrainers, setExpandedTrainers] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'completed', 'pending'
  const [stats, setStats] = useState({
    totalTrainers: 0,
    totalSessions: 0,
    activeSessions: 0,
    completedSessions: 0,
    pendingSessions: 0,
    totalMembers: 0,
    avgSessionsPerTrainer: 0
  });

  // Fetch trainers and their PT sessions
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all trainers
      const trainersRes = await api.get('/gym/trainers');
      const trainersData = trainersRes.data || [];
      setTrainers(trainersData);

      // Fetch all PT sessions for the gym
      const sessionsRes = await api.get('/gym/personal-training/all');
      const sessionsData = sessionsRes.data || [];
      setSessions(sessionsData);

      // Calculate stats
      const active = sessionsData.filter(s => s.status === 'active' || s.status === 'pending').length;
      const completed = sessionsData.filter(s => s.status === 'completed').length;
      const pending = sessionsData.filter(s => s.status === 'pending').length;

      // Count unique members
      const uniqueMembers = new Set(sessionsData.map(s => s.member_id));
      
      // Calculate sessions per trainer
      const trainerSessions = {};
      sessionsData.forEach(s => {
        if (s.trainer_id) {
          trainerSessions[s.trainer_id] = (trainerSessions[s.trainer_id] || 0) + 1;
        }
      });
      const totalSessions = Object.values(trainerSessions).reduce((a, b) => a + b, 0);
      const avgSessions = trainersData.length > 0 ? totalSessions / trainersData.length : 0;

      setStats({
        totalTrainers: trainersData.length,
        totalSessions: sessionsData.length,
        activeSessions: active,
        completedSessions: completed,
        pendingSessions: pending,
        totalMembers: uniqueMembers.size,
        avgSessionsPerTrainer: Math.round(avgSessions * 10) / 10
      });

    } catch (error) {
      console.error('Error fetching trainer data:', error);
      toast.error('Failed to load trainer schedule data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get sessions for a specific trainer on a specific date
  const getTrainerSessionsForDate = (trainerId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    return sessions.filter(s => 
      s.trainer_id === trainerId && 
      s.start_date <= dateStr &&
      s.end_date >= dateStr &&
      (filterStatus === 'all' || s.status === filterStatus)
    );
  };

  // Get sessions for a specific trainer
  const getTrainerSessions = (trainerId) => {
    return sessions.filter(s => 
      s.trainer_id === trainerId &&
      (filterStatus === 'all' || s.status === filterStatus)
    );
  };

  // Get members count for a trainer
  const getTrainerMemberCount = (trainerId) => {
    const trainerSessions = sessions.filter(s => s.trainer_id === trainerId);
    const uniqueMembers = new Set(trainerSessions.map(s => s.member_id));
    return uniqueMembers.size;
  };

  // Get upcoming sessions for a trainer
  const getUpcomingSessions = (trainerId, limit = 5) => {
    const today = new Date().toISOString().split('T')[0];
    return sessions
      .filter(s => 
        s.trainer_id === trainerId && 
        s.start_date >= today &&
        (filterStatus === 'all' || s.status === filterStatus)
      )
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, limit);
  };

  // Navigation
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get date range for display
  const getDateRangeDisplay = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } else if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else {
      return `${getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`;
    }
  };

  // Get week days
  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  // Render day view
  const renderDayView = () => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const filteredTrainers = trainers.filter(t => {
      const nameMatch = t.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      const hasSessions = getTrainerSessions(t.id).length > 0;
      return nameMatch && (searchTerm || hasSessions || true);
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 bg-gray-50 z-10 border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-600 min-w-[150px]">
                Trainer
              </th>
              <th className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-600 min-w-[120px]">
                {currentDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </th>
              <th className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-600 min-w-[100px]">
                Members
              </th>
              <th className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-600 min-w-[120px]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTrainers.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No trainers match your search' : 'No trainers found'}
                </td>
              </tr>
            ) : (
              filteredTrainers.map((trainer) => {
                const daySessions = getTrainerSessionsForDate(trainer.id, currentDate);
                const memberCount = getTrainerMemberCount(trainer.id);
                const isExpanded = expandedTrainers[trainer.id] || false;

                return (
                  <React.Fragment key={trainer.id}>
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedTrainers(prev => ({
                        ...prev,
                        [trainer.id]: !prev[trainer.id]
                      }))}
                    >
                      <td className="sticky left-0 bg-white z-10 border border-gray-200 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {trainer.full_name?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{trainer.full_name}</div>
                            <div className="text-xs text-gray-500">{trainer.position || 'Trainer'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        {daySessions.length > 0 ? (
                          <div className="space-y-2">
                            {daySessions.map((session, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">
                                  <Clock className="h-3 w-3" />
                                  {session.session_time || '—'}
                                </span>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {session.member_name || `Member #${session.member_id}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No sessions</span>
                        )}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          <Users className="h-3.5 w-3.5" />
                          {memberCount}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        {daySessions.some(s => s.status === 'active' || s.status === 'pending') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                        ) : daySessions.some(s => s.status === 'completed') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            <CheckCircle className="h-3 w-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="4" className="border border-gray-200 px-4 py-3 bg-gray-50">
                          <div className="pl-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Dumbbell className="h-4 w-4 text-purple-500" />
                              All PT Sessions for {trainer.full_name}
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {getTrainerSessions(trainer.id).length > 0 ? (
                                getTrainerSessions(trainer.id).map((session, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                        {session.member_name?.charAt(0) || 'M'}
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900 text-sm">
                                          {session.member_name || `Member #${session.member_id}`}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                          <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {session.start_date} - {session.end_date}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {session.session_time || '—'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        session.status === 'active' || session.status === 'pending'
                                          ? 'bg-green-100 text-green-700'
                                          : session.status === 'completed'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {session.status?.charAt(0).toUpperCase() + session.status?.slice(1) || 'Unknown'}
                                      </span>
                                      <div className="text-right text-xs">
                                        <div className="font-medium text-gray-700">₹{session.total_amount || 0}</div>
                                        <div className="text-gray-400">Paid: ₹{session.amount_paid || 0}</div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                  No sessions for this trainer
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const filteredTrainers = trainers.filter(t => {
      const nameMatch = t.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch;
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 bg-gray-50 z-10 border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-600 min-w-[150px]">
                Trainer
              </th>
              {weekDays.map((day, idx) => (
                <th key={idx} className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-600 min-w-[120px]">
                  <div>{getDayName(day).substring(0, 3)}</div>
                  <div className="text-xs font-normal text-gray-400">{day.getDate()}</div>
                </th>
              ))}
              <th className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-600 min-w-[100px]">
                Total Members
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTrainers.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No trainers match your search' : 'No trainers found'}
                </td>
              </tr>
            ) : (
              filteredTrainers.map((trainer) => {
                const memberCount = getTrainerMemberCount(trainer.id);
                const isExpanded = expandedTrainers[trainer.id] || false;

                return (
                  <React.Fragment key={trainer.id}>
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedTrainers(prev => ({
                        ...prev,
                        [trainer.id]: !prev[trainer.id]
                      }))}
                    >
                      <td className="sticky left-0 bg-white z-10 border border-gray-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {trainer.full_name?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{trainer.full_name}</div>
                            <div className="text-xs text-gray-400">{trainer.position || 'Trainer'}</div>
                          </div>
                        </div>
                      </td>
                      {weekDays.map((day, dayIdx) => {
                        const daySessions = getTrainerSessionsForDate(trainer.id, day);
                        return (
                          <td key={dayIdx} className="border border-gray-200 px-2 py-2 text-center">
                            {daySessions.length > 0 ? (
                              <div className="space-y-1">
                                {daySessions.slice(0, 3).map((session, sIdx) => (
                                  <div key={sIdx} className="text-xs">
                                    <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">
                                      {session.session_time || '—'}
                                    </span>
                                    <div className="text-[10px] text-gray-400 truncate max-w-[80px]">
                                      {session.member_name?.substring(0, 10) || `M${session.member_id}`}
                                    </div>
                                  </div>
                                ))}
                                {daySessions.length > 3 && (
                                  <div className="text-[10px] text-gray-400">+{daySessions.length - 3} more</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          <Users className="h-3.5 w-3.5" />
                          {memberCount}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="border border-gray-200 px-4 py-3 bg-gray-50">
                          <div className="pl-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Dumbbell className="h-4 w-4 text-purple-500" />
                              All Sessions for {trainer.full_name}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                              {getTrainerSessions(trainer.id).length > 0 ? (
                                getTrainerSessions(trainer.id).map((session, idx) => (
                                  <div key={idx} className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="font-medium text-gray-900 text-sm">
                                        {session.member_name || `Member #${session.member_id}`}
                                      </div>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        session.status === 'active' || session.status === 'pending'
                                          ? 'bg-green-100 text-green-700'
                                          : session.status === 'completed'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {session.status?.charAt(0).toUpperCase() + session.status?.slice(1) || 'Unknown'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {session.start_date} - {session.end_date}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {session.session_time || '—'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
                                      <span className="text-gray-600">₹{session.total_amount || 0}</span>
                                      <span className="text-gray-400">Paid: ₹{session.amount_paid || 0}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-3 text-center py-4 text-gray-400 text-sm">
                                  No sessions for this trainer
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Render month view
  const renderMonthView = () => {
    const filteredTrainers = trainers.filter(t => {
      const nameMatch = t.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch;
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 bg-gray-50 z-10 border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-600 min-w-[150px]">
                Trainer
              </th>
              <th className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-600 min-w-[120px]">
                Total Sessions
              </th>
              <th className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-600 min-w-[120px]">
                Active
              </th>
              <th className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-600 min-w-[120px]">
                Completed
              </th>
              <th className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-600 min-w-[120px]">
                Pending
              </th>
              <th className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-600 min-w-[120px]">
                Members
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTrainers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No trainers match your search' : 'No trainers found'}
                </td>
              </tr>
            ) : (
              filteredTrainers.map((trainer) => {
                const trainerSessions = getTrainerSessions(trainer.id);
                const active = trainerSessions.filter(s => s.status === 'active' || s.status === 'pending').length;
                const completed = trainerSessions.filter(s => s.status === 'completed').length;
                const pending = trainerSessions.filter(s => s.status === 'pending').length;
                const memberCount = getTrainerMemberCount(trainer.id);
                const isExpanded = expandedTrainers[trainer.id] || false;

                return (
                  <React.Fragment key={trainer.id}>
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedTrainers(prev => ({
                        ...prev,
                        [trainer.id]: !prev[trainer.id]
                      }))}
                    >
                      <td className="sticky left-0 bg-white z-10 border border-gray-200 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {trainer.full_name?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{trainer.full_name}</div>
                            <div className="text-xs text-gray-500">{trainer.position || 'Trainer'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        <span className="text-lg font-bold text-gray-900">{trainerSessions.length}</span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {active}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {completed}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          {pending}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          <Users className="h-3.5 w-3.5" />
                          {memberCount}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="border border-gray-200 px-4 py-3 bg-gray-50">
                          <div className="pl-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Dumbbell className="h-4 w-4 text-purple-500" />
                              Session Details for {trainer.full_name}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                              {trainerSessions.length > 0 ? (
                                trainerSessions.map((session, idx) => (
                                  <div key={idx} className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="font-medium text-gray-900 text-sm">
                                        {session.member_name || `Member #${session.member_id}`}
                                      </div>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        session.status === 'active' || session.status === 'pending'
                                          ? 'bg-green-100 text-green-700'
                                          : session.status === 'completed'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {session.status?.charAt(0).toUpperCase() + session.status?.slice(1) || 'Unknown'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {session.start_date} - {session.end_date}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {session.session_time || '—'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
                                      <span className="text-gray-600">₹{session.total_amount || 0}</span>
                                      <span className="text-gray-400">Paid: ₹{session.amount_paid || 0}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-3 text-center py-4 text-gray-400 text-sm">
                                  No sessions for this trainer
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Stats cards
  const renderStatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Trainers</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTrainers}</p>
          </div>
          <div className="bg-blue-100 p-2 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Sessions</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
          </div>
          <div className="bg-purple-100 p-2 rounded-lg">
            <Dumbbell className="h-5 w-5 text-purple-600" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Active Sessions</p>
            <p className="text-2xl font-bold text-green-600">{stats.activeSessions}</p>
          </div>
          <div className="bg-green-100 p-2 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Completed</p>
            <p className="text-2xl font-bold text-blue-600">{stats.completedSessions}</p>
          </div>
          <div className="bg-blue-100 p-2 rounded-lg">
            <CheckCircle className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingSessions}</p>
          </div>
          <div className="bg-yellow-100 p-2 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Members</p>
            <p className="text-2xl font-bold text-purple-600">{stats.totalMembers}</p>
          </div>
          <div className="bg-purple-100 p-2 rounded-lg">
            <User className="h-5 w-5 text-purple-600" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Avg/Trainer</p>
            <p className="text-2xl font-bold text-orange-600">{stats.avgSessionsPerTrainer}</p>
          </div>
          <div className="bg-orange-100 p-2 rounded-lg">
            <BarChart className="h-5 w-5 text-orange-600" />
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading trainer schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-purple-600" />
            Trainer Schedule
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage and view personal training schedules for all trainers</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* View Mode */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-3 flex-1 justify-center">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
              {getDateRangeDisplay()}
            </span>
            <button
              onClick={() => navigateDate(1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search trainers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full md:w-48"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <span className="font-medium text-gray-700">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
          Trainer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          Member
        </span>
      </div>
    </div>
  );
};

export default TrainerSchedule;