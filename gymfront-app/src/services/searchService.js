// src/services/searchService.js
import api from './api';

export const searchAll = async (query, limit = 10) => {
    if (!query || query.trim().length < 2) {
        return { results: [] };
    }
    
    try {
        const response = await api.get('/gym/search', {
            params: { query: query.trim(), limit }
        });
        return response.data;
    } catch (error) {
        console.error('Search error:', error);
        return { results: [] };
    }
};