
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { UploadIcon, HomeIcon, SaveIcon, SearchIcon, SpellcheckIcon, SummarizeIcon, XIcon, HtmlIcon, PdfIcon, PrintIcon, RomanTempleIcon } from './icons';
import { PageText, Chapter, SavedSummary } from '../types';
import { extractTextPerPage } from '../services/pdfService';
import { analyzeDocumentStructure, summarizeChapterText, proofreadSinglePageText } from '../services/geminiService';
import { saveSummary, loadAllSavedSummaries } from '../services/dbService';
import LoadingSpinner from './LoadingSpinner';

interface SummarizerSidebarProps {
    isOpen: boolean;
    onGoHome: () => void;
    onClose: () => void;
}

const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const SummarizerSidebar: React.FC<SummarizerSidebarProps> = ({ isOpen, onGoHome, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [analysisResult, setAnalysisResult] = useState<{ name: string, pageTexts: PageText[], chapters: Chapter[] } | null>(null);
    const [currentSummary, setCurrentSummary] = useState<{ chapterTitle: string, text: string } | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isSpellchecking, setIsSpellchecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summarizationStyle, setSummarizationStyle] = useState('');
    const sidebarRef = useRef<HTMLElement>(null);
    const goldenGradient = 'linear-gradient(to bottom right, #FBBF24, #262626)';

    // Library State
    const [savedSummaries, setSavedSummaries] = useState<SavedSummary[]>([]);
    const [librarySearchTerm, setLibrarySearchTerm] = useState('');

    const fetchSavedSummaries = useCallback(async () => {
        const summaries = await loadAllSavedSummaries();
        setSavedSummaries(summaries);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchSavedSummaries();
        }
    }, [isOpen, fetchSavedSummaries]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setAnalysisResult(null);
            setCurrentSummary(null);
            setError(null);
        } else {
            setFile(null);
            setError("الرجاء اختيار ملف PDF صالح.");
        }
    };

    const handleAnalyze = useCallback(async () => {
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        setCurrentSummary(null);

        try {
            setLoadingText("جاري تحليل بنية المستند...");
            const pageTexts = await extractTextPerPage(file);
            const chapters = await analyzeDocumentStructure(pageTexts);

            if (chapters) {
                setAnalysisResult({ name: file.name, pageTexts: pageTexts, chapters });
            } else {
                setError("فشل تحليل بنية المستند.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء التحليل.");
        } finally {
            setIsLoading(false);
            setLoadingText('');
        }
    }, [file]);

    const handleSelectChapter = async (chapter: Chapter) => {
        if (!analysisResult) return;
        setIsSummarizing(true);
        setCurrentSummary(null);
        setError(null);
        try {
            const chapterText = analysisResult.pageTexts
                .filter(p => p.pageNumber >= chapter.startPage && p.pageNumber <= chapter.endPage)
                .map(p => p.text)
                .join('\n\n');
            
            if (!chapterText.trim()) {
                setError("هذا الفصل لا يحتوي على نص لتلخيصه.");
                setIsSummarizing(false);
                return;
            }

            const summaryText = await summarizeChapterText(chapterText, summarizationStyle);
            setCurrentSummary({ chapterTitle: chapter.title, text: summaryText });

        } catch (err) {
            setError(err instanceof Error ? err.message : "فشل إنشاء الملخص.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleSaveSummary = useCallback(async () => {
        if (!analysisResult || !currentSummary) {
            setError("لا يوجد ملخص لحفظه حاليًا.");
            return;
        }
        setIsLoading(true);
        setLoadingText("جاري حفظ الملخص في المكتبة...");
        try {
            const summaryToSave: SavedSummary = {
                id: generateUniqueId(),
                bookName: analysisResult.name,
                chapterTitle: currentSummary.chapterTitle,
                summaryText: currentSummary.text,
            };
            await saveSummary(summaryToSave);
            await fetchSavedSummaries();
            alert(`تم حفظ ملخص فصل "${currentSummary.chapterTitle}" بنجاح.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "فشل حفظ الملخص.");
        } finally {
            setIsLoading(false);
            setLoadingText('');
        }
    }, [analysisResult, currentSummary, fetchSavedSummaries]);
    
    const handlePrint = () => {
        if (!sidebarRef.current) return;
        
        const sidebarElement = sidebarRef.current;
        document.body.classList.add('printing-sidebar');
        sidebarElement.classList.add('is-printing');

        const cleanup = () => {
            document.body.classList.remove('printing-sidebar');
            sidebarElement.classList.remove('is-printing');
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        window.print();
    };

    const downloadHtml = (elementId: string, title: string) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        const styles = `
            body { font-family: 'Times New Roman', serif; direction: rtl; line-height: 1.8; padding: 2rem; margin: auto; max-width: 800px; }
            h3 { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
            p { white-space: pre-wrap; }
        `;
        
        const htmlString = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>${styles}</style>
            </head>
            <body>${element.innerHTML}</body>
            </html>
        `;

        const blob = new Blob([htmlString], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleLoadSummary = (summary: SavedSummary) => {
        setAnalysisResult(null);
        setCurrentSummary({ chapterTitle: `${summary.bookName} - ${summary.chapterTitle}`, text: summary.summaryText });
        setFile(null);
    };

    const handleSpellcheck = async () => {
        if (!currentSummary) return;
        setIsSpellchecking(true);
        try {
            const correctedText = await proofreadSinglePageText(currentSummary.text);
            setCurrentSummary(prev => prev ? { ...prev, text: correctedText } : null);
        } catch (e) {
            setError("فشل التدقيق الإملائي للملخص.");
        } finally {
            setIsSpellchecking(false);
        }
    };

    const filteredSummaries = useMemo(() => {
        if (!savedSummaries) return [];
        return savedSummaries.filter(s => 
            s.bookName.toLowerCase().includes(librarySearchTerm.toLowerCase()) || 
            s.chapterTitle.toLowerCase().includes(librarySearchTerm.toLowerCase())
        );
    }, [savedSummaries, librarySearchTerm]);

    return (
        <aside
            ref={sidebarRef}
            className={`fixed inset-0 bg-[var(--color-background-secondary)]/70 backdrop-blur-lg shadow-2xl transition-transform duration-500 ease-in-out z-50 flex flex-col ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            aria-hidden={!isOpen}
        >
            {isOpen && (
                <>
                    <div className="flex-shrink-0 p-4 border-b border-[var(--color-border-primary)] flex justify-between items-center bg-[var(--color-background-primary)] no-print-sidebar">
                        <button onClick={onGoHome} className="p-2 rounded-lg text-white flex items-center gap-2 px-4" aria-label="العودة للرئيسية" style={{ backgroundImage: goldenGradient }}>
                            <HomeIcon className="w-6 h-6" /> <span className="font-bold">الرئيسية</span>
                        </button>
                        <h2 className="text-xl font-bold golden-text flex items-center gap-2">
                            <SummarizeIcon className="w-6 h-6 -rotate-90 golden-text" />
                            ملخصات
                        </h2>
                        <button onClick={onClose} className="p-2 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)]" aria-label="إغلاق">
                            <XIcon className="w-6 h-6 golden-text" />
                        </button>
                    </div>

                    <div className="flex-shrink-0 px-4 py-2 border-b border-[var(--color-border-primary)] flex justify-center items-center gap-4 no-print-sidebar">
                        <label htmlFor="summarizer-file-upload" className="cursor-pointer flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-md hover:opacity-90 transition-all" style={{ backgroundImage: goldenGradient }}>
                            <UploadIcon className="w-4 h-4"/> ملف جديد
                        </label>
                        <input id="summarizer-file-upload" type="file" className="sr-only" accept=".pdf" onChange={handleFileChange} />
                        <button onClick={handleAnalyze} disabled={!file || isLoading} className="px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-md hover:opacity-90 disabled:bg-none disabled:bg-gray-500 disabled:cursor-not-allowed" style={{ backgroundImage: goldenGradient }}>
                            {isLoading ? '...' : 'تحليل'}
                        </button>
                        <button onClick={handleSaveSummary} disabled={!currentSummary || isLoading} className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-md hover:opacity-90 disabled:bg-none disabled:bg-gray-500 disabled:cursor-not-allowed" style={{ backgroundImage: goldenGradient }}>
                            <SaveIcon className="w-4 h-4"/> حفظ الملخص
                        </button>
                    </div>
                    
                     <div className="flex-shrink-0 px-4 py-2 border-b border-[var(--color-border-primary)] no-print-sidebar">
                        {file && !isLoading && ( <div className="p-2 bg-yellow-500/10 rounded-md text-xs text-center text-dark-gold-gradient"> الملف المحدد: <span className="font-bold">{file.name}</span></div>)}
                        {error && ( <div className="p-2 bg-yellow-500/10 text-dark-gold-gradient rounded-md text-sm text-center"> {error} </div> )}
                     </div>

                    <div className="flex-grow flex flex-row min-h-0">
                        {isLoading ? <div className="w-full flex items-center justify-center"><LoadingSpinner text={loadingText} /></div> :
                        <>
                            {/* Navigation Panel */}
                            <nav className="w-[15%] border-l border-[var(--color-border-primary)] flex-shrink-0 flex flex-col no-print-sidebar">
                                <div className="flex-grow overflow-y-auto p-3">
                                {analysisResult ? (
                                    <>
                                        <div className="px-1 pb-3 mb-3 border-b border-[var(--color-border-primary)]">
                                            <label htmlFor="summary-style" className="block text-sm font-bold text-center golden-text mb-2">
                                               أسلوب التلخيص
                                            </label>
                                            <input
                                                id="summary-style"
                                                type="text"
                                                value={summarizationStyle}
                                                onChange={(e) => setSummarizationStyle(e.target.value)}
                                                placeholder="مثال: على شكل نقاط..."
                                                className="w-full p-2 bg-[var(--color-background-tertiary)] rounded-md border border-yellow-800/30 text-sm"
                                            />
                                        </div>
                                        <ul className="space-y-1">
                                            {analysisResult.chapters.map(chapter => (
                                                <li key={chapter.id}>
                                                    <button 
                                                        onClick={() => handleSelectChapter(chapter)} 
                                                        className={`flex justify-between items-center w-full text-right p-2 rounded-md cursor-pointer ${currentSummary?.chapterTitle === chapter.title ? 'bg-yellow-500/20 text-dark-gold-gradient font-bold' : 'text-gold-brown hover:bg-yellow-500/10'}`}
                                                    >
                                                        <span className="font-semibold">{chapter.title}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                ) : ( <div className="text-center p-4 text-gold-brown text-sm"> {file ? 'اضغط على "تحليل" للبدء.' : 'اختر ملف PDF أو قم بتحميل ملخص من مكتبتك.'} </div> )}
                                </div>
                                <div className="flex-shrink-0 border-t border-[var(--color-border-primary)] p-3 space-y-3">
                                    <h4 className="font-bold text-center golden-text">مكتبة الملخصات</h4>
                                    <div className="relative">
                                        <input type="search" placeholder="ابحث..." value={librarySearchTerm} onChange={e => setLibrarySearchTerm(e.target.value)} className="w-full p-2 pr-8 text-sm bg-[var(--color-background-tertiary)] rounded-md border border-yellow-800/30"/>
                                        <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 golden-text"/>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto space-y-2">
                                        {filteredSummaries.length > 0 ? filteredSummaries.map(s => (
                                            <div key={s.id} className="p-2 bg-[var(--color-background-tertiary)] rounded-md text-sm">
                                                <p className="font-semibold text-gold-brown truncate" title={`${s.bookName} - ${s.chapterTitle}`}>
                                                    <span className="font-bold text-dark-gold-gradient">{s.chapterTitle}</span>
                                                    <span className="text-xs"> ({s.bookName})</span>
                                                </p>
                                                <div className="flex gap-2 mt-1">
                                                    <button onClick={() => handleLoadSummary(s)} className="flex-1 text-xs py-1 rounded text-white hover:opacity-90" style={{ backgroundImage: goldenGradient }}>عرض</button>
                                                </div>
                                            </div>
                                        )) : <p className="text-xs text-center text-gold-brown p-2">مكتبتك فارغة.</p>}
                                    </div>
                                </div>
                            </nav>
                            {/* Content Panel */}
                            <div className="flex-grow overflow-y-auto p-6 bg-[var(--color-background-primary)] w-[85%] printable-content">
                                {isSummarizing ? (
                                    <div className="flex items-center justify-center h-full"> <LoadingSpinner text="جاري إنشاء الملخص..." /> </div>
                                ) : currentSummary ? (
                                    <div id="summary-content" style={{ fontFamily: "'Times New Roman', serif" }}>
                                        <div className="flex justify-between items-center border-b border-[var(--color-border-primary)] pb-3 mb-4">
                                            <h3 className="text-2xl font-bold golden-text">ملخص: {currentSummary.chapterTitle}</h3>
                                            <div className="flex items-center gap-2 no-print-sidebar">
                                                <button onClick={() => downloadHtml('summary-content', `Summary_${currentSummary.chapterTitle}`)} title="تحميل HTML" className="p-2 text-white rounded-md" style={{ backgroundImage: goldenGradient }}><HtmlIcon className="w-4 h-4"/></button>
                                                <button onClick={handlePrint} title="تحميل PDF / طباعة" className="p-2 text-white rounded-md" style={{ backgroundImage: goldenGradient }}><PdfIcon className="w-4 h-4"/></button>
                                                <button onClick={handlePrint} title="طباعة" className="p-2 text-white rounded-md" style={{ backgroundImage: goldenGradient }}><PrintIcon className="w-4 h-4"/></button>
                                                <button onClick={handleSpellcheck} disabled={isSpellchecking} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow hover:opacity-90 disabled:bg-none disabled:bg-gray-500" style={{ backgroundImage: goldenGradient }}>
                                                    {isSpellchecking ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <SpellcheckIcon className="w-4 h-4" />}
                                                    <span>تصحيح</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <RomanTempleIcon className="w-5 h-5 golden-text flex-shrink-0 mt-1" />
                                            <p className="flex-grow text-lg leading-relaxed whitespace-pre-wrap text-dark-gold-gradient">{currentSummary.text}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-center text-lg text-gold-brown">
                                            {analysisResult ? 'حدد فصلاً من القائمة لتوليد ملخص له.' : (file ? 'اضغط على "تحليل" للبدء.' : 'اختر ملف PDF أو قم بتحميل ملخص من مكتبتك.')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                        }
                    </div>
                </>
            )}
        </aside>
    );
};

export default SummarizerSidebar;
