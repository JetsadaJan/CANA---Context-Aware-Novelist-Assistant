
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, StoryBible } from '../types';
import { sendMessageToGameMaster } from '../services/gemini';
import { Send, Gamepad2, User, Loader2, Info, Sparkles, RefreshCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface RoleplayChatProps {
  bible: StoryBible;
  setBible: (bible: StoryBible) => void;
}

const RoleplayChat: React.FC<RoleplayChatProps> = ({ bible, setBible }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load from DB or default
  const messages = bible.roleplayHistory && bible.roleplayHistory.length > 0 
    ? bible.roleplayHistory
    : [{
        id: 'welcome-rp',
        role: 'model' as const,
        content: `**ยินดีต้อนรับสู่โลกแห่ง ${bible.title}**\n\nผมคือ Game Master (GM) ที่จะพาคุณออกเดินทางในโลกที่คุณสร้างขึ้น\nคุณสามารถบอกผมได้ว่าอยากเริ่มที่ไหน หรืออยากทำอะไร (เช่น "ตื่นขึ้นมาในโรงเตี๊ยม", "เดินทางไปกิลด์นักผจญภัย", "คุยกับ [ชื่อตัวละคร]")`,
        timestamp: Date.now()
    }];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const updateHistory = (newHistory: ChatMessage[]) => {
      setBible({ ...bible, roleplayHistory: newHistory });
  };

  const handleReset = () => {
    if(window.confirm("เริ่มการผจญภัยใหม่? (ประวัติการ Roleplay ปัจจุบันจะถูกลบ)")) {
       updateHistory([]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMsg];
    updateHistory(newHistory);
    setInput('');
    setIsLoading(true);

    const responseText = await sendMessageToGameMaster(bible, newHistory, userMsg.content);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      content: responseText,
      timestamp: Date.now()
    };

    setBible(prev => ({ ...prev, roleplayHistory: [...newHistory, aiMsg] }));
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm flex justify-between items-center">
        <div>
           <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5" /> Roleplay Session
          </h2>
          <p className="text-xs text-gray-500">
            Adventure in: {bible.title} ({bible.genre})
          </p>
        </div>
        <div>
            <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/20 text-emerald-400 border border-emerald-500/20 rounded hover:bg-emerald-900/40 text-xs font-medium cursor-pointer"
            >
                <RefreshCcw className="w-3 h-3" /> Restart Adventure
            </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-lg shadow-emerald-900/20">
                <Gamepad2 className="w-6 h-6 text-emerald-300" />
              </div>
            )}
            
            <div className={`max-w-[85%] md:max-w-[75%] rounded-xl p-5 ${
              msg.role === 'user' 
                ? 'bg-gray-800 text-gray-100 border border-gray-700 shadow-md' 
                : 'bg-emerald-950/10 text-gray-200 border border-emerald-500/20 shadow-inner'
            }`}>
              {msg.role === 'model' ? (
                <div className="prose prose-invert prose-sm max-w-none font-serif leading-relaxed text-gray-300">
                    <ReactMarkdown
                        components={{
                            p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-emerald-300" {...props} />,
                            em: ({node, ...props}) => <em className="text-emerald-200/80 not-italic" {...props} />, // Highlight actions/sounds potentially
                        }}
                    >
                        {msg.content}
                    </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
              )}
            </div>

             {msg.role === 'user' && (
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-gray-300" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Gamepad2 className="w-6 h-6 text-emerald-300 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 text-emerald-500/70 bg-emerald-950/10 p-4 rounded-lg border border-emerald-500/10">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">GM is weaving the story...</span>
              </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
         <div className="max-w-4xl mx-auto relative">
           <textarea
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={handleKeyDown}
             placeholder="กระทำสิ่งใดสิ่งหนึ่ง, พูดคุย, หรือเดินทาง..."
             className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 pr-12 text-gray-100 placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none shadow-xl font-medium"
             rows={2}
           />
           <button
             onClick={handleSend}
             disabled={isLoading || !input.trim()}
             className="absolute right-3 bottom-3 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/50"
           >
             <Send className="w-4 h-4" />
           </button>
         </div>
      </div>
    </div>
  );
};

export default RoleplayChat;
