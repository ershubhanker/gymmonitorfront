// src/components/BirthdayCard.jsx
import React, { useState } from 'react';
import { 
  Cake, 
  Gift, 
  Calendar, 
  Phone, 
  RefreshCw,
  Sparkles
} from 'lucide-react';

const BirthdayCard = ({ 
  birthdays = { members: [], staff: [], all: [], todayCount: 0, totalCount: 0 },
  gymName = '',
  onMemberClick,
  onStaffClick,
  onRefresh,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState('all');

  const members = birthdays?.members || [];
  const staff = birthdays?.staff || [];
  const all = birthdays?.all || [...members, ...staff].sort((a, b) => a.daysUntil - b.daysUntil);
  const todayCount = birthdays?.todayCount ?? all.filter(b => b.isToday).length;
  const totalCount = birthdays?.totalCount ?? all.length;

  const hasMembers = members.length > 0;
  const hasStaff = staff.length > 0;

  // Filter items based on active tab
  let displayList = all;
  if (activeTab === 'today') {
    displayList = all.filter(b => b.isToday);
  } else if (activeTab === 'members') {
    displayList = members;
  } else if (activeTab === 'staff') {
    displayList = staff;
  }

  // 1. Loading State
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-pink-100 p-2 rounded-lg">
              <Cake className="h-5 w-5 text-pink-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Birthdays</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-pink-500 animate-spin" />
        </div>
      </div>
    );
  }

  // 2. Empty State (Matching the membership expiry notification card design)
  if (totalCount === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-2 rounded-lg text-white">
              <Cake className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Birthdays</h3>
              <p className="text-xs text-gray-500">Today & next 7 days</p>
            </div>
          </div>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="text-pink-600 hover:text-pink-700 transition-colors p-1.5 rounded-lg hover:bg-pink-50"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="text-center py-8 my-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-100 to-rose-100 rounded-full mb-3 shadow-sm text-pink-500">
            <Gift className="h-8 w-8" />
          </div>
          <p className="text-gray-900 font-bold text-base mb-1">No Birthdays This Week! 🎂</p>
          <p className="text-gray-500 text-xs max-w-xs mx-auto">No member or staff birthdays in the next 7 days.</p>
        </div>
      </div>
    );
  }

  // 3. Active Birthday List State
  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 px-6 py-4 text-white">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-xs flex-shrink-0">
              <Cake className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white">Birthdays</h3>
                {todayCount > 0 && (
                  <span className="bg-white text-pink-600 text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-xs animate-bounce flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-pink-500" />
                    {todayCount} Today!
                  </span>
                )}
              </div>
              <p className="text-white/85 text-xs sm:text-sm mt-0.5">
                {todayCount > 0 
                  ? `${todayCount} celebrating today · ${totalCount} this week`
                  : `${totalCount} upcoming in the next 7 days`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Filters */}
        {(hasMembers && hasStaff || todayCount > 0) && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/20 text-xs overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-full font-medium transition-all whitespace-nowrap ${
                activeTab === 'all' 
                  ? 'bg-white text-pink-600 shadow-xs' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              All ({all.length})
            </button>
            {todayCount > 0 && (
              <button
                onClick={() => setActiveTab('today')}
                className={`px-3 py-1 rounded-full font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
                  activeTab === 'today' 
                    ? 'bg-white text-pink-600 shadow-xs' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                🎉 Today ({todayCount})
              </button>
            )}
            {hasMembers && (
              <button
                onClick={() => setActiveTab('members')}
                className={`px-3 py-1 rounded-full font-medium transition-all whitespace-nowrap ${
                  activeTab === 'members' 
                    ? 'bg-white text-pink-600 shadow-xs' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Members ({members.length})
              </button>
            )}
            {hasStaff && (
              <button
                onClick={() => setActiveTab('staff')}
                className={`px-3 py-1 rounded-full font-medium transition-all whitespace-nowrap ${
                  activeTab === 'staff' 
                    ? 'bg-white text-pink-600 shadow-xs' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Staff ({staff.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Birthday List */}
      <div className="p-4 max-h-[500px] overflow-y-auto custom-scrollbar flex-1 space-y-3">
        {displayList.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <p>No birthdays found in this filter.</p>
          </div>
        ) : (
          displayList.map((person) => {
            const isMember = person.type === 'member';

            return (
              <div
                key={`${person.type}-${person.id}`}
                onClick={() => {
                  if (isMember && onMemberClick) onMemberClick(person.id);
                  else if (!isMember && onStaffClick) onStaffClick(person.id);
                }}
                className={`group relative flex flex-col gap-2 p-3 sm:p-4 rounded-xl transition-all cursor-pointer ${
                  person.isToday
                    ? 'bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50/60 border-l-4 border-pink-500 shadow-sm ring-1 ring-pink-200/70 hover:shadow-md'
                    : person.isTomorrow
                    ? 'bg-gradient-to-r from-amber-50/70 to-orange-50/40 border-l-4 border-amber-400 hover:shadow-md'
                    : 'bg-gradient-to-r from-purple-50/50 to-pink-50/40 border-l-4 border-purple-300 hover:shadow-md'
                }`}
              >
                {/* Main Row */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <img 
                    src={person.avatar} 
                    alt={person.name}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0 ${
                      person.isToday 
                        ? 'ring-2 ring-pink-500 ring-offset-2' 
                        : 'ring-2 ring-pink-200'
                    }`}
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=${isMember ? 'EC4899' : '8B5CF6'}&color=fff&size=64`;
                    }}
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm sm:text-base">
                          {person.name}
                        </span>
                        <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${
                          isMember 
                            ? 'bg-pink-100 text-pink-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {isMember ? 'Member' : (person.position ? `Staff · ${person.position}` : 'Staff')}
                        </span>
                        {person.planName && (
                          <span className="text-[10px] text-gray-500 bg-white/70 px-1.5 py-0.5 rounded border border-gray-200">
                            {person.planName}
                          </span>
                        )}
                      </div>

                      {/* Birthday Status Badge */}
                      <div>
                        {person.isToday ? (
                          <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-xs animate-pulse flex items-center gap-1">
                            🎂 Today! 🎉
                          </span>
                        ) : person.isTomorrow ? (
                          <span className="bg-amber-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
                            Tomorrow
                          </span>
                        ) : (
                          <span className="bg-pink-100 text-pink-700 font-semibold text-xs px-2 py-0.5 rounded-full">
                            {person.birthdayDate} ({person.daysUntil}d)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sub info */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1 text-pink-600 font-medium">
                        <Calendar className="h-3 w-3" />
                        {person.birthdayDate}
                        {person.age ? ` · Turning ${person.age}` : ''}
                      </span>
                      {person.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {person.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BirthdayCard;
