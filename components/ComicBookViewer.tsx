import React, { useState } from 'react';
import { ComicPage, ComicStory } from '../types';
import Spinner from './Spinner';

interface ComicBookViewerProps {
  story: ComicStory;
}

const ComicBookViewer: React.FC<ComicBookViewerProps> = ({ story }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const nextPage = () => {
    if (currentPageIndex < story.pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const currentPage = story.pages[currentPageIndex];

  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col items-center justify-center p-4">
      <div className="mb-6 text-center">
        <h1 className="text-5xl md:text-7xl font-comic-title text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-red-500 to-purple-600 drop-shadow-lg">
          {story.title || "YOUR HEROIC TALE"}
        </h1>
        <p className="text-zinc-400 mt-2 font-comic-text text-xl">Feat. {story.heroName}</p>
      </div>

      {/* Book Container */}
      <div className="relative w-full aspect-[2/3] md:aspect-[16/9] max-h-[70vh] bg-zinc-900 border-8 border-zinc-800 rounded-lg shadow-2xl overflow-hidden perspective-1000 group">
        
        {/* Page Content */}
        <div className="w-full h-full bg-white flex flex-col md:flex-row overflow-hidden">
            {/* Image Area */}
            <div className="relative w-full md:w-2/3 h-2/3 md:h-full bg-black overflow-hidden">
                {currentPage.isLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <Spinner className="w-12 h-12 text-red-500 mb-4" />
                    <p className="font-comic-title text-xl animate-pulse">Drawing Scene {currentPage.pageNumber}...</p>
                  </div>
                ) : (
                  <img 
                    src={currentPage.imageUrl} 
                    alt={currentPage.panelDescription}
                    className="w-full h-full object-cover animate-float hover:scale-105 transition-transform duration-[10s]"
                  />
                )}
                
                {/* Panel Number Badge */}
                <div className="absolute top-4 left-4 bg-yellow-400 text-black font-black font-comic-title text-xl px-3 py-1 -rotate-3 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                   PAGE {currentPage.pageNumber}
                </div>
            </div>

            {/* Text Area */}
            <div className="w-full md:w-1/3 h-1/3 md:h-full bg-white p-6 flex flex-col justify-center border-l-4 border-black relative">
                <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-gray-200 to-transparent opacity-50"></div>
                
                {/* Dialogue Bubble */}
                {!currentPage.isLoading && (
                  <div className="bg-white border-4 border-black p-6 rounded-[2rem] rounded-bl-none shadow-[8px_8px_0px_rgba(0,0,0,0.2)] mb-4 transform -rotate-1 hover:rotate-0 transition-transform">
                      <p className="font-comic-text text-2xl md:text-3xl text-black font-bold leading-tight">
                        "{currentPage.dialogue}"
                      </p>
                  </div>
                )}
                
                <div className="mt-auto">
                   <p className="font-comic-text text-gray-500 text-sm italic">
                     Panel Action: {currentPage.panelDescription}
                   </p>
                </div>
            </div>
        </div>

        {/* Navigation Overlay */}
        <div className="absolute inset-0 flex justify-between items-center pointer-events-none px-4">
            <button 
              onClick={prevPage}
              disabled={currentPageIndex === 0}
              className={`pointer-events-auto p-3 rounded-full bg-black/50 text-white hover:bg-red-600 transition disabled:opacity-0 ${currentPageIndex === 0 ? '' : 'animate-pulse-glow'}`}
            >
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>

            <button 
              onClick={nextPage}
              disabled={currentPageIndex === story.pages.length - 1}
              className={`pointer-events-auto p-3 rounded-full bg-black/50 text-white hover:bg-red-600 transition disabled:opacity-0 ${currentPageIndex === story.pages.length - 1 ? '' : 'animate-pulse-glow'}`}
            >
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 w-full h-2 bg-zinc-800">
          <div 
            className="h-full bg-red-500 transition-all duration-300 ease-out"
            style={{ width: `${((currentPageIndex + 1) / story.pages.length) * 100}%` }}
          ></div>
        </div>

      </div>
      
      <div className="mt-6 flex gap-4">
         <span className="px-4 py-2 bg-zinc-800 rounded-lg font-mono text-xs text-zinc-500">
           Gemini 2.5 Flash & Pro
         </span>
      </div>
    </div>
  );
};

export default ComicBookViewer;
