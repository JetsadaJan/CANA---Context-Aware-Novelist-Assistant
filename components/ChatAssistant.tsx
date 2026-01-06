
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, StoryBible, Character, WorldItem, TimelineEvent } from '../types';
import { sendMessageToArchitect, ToolExecutor } from '../services/gemini';
import { Send, Bot, User, Loader2, Info, CheckCircle2, Trash2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateId } from '../services/storage';

interface ChatAssistantProps {
  bible: StoryBible;
  setBible: (bible: StoryBible) => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ bible, setBible }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize messages from bible (Database) or default welcome
  const messages = bible.architectHistory && bible.architectHistory.length > 0 
    ? bible.architectHistory 
    : [{
        id: 'welcome',
        role: 'model' as const,
        content: "รับทราบข้อมูล Story Bible ล่าสุดเรียบร้อยครับ พร้อมทำหน้าที่ตรวจสอบตรรกะและโครงสร้างเรื่องตามที่คุณกำหนด \n\n**Tip:** ผมสามารถจดจำ 'นิสัยตัวละคร' และ 'คำศัพท์เฉพาะ/กฎของโลก' ได้ทันทีที่คุณบอกครับ รวมถึงสามารถวิเคราะห์ Genre และ Tone ได้เอง",
        timestamp: Date.now()
    }];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, lastAction, isLoading]);

  const updateHistory = (newHistory: ChatMessage[]) => {
      setBible({ ...bible, architectHistory: newHistory });
  };

  const clearHistory = () => {
      if(window.confirm("คุณต้องการลบประวัติการสนทนาทั้งหมดหรือไม่? (ข้อมูลในฐานข้อมูลนิยายจะไม่หาย)")) {
          updateHistory([]);
          setLastAction("ล้างประวัติการสนทนาเรียบร้อย");
      }
  };

  // --- TOOL EXECUTORS ---
  
  const createToolHandler = (): ToolExecutor => ({
      // --- METADATA ---
      updateStoryMetadata: (args: any) => {
          const { genre, tone, title } = args;
          const updates: any = {};
          if (genre) updates.genre = genre;
          if (tone) updates.tone = tone;
          if (title) updates.title = title;

          if (Object.keys(updates).length > 0) {
              setBible((prev) => ({ ...prev, ...updates }));
              const changes = [];
              if (genre) changes.push(`Genre: ${genre}`);
              if (tone) changes.push(`Tone: ${tone}`);
              if (title) changes.push(`Title: ${title}`);
              
              setLastAction(`Updated Metadata: ${changes.join(', ')}`);
              return `Success: Story Metadata updated. Current State -> Title: ${title || bible.title}, Genre: ${genre || bible.genre}, Tone: ${tone || bible.tone}`;
          }
          return "No changes made to metadata.";
      },

      // --- CREATE ---
      createCharacter: (args: any) => {
          const { name, role, description, personality, appearance, dialogue_examples, category_name } = args;
          
          if (bible.characters.some(c => c.name.toLowerCase() === (name || '').toLowerCase())) {
              return `FAILED: Character '${name}' already exists. Ask the user if they want to update it.`;
          }

          let catId = bible.characterCategories[0]?.id; 
          const foundCat = bible.characterCategories.find(c => 
              c.name.toLowerCase().includes((category_name || '').toLowerCase())
          );
          if (foundCat) catId = foundCat.id;

          const template = foundCat ? foundCat.template : bible.characterCategories[0]?.template || [];
          const attrs = template.map(t => ({ id: generateId(), key: t.key, value: "" }));

          const newChar: Character = {
              id: generateId(),
              name: name || "Unnamed",
              role: role || "Unknown",
              description: description || "",
              personality: personality || "",
              appearance: appearance || "",
              dialogueExamples: dialogue_examples || "",
              categoryId: catId,
              traits: [],
              relationships: [],
              attributes: attrs
          };

          setBible((prev) => ({ ...prev, characters: [...prev.characters, newChar] }));
          setLastAction(`Added Character: ${newChar.name}`);
          return `Success: Character '${newChar.name}' created.`;
      },

      createWorldItem: (args: any) => {
          const { name, class_name, description } = args;

          if (bible.worldItems.some(i => i.name.toLowerCase() === (name || '').toLowerCase())) {
              return `FAILED: World Item '${name}' already exists. Ask the user if they want to update it.`;
          }

          let classId = bible.worldClasses[0]?.id;
          const foundClass = bible.worldClasses.find(c => 
              c.name.toLowerCase().includes((class_name || '').toLowerCase())
          );
          if (foundClass) classId = foundClass.id;

          const template = foundClass ? foundClass.template : [];
          const attrs = template.map(t => ({ id: generateId(), key: t.key, value: "" }));

          const newItem: WorldItem = {
              id: generateId(),
              classId: classId,
              name: name || "Unnamed",
              description: description || "",
              attributes: attrs
          };

          setBible((prev) => ({ ...prev, worldItems: [newItem, ...prev.worldItems] }));
          setLastAction(`Added Item: ${newItem.name} (${foundClass?.name || 'Default'})`);
          return `Success: '${newItem.name}' created in class '${foundClass?.name || 'Default'}'.`;
      },

      createTimelineEvent: (args: any) => {
          const { title, type, description, parent_title } = args;

          if (bible.timeline.some(t => t.title.toLowerCase() === (title || '').toLowerCase())) {
             return `FAILED: Event '${title}' already exists. Ask the user if they want to update it.`;
          }
          
          let parentId: string | undefined = undefined;
          if (parent_title) {
              const parent = bible.timeline.find(t => t.title.toLowerCase().includes(parent_title.toLowerCase()));
              if (parent) parentId = parent.id;
          }

          const newEvent: TimelineEvent = {
              id: generateId(),
              type: type || 'Episode',
              title: title || "New Event",
              description: description || "",
              parentId: parentId,
              order: bible.timeline.length
          };

          setBible((prev) => ({ ...prev, timeline: [...prev.timeline, newEvent] }));
          setLastAction(`Added Event: ${newEvent.title}`);
          return `Success: Timeline Event '${newEvent.title}' created.`;
      },

      // --- UPDATE ---
      updateCharacter: (args: any) => {
          const { target_name, new_name, role, description, personality, appearance, dialogue_examples } = args;
          let found = false;
          setBible((prev) => ({
              ...prev,
              characters: prev.characters.map(c => {
                  if (c.name.toLowerCase() === target_name.toLowerCase()) {
                      found = true;
                      return {
                          ...c,
                          name: new_name || c.name,
                          role: role || c.role,
                          description: description || c.description,
                          personality: personality || c.personality,
                          appearance: appearance || c.appearance,
                          dialogueExamples: dialogue_examples || c.dialogueExamples
                      };
                  }
                  return c;
              })
          }));
          if (found) {
              setLastAction(`Updated Character: ${new_name || target_name}`);
              return `Success: Character '${target_name}' updated.`;
          }
          return `Error: Character '${target_name}' not found.`;
      },

      updateWorldItem: (args: any) => {
          const { target_name, new_name, description } = args;
          let found = false;
          setBible((prev) => ({
              ...prev,
              worldItems: prev.worldItems.map(i => {
                  if (i.name.toLowerCase() === target_name.toLowerCase()) {
                      found = true;
                      return {
                          ...i,
                          name: new_name || i.name,
                          description: description || i.description
                      };
                  }
                  return i;
              })
          }));
          if (found) {
              setLastAction(`Updated Item: ${new_name || target_name}`);
              return `Success: Item '${target_name}' updated.`;
          }
          return `Error: Item '${target_name}' not found.`;
      },

      updateTimelineEvent: (args: any) => {
          const { target_title, new_title, description } = args;
          let found = false;
          setBible((prev) => ({
              ...prev,
              timeline: prev.timeline.map(t => {
                  if (t.title.toLowerCase() === target_title.toLowerCase()) {
                      found = true;
                      return {
                          ...t,
                          title: new_title || t.title,
                          description: description || t.description
                      };
                  }
                  return t;
              })
          }));
          if (found) {
              setLastAction(`Updated Event: ${new_title || target_title}`);
              return `Success: Event '${target_title}' updated.`;
          }
          return `Error: Event '${target_title}' not found.`;
      }
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMsg];
    updateHistory(newHistory); // Save user message immediately to DB
    setInput('');
    setIsLoading(true);
    setLastAction(null);

    const tools = createToolHandler();
    
    // We pass the newHistory. Note: bible might be stale in this closure, so we rely on newHistory.
    const responseText = await sendMessageToArchitect(bible, newHistory, userMsg.content, tools);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      content: responseText,
      timestamp: Date.now()
    };

    // Save final state to DB
    // IMPORTANT: fetch latest state logic handled by App.tsx, here we just push update
    // But since tools might have updated bible, we must use the function updater if possible.
    // However setBible is simple state replace.
    // The safest way here is:
    setBible(prev => ({ ...prev, architectHistory: [...newHistory, aiMsg] }));
    
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
           <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" /> Narrative Architect
          </h2>
          <p className="text-xs text-gray-500">
            Context: {bible.title} ({bible.characters?.length || 0} chars, {bible.worldItems?.length || 0} items)
          </p>
        </div>
        <div className="flex items-center gap-2">
             {messages.length > 1 && (
                 <button 
                    onClick={clearHistory} 
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                    title="Clear Chat History (Database)"
                 >
                     <Trash2 className="w-4 h-4" />
                 </button>
             )}
            <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded border border-gray-700 uppercase tracking-wide">
                gemini-3-pro-preview
            </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded bg-indigo-900/50 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <Bot className="w-5 h-5 text-indigo-300" />
              </div>
            )}
            
            <div className={`max-w-[85%] md:max-w-[75%] rounded-lg p-4 shadow-md ${
              msg.role === 'user' 
                ? 'bg-gray-800 text-gray-100 border border-gray-700' 
                : 'bg-indigo-950/20 text-gray-200 border border-indigo-500/20'
            }`}>
              {msg.role === 'model' ? (
                <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                        components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-indigo-300" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500/50 pl-4 italic text-gray-400 my-2" {...props} />,
                        }}
                    >
                        {msg.content}
                    </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>

             {msg.role === 'user' && (
              <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-gray-300" />
              </div>
            )}
          </div>
        ))}
        
        {/* Real-time Action Feedback */}
        {lastAction && (
             <div className="flex justify-center animate-fade-in-up">
                 <div className="bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                     <CheckCircle2 className="w-3 h-3" /> {lastAction}
                 </div>
             </div>
        )}

        {isLoading && (
          <div className="flex gap-4">
             <div className="w-8 h-8 rounded bg-indigo-900/50 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <Bot className="w-5 h-5 text-indigo-300" />
              </div>
              <div className="flex items-center gap-2 text-gray-500 bg-indigo-950/10 p-4 rounded-lg border border-indigo-500/10">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Consulting Story Bible logic...</span>
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
             placeholder="บอกข้อมูลใหม่, นิสัยตัวละคร, หรือกฎของโลก (ผมจะบันทึกทุกอย่าง)..."
             className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 pr-12 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none shadow-xl"
             rows={2}
           />
           <button
             onClick={handleSend}
             disabled={isLoading || !input.trim()}
             className="absolute right-3 bottom-3 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Send className="w-4 h-4" />
           </button>
         </div>
         <p className="text-center text-xs text-gray-600 mt-2 flex items-center justify-center gap-1">
            <Info className="w-3 h-3" /> AI จะบันทึกนิสัย, บทสนทนา, และกฎต่างๆ ลง Database อัตโนมัติ
         </p>
      </div>
    </div>
  );
};

export default ChatAssistant;
