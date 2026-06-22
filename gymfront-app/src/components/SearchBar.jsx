// src/components/SearchBar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Users, UserPlus, Briefcase, ChevronRight, Loader } from 'lucide-react';
import { searchAll } from '../services/searchService';
import { useNavigate } from 'react-router-dom';

const SearchBar = ({ onSelect, placeholder = "Search members, leads, staff..." }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const debounceTimer = useRef(null);
    const navigate = useNavigate();

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen || results.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % results.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                handleResultClick(results[selectedIndex]);
            } else if (e.key === 'Escape') {
                setIsOpen(false);
                inputRef.current?.blur();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex]);

    // Debounced search
    const performSearch = useCallback(async (searchQuery) => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setLoading(true);
        try {
            const data = await searchAll(searchQuery);
            setResults(data.results || []);
            setIsOpen(data.results && data.results.length > 0);
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle input change with debounce
    const handleInputChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        setSelectedIndex(-1);

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        if (value.trim().length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        debounceTimer.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    };

    const handleResultClick = (result) => {
        setIsOpen(false);
        setQuery('');
        setResults([]);
        
        if (onSelect) {
            onSelect(result);
            return;
        }

        // Default navigation based on type
        switch (result.type) {
            case 'member':
                navigate(`/dashboard?tab=members&memberId=${result.id}`);
                break;
            case 'lead':
                navigate(`/dashboard?tab=leads&leadId=${result.id}`);
                break;
            case 'staff':
                navigate(`/dashboard?tab=staff&staffId=${result.id}`);
                break;
            default:
                break;
        }
    };

    const clearSearch = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        inputRef.current?.focus();
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'member':
                return <Users className="h-4 w-4 text-blue-500" />;
            case 'lead':
                return <UserPlus className="h-4 w-4 text-purple-500" />;
            case 'staff':
                return <Briefcase className="h-4 w-4 text-gray-500" />;
            default:
                return null;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'member': return 'Member';
            case 'lead': return 'Lead';
            case 'staff': return 'Staff';
            default: return type;
        }
    };

    const getStatusColor = (result) => {
        if (result.type === 'member') {
            return result.status === 'active' ? 'text-green-600 bg-green-100' : 'text-gray-500 bg-gray-100';
        }
        if (result.type === 'lead') {
            const colors = {
                new: 'text-blue-600 bg-blue-100',
                contacted: 'text-yellow-600 bg-yellow-100',
                interested: 'text-green-600 bg-green-100',
                converted: 'text-purple-600 bg-purple-100',
                lost: 'text-gray-500 bg-gray-100',
                not_interested: 'text-red-600 bg-red-100'
            };
            return colors[result.status] || 'text-gray-500 bg-gray-100';
        }
        return 'text-gray-500 bg-gray-100';
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-2xl">
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search className="h-5 w-5" />
                </div>
                
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => query.trim().length >= 2 && results.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-2xl 
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               shadow-sm hover:shadow-md transition-shadow duration-200
                               text-gray-800 placeholder-gray-400"
                    autoComplete="off"
                />
                
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {loading && (
                        <Loader className="h-4 w-4 text-gray-400 animate-spin" />
                    )}
                    {query && !loading && (
                        <button
                            onClick={clearSearch}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </button>
                    )}
                </div>
            </div>

            {/* Results Dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl 
                              border border-gray-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                        <span className="text-xs text-gray-500 font-medium">
                            Found {results.length} result{results.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    
                    <div className="py-1">
                        {results.map((result, index) => (
                            <button
                                key={`${result.type}-${result.id}`}
                                onClick={() => handleResultClick(result)}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 
                                          transition-colors duration-150 text-left
                                          ${selectedIndex === index ? 'bg-blue-50' : ''}`}
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                    <img 
                                        src={result.avatar} 
                                        alt={result.name}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
                                        onError={(e) => {
                                            e.target.src = `https://ui-avatars.com/api/?name=${result.name}&background=6B7280&color=fff&size=64`;
                                        }}
                                    />
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 truncate">
                                            {result.name}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(result)}`}>
                                            {result.status || result.type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                        <span className="flex items-center gap-1">
                                            {getTypeIcon(result.type)}
                                            {getTypeLabel(result.type)}
                                        </span>
                                        {result.phone && (
                                            <span>📞 {result.phone}</span>
                                        )}
                                        {result.plan && result.type === 'member' && (
                                            <span className="text-blue-600">📋 {result.plan}</span>
                                        )}
                                        {result.type === 'lead' && result.plan && (
                                            <span className="text-purple-600">🎯 {result.plan}</span>
                                        )}
                                    </div>
                                </div>
                                
                                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            </button>
                        ))}
                    </div>
                    
                    <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 text-center">
                        <span className="text-xs text-gray-400">
                            Press Enter to select • Arrow keys to navigate • Esc to close
                        </span>
                    </div>
                </div>
            )}

            {/* No Results Message */}
            {isOpen && query.trim().length >= 2 && results.length === 0 && !loading && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl 
                              border border-gray-100 overflow-hidden z-50">
                    <div className="px-6 py-8 text-center">
                        <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">No results found</p>
                        <p className="text-gray-400 text-sm mt-1">
                            Try searching with a different keyword
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchBar;