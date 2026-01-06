
import { StoryBible, WorldClass, TimelineEvent, CharacterCategory, KeyValue } from '../types';

const STORAGE_KEY = 'cana_story_bible_v3'; // Keep version

const generateId = (): string => Math.random().toString(36).substring(2, 9);

const DEFAULT_BIBLE: StoryBible = {
  title: "Untitled World Project",
  genre: "High Fantasy",
  tone: "Epic, Detailed, Mythological",
  characterCategories: [
    {
      id: "class_human",
      name: "Human",
      template: [
         { id: "attr_age", key: "Age" },
         { id: "attr_occupation", key: "Occupation" }
      ]
    }
  ],
  characters: [],
  worldClasses: [
    {
      id: "class_location",
      name: "Location",
      template: [
          { id: generateId(), key: "Climate" }, 
          { id: generateId(), key: "Population" },
          { id: generateId(), key: "Key Resources" }
      ]
    },
    {
      id: "class_rules",
      name: "World Rules & Laws",
      template: [
          { id: generateId(), key: "Type" }, // e.g. Physics, Magic, Social
          { id: generateId(), key: "Penalty" }
      ]
    },
    {
      id: "class_glossary",
      name: "Glossary & Terminology",
      template: [
          { id: generateId(), key: "Category" }, // e.g. Slang, Technical, Ancient
          { id: generateId(), key: "Synonyms" }
      ]
    }
  ],
  worldItems: [],
  timeline: [],
  architectHistory: [],
  roleplayHistory: [],
  // Legacy empty arrays
  worldCategories: [],
  plots: []
};

export const loadBible = (): StoryBible => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return DEFAULT_BIBLE;

    const parsed: any = JSON.parse(data);

    // --- MIGRATION LOGIC ---

    // 1. Migrate Legacy WorldCategories -> WorldClasses + WorldItems
    if (parsed.worldCategories && parsed.worldCategories.length > 0 && (!parsed.worldClasses || parsed.worldClasses.length === 0)) {
        parsed.worldClasses = [];
        parsed.worldItems = [];
        
        parsed.worldCategories.forEach((cat: any) => {
            const classId = generateId();
            // Create Class
            parsed.worldClasses.push({
                id: classId,
                name: cat.name,
                template: [] 
            });

            // Create Items
            if (cat.entries) {
                cat.entries.forEach((entry: any) => {
                    parsed.worldItems.push({
                        id: entry.id || generateId(),
                        classId: classId,
                        name: entry.name,
                        description: entry.description,
                        attributes: entry.attributes || []
                    });
                });
            }
        });
        delete parsed.worldCategories;
    }

    // 2. Migrate Legacy Plots -> Timeline (Saga/Arc)
    if (parsed.plots && parsed.plots.length > 0 && (!parsed.timeline || parsed.timeline.length === 0)) {
        parsed.timeline = [];
        const sagaId = generateId();
        parsed.timeline.push({
            id: sagaId,
            type: 'Saga',
            title: 'Main Saga',
            description: 'Imported from legacy plots',
            parentId: undefined,
            order: 0
        });

        parsed.plots.forEach((p: any, index: number) => {
            parsed.timeline.push({
                id: p.id || generateId(),
                type: 'Arc',
                title: p.title,
                description: p.description,
                parentId: sagaId,
                order: index
            });
        });
        delete parsed.plots;
    }

    // --- INTEGRITY CHECKS ---
    if (!Array.isArray(parsed.worldClasses)) parsed.worldClasses = DEFAULT_BIBLE.worldClasses;
    if (!Array.isArray(parsed.worldItems)) parsed.worldItems = [];
    if (!Array.isArray(parsed.timeline)) parsed.timeline = [];
    if (!Array.isArray(parsed.characterCategories)) parsed.characterCategories = DEFAULT_BIBLE.characterCategories;
    
    // Ensure Characters have new fields
    if (!Array.isArray(parsed.characters)) {
        parsed.characters = [];
    } else {
        parsed.characters = parsed.characters.map((c: any) => ({
            ...c,
            personality: c.personality || "",
            appearance: c.appearance || "",
            dialogueExamples: c.dialogueExamples || ""
        }));
    }

    // Check History fields
    if (!Array.isArray(parsed.architectHistory)) parsed.architectHistory = [];
    if (!Array.isArray(parsed.roleplayHistory)) parsed.roleplayHistory = [];

    parsed.title = parsed.title || DEFAULT_BIBLE.title;
    parsed.genre = parsed.genre || DEFAULT_BIBLE.genre;
    parsed.tone = parsed.tone || DEFAULT_BIBLE.tone;

    return parsed as StoryBible;
  } catch (e) {
    console.error("Failed to load bible", e);
    return DEFAULT_BIBLE;
  }
};

export const saveBible = (bible: StoryBible): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bible));
};

export const resetBible = (): StoryBible => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BIBLE));
  return DEFAULT_BIBLE;
};

export { generateId };
