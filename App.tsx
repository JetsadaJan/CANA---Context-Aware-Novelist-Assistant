
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import BibleManager from './components/BibleManager';
import ChatAssistant from './components/ChatAssistant';
import RoleplayChat from './components/RoleplayChat';
import { AppTab, StoryBible } from './types';
import { loadBible, saveBible, resetBible } from './services/storage';
import { Key, Save, Trash2, Eye, EyeOff } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.BIBLE);
  const [bible, setBible] = useState<StoryBible>(loadBible());

  // Settings State
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  // Load API Key on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('cana_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setKeySaved(true);
    }
  }, []);

  // Auto-save whenever bible changes
  useEffect(() => {
    saveBible(bible);
  }, [bible]);

  const handleReset = () => {
    const newBible = resetBible();
    setBible(newBible);
    window.location.reload(); 
  };

  const saveApiKey = () => {
    localStorage.setItem('cana_api_key', apiKey.trim());
    setKeySaved(true);
    alert('API Key Saved successfully!');
  };

  const removeApiKey = () => {
    localStorage.removeItem('cana_api_key');
    setApiKey('');
    setKeySaved(false);
  };

  const SettingsView = () => (
    <div className="flex items-center justify-center h-full p-8">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
          <div className="p-3 bg-indigo-900/30 rounded-xl">
             <Key className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">API Key Configuration</h2>
            <p className="text-sm text-gray-500">Connect your Google Gemini AI account</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-200">
             If you are experiencing <strong>Quota Errors (429)</strong>, please enter your own Gemini API key below.
             The key is stored locally on your browser and is never sent to our servers.
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-400 mb-2">Google Gemini API Key</label>
             <div className="relative">
               <input 
                 type={showKey ? "text" : "password"}
                 value={apiKey}
                 onChange={(e) => setApiKey(e.target.value)}
                 className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-4 pr-12 py-3 text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                 placeholder="AIzaSy..."
               />
               <button 
                 onClick={() => setShowKey(!showKey)}
                 className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
               >
                 {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
               </button>
             </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={saveApiKey}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" /> Save Key
            </button>
            {keySaved && (
              <button 
                onClick={removeApiKey}
                className="px-4 py-2.5 bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-500/20 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Remove
              </button>
            )}
          </div>

          <div className="text-center mt-6">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300 underline">
              Get a free API Key from Google AI Studio
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans selection:bg-indigo-500/30">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onReset={handleReset}
        bible={bible}
        onImport={setBible}
      />
      
      <main className="flex-1 h-full overflow-hidden relative">
        {/* Render BibleManager with specific view props for the data management tabs */}
        <div className={`h-full transition-opacity duration-200 ${activeTab === AppTab.BIBLE ? 'block' : 'hidden'}`}>
          <BibleManager bible={bible} setBible={setBible} view="BIBLE" />
        </div>
        <div className={`h-full transition-opacity duration-200 ${activeTab === AppTab.WORLD ? 'block' : 'hidden'}`}>
          <BibleManager bible={bible} setBible={setBible} view="WORLD" />
        </div>
        <div className={`h-full transition-opacity duration-200 ${activeTab === AppTab.CHARACTERS ? 'block' : 'hidden'}`}>
          <BibleManager bible={bible} setBible={setBible} view="CHARACTERS" />
        </div>
        <div className={`h-full transition-opacity duration-200 ${activeTab === AppTab.TIMELINE ? 'block' : 'hidden'}`}>
          <BibleManager bible={bible} setBible={setBible} view="TIMELINE" />
        </div>

        {/* Chat Modules */}
        <div className={`h-full transition-opacity duration-200 ${activeTab === AppTab.CHAT ? 'block' : 'hidden'}`}>
          <ChatAssistant bible={bible} setBible={setBible} />
        </div>
        <div className={`h-full transition-opacity duration-200 ${activeTab === AppTab.ROLEPLAY ? 'block' : 'hidden'}`}>
          <RoleplayChat bible={bible} setBible={setBible} />
        </div>
        
        {/* Settings */}
        <div className={`h-full transition-opacity duration-200 ${activeTab === AppTab.SETTINGS ? 'block' : 'hidden'}`}>
          <SettingsView />
        </div>
      </main>
    </div>
  );
};

export default App;
