
import React, { useRef } from 'react';
import { Book, MessageSquare, Trash2, Settings, Download, Upload, Gamepad2, Globe, Users, List, Activity, Key } from 'lucide-react';
import { AppTab, StoryBible } from '../types';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onReset: () => void;
  bible: StoryBible;
  onImport: (bible: StoryBible) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onReset, bible, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = JSON.stringify(bible, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `cana_bible_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed) {
           if(confirm("This will overwrite your current project data. Continue?")) {
              onImport(parsed as StoryBible);
           }
        } else {
           alert("Invalid file format.");
        }
      } catch (error) {
        console.error("Import error", error);
        alert("Failed to parse the file.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const NavButton = ({ tab, label, icon: Icon }: { tab: AppTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        activeTab === tab
          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="hidden md:block font-medium">{label}</span>
    </button>
  );

  return (
    <div className="w-20 md:w-64 bg-gray-900 border-r border-gray-800 flex flex-col justify-between h-full shrink-0">
      <div>
        <div className="p-4 md:p-6 flex items-center gap-3 border-b border-gray-800 mb-4">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Settings className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-gray-100 hidden md:block tracking-tight">CANA <span className="text-xs font-normal text-gray-400 block">Novelist Assistant</span></h1>
        </div>

        <nav className="px-2 space-y-2">
            <NavButton tab={AppTab.BIBLE} label="Overview" icon={Activity} />
            <div className="pt-2 pb-1 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider hidden md:block">Database</div>
            <NavButton tab={AppTab.WORLD} label="World & Lore" icon={Globe} />
            <NavButton tab={AppTab.CHARACTERS} label="Characters" icon={Users} />
            <NavButton tab={AppTab.TIMELINE} label="Timeline & BG" icon={List} />
            
            <div className="pt-2 pb-1 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider hidden md:block">AI Modules</div>
            <NavButton tab={AppTab.CHAT} label="Architect Chat" icon={MessageSquare} />
            <NavButton tab={AppTab.ROLEPLAY} label="Roleplay Mode" icon={Gamepad2} />
            
            <div className="pt-2 pb-1 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider hidden md:block">System</div>
            <NavButton tab={AppTab.SETTINGS} label="API Key" icon={Key} />
        </nav>
      </div>

      <div className="p-4 border-t border-gray-800 space-y-2">
        <div className="flex flex-col md:flex-row gap-2">
             <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
            <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-xs font-medium">
                <Download className="w-4 h-4" /> <span className="hidden md:inline">Save</span>
            </button>
             <button onClick={handleImportClick} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-xs font-medium">
                <Upload className="w-4 h-4" /> <span className="hidden md:inline">Load</span>
            </button>
        </div>

        <button
          onClick={() => {
            if(confirm("Are you sure you want to reset?")) onReset();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
        >
          <Trash2 className="w-5 h-5 shrink-0" />
          <span className="hidden md:block font-medium">Reset Project</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
