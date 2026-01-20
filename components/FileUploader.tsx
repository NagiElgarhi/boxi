import React from 'react';
import { HistoryIcon, GradientBookOpenIcon, UploadIcon, RomanTempleIcon } from './icons';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onLoadLastBook: () => void;
  hasLastBook: boolean;
  isDashboardVisible: boolean;
  onStartJourney: () => void;
  toolButtons: { 
    icon?: React.FC<{ className?: string; }>;
    symbol?: string;
    text: string; 
    action: () => void; 
    gradient: string; 
  }[];
  onTestMe: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
    onFileSelect, 
    onLoadLastBook, 
    hasLastBook,
    isDashboardVisible,
    onStartJourney,
    toolButtons,
    onTestMe
}) => {
  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      // Allow any file type here, but specific tools might filter later
      onFileSelect(selectedFile);
      // Reset file input to allow selecting the same file again
      event.target.value = '';
    }
  };

  if (!isDashboardVisible) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center relative overflow-hidden">
        {/* Vertical "Booksy" text on the side - Updated position */}
        <div 
            className="absolute -translate-y-1/2 hidden md:flex items-center justify-center pointer-events-none select-none"
            style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                top: 'calc(50% - 64px)',
                left: '70px', // Set to 70px from the left edge
                transition: 'all 0.3s ease-out',
                right: 'auto',
            }}
        >
            <span 
                className="font-black golden-text animate-shimmer"
                style={{
                    fontSize: '36px',
                    fontFamily: "'Marhey', 'Tajawal', sans-serif",
                    backgroundSize: '200% 200%',
                }}
            >
                Booksy
            </span>
        </div>

        <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] font-black pointer-events-none select-none"
            style={{
                fontSize: '60px',
                color: 'var(--color-text-primary)',
                opacity: 0.04,
                fontFamily: "'Cinzel Decorative', serif",
            }}
        >
            BooKsy
        </div>

        <div
          onClick={onStartJourney}
          className="relative z-10 w-full max-w-md rounded-lg p-[2px] bg-gradient-to-br from-[#D4AF37] via-[#4a3a1a] to-[#1a1a1a] animate-shimmer cursor-pointer transition-transform transform hover:scale-105"
          style={{ backgroundSize: '200% 200%' }}
        >
            <div 
              className="absolute bottom-full left-1/2 text-dark-gold-gradient whitespace-nowrap"
              style={{
                  transform: 'translateX(-50%) translateY(-200px)',
                  fontFamily: "'Cinzel Decorative', serif",
                  fontSize: '28px'
              }}
            >
              Lord of the books
            </div>

          <div className="bg-[var(--color-background-primary)] rounded-[calc(0.5rem-2px)] p-6 flex flex-col items-center gap-3">
            
            <div className="flex items-center justify-center gap-2">
              <h2
                  className="text-lg font-bold animate-shimmer bg-clip-text text-transparent bg-gradient-to-br from-[#FBBF24] to-[#262626] text-center"
                  style={{
                      fontFamily: "'Marhey', 'Tajawal', sans-serif",
                      backgroundSize: '400% 400%',
                  }}
              >
                  تفاعل اكثر. شرح اكثر . أسئلة أكثر . فهم أعمق
              </h2>
            </div>
            
            <div className="mt-2 w-full text-center">
                <div
                    className="w-full h-px mb-3 animate-expand-shimmer"
                    style={{
                        backgroundImage: 'linear-gradient(to right, transparent, #c09a3e, #856a3d, #c09a3e, transparent)',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                    }}
                ></div>
                <span
                  className="block text-lg font-bold animate-shimmer"
                  style={{
                    fontFamily: "'Marhey', 'Tajawal', sans-serif",
                    backgroundImage: 'linear-gradient(to bottom right, #FBBF24, #262626)',
                    color: 'transparent',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    backgroundSize: '200% 200%',
                  }}
                >
                  إبدأ رحلة كنزك العلمى بذكاء مع
                </span>
                <div
                  className="flex items-center justify-center gap-2 text-lg font-bold"
                  style={{
                    fontFamily: "'Marhey', 'Tajawal', sans-serif",
                  }}
                >
                    <span
                      className="animate-shimmer"
                      style={{
                        backgroundImage: 'linear-gradient(to bottom right, #FBBF24, #262626)',
                        color: 'transparent',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        backgroundSize: '200% 200%',
                      }}
                    >
                      النسخة العربية
                    </span>
                    <RomanTempleIcon className="w-5 h-5" />
                    <span
                      className="animate-shimmer"
                      style={{
                        backgroundImage: 'linear-gradient(to bottom right, #FBBF24, #262626)',
                        color: 'transparent',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        backgroundSize: '200% 200%',
                      }}
                    >
                      Booksy
                    </span>
                </div>
            </div>

          </div>
        </div>
        
        {hasLastBook && (
          <button
            onClick={onLoadLastBook}
            style={{ backgroundImage: 'linear-gradient(to bottom right, #FBBF24, #262626)' }}
            className="relative z-10 mt-6 w-full max-w-md flex items-center justify-center gap-3 px-6 py-3 text-base font-bold text-white rounded-lg shadow-lg hover:opacity-90 transform hover:scale-105 transition-all duration-300"
          >
            <HistoryIcon className="w-5 h-5"/>
            تحميل الكتاب الأخير
          </button>
        )}
      </div>
    );
  }

  // Dashboard View with scattered tools
  const toolPositions = [
      { top: '25%', left: '20%', transform: 'rotate(-10deg)' },
      { top: '20%', left: '75%', transform: 'rotate(8deg)' },
      { top: '55%', left: '80%', transform: 'rotate(-5deg)' },
      { top: '65%', left: '15%', transform: 'rotate(12deg)' },
      { top: '85%', left: '50%', transform: 'rotate(-3deg)' },
      { top: '45%', left: '45%', transform: 'rotate(5deg)' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 md:gap-6 py-3 md:py-6">
      <input id="file-upload-interactive" name="file-upload-interactive" type="file" className="sr-only" accept=".pdf,.doc,.docx,image/*" onChange={onInputChange} />
      
      <div 
        className="p-3 sm:p-6 text-center border border-[var(--color-border-secondary)] rounded-2xl shadow-lg relative min-h-[50vh] md:min-h-[60vh]"
        style={{ backgroundImage: 'var(--color-background-container-gradient)' }}
      >
        {/* Central Element - Interactive Book Uploader */}
        <div
          onClick={() => document.getElementById('file-upload-interactive')?.click()}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group z-10"
          style={{ top: 'calc(50% - 20px)' }}
        >
          <h3
            className="text-2xl font-bold text-book-gradient"
            style={{
              fontFamily: "'Marhey', 'Tajawal', sans-serif",
              marginBottom: '5px'
            }}
          >
            محادثة
          </h3>
          <div className="relative">
            <GradientBookOpenIcon 
              className="w-24 h-24 sm:w-32 sm:h-32 transition-transform duration-300 group-hover:scale-110" 
              gradientId="book-icon-gradient" 
            />
            <div 
                className="absolute inset-0 pointer-events-none flex justify-center items-center select-none"
            >
              <div className="flex items-center" style={{ gap: '15px' }}>
                <span
                    className="text-base sm:text-lg font-bold text-gold-brown"
                    style={{ 
                        fontFamily: "'Marhey', 'Tajawal', sans-serif",
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
                        letterSpacing: '1px'
                    }}
                >
                    التفاعلى
                </span>
                <span
                    className="text-base sm:text-lg font-bold text-gold-brown"
                    style={{ 
                        fontFamily: "'Marhey', 'Tajawal', sans-serif",
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
                        letterSpacing: '1px'
                    }}
                >
                    كتابك
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scattered Smart Tools (all EXCEPT the repurposed "محادثة" tool) */}
        {toolButtons
          .filter(tool => tool.text !== 'محادثة')
          .map((tool, index) => {
            const pos = toolPositions[index % toolPositions.length];
            
            const style: React.CSSProperties = { 
                fontFamily: "'Marhey', 'Tajawal', sans-serif",
                top: pos.top,
                left: pos.left,
                transform: `${pos.transform} translate(-50%, -50%)`,
                zIndex: 10
            };

            if (tool.text === 'تعديل النص') {
                style.top = `calc(${pos.top} + 20px)`;
            }
            
            return (
                <button
                    key={index}
                    onClick={tool.action}
                    className="absolute text-3xl font-bold p-2 text-book-gradient transition-all duration-300 transform hover:scale-110 hover:drop-shadow-lg"
                    style={style}
                >
                    {tool.text}
                </button>
            );
        })}
      </div>
    </div>
  );
};

export default FileUploader;