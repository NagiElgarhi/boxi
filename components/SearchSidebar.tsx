
import React, { useState } from 'react';
import { searchForMaterials } from '../services/geminiService';
import { SearchResult, SearchFilter } from '../types';
import { ArrowLeftIcon, ArrowRightIcon, SearchIcon, HomeIcon, XIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

interface SearchSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onGoHome: () => void;
}

const SearchSidebar: React.FC<SearchSidebarProps> = ({ isOpen, onClose, onGoHome }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<SearchResult | null>(null);
    const [filter, setFilter] = useState<SearchFilter>('all');

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults(null);
        try {
            const searchResults = await searchForMaterials(query, filter);
            setResults(searchResults);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setQuery('');
        setError(null);
        setResults(null);
        setIsLoading(false);
    };
    
    const filters: { key: SearchFilter, label: string }[] = [
        { key: 'all', label: 'الكل' },
        { key: 'sites', label: 'مواقع فقط' },
        { key: 'video', label: 'فيديو فقط' }
    ];

    const goldenGradient = 'linear-gradient(to bottom right, #FBBF24, #262626)';

    return (
        <div
            className={`fixed top-0 right-0 h-full bg-[var(--color-background-secondary)]/70 backdrop-blur-lg shadow-2xl transition-transform duration-300 ease-in-out z-40 flex flex-col w-full max-w-md ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
            {isOpen && (
                <>
                    <div className="flex-shrink-0 p-4 border-b border-[var(--color-border-primary)] flex justify-between items-center">
                        <button onClick={onGoHome} className="p-2 rounded-lg text-white flex items-center gap-2 px-4" aria-label="العودة للرئيسية" style={{backgroundImage: goldenGradient}}>
                            <HomeIcon className="w-6 h-6" /> <span className="font-bold">الرئيسية</span>
                        </button>
                        <h2 className="text-xl font-bold golden-text">البحث عن مواد تعليمية</h2>
                        <button onClick={onClose} className="p-2 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)]" aria-label="إغلاق">
                            <XIcon className="w-6 h-6 golden-text" />
                        </button>
                    </div>
                    
                    <div className="flex-shrink-0 p-4 space-y-3">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="هات كتابك من على الرف"
                                className="flex-grow p-2 bg-[var(--color-background-tertiary)] rounded-lg border border-yellow-800/30 focus:ring-2 focus:ring-yellow-600 transition text-dark-gold-gradient font-semibold"
                            />
                            <button type="submit" disabled={isLoading || !query.trim()} className="p-2 px-4 text-white rounded-lg shadow hover:opacity-90 disabled:opacity-50 flex items-center justify-center" style={{backgroundImage: goldenGradient}}>
                                {isLoading ? <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <SearchIcon className="w-6 h-6"/>}
                            </button>
                             <button type="button" onClick={handleReset} className="p-2 px-4 text-white rounded-lg shadow hover:opacity-90" style={{backgroundImage: goldenGradient}}>إعادة</button>
                        </form>
                        <div className="flex justify-center gap-2">
                            {filters.map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    className={`px-4 py-1 text-sm font-semibold rounded-full transition-all ${filter === f.key ? 'text-white shadow-md' : 'text-gold-brown bg-[var(--color-background-tertiary)] hover:bg-yellow-500/10'}`}
                                    style={filter === f.key ? {backgroundImage: goldenGradient} : {}}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 space-y-4">
                        {isLoading && !results && <LoadingSpinner text="جاري البحث..." />}
                        {error && <div className="text-center text-dark-gold-gradient bg-yellow-500/10 p-3 rounded-lg">{error}</div>}
                        {results && (
                            <div className="space-y-4">
                                {results.sources && results.sources.length > 0 ? (
                                     <div className="p-4 bg-[var(--color-background-tertiary)] rounded-lg">
                                        <h3 className="font-bold text-lg mb-2 golden-text">المصادر ({results.sources.length})</h3>
                                        <ul className="space-y-2">
                                            {results.sources.map((source, index) => (
                                                <li key={index}>
                                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="block p-2 rounded-md hover:bg-yellow-500/10 transition-colors">
                                                        <span className="font-semibold text-dark-gold-gradient">{source.title || new URL(source.uri).hostname}</span>
                                                        <span className="block text-xs text-gold-brown truncate">{source.uri}</span>
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <p className="text-center text-gold-brown pt-8">لم يتم العثور على نتائج للبحث الحالي.</p>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default SearchSidebar;
