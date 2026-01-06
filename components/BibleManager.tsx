
import React, { useState } from 'react';
import { StoryBible, Character, WorldClass, WorldItem, TimelineEvent, KeyValue, CharacterCategory, TimelineLevel } from '../types';
import { Plus, X, Globe, Trash2, FolderOpen, Database, ChevronRight, Activity, History, Bookmark, Users, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import { generateId } from '../services/storage';

interface BibleManagerProps {
  bible: StoryBible;
  setBible: React.Dispatch<React.SetStateAction<StoryBible>>;
  view: 'BIBLE' | 'WORLD' | 'CHARACTERS' | 'TIMELINE';
}

const BibleManager: React.FC<BibleManagerProps> = ({ bible, setBible, view }) => {
  // World State
  const [selectedWorldClassId, setSelectedWorldClassId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState(false);
  
  // Character State
  const [charSubTab, setCharSubTab] = useState<'roster' | 'classes'>('roster');

  // Helper for simple updates
  const updateBible = (updates: Partial<StoryBible>) => {
    setBible(prev => ({ ...prev, ...updates }));
  };

  // ================= SORTING HELPERS =================

  // Generic array move
  const moveItemInArray = <T extends { id: string }>(
      fullArray: T[], 
      subsetArray: T[], // The filtered view the user sees
      id: string, 
      direction: 'up' | 'down'
  ): T[] => {
      const subsetIndex = subsetArray.findIndex(x => x.id === id);
      if (subsetIndex === -1) return fullArray;
      if (direction === 'up' && subsetIndex === 0) return fullArray;
      if (direction === 'down' && subsetIndex === subsetArray.length - 1) return fullArray;

      const targetSubsetIndex = direction === 'up' ? subsetIndex - 1 : subsetIndex + 1;
      
      const itemA = subsetArray[subsetIndex];
      const itemB = subsetArray[targetSubsetIndex];

      // We need to swap them in the FULL array.
      // Strategy: Map the full array, swapping the instances of itemA and itemB
      const indexA = fullArray.findIndex(x => x.id === itemA.id);
      const indexB = fullArray.findIndex(x => x.id === itemB.id);

      if (indexA === -1 || indexB === -1) return fullArray;

      const newArray = [...fullArray];
      // Swap positions in the main array directly? 
      // This works if we want to preserve exact global positions, but if the filtered list 
      // implies they should be adjacent, this might behave oddly if they are far apart in global list.
      // BUT, for simple lists like classes or characters, this simple swap is usually what users expect.
      // However, for World Items which are filtered by class, simple swap of indices is safer.
      
      newArray[indexA] = fullArray[indexB];
      newArray[indexB] = fullArray[indexA];
      
      return newArray;
  };

  // ================= WORLD BUILDING (OOP) HANDLERS =================
  const addWorldClass = () => {
      const newClass: WorldClass = {
          id: generateId(),
          name: "New Class (e.g. History)",
          template: []
      };
      setBible(prev => ({ ...prev, worldClasses: [...prev.worldClasses, newClass] }));
      setSelectedWorldClassId(newClass.id);
  };
  
  const moveWorldClass = (id: string, dir: 'up' | 'down') => {
      setBible(prev => ({
          ...prev,
          worldClasses: moveItemInArray(prev.worldClasses, prev.worldClasses, id, dir)
      }));
  };

  const updateWorldClass = (id: string, updates: Partial<WorldClass>) => {
      setBible(prev => ({
          ...prev,
          worldClasses: prev.worldClasses.map(c => c.id === id ? { ...c, ...updates } : c)
      }));
  };

  const deleteWorldClass = (e: React.MouseEvent | null, id: string, skipConfirm = false) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      
      setBible(prev => {
          const itemsInClass = prev.worldItems.filter(i => i.classId === id);
          if (itemsInClass.length > 0) {
              if (!skipConfirm && !window.confirm(`Delete this class AND all ${itemsInClass.length} items within it? This cannot be undone.`)) {
                  return prev;
              }
              return { 
                  ...prev,
                  worldClasses: prev.worldClasses.filter(c => c.id !== id),
                  worldItems: prev.worldItems.filter(i => i.classId !== id)
              };
          } else {
              if (!skipConfirm && !window.confirm("Delete this class?")) return prev;
              return { 
                  ...prev, 
                  worldClasses: prev.worldClasses.filter(c => c.id !== id) 
              };
          }
      });
      
      if(selectedWorldClassId === id) setSelectedWorldClassId(null);
  };

  const addWorldTemplateField = (classId: string) => {
      setBible(prev => ({
          ...prev,
          worldClasses: prev.worldClasses.map(c => c.id === classId ? { ...c, template: [...c.template, { id: generateId(), key: "New Field" }] } : c)
      }));
  };

  const updateWorldTemplateField = (classId: string, tempId: string, newKey: string) => {
      setBible(prev => {
          const cls = prev.worldClasses.find(c => c.id === classId);
          if(!cls) return prev;
          
          const field = cls.template.find(t => t.id === tempId);
          const oldKey = field?.key;

          // Update Template
          const newClasses = prev.worldClasses.map(c => 
              c.id === classId 
              ? { ...c, template: c.template.map(t => t.id === tempId ? {...t, key: newKey} : t) } 
              : c
          );

          // Propagate rename to all items in this class
          const newItems = prev.worldItems.map(item => {
              if (item.classId === classId && oldKey) {
                  return {
                      ...item,
                      attributes: item.attributes.map(a => a.key === oldKey ? { ...a, key: newKey } : a)
                  };
              }
              return item;
          });
          
          return { ...prev, worldClasses: newClasses, worldItems: newItems };
      });
  };

  const deleteWorldTemplateField = (e: React.MouseEvent, classId: string, tempId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setBible(prev => {
        const cls = prev.worldClasses.find(c => c.id === classId);
        if(!cls) return prev;

        const field = cls.template.find(t => t.id === tempId);
        const keyToRemove = field?.key;

        if(!window.confirm(`Delete field "${keyToRemove}" from template? This will remove it from all existing items in this class.`)) return prev;

        // Update Template
        const newClasses = prev.worldClasses.map(c => 
            c.id === classId 
            ? { ...c, template: c.template.filter(t => t.id !== tempId) } 
            : c
        );

        // Propagate delete to items
        const newItems = prev.worldItems.map(item => {
            if (item.classId === classId && keyToRemove) {
                return {
                    ...item,
                    attributes: item.attributes.filter(a => a.key !== keyToRemove)
                };
            }
            return item;
        });

        return { ...prev, worldClasses: newClasses, worldItems: newItems };
    });
  };

  const addWorldItem = (classId: string) => {
      setBible(prev => {
          const cls = prev.worldClasses.find(c => c.id === classId);
          const attrs = cls ? cls.template.map(t => ({ id: generateId(), key: t.key, value: "" })) : [];
          const newItem: WorldItem = {
              id: generateId(),
              classId,
              name: "New Entry",
              description: "",
              attributes: attrs
          };
          // Prepend to top
          return { ...prev, worldItems: [newItem, ...prev.worldItems] };
      });
  };

  const moveWorldItem = (id: string, classId: string, dir: 'up' | 'down') => {
     setBible(prev => {
         const itemsInClass = prev.worldItems.filter(i => i.classId === classId);
         return {
             ...prev,
             worldItems: moveItemInArray(prev.worldItems, itemsInClass, id, dir)
         };
     });
  };

  const updateWorldItem = (itemId: string, updates: Partial<WorldItem>) => {
      setBible(prev => ({
          ...prev,
          worldItems: prev.worldItems.map(i => i.id === itemId ? { ...i, ...updates } : i)
      }));
  };

  const deleteWorldItem = (e: React.MouseEvent | null, itemId: string, skipConfirm = false) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if(!skipConfirm && !window.confirm("Delete this item?")) return;
      setBible(prev => ({
          ...prev,
          worldItems: prev.worldItems.filter(i => i.id !== itemId)
      }));
  };

  const updateItemAttribute = (itemId: string, attrId: string, value: string) => {
      setBible(prev => {
          const item = prev.worldItems.find(i => i.id === itemId);
          if(item) {
              const newAttrs = item.attributes.map(a => a.id === attrId ? { ...a, value } : a);
              return {
                  ...prev,
                  worldItems: prev.worldItems.map(i => i.id === itemId ? { ...i, attributes: newAttrs } : i)
              };
          }
          return prev;
      });
  };

  // ================= TIMELINE HANDLERS =================
  const addTimelineEvent = (type: TimelineLevel, parentId?: string) => {
      setBible(prev => {
          const newEvent: TimelineEvent = {
              id: generateId(),
              type,
              title: type === 'Saga' ? 'New Saga' : type === 'Arc' ? 'New Arc' : 'New Episode',
              description: '',
              parentId,
              order: prev.timeline.filter(t => t.parentId === parentId).length
          };
          return { ...prev, timeline: [...prev.timeline, newEvent] };
      });
  };
  
  const moveTimelineEvent = (id: string, parentId: string | undefined, dir: 'up' | 'down') => {
      setBible(prev => {
          const siblings = prev.timeline.filter(t => t.parentId === parentId).sort((a,b) => a.order - b.order);
          const currentIndex = siblings.findIndex(t => t.id === id);
          if (currentIndex === -1) return prev;
          if (dir === 'up' && currentIndex === 0) return prev;
          if (dir === 'down' && currentIndex === siblings.length - 1) return prev;

          const targetIndex = dir === 'up' ? currentIndex - 1 : currentIndex + 1;
          const currentItem = siblings[currentIndex];
          const targetItem = siblings[targetIndex];
          
          // Swap orders
          const newOrderA = targetItem.order;
          const newOrderB = currentItem.order;

          return {
              ...prev,
              timeline: prev.timeline.map(t => {
                  if (t.id === currentItem.id) return { ...t, order: newOrderA };
                  if (t.id === targetItem.id) return { ...t, order: newOrderB };
                  return t;
              })
          };
      });
  };

  const updateTimelineEvent = (id: string, updates: Partial<TimelineEvent>) => {
      setBible(prev => ({
          ...prev,
          timeline: prev.timeline.map(t => t.id === id ? { ...t, ...updates } : t)
      }));
  };

  const deleteTimelineEvent = (e: React.MouseEvent | null, id: string, skipConfirm = false) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if(!skipConfirm && !window.confirm("Delete this event and all its children?")) return;
      
      setBible(prev => {
          const idsToDelete = new Set<string>([id]);
          let changed = true;
          // Recursively find all children
          while(changed) {
              changed = false;
              prev.timeline.forEach(t => {
                  if(t.parentId && idsToDelete.has(t.parentId) && !idsToDelete.has(t.id)) {
                      idsToDelete.add(t.id);
                      changed = true;
                  }
              });
          }
          return { ...prev, timeline: prev.timeline.filter(t => !idsToDelete.has(t.id)) };
      });
  };

  // ================= CHARACTER HANDLERS (Reused) =================
  const addCharacter = () => {
    setBible(prev => {
        const defaultCat = prev.characterCategories[0];
        const initialAttributes = defaultCat ? defaultCat.template.map(t => ({ id: generateId(), key: t.key, value: "" })) : [];
        const newChar: Character = { 
            id: generateId(), 
            name: "New Character", 
            role: "Role", 
            categoryId: defaultCat?.id, 
            description: "", 
            personality: "",
            appearance: "",
            dialogueExamples: "",
            traits: [], 
            relationships: [], 
            attributes: initialAttributes 
        };
        return { ...prev, characters: [...prev.characters, newChar] };
    });
  };
  
  const moveCharacter = (id: string, dir: 'up' | 'down') => {
      setBible(prev => ({
          ...prev,
          characters: moveItemInArray(prev.characters, prev.characters, id, dir)
      }));
  };
  
  const updateCharacter = (id: string, u: Partial<Character>) => {
      setBible(prev => ({
          ...prev,
          characters: prev.characters.map(c => c.id === id ? { ...c, ...u } : c)
      }));
  };
  
  const deleteCharacter = (e: React.MouseEvent | null, id: string, skipConfirm = false) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if(!skipConfirm && !window.confirm("Delete this character?")) return;
      setBible(prev => ({ ...prev, characters: prev.characters.filter(c => c.id !== id) }));
  };

  const changeCharacterCategory = (charId: string, newCatId: string) => {
      setBible(prev => {
          const char = prev.characters.find(c => c.id === charId);
          const cat = prev.characterCategories.find(c => c.id === newCatId);
          if(!char || !cat) return prev;
          // Merge logic
          const merged = [...char.attributes];
          cat.template.forEach(t => {
              if(!merged.some(a => a.key === t.key)) merged.push({ id: generateId(), key: t.key, value: "" });
          });
          
          return {
              ...prev,
              characters: prev.characters.map(c => c.id === charId ? { ...c, categoryId: newCatId, attributes: merged } : c)
          };
      });
  };

  const updateCharAttr = (charId: string, attrId: string, val: string) => {
      setBible(prev => {
          const char = prev.characters.find(c => c.id === charId);
          if(char) {
              const newAttrs = char.attributes.map(a => a.id === attrId ? {...a, value: val} : a);
              return {
                  ...prev,
                  characters: prev.characters.map(c => c.id === charId ? { ...c, attributes: newAttrs } : c)
              };
          }
          return prev;
      });
  };

  // Class Handlers
  const addCharClass = () => {
      setBible(prev => ({ ...prev, characterCategories: [...prev.characterCategories, { id: generateId(), name: "New Class", template: [] }] }));
  };

  const moveCharClass = (id: string, dir: 'up' | 'down') => {
      setBible(prev => ({
          ...prev,
          characterCategories: moveItemInArray(prev.characterCategories, prev.characterCategories, id, dir)
      }));
  };

  const updateCharClass = (id: string, u: Partial<CharacterCategory>) => {
      setBible(prev => ({
          ...prev,
          characterCategories: prev.characterCategories.map(c => c.id === id ? { ...c, ...u } : c)
      }));
  };
  
  const deleteCharClass = (e: React.MouseEvent | null, id: string, skipConfirm = false) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      
      setBible(prev => {
          const charsInCat = prev.characters.filter(c => c.categoryId === id);
          if(charsInCat.length > 0) {
              if(!skipConfirm && !window.confirm(`Delete this Class and ${charsInCat.length} characters in it?`)) return prev;
              return { 
                  ...prev,
                  characterCategories: prev.characterCategories.filter(c => c.id !== id),
                  characters: prev.characters.filter(c => c.categoryId !== id)
              };
          } else {
              return { 
                  ...prev, 
                  characterCategories: prev.characterCategories.filter(c => c.id !== id) 
              };
          }
      });
  };

  const addCharTemplate = (id: string) => {
      setBible(prev => ({
          ...prev,
          characterCategories: prev.characterCategories.map(c => c.id === id ? { ...c, template: [...c.template, {id: generateId(), key: "Stat"}] } : c)
      }));
  };
  
  const updateCharTemplate = (cid: string, tid: string, k: string) => {
      setBible(prev => {
          const c = prev.characterCategories.find(x => x.id === cid);
          if(!c) return prev;

          const field = c.template.find(t => t.id === tid);
          const oldKey = field?.key;

          const newCats = prev.characterCategories.map(cat => 
              cat.id === cid
              ? { ...cat, template: cat.template.map(t => t.id === tid ? {...t, key: k} : t) }
              : cat
          );

          const newChars = prev.characters.map(char => {
              if (char.categoryId === cid && oldKey) {
                  return {
                      ...char,
                      attributes: char.attributes.map(a => a.key === oldKey ? { ...a, key: k } : a)
                  };
              }
              return char;
          });
          
          return { ...prev, characterCategories: newCats, characters: newChars };
      });
  };

  const deleteCharTemplate = (e: React.MouseEvent, cid: string, tid: string) => {
       e.preventDefault();
       e.stopPropagation();
       
       setBible(prev => {
           const c = prev.characterCategories.find(x => x.id === cid);
           if(!c) return prev;

           const field = c.template.find(t => t.id === tid);
           const keyToRemove = field?.key;
           if(!window.confirm(`Delete field "${keyToRemove}"?`)) return prev;

           const newCats = prev.characterCategories.map(cat => 
                cat.id === cid 
                ? { ...cat, template: cat.template.filter(t => t.id !== tid) }
                : cat
           );
           
           const newChars = prev.characters.map(char => {
               if(char.categoryId === cid && keyToRemove) {
                   return {
                       ...char,
                       attributes: char.attributes.filter(a => a.key !== keyToRemove)
                   };
               }
               return char;
           });

           return { ...prev, characterCategories: newCats, characters: newChars };
       });
  };


  // ================= VIEW RENDERING =================

  return (
    <>
        {view === 'BIBLE' && (
            <div className="max-w-3xl space-y-6 mx-auto p-8">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                    World Bible Overview
                </h1>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
                    <div className="grid gap-6">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Project Name</label>
                            <input
                                type="text"
                                value={bible.title}
                                onChange={(e) => updateBible({ title: e.target.value })}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-lg font-semibold text-gray-100 outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Genre</label>
                                <input
                                    type="text"
                                    value={bible.genre}
                                    onChange={(e) => updateBible({ genre: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-gray-200 outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Tone</label>
                                <input
                                    type="text"
                                    value={bible.tone}
                                    onChange={(e) => updateBible({ tone: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-gray-200 outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 text-center">
                        <div className="text-2xl font-bold text-white">{bible.characters.length}</div>
                        <div className="text-xs text-gray-500 uppercase">Characters</div>
                    </div>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 text-center">
                        <div className="text-2xl font-bold text-white">{bible.worldItems.length}</div>
                        <div className="text-xs text-gray-500 uppercase">World Items</div>
                    </div>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 text-center">
                        <div className="text-2xl font-bold text-white">{bible.timeline.length}</div>
                        <div className="text-xs text-gray-500 uppercase">Timeline Events</div>
                    </div>
                </div>
            </div>
        )}

        {view === 'WORLD' && (
            <div className="flex flex-col md:flex-row h-full">
                {/* Sidebar: Classes */}
                <div className="w-full md:w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                            <span className="font-bold text-gray-300 flex items-center gap-2"><Database className="w-4 h-4" /> Classes</span>
                            <button type="button" onClick={addWorldClass} className="text-indigo-400 bg-indigo-900/30 p-1.5 rounded hover:text-white"><Plus className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {bible.worldClasses.map(cls => (
                            <div key={cls.id} className="flex items-center gap-1 group">
                                <button 
                                    onClick={() => setSelectedWorldClassId(cls.id)} 
                                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center group ${selectedWorldClassId === cls.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
                                >
                                    <span className="truncate">{cls.name}</span>
                                    {selectedWorldClassId === cls.id && <ChevronRight className="w-3 h-3" />}
                                </button>
                                <div className="hidden group-hover:flex flex-col gap-0.5">
                                    <button onClick={() => moveWorldClass(cls.id, 'up')} className="text-gray-600 hover:text-indigo-400 p-0.5"><ChevronUp className="w-3 h-3"/></button>
                                    <button onClick={() => moveWorldClass(cls.id, 'down')} className="text-gray-600 hover:text-indigo-400 p-0.5"><ChevronDown className="w-3 h-3"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main: Items & Template Editor */}
                <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden">
                    {(() => {
                        const activeClass = bible.worldClasses.find(c => c.id === selectedWorldClassId) || bible.worldClasses[0];
                        const items = bible.worldItems.filter(i => i.classId === activeClass?.id);
                        
                        if (!activeClass) return <div className="flex-1 flex items-center justify-center text-gray-500">Select a Class</div>;

                        return (
                            <>
                            <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                                <div className="flex-1 mr-4">
                                    <input 
                                        className="bg-transparent text-lg font-bold text-white outline-none w-full"
                                        value={activeClass.name}
                                        onChange={(e) => updateWorldClass(activeClass.id, { name: e.target.value })}
                                    />
                                    <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                        <span>{items.length} items</span>
                                        <button onClick={() => setEditingTemplate(!editingTemplate)} className="text-indigo-400 hover:text-indigo-300 underline">
                                            {editingTemplate ? 'Done Editing Template' : 'Edit Class Template'}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={(e) => deleteWorldClass(e, activeClass.id)} className="p-2 text-gray-600 hover:text-red-400 relative z-20 cursor-pointer" title="Delete Class"><Trash2 className="w-4 h-4" /></button>
                                    <button type="button" onClick={() => addWorldItem(activeClass.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> New Item</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                {/* Template Editor */}
                                {editingTemplate && (
                                    <div className="mb-6 bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4">
                                        <h3 className="text-sm font-bold text-indigo-300 mb-2 uppercase">Class Template Fields</h3>
                                        <div className="space-y-2 mb-2">
                                            {activeClass.template.map(t => (
                                                <div key={t.id} className="flex gap-2">
                                                    <input 
                                                        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 flex-1 outline-none"
                                                        value={t.key}
                                                        onChange={(e) => updateWorldTemplateField(activeClass.id, t.id, e.target.value)}
                                                    />
                                                    <button type="button" onClick={(e) => deleteWorldTemplateField(e, activeClass.id, t.id)} className="text-red-400 hover:text-red-300 relative z-20 cursor-pointer"><X className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => addWorldTemplateField(activeClass.id)} className="text-xs text-indigo-400 flex items-center gap-1 cursor-pointer"><Plus className="w-3 h-3" /> Add Field</button>
                                    </div>
                                )}

                                {/* Items List */}
                                <div className="space-y-4">
                                    {items.length === 0 && !editingTemplate && (
                                        <div className="text-center py-12 text-gray-600 border border-dashed border-gray-800 rounded-xl">
                                            <Globe className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                            <p>No items in this class yet.</p>
                                        </div>
                                    )}
                                    {items.map(item => (
                                        <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-indigo-500/30 transition-all relative group">
                                            {/* Order Buttons */}
                                            <div className="absolute right-12 top-4 flex flex-col gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                 <button onClick={() => moveWorldItem(item.id, activeClass.id, 'up')} className="text-gray-500 hover:text-indigo-400"><ChevronUp className="w-4 h-4" /></button>
                                                 <button onClick={() => moveWorldItem(item.id, activeClass.id, 'down')} className="text-gray-500 hover:text-indigo-400"><ChevronDown className="w-4 h-4" /></button>
                                            </div>

                                            <div className="flex justify-between items-start mb-2 gap-2 pr-8">
                                                <div className="flex-1 min-w-0">
                                                    <input 
                                                        className="bg-transparent font-bold text-indigo-200 outline-none w-full"
                                                        value={item.name}
                                                        onChange={(e) => updateWorldItem(item.id, { name: e.target.value })}
                                                        placeholder="Item Name"
                                                    />
                                                </div>
                                                <button type="button" onClick={(e) => deleteWorldItem(e, item.id)} className="text-gray-600 hover:text-red-400 p-1 rounded hover:bg-gray-800 relative z-20 shrink-0 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                            <textarea 
                                                className="w-full bg-gray-950/50 border border-gray-800 rounded p-2 text-sm text-gray-300 mb-3 outline-none"
                                                value={item.description}
                                                onChange={(e) => updateWorldItem(item.id, { description: e.target.value })}
                                                placeholder="Description..."
                                                rows={2}
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {item.attributes.map(attr => (
                                                    <div key={attr.id} className="flex items-center text-sm bg-gray-950/30 rounded px-2 py-1 border border-gray-800/50">
                                                        <span className="text-gray-500 w-1/3 text-right pr-2 text-xs font-medium truncate">{attr.key}</span>
                                                        <div className="w-px h-3 bg-gray-700 mr-2"></div>
                                                        <input 
                                                            className="bg-transparent text-gray-200 outline-none flex-1"
                                                            value={attr.value}
                                                            onChange={(e) => updateItemAttribute(item.id, attr.id, e.target.value)}
                                                            placeholder="Value"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            </>
                        );
                    })()}
                </div>
            </div>
        )}

        {view === 'TIMELINE' && (
             <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto">
                 <div className="flex justify-between items-center mb-8">
                     <div>
                       <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                           <History className="w-6 h-6 text-purple-400" /> Timeline & Background
                       </h1>
                       <p className="text-gray-500 text-sm">Organize history into Sagas, Arcs, and Episodes.</p>
                     </div>
                     <button onClick={() => addTimelineEvent('Saga')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium cursor-pointer">
                         <Plus className="w-4 h-4" /> New Saga
                     </button>
                 </div>
   
                 <div className="space-y-6">
                     {(() => {
                         // FIX: Render all root events (orphans included), not just Sagas
                         const rootEvents = bible.timeline.filter(t => !t.parentId).sort((a,b) => a.order - b.order);
                         
                         const renderEventNode = (evt: TimelineEvent, level: number) => {
                             const children = bible.timeline.filter(t => t.parentId === evt.id).sort((a,b) => a.order - b.order);
                             const nextType: TimelineLevel | null = evt.type === 'Saga' ? 'Arc' : evt.type === 'Arc' ? 'Episode' : null;
                             
                             return (
                                 <div key={evt.id} className={`mb-2 ${level > 0 ? 'ml-6 pl-4 border-l border-gray-800' : ''}`}>
                                        <div className={`flex items-start gap-3 p-3 rounded-lg border group relative ${
                                            evt.type === 'Saga' ? 'bg-indigo-950/20 border-indigo-900/50' : 
                                            evt.type === 'Arc' ? 'bg-gray-900 border-gray-800' : 
                                            'bg-gray-950 border-gray-800/50'
                                        }`}>
                                            {/* Order Buttons */}
                                            <div className="flex flex-col gap-0.5 absolute -left-5 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <button onClick={() => moveTimelineEvent(evt.id, evt.parentId, 'up')} className="text-gray-600 hover:text-indigo-400"><ChevronUp className="w-3 h-3" /></button>
                                                 <button onClick={() => moveTimelineEvent(evt.id, evt.parentId, 'down')} className="text-gray-600 hover:text-indigo-400"><ChevronDown className="w-3 h-3" /></button>
                                            </div>

                                            <div className={`mt-1 shrink-0 ${
                                                evt.type === 'Saga' ? 'text-indigo-400' : 
                                                evt.type === 'Arc' ? 'text-purple-400' : 
                                                'text-gray-500'
                                            }`}>
                                                {evt.type === 'Saga' ? <Bookmark className="w-5 h-5"/> : evt.type === 'Arc' ? <FolderOpen className="w-4 h-4"/> : <Activity className="w-4 h-4"/>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1 gap-2">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <span className="text-[10px] uppercase font-bold text-gray-600 bg-gray-900 border border-gray-700 px-1 rounded shrink-0">{evt.type}</span>
                                                        <input 
                                                            className="bg-transparent font-bold text-gray-200 outline-none w-full"
                                                            value={evt.title}
                                                            onChange={(e) => updateTimelineEvent(evt.id, { title: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {nextType && (
                                                            <button type="button" onClick={() => addTimelineEvent(nextType, evt.id)} className="p-1 hover:bg-gray-800 rounded text-gray-600 hover:text-green-400 transition-colors cursor-pointer" title={`Add ${nextType}`}>
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button type="button" onClick={(e) => deleteTimelineEvent(e, evt.id)} className="p-1 hover:bg-gray-800 rounded text-gray-600 hover:text-red-400 transition-colors relative z-20 cursor-pointer" title="Delete Event">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <textarea 
                                                    className="w-full bg-transparent text-sm text-gray-400 outline-none resize-none"
                                                    value={evt.description}
                                                    onChange={(e) => updateTimelineEvent(evt.id, { description: e.target.value })}
                                                    placeholder="Description..."
                                                    rows={1}
                                                />
                                            </div>
                                        </div>
                                        {/* Children */}
                                        <div className="mt-2">
                                            {children.map(child => renderEventNode(child, level + 1))}
                                        </div>
                                    </div>
                             );
                         };
   
                         if(rootEvents.length === 0) return (
                             <div className="text-center py-20 text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">
                                 <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                 <p>No timeline events yet.</p>
                                 <p>Start by creating a Saga.</p>
                             </div>
                         );

                         return rootEvents.map(evt => renderEventNode(evt, 0));
                     })()}
                 </div>
             </div>
        )}

        {view === 'CHARACTERS' && (
            <div className="flex flex-col h-full space-y-4 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <div className="flex gap-4 border-b border-gray-800 pb-2">
                    <button onClick={() => setCharSubTab('roster')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer ${charSubTab === 'roster' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Users className="w-4 h-4" /> Roster</button>
                    <button onClick={() => setCharSubTab('classes')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer ${charSubTab === 'classes' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Layers className="w-4 h-4" /> Classes</button>
                </div>

                {charSubTab === 'roster' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
                        <div className="col-span-full flex justify-between">
                            <h2 className="text-xl font-bold text-gray-100">Roster</h2>
                            <button onClick={addCharacter} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm flex gap-2 items-center cursor-pointer"><Plus className="w-4 h-4"/> Add</button>
                        </div>
                        {bible.characters.map((char) => (
                            <div key={char.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 relative group">
                                 {/* Order Buttons */}
                                 <div className="absolute right-14 top-5 flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveCharacter(char.id, 'up')} className="text-gray-500 hover:text-indigo-400"><ChevronUp className="w-4 h-4" /></button>
                                        <button onClick={() => moveCharacter(char.id, 'down')} className="text-gray-500 hover:text-indigo-400"><ChevronDown className="w-4 h-4" /></button>
                                </div>

                                <div className="flex justify-between items-start mb-3 gap-2 pr-16">
                                    <div className="flex-1 min-w-0">
                                        <input className="bg-transparent text-lg font-bold text-gray-100 outline-none w-full" value={char.name} onChange={(e) => updateCharacter(char.id, { name: e.target.value })} placeholder="Name" />
                                    </div>
                                    <button type="button" onClick={(e) => deleteCharacter(e, char.id)} className="text-gray-600 hover:text-red-400 relative z-20 shrink-0 cursor-pointer"><Trash2 className="w-5 h-5" /></button>
                                </div>
                                <div className="flex gap-2 mb-3">
                                    <select value={char.categoryId || ''} onChange={(e) => changeCharacterCategory(char.id, e.target.value)} className="bg-gray-950 text-xs text-indigo-400 border border-gray-700 rounded px-2 py-1 outline-none cursor-pointer">
                                        <option value="" disabled>Class</option>
                                        {bible.characterCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <input className="bg-transparent text-xs text-gray-400 uppercase tracking-wider outline-none border-b border-transparent focus:border-gray-600" value={char.role} onChange={(e) => updateCharacter(char.id, {role: e.target.value})} placeholder="Role" />
                                </div>
                                
                                {/* Detailed Profile Fields */}
                                <div className="space-y-3 mb-4">
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Personality</label>
                                        <textarea className="w-full bg-gray-950/50 border border-gray-800 rounded p-2 text-sm text-gray-300 outline-none" rows={2} value={char.personality || ''} onChange={(e) => updateCharacter(char.id, { personality: e.target.value })} placeholder="Habits, likes, dislikes..." />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Appearance</label>
                                        <textarea className="w-full bg-gray-950/50 border border-gray-800 rounded p-2 text-sm text-gray-300 outline-none" rows={2} value={char.appearance || ''} onChange={(e) => updateCharacter(char.id, { appearance: e.target.value })} placeholder="Visual description..." />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Dialogue Examples</label>
                                        <textarea className="w-full bg-gray-950/50 border border-gray-800 rounded p-2 text-sm text-gray-300 outline-none italic" rows={2} value={char.dialogueExamples || ''} onChange={(e) => updateCharacter(char.id, { dialogueExamples: e.target.value })} placeholder="Quote examples..." />
                                    </div>
                                </div>

                                {/* Dynamic Attributes */}
                                <div className="space-y-2 bg-gray-950/30 p-3 rounded border border-gray-800/50">
                                    <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Stats & Attributes</div>
                                    {char.attributes.map(attr => (
                                        <div key={attr.id} className="flex gap-2 text-sm">
                                            <span className="text-gray-500 w-1/3 text-right text-xs pt-1">{attr.key}</span>
                                            <input className="flex-1 bg-transparent text-gray-200 outline-none border-b border-gray-800 focus:border-indigo-500" value={attr.value} onChange={(e) => updateCharAttr(char.id, attr.id, e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {charSubTab === 'classes' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                        <div className="col-span-full flex justify-between">
                            <h2 className="text-xl font-bold text-gray-100">Classes</h2>
                            <button onClick={addCharClass} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm flex gap-2 items-center cursor-pointer"><Plus className="w-4 h-4"/> Add Class</button>
                        </div>
                        {bible.characterCategories.map(cat => (
                            <div key={cat.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative group">
                                <div className="absolute right-12 top-4 flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveCharClass(cat.id, 'up')} className="text-gray-500 hover:text-indigo-400"><ChevronUp className="w-4 h-4" /></button>
                                        <button onClick={() => moveCharClass(cat.id, 'down')} className="text-gray-500 hover:text-indigo-400"><ChevronDown className="w-4 h-4" /></button>
                                </div>
                                <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2 pr-12">
                                    <input className="bg-transparent font-bold text-white outline-none" value={cat.name} onChange={(e) => updateCharClass(cat.id, { name: e.target.value })} />
                                    <button type="button" onClick={(e) => deleteCharClass(e, cat.id)} className="text-gray-600 hover:text-red-400 relative z-20 cursor-pointer"><Trash2 className="w-4 h-4"/></button>
                                </div>
                                <div className="space-y-2">
                                    {cat.template.map(t => (
                                        <div key={t.id} className="flex gap-2">
                                            <input className="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-sm text-gray-300 flex-1" value={t.key} onChange={(e) => updateCharTemplate(cat.id, t.id, e.target.value)} />
                                            <button type="button" onClick={(e) => deleteCharTemplate(e, cat.id, t.id)} className="text-gray-600 hover:text-red-400 relative z-20 cursor-pointer"><X className="w-3 h-3"/></button>
                                        </div>
                                    ))}
                                    <button onClick={() => addCharTemplate(cat.id)} className="text-xs text-indigo-400 flex gap-1 items-center mt-2 cursor-pointer"><Plus className="w-3 h-3"/> Add Field</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
    </>
  );
};

export default BibleManager;
