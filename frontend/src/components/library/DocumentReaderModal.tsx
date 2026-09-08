import React, { useState } from 'react';
import { LibraryResource } from '../../types/library';
import { GeminiStudyAssistant } from './GeminiStudyAssistant';
import { X, ChevronLeft, ChevronRight, BookOpen, Bookmark } from 'lucide-react';

interface DocumentReaderModalProps {
  resource: LibraryResource;
  onClose: () => void;
}

export const DocumentReaderModal: React.FC<DocumentReaderModalProps> = ({ resource, onClose }) => {
  const [currentPage, setCurrentPage] = useState<number>(18);
  const [isSaved, setIsSaved] = useState<boolean>(resource.is_saved);

  const availablePages = [1, 5, 12, 18, 19, 20, 42, resource.page_count];

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < resource.page_count) setCurrentPage(currentPage + 1);
  };

  const pageContent = resource.pages_content[currentPage] || 
    `PAGE ${currentPage}: ${resource.title.toUpperCase()}\n\n` +
    `Facial landmark detection computes 468 3D spatial points locally in client browser memory at ~30 FPS. ` +
    `Eye Aspect Ratio (EAR) drops below 0.20 when blinking or drowsy. Zero raw video frames leave the user device.`;

  return (
    <div className="fixed inset-0 z-50 bg-[#07111F]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0B1728] border border-[#D6E3ED] dark:border-[#24425C] rounded-md w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Top Header Bar */}
        <div className="h-14 border-b border-[#D6E3ED] dark:border-[#24425C] bg-[#F5F9FC] dark:bg-[#10243A] px-6 flex items-center justify-between shrink-0 font-sans">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 rounded-md bg-[#176B87] dark:bg-[#27D7E8] text-white dark:text-[#07111F] font-bold flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white dark:text-[#07111F]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#10243A] dark:text-white leading-tight">
                {resource.title}
              </h2>
              <p className="text-[11px] font-mono text-[#526B7D] dark:text-[#9FB2C5]">
                {resource.author} • <span className="text-[#176B87] dark:text-[#27D7E8] font-bold">{resource.resource_type} ({resource.page_count} PAGES)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold flex items-center space-x-1.5 border transition-colors ${
                isSaved 
                  ? 'bg-[#176B87] dark:bg-[#27D7E8] text-white dark:text-[#07111F] border-[#176B87] dark:border-[#27D7E8]' 
                  : 'bg-white dark:bg-[#0B1728] text-[#10243A] dark:text-[#9FB2C5] border-[#D6E3ED] dark:border-[#24425C]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isSaved ? 'SAVED' : 'SAVE'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[#526B7D] dark:text-[#9FB2C5] hover:text-[#10243A] dark:hover:text-white hover:bg-[#D6E3ED] dark:hover:bg-[#10243A] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-COLUMN READER LAYOUT */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* COLUMN 1: LEFT PAGE NAVIGATION */}
          <div className="hidden lg:block lg:col-span-2 border-r border-[#D6E3ED] dark:border-[#24425C] bg-[#F5F9FC] dark:bg-[#07111F] p-4 overflow-y-auto font-mono text-xs space-y-3">
            <span className="text-[10px] font-bold uppercase text-[#526B7D] dark:text-[#9FB2C5]">PAGES INDEX</span>
            <div className="space-y-1">
              {availablePages.map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-full px-3 py-2 rounded-md text-left flex items-center justify-between transition-colors ${
                    currentPage === pg 
                      ? 'bg-[#176B87] dark:bg-[#27D7E8] text-white dark:text-[#07111F] font-bold' 
                      : 'text-[#10243A] dark:text-[#9FB2C5] hover:bg-[#D6E3ED] dark:hover:bg-[#10243A]'
                  }`}
                >
                  <span>PAGE 0{pg}</span>
                  {currentPage === pg && <span className="text-[10px]">CURRENT</span>}
                </button>
              ))}
            </div>
          </div>

          {/* COLUMN 2: CENTER DOCUMENT VIEWER */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-white dark:bg-[#0B1728] p-6 md:p-8 overflow-y-auto">
            
            {/* Page Content Display */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#D6E3ED] dark:border-[#24425C] pb-3 font-mono text-xs">
                <span className="text-[#176B87] dark:text-[#27D7E8] font-bold uppercase">
                  {resource.course_association || 'RESEARCH RESOURCE'}
                </span>
                <span className="text-[#526B7D] dark:text-[#9FB2C5] font-bold">PAGE {currentPage} OF {resource.page_count}</span>
              </div>

              <div className="bg-[#F5F9FC] dark:bg-[#10243A] p-6 rounded-md border border-[#D6E3ED] dark:border-[#24425C] min-h-[360px] whitespace-pre-wrap font-sans text-sm text-[#10243A] dark:text-[#F5F9FC] leading-relaxed font-medium">
                {pageContent}
              </div>
            </div>

            {/* Pagination Control Bar */}
            <div className="pt-4 border-t border-[#D6E3ED] dark:border-[#24425C] flex items-center justify-between font-mono text-xs">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="px-4 py-2 rounded-md bg-[#F5F9FC] dark:bg-[#10243A] border border-[#D6E3ED] dark:border-[#24425C] text-[#10243A] dark:text-[#9FB2C5] disabled:opacity-40 flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>PREV PAGE</span>
              </button>

              <span className="text-[#526B7D] dark:text-[#9FB2C5] font-bold">PAGE {currentPage} / {resource.page_count}</span>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= resource.page_count}
                className="px-4 py-2 rounded-md bg-[#F5F9FC] dark:bg-[#10243A] border border-[#D6E3ED] dark:border-[#24425C] text-[#10243A] dark:text-[#9FB2C5] disabled:opacity-40 flex items-center space-x-1"
              >
                <span>NEXT PAGE</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* COLUMN 3: RIGHT GEMINI STUDY ASSISTANT */}
          <div className="lg:col-span-3 h-full overflow-hidden">
            <GeminiStudyAssistant resource={resource} currentPage={currentPage} />
          </div>

        </div>

      </div>
    </div>
  );
};
