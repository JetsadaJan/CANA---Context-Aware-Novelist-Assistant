
export interface KeyValue {
  id: string;
  key: string; // e.g. "Leader", "Danger Level", "Export Goods"
  value: string;
}

export interface AttributeTemplate {
  id: string;
  key: string; // e.g. "Mana Points", "Fur Color"
}

// OOP Structure for World Building
export interface WorldClass {
  id: string;
  name: string; // e.g. "Geography", "Organization", "Historical Event"
  template: AttributeTemplate[];
}

export interface WorldItem {
  id: string;
  classId: string;
  name: string;
  description: string;
  attributes: KeyValue[];
}

// Character OOP Structure
export interface CharacterCategory {
  id: string;
  name: string; // e.g. "Human", "Elf", "Cyborg"
  template: AttributeTemplate[]; // Default fields for this class
}

export interface Character {
  id: string;
  name: string;
  role: string;
  categoryId?: string; // Links to CharacterCategory
  description: string; // General Bio
  
  // New Fields
  personality: string; 
  appearance: string;
  dialogueExamples: string; // Quotes or speech patterns

  traits: string[];
  relationships: string[]; // Descriptions of key relationships
  attributes: KeyValue[]; // Specific data (e.g. "Mana: 100")
}

// Timeline Hierarchy Structure
export type TimelineLevel = 'Saga' | 'Arc' | 'Episode';

export interface TimelineEvent {
  id: string;
  type: TimelineLevel;
  title: string;
  description: string;
  parentId?: string; // If null, it's a Saga. If parent is Saga, it's Arc. If parent is Arc, it's Episode.
  order: number;
}

// Legacy types for migration
export interface WorldEntry { id: string; name: string; description: string; attributes: KeyValue[]; }
export interface WorldCategory { id: string; name: string; entries: WorldEntry[]; description?: string; }
export interface PlotPoint { id: string; title: string; description: string; status: string; }

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  type?: 'text' | 'analysis' | 'warning';
}

export interface StoryBible {
  title: string;
  genre: string;
  tone: string;
  
  // Characters
  characterCategories: CharacterCategory[];
  characters: Character[];
  
  // World Building (OOP)
  worldClasses: WorldClass[];
  worldItems: WorldItem[];

  // Timeline & Background
  timeline: TimelineEvent[];

  // Chat History
  architectHistory: ChatMessage[];
  roleplayHistory: ChatMessage[];

  // Legacy fields for migration
  worldCategories?: WorldCategory[];
  plots?: PlotPoint[];
  worldRules?: any[]; 
}

export enum AppTab {
  BIBLE = 'BIBLE', // Overview
  WORLD = 'WORLD', // World Building (OOP)
  CHARACTERS = 'CHARACTERS', // Character OOP
  TIMELINE = 'TIMELINE', // Timeline & Background (Hierarchy)
  CHAT = 'CHAT',
  ROLEPLAY = 'ROLEPLAY',
  SETTINGS = 'SETTINGS'
}
