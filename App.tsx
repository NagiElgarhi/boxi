import React, { useState, useCallback, useEffect, useRef } from 'react';
import FileUploader from './components/FileUploader';
import InteractiveSession from './components/InteractiveSession';
import LoadingSpinner from './components/LoadingSpinner';
import ChapterSelector from './components/ChapterSelector';
import SearchSidebar from './components/SearchSidebar';
import EditSidebar from './components/EditSidebar';
import SummarizerSidebar from './components/SummarizerSidebar';
import ChatSidebar from './components/ChatSidebar';
import Library from './components/Library';
import QuestionGeneratorSidebar from './components/QuestionGeneratorSidebar';
import AskMeSidebar from './components/AskMeSidebar';
import PrayerTimes from './components/PrayerTimes';
import TaskManager from './components/TaskManager';
import UserGuide from './components/UserGuide';
import Calculator from './components/Calculator';
import PurchaseRequest from './components/PurchaseRequest';
import { HomeIcon, WhatsAppIcon, EditIcon, RomanTempleIcon, SummarizeIcon, QuestionMarkCircleIcon, ChatBubbleIcon, SearchIcon, SunIcon, MoonIcon, SettingsIcon, MailIcon, PrayerTimeIcon, ClipboardListIcon, InfoIcon, ShieldIcon, CalculatorIcon, BookOpenIcon, CheckCircleIcon } from './components/icons';
import { extractTextPerPage } from './services/pdfService';
import { analyzeDocumentStructure, analyzeChapterForLessons, generateInteractiveLesson, generateInitialQuestions, getFeedbackOnAnswers, generateMoreQuestions, getDeeperExplanation, getAiCorrections } from './services/geminiService';
import { generateTheme } from './services/themeService';
import { saveBook, getBookById, saveActiveBookState, loadActiveBookState, clearAllData, clearActiveBookState } from './services/dbService';
import { InteractiveContent, UserAnswer, FeedbackItem, Chapter, PageText, Lesson, ColorTheme, InteractiveBlock, SavedBook, AppState, ThemeMode } from './types';

type ActiveView = 'main' | 'prayer_times' | 'calculator' | 'library' | 'tasks' | 'user_guide' | 'purchase_request';

const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

function App() {
  const [appState, setAppState] = useState<AppState>('analyzing'); // Start in analyzing to show spinner while checking db
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Session State
  const [activeBook, setActiveBook] = useState<SavedBook | null>(null);
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [interactiveContent, setInteractiveContent] = useState<InteractiveContent | null>(null);
  const [originalFullContent, setOriginalFullContent] = useState<InteractiveContent | null>(null);

  // Interaction State
  const [feedback, setFeedback] = useState<FeedbackItem[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isRetryMode, setIsRetryMode] = useState(false);
  
  // Persistence State
  const [hasLastBook, setHasLastBook] = useState(false);
  const isSavingRef = useRef(false);
  
  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<{hue: number, mode: ThemeMode}>({ hue: 35, mode: 'dark' });
  const [activeSidebar, setActiveSidebar] = useState<string | null>(null);
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const [initialChapterForTest, setInitialChapterForTest] = useState<Chapter | null>(null);

  // Load initial state from localStorage/IndexedDB
  useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        setTheme(parsedTheme);
      } catch (e) {
        setTheme({ hue: 35, mode: 'dark' });
        console.error("Failed to parse saved theme", e);
      }
    } else {
        setTheme({ hue: 35, mode: 'dark' });
    }

    const checkLastBook = async () => {
      try {
        const lastState = await loadActiveBookState();
        setHasLastBook(!!lastState);
      } catch (error) {
         console.error("Error checking for last book state:", error);
         setHasLastBook(false);
      }
      setAppState('uploading'); // Done checking, move to upload state
    };
    checkLastBook();
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    const colorTheme = generateTheme(theme.hue, theme.mode);
    for (const [key, value] of Object.entries(colorTheme)) {
        root.style.setProperty(key, value);
    }
    if(theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('appTheme', JSON.stringify(theme));
  }, [theme]);
  
  const handleThemeToggle = () => {
    const newMode = theme.mode === 'light' ? 'dark' : 'light';
    setTheme(prev => ({ ...prev, mode: newMode }));
  };
  
  const handleClearData = async () => {
    if (window.confirm("هل أنت متأكد من رغبتك في مسح كل بياناتك المحفوظة نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.")) {
        await clearAllData();
        setHasLastBook(false);
        // Full reset of app state
        setAppState('uploading');
        setActiveBook(null);
        setChapters(null);
        setInteractiveContent(null);
        alert("تم مسح جميع البيانات بنجاح.");
    }
  };
  
  const handleMenuItemClick = (action: () => void) => {
      action();
      setIsSettingsOpen(false);
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setAppState('analyzing');
    setErrorMessage('');
    
    try {
      const fileContent = await file.arrayBuffer();
      const pageTexts = await extractTextPerPage(file);
      const chapterData = await analyzeDocumentStructure(pageTexts);

      if (chapterData) {
        const newBook: SavedBook = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          chapters: chapterData,
          pageTexts,
          fileContent,
        };

        if (!isSavingRef.current) {
          isSavingRef.current = true;
          await saveBook(newBook);
          const activeState = { id: newBook.id, xp: 0, chapters: newBook.chapters };
          await saveActiveBookState(activeState);
          setHasLastBook(true);
          setActiveBook(newBook);
          setChapters(newBook.chapters);
          setAppState('chapter_selection');
          isSavingRef.current = false;
        }

      } else {
        throw new Error('فشل تحليل بنية المستند.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
      setAppState('error');
    }
  }, []);
  
  const handleAnalyzeSubstructure = async (chapterIndex: number) => {
    if (!chapters || !activeBook) return;

    let chaptersCopy = JSON.parse(JSON.stringify(chapters));
    chaptersCopy[chapterIndex].isAnalyzing = true;
    setChapters(chaptersCopy);

    const chapter = chaptersCopy[chapterIndex];
    const chapterText = activeBook.pageTexts
        .filter(p => p.pageNumber >= chapter.startPage && p.pageNumber <= chapter.endPage)
        .map(p => p.text)
        .join('\n\n');

    const lessons = await analyzeChapterForLessons(chapterText, chapter);
    
    chaptersCopy = JSON.parse(JSON.stringify(chaptersCopy)); // deep copy again to ensure re-render
    chaptersCopy[chapterIndex].lessons = lessons || [];
    chaptersCopy[chapterIndex].isAnalyzing = false;
    setChapters(chaptersCopy);

    if(activeBook) {
        const updatedBook = {...activeBook, chapters: chaptersCopy};
        await saveBook(updatedBook);
        await saveActiveBookState({id: activeBook.id, xp: 0, chapters: chaptersCopy });
        setActiveBook(updatedBook);
    }
  };

  const handleGenerateInteractiveSession = useCallback(async (lesson: Lesson) => {
    if (!activeBook) return;
    setAppState('generating');
    setErrorMessage('');
    setInteractiveContent(null);
    setOriginalFullContent(null);
    setFeedback(null);
    setIsRetryMode(false);
    
    try {
      const lessonText = activeBook.pageTexts.filter(p => p.pageNumber >= lesson.startPage && p.pageNumber <= lesson.endPage).map(p => p.text).join('\n\n');
      const lessonPages = activeBook.pageTexts.filter(p => p.pageNumber >= lesson.startPage && p.pageNumber <= lesson.endPage);
      const content = await generateInteractiveLesson(lessonText, lessonPages);
      if (content) {
        setInteractiveContent(content);
        setOriginalFullContent(content);
        setAppState('session');
      } else {
        throw new Error('لم يتمكن الذكاء الاصطناعي من إنشاء محتوى تفاعلي لهذا الدرس.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
      setAppState('error');
    }
  }, [activeBook]);
  
  const handleGenerateInitialQuestions = async () => {
    if(!interactiveContent) return;
    setIsGeneratingMore(true);
    const lessonText = interactiveContent.content.filter(b => b.type === 'explanation').map(b => (b as any).text).join('\n');
    const questions = await generateInitialQuestions(lessonText);
    if(questions && questions.length > 0) {
      setInteractiveContent(prev => prev ? ({ ...prev, content: [...prev.content, ...questions] }) : null);
      setOriginalFullContent(prev => prev ? ({ ...prev, content: [...prev.content, ...questions] }) : null);
    } else {
      alert("فشل توليد أسئلة إضافية. حاول مرة أخرى.");
    }
    setIsGeneratingMore(false);
  };
  
  const handleGenerateMoreQuestions = async () => {
    if (!interactiveContent) return;
    setIsGeneratingMore(true);
    const lessonText = interactiveContent.content.filter(b => b.type === 'explanation').map(b => (b as any).text).join('\n');
    const existingQuestions = interactiveContent.content.filter(b => b.type.endsWith('_question'));
    const newQuestions = await generateMoreQuestions(lessonText, existingQuestions);
    if(newQuestions && newQuestions.length > 0) {
      setInteractiveContent(prev => prev ? ({...prev, content: [...prev.content, ...newQuestions] }) : null);
      setOriginalFullContent(prev => prev ? ({...prev, content: [...prev.content, ...newQuestions] }) : null);
    } else {
      alert("فشل توليد أسئلة إضافية. حاول مرة أخرى.");
    }
    setIsGeneratingMore(false);
  };

  const handleGetDeeperExplanation = async (text: string) => {
      const explanation = await getDeeperExplanation(text);
      if (explanation && interactiveContent) {
          const newBlock: InteractiveBlock = {
              id: generateUniqueId(),
              type: 'explanation',
              text: `شرح إضافي: ${explanation}`
          };
          
          const contentCopy = [...interactiveContent.content];
          const originalBlockIndex = contentCopy.findIndex(b => b.type === 'explanation' && (b as any).text === text);
          if(originalBlockIndex !== -1){
              contentCopy.splice(originalBlockIndex + 1, 0, newBlock);
              setInteractiveContent({...interactiveContent, content: contentCopy});
          }
      } else {
          alert('فشل الحصول على شرح إضافي.');
      }
  };

  const handleSubmitAnswers = useCallback(async (answers: UserAnswer[]) => {
    if (!interactiveContent) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const feedbackData = await getFeedbackOnAnswers(answers, interactiveContent.content.filter(c => c.type.endsWith('_question')));
      if (feedbackData) {
        setFeedback(feedbackData);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('فشل في تقييم الإجابات.');
    } finally {
      setIsSubmitting(false);
    }
  }, [interactiveContent]);
  
  const handleAiCorrectAnswers = async () => {
    if (!feedback || !interactiveContent) return;
    
    const incorrectAnswers = feedback
        .filter(fb => !fb.isCorrect)
        .map(fb => ({
            questionId: fb.questionId,
            question: fb.question || '',
            userAnswer: fb.userAnswer || '',
        }))
        .filter(item => item.question);

    if (incorrectAnswers.length === 0) return;

    setIsCorrecting(true);
    try {
        const corrections = await getAiCorrections(incorrectAnswers);
        if (corrections) {
            const newFeedback = feedback.map(fb => {
                if (fb.isCorrect) return fb;
                const correction = corrections.find(c => c.questionId === fb.questionId);
                return correction ? { ...fb, explanation: correction.correction } : fb;
            });
            setFeedback(newFeedback);
        } else {
           alert("لم يتمكن الذكاء الاصطناعي من تقديم التصحيحات.");
        }
    } catch (error) {
        console.error("Error getting AI corrections:", error);
        alert("حدث خطأ أثناء الحصول على التصحيحات.");
    } finally {
        setIsCorrecting(false);
    }
  };
  
  const handleRetryIncorrect = (incorrectQuestionIds: string[]) => {
      if (!originalFullContent) return;
      const incorrectQuestions = originalFullContent.content.filter(
          b => b.type.endsWith('_question') && incorrectQuestionIds.includes(b.id)
      );
      setInteractiveContent({
          ...originalFullContent,
          content: incorrectQuestions
      });
      setFeedback(null);
      setIsRetryMode(true);
  };
  
  const handleTestChapter = (chapter: Chapter) => {
    if (!activeBook) return;
    setInitialChapterForTest(chapter);
    setActiveSidebar('test_me');
  };

  const handleBackToChapters = useCallback(() => {
    setAppState('chapter_selection');
    setInteractiveContent(null);
    setFeedback(null);
    setIsRetryMode(false);
  }, []);
  
  const handleBackToUpload = useCallback(async () => {
    setIsSettingsOpen(false); // Close dropdown when going home.
    await clearActiveBookState();
    setHasLastBook(false);
    setAppState('uploading');
    setActiveBook(null);
    setChapters(null);
    setInteractiveContent(null);
    setFeedback(null);
    setIsRetryMode(false);
    setIsDashboardVisible(false);
  }, []);

  const handleLoadLastBook = useCallback(async () => {
    setAppState('analyzing');
    const lastState = await loadActiveBookState();
    if (lastState && lastState.id) {
        const book = await getBookById(lastState.id);
        if (book) {
            setActiveBook(book);
            setChapters(book.chapters);
            setAppState('chapter_selection');
            return;
        }
    }
    // If anything fails, go back to upload
    setAppState('uploading');
  }, []);

  const toolButtons = [
      { text: 'إسألني', action: () => setActiveSidebar('ask_me'), icon: QuestionMarkCircleIcon, gradient: 'from-blue-400 to-blue-600' },
      { text: 'إختبرني', action: () => setActiveSidebar('test_me'), icon: CheckCircleIcon, gradient: 'from-green-400 to-green-600' },
      { text: 'ملخصات', action: () => setActiveSidebar('summarize'), icon: SummarizeIcon, gradient: 'from-purple-400 to-purple-600' },
      { text: 'تعديل النص', action: () => setActiveSidebar('edit'), icon: EditIcon, gradient: 'from-yellow-400 to-yellow-600' },
      { text: 'شات أكاديمى', action: () => setActiveSidebar('chat'), icon: ChatBubbleIcon, gradient: 'from-pink-400 to-pink-600' },
      { text: 'محادثة', action: () => document.getElementById('file-upload-interactive')?.click(), symbol: 'م', gradient: 'from-red-400 to-red-600'}
  ];
  
  const goldenGradient = 'linear-gradient(to bottom right, #c09a3e, #856a3d)';
  const onGoHome = () => setActiveView('main');

  const renderContent = () => {
    if (appState === 'error') {
      return (
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-red-500 mb-4">حدث خطأ</h2>
          <p className="text-[var(--color-text-secondary)] mb-6">{errorMessage}</p>
          <button onClick={handleBackToUpload} style={{backgroundImage: goldenGradient}} className="px-6 py-2 text-white font-bold rounded-lg">العودة</button>
        </div>
      );
    }
    
    if (appState === 'analyzing' || appState === 'generating') {
      const text = appState === 'analyzing' ? 'جاري التحليل...' : 'جاري إنشاء الجلسة التفاعلية...';
      return <LoadingSpinner text={text} />;
    }

    if (appState === 'session' && interactiveContent && activeBook) {
      return <InteractiveSession 
              content={interactiveContent}
              activeBook={activeBook}
              onSubmitAnswers={handleSubmitAnswers} 
              feedback={feedback}
              isSubmitting={isSubmitting}
              onBack={isRetryMode ? () => {
                  setInteractiveContent(originalFullContent);
                  setIsRetryMode(false);
              } : handleBackToChapters}
              backButtonText={isRetryMode ? "عودة للنتيجة" : "عودة للفصول"}
              onGenerateInitialQuestions={handleGenerateInitialQuestions}
              onGenerateMoreQuestions={handleGenerateMoreQuestions}
              isGeneratingMore={isGeneratingMore}
              isCorrecting={isCorrecting}
              isRetryMode={isRetryMode}
              onRetryIncorrect={handleRetryIncorrect}
              onGetDeeperExplanation={handleGetDeeperExplanation}
              onAiCorrectAnswers={handleAiCorrectAnswers}
             />;
    }

    if (appState === 'chapter_selection' && chapters && activeBook) {
      return <ChapterSelector 
                chapters={chapters} 
                pageTexts={activeBook.pageTexts}
                onGenerate={handleGenerateInteractiveSession}
                onBack={handleBackToUpload}
                onAnalyzeSubstructure={handleAnalyzeSubstructure}
                onTestChapter={handleTestChapter}
              />;
    }
    
    // Default to uploader
    return (
      <FileUploader 
        onFileSelect={handleFileSelect} 
        onLoadLastBook={handleLoadLastBook}
        hasLastBook={hasLastBook}
        isDashboardVisible={isDashboardVisible}
        onStartJourney={() => setIsDashboardVisible(true)}
        toolButtons={toolButtons}
        onTestMe={() => setActiveSidebar('test_me')}
      />
    );
  };
  
  const mainContent = () => {
      switch (activeView) {
          case 'library': return <Library onGoHome={onGoHome} />;
          case 'tasks': return <TaskManager onRequestPurchase={() => setActiveView('purchase_request')} onGoHome={onGoHome} />;
          case 'prayer_times': return <PrayerTimes onGoHome={onGoHome} />;
          case 'calculator': return <Calculator />;
          case 'user_guide': return <UserGuide onBack={() => setActiveView('main')} onRequestPurchase={() => setActiveView('purchase_request')}/>;
          case 'purchase_request': return <PurchaseRequest onBack={() => setActiveView('main')}/>;
          case 'main':
          default:
              return renderContent();
      }
  };

  const MenuItem: React.FC<{icon: React.FC<{className?: string}>, text: string, onClick: () => void}> = ({ icon: Icon, text, onClick }) => (
    <button
        onClick={() => handleMenuItemClick(onClick)}
        className="w-full flex items-center justify-start gap-2 p-2 rounded-md text-white hover:opacity-90 transition-opacity"
        style={{
            backgroundImage: 'linear-gradient(to bottom, #a1885b, #4a2c2a)'
        }}
    >
        <Icon className="w-4 h-4 shrink-0 text-white" />
        <span className="font-semibold text-xs leading-tight">{text}</span>
    </button>
  );

  return (
    <div className="min-h-screen w-full bg-[var(--color-background-primary)] text-[var(--color-text-primary)] flex flex-col relative" dir="rtl">
      
      <header className="no-print sticky top-0 z-40 bg-[var(--color-background-primary)]/80 backdrop-blur-sm border-b border-[var(--color-border-primary)] shadow-sm">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
            
            <div className="flex items-center gap-5">
              <div className="relative">
                <button
                  onClick={() => setIsSettingsOpen(prev => !prev)}
                  className="p-2 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)] transition-colors"
                  aria-label="الإعدادات"
                >
                  <SettingsIcon className="w-8 h-8"/>
                </button>
                {isSettingsOpen && (
                  <div 
                    className="absolute left-0 mt-2 w-[120px] rounded-lg shadow-2xl p-[2px]"
                    style={{
                      backgroundImage: 'linear-gradient(to bottom right, #c09a3e, #856a3d)',
                      transform: 'translateX(-85px)',
                    }}
                  >
                    <div 
                        className="rounded-md p-2"
                        style={{
                            backgroundImage: 'var(--color-background-container-gradient)',
                        }}
                    >
                        <div className="flex flex-col gap-1">
                            <MenuItem icon={PrayerTimeIcon} text="الصلاة" onClick={() => setActiveView('prayer_times')} />
                            <MenuItem 
                                icon={theme.mode === 'dark' ? SunIcon : MoonIcon} 
                                text={theme.mode === 'dark' ? 'فاتح' : 'مظلم'} 
                                onClick={handleThemeToggle}
                            />
                            <MenuItem icon={ClipboardListIcon} text="المهام" onClick={() => setActiveView('tasks')} />
                            <MenuItem icon={CalculatorIcon} text="الحاسبة" onClick={() => setActiveView('calculator')} />
                            <MenuItem icon={InfoIcon} text="الدليل" onClick={() => setActiveView('user_guide')} />
                            <MenuItem icon={ShieldIcon} text="شراء" onClick={() => setActiveView('purchase_request')} />
                        </div>
                    </div>
                  </div>
                )}
              </div>
              
                <div className="flex items-center gap-5 ml-5">
                    <button onClick={() => setActiveSidebar('search')} title="بحث" className="p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] transition-colors"><SearchIcon className="w-6 h-6" /></button>
                    <button onClick={() => { setActiveView('main'); setIsDashboardVisible(true); setTimeout(() => document.getElementById('file-upload-interactive')?.click(), 0); }} title="كتابك التفاعلي" className="p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] transition-colors"><BookOpenIcon className="w-6 h-6" /></button>
                    <button onClick={() => setActiveSidebar('ask_me')} title="إسألني" className="p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] transition-colors"><QuestionMarkCircleIcon className="w-6 h-6" /></button>
                    <button onClick={() => setActiveSidebar('test_me')} title="إختبرني" className="p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] transition-colors"><CheckCircleIcon className="w-6 h-6" /></button>
                    <button onClick={() => setActiveSidebar('summarize')} title="ملخصات" className="p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] transition-colors"><SummarizeIcon className="w-6 h-6 -rotate-90" /></button>
                    <button onClick={() => setActiveSidebar('edit')} title="تعديل النص" className="p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] transition-colors"><EditIcon className="w-6 h-6" /></button>
                    <button onClick={() => setActiveSidebar('chat')} title="شات أكاديمى" className="p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] transition-colors"><ChatBubbleIcon className="w-6 h-6" /></button>
                </div>
            </div>
          
            <div className="flex items-center" style={{ marginLeft: '10px', gap: '35px' }}>
                <div className="text-right">
                    <div className="text-wavy-dark-gold animate-shimmer font-bold text-2xl" style={{ fontFamily: "'Marhey', sans-serif" }}>
                        Booksy
                    </div>
                </div>
                <button onClick={handleBackToUpload} title="الرئيسية">
                    <RomanTempleIcon className="w-12 h-12" />
                </button>
            </div>

        </div>
      </header>
      
      <main className="flex-grow flex justify-center items-center p-4">
        {mainContent()}
      </main>
      
      <SearchSidebar isOpen={activeSidebar === 'search'} onClose={() => setActiveSidebar(null)} onGoHome={() => {setActiveSidebar(null); setActiveView('main');}} />
      <EditSidebar isOpen={activeSidebar === 'edit'} onClose={() => setActiveSidebar(null)} onGoHome={() => {setActiveSidebar(null); setActiveView('main');}} />
      <SummarizerSidebar isOpen={activeSidebar === 'summarize'} onClose={() => setActiveSidebar(null)} onGoHome={() => {setActiveSidebar(null); setActiveView('main');}} />
      <ChatSidebar isOpen={activeSidebar === 'chat'} onClose={() => setActiveSidebar(null)} onGoHome={() => {setActiveSidebar(null); setActiveView('main');}} />
      <QuestionGeneratorSidebar isOpen={activeSidebar === 'test_me'} onClose={() => setActiveSidebar(null)} onGoHome={() => {setActiveSidebar(null); setActiveView('main');}} initialChapter={initialChapterForTest} initialPageTexts={activeBook?.pageTexts || null} />
      <AskMeSidebar isOpen={activeSidebar === 'ask_me'} onClose={() => setActiveSidebar(null)} onGoHome={() => {setActiveSidebar(null); setActiveView('main');}} />

       <footer className="no-print bg-[var(--color-background-secondary)]/50 border-t border-[var(--color-border-primary)] p-4 text-center">
            <div className="flex justify-center items-center gap-x-12">
                <button 
                    onClick={() => setActiveView('purchase_request')}
                    className="flex items-center gap-2 text-base font-bold transition-transform transform hover:scale-105"
                >
                    <RomanTempleIcon className="w-5 h-5"/>
                    <span 
                        className="golden-text animate-shimmer" 
                        style={{ backgroundSize: '200% 200%' }}
                    >
                        طلب النسخة الكاملة
                    </span>
                </button>

                <a 
                    href="https://wa.me/201066802250" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-base font-bold transition-transform transform hover:scale-105"
                >
                    <WhatsAppIcon className="w-6 h-6"/>
                    <div className="flex flex-row items-baseline gap-2">
                         <span 
                            className="golden-text animate-shimmer" 
                            style={{ backgroundSize: '200% 200%' }}
                        >
                            تواصل معنا عبر واتساب
                        </span>
                        <span 
                            className="golden-text animate-shimmer text-sm" 
                            style={{ backgroundSize: '200% 200%', direction: 'ltr' }}
                        >
                            +20 106 680 2250
                        </span>
                    </div>
                </a>

                <a 
                    href="mailto:nagi.ai.cave@gmail.com" 
                    className="flex items-center gap-2 text-base font-bold transition-transform transform hover:scale-105"
                >
                    <MailIcon className="w-6 h-6"/>
                     <span 
                        className="golden-text animate-shimmer" 
                        style={{ backgroundSize: '200% 200%' }}
                    >
                        nagi.ai.cave@gmail.com
                    </span>
                </a>
            </div>
        </footer>
    </div>
  );
}

export default App;