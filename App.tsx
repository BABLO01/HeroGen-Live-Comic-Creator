import React, { useState, useRef } from 'react';
import { AppState, ComicStory, UserSettings, AudioStatus } from './types';
import { generateComicScript, generatePanelImage } from './services/geminiService';
import LiveManager from './components/LiveManager';
import ComicBookViewer from './components/ComicBookViewer';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.UPLOAD);
  const [image, setImage] = useState<string | null>(null);
  const [story, setStory] = useState<ComicStory | null>(null);
  
  // Audio/Live State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>(AudioStatus.DISCONNECTED);

  const [settings, setSettings] = useState<UserSettings>({
    heroName: 'Captain Pixel',
    superpower: 'Can manipulate digital reality',
    villain: 'The Glitch',
    setting: 'Neo-Tokyo Cyberpunk City',
    artStyle: 'Modern American Comic',
  });

  // Input Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64.split(',')[1]); // remove data:image/jpeg;base64, prefix
        setState(AppState.CONFIG);
      };
      reader.readAsDataURL(file);
    }
  };

  const startGeneration = async () => {
    if (!image) return;
    setState(AppState.GENERATING);
    
    try {
      // 1. Generate Script
      const script = await generateComicScript(image, settings);
      setStory(script);
      setState(AppState.VIEWING);
      
      // 2. Generate Images Sequentially (to avoid rate limits and allow incremental viewing)
      const newPages = [...script.pages];
      
      // We'll update state as each image arrives
      for (let i = 0; i < newPages.length; i++) {
        const page = newPages[i];
        try {
            const imageUrl = await generatePanelImage(
                page.panelDescription, 
                image, 
                settings.artStyle
            );
            
            // Functional update to ensure we have latest state if user navigates
            setStory(prev => {
                if(!prev) return null;
                const updatedPages = [...prev.pages];
                updatedPages[i] = { ...updatedPages[i], imageUrl, isLoading: false };
                return { ...prev, pages: updatedPages };
            });
        } catch (err) {
            console.error(`Failed to generate page ${i}`, err);
             setStory(prev => {
                if(!prev) return null;
                const updatedPages = [...prev.pages];
                updatedPages[i] = { ...updatedPages[i], isLoading: false, imageUrl: 'https://picsum.photos/800/600?error' };
                return { ...prev, pages: updatedPages };
            });
        }
      }

    } catch (error) {
      console.error("Generation failed", error);
      alert("Failed to generate comic. Please try again.");
      setState(AppState.CONFIG);
    }
  };

  const toggleLive = () => {
    setIsLiveActive(!isLiveActive);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
      <LiveManager 
        isActive={isLiveActive} 
        status={audioStatus} 
        setStatus={setAudioStatus} 
      />

      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900 via-zinc-950 to-zinc-950"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
      </div>

      {/* Header / Live Control */}
      <nav className="fixed top-0 left-0 w-full z-50 p-4 flex justify-between items-center bg-gradient-to-b from-zinc-950/80 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-2">
           <span className="text-2xl font-comic-title text-red-500 -rotate-2 border-2 border-white px-2 bg-black">HERO</span>
           <span className="text-2xl font-comic-title text-white">GEN</span>
        </div>
        
        <button 
          onClick={toggleLive}
          className={`flex items-center gap-3 px-4 py-2 rounded-full border-2 transition-all shadow-lg ${
             isLiveActive 
               ? 'bg-red-600 border-red-400 text-white animate-pulse-glow' 
               : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-white'
          }`}
        >
          {audioStatus === AudioStatus.SPEAKING && (
             <div className="flex gap-1 h-4 items-end">
               <div className="w-1 bg-white animate-[bounce_1s_infinite] h-2"></div>
               <div className="w-1 bg-white animate-[bounce_1.2s_infinite] h-4"></div>
               <div className="w-1 bg-white animate-[bounce_0.8s_infinite] h-3"></div>
             </div>
          )}
          <span className="font-bold font-mono uppercase text-sm">
             {isLiveActive ? (audioStatus === AudioStatus.CONNECTING ? 'Connecting...' : 'Live Director ON') : 'Enable Voice Director'}
          </span>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </button>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-20 min-h-screen flex flex-col">
        
        {state === AppState.UPLOAD && (
           <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-float">
              <h1 className="text-6xl md:text-8xl font-comic-title text-white mb-8 drop-shadow-[0_5px_5px_rgba(255,0,0,0.5)]">
                 BECOME A <span className="text-red-500">HERO</span>
              </h1>
              <p className="max-w-xl text-xl text-zinc-400 mb-12 font-comic-text">
                Upload a selfie and let Gemini AI craft a 10-page animated comic book starring YOU.
              </p>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group cursor-pointer relative w-64 h-64 bg-zinc-900 border-4 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center hover:border-red-500 hover:bg-zinc-800 transition-all transform hover:scale-105"
              >
                 <svg className="w-16 h-16 text-zinc-600 group-hover:text-red-500 mb-4 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 <span className="font-bold text-zinc-500 group-hover:text-white">UPLOAD SELFIE</span>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={handleImageUpload} 
                   accept="image/*" 
                   className="hidden" 
                 />
              </div>
           </div>
        )}

        {state === AppState.CONFIG && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-2xl bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl">
                <h2 className="text-4xl font-comic-title text-white mb-6 text-center">Origin Story Setup</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-400">HERO NAME</label>
                    <input 
                      type="text" 
                      value={settings.heroName}
                      onChange={e => setSettings({...settings, heroName: e.target.value})}
                      className="w-full bg-black border border-zinc-700 p-3 rounded-lg text-white focus:border-red-500 focus:outline-none font-comic-text text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-400">SUPERPOWER</label>
                    <input 
                      type="text" 
                      value={settings.superpower}
                      onChange={e => setSettings({...settings, superpower: e.target.value})}
                      className="w-full bg-black border border-zinc-700 p-3 rounded-lg text-white focus:border-red-500 focus:outline-none font-comic-text text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-400">VILLAIN</label>
                    <input 
                      type="text" 
                      value={settings.villain}
                      onChange={e => setSettings({...settings, villain: e.target.value})}
                      className="w-full bg-black border border-zinc-700 p-3 rounded-lg text-white focus:border-red-500 focus:outline-none font-comic-text text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-400">SETTING</label>
                    <input 
                      type="text" 
                      value={settings.setting}
                      onChange={e => setSettings({...settings, setting: e.target.value})}
                      className="w-full bg-black border border-zinc-700 p-3 rounded-lg text-white focus:border-red-500 focus:outline-none font-comic-text text-lg"
                    />
                  </div>
                </div>

                <button 
                  onClick={startGeneration}
                  className="w-full mt-8 bg-red-600 hover:bg-red-500 text-white font-comic-title text-2xl py-4 rounded-xl transition-transform transform hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                >
                  GENERATE COMIC
                </button>
             </div>
          </div>
        )}

        {state === AppState.GENERATING && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
             <Spinner className="w-24 h-24 text-red-500 mb-8" />
             <h2 className="text-4xl font-comic-title text-white animate-pulse">WRITING SCRIPT...</h2>
             <p className="text-zinc-400 mt-4 font-comic-text text-xl">The AI is brainstorming your heroic deeds.</p>
          </div>
        )}

        {state === AppState.VIEWING && story && (
           <ComicBookViewer story={story} />
        )}

      </main>
    </div>
  );
};

export default App;
