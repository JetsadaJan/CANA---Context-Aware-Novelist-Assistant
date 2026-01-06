
import { GoogleGenAI, FunctionDeclaration, Type, Content, Part } from "@google/genai";
import { StoryBible, ChatMessage } from '../types';

// --- SYSTEM INSTRUCTIONS ---
const ARCHITECT_SYSTEM_INSTRUCTION = `
You are the "Narrative Architect" (CANA), a specialized AI World Builder and Editor.
Your primary goal is to assist the user in building a deep, consistent, and detailed fictional world.

LANGUAGE:
- You MUST respond in THAI (ภาษาไทย) strictly.
- Use English for technical terms or specific names defined in the Bible.

ROLE & PERSONA:
- Role: World Building Expert & Logic Keeper.
- Tone: Knowledgeable, Analytical, Creative but grounded.

CRITICAL INSTRUCTION - DATA RECORDING:
- You are NOT just a chatbot. You are a **Database Manager**.
- **SAVE EVERYTHING**: If the user mentions a new rule, a definition (e.g., "Kitten Mode means X"), a special condition, or a character trait, you MUST save it using Tools.
- **DICTIONARY/GLOSSARY**: If the user defines a specific term (e.g., "Mana Burn"), create a World Item in the 'Glossary' or 'Terminology' class.
- **RULES**: If the user defines a law of physics or magic, create a World Item in the 'World Rules' class.
- **DO NOT SUMMARIZE**: Do not just say "I'll remember that". Call the \`create_world_item\` or \`update_world_item\` tool immediately.
- **CHARACTER DEPTH**: When creating characters, fill in Personality, Appearance, and Dialogue Examples if provided.

**INFER GENRE & TONE (IMPORTANT)**:
- Analyze the user's input. If the content suggests a specific **Genre** (e.g., Spaceships -> Sci-Fi, Cultivation -> Xianxia) or **Tone** (e.g., Dark, Comedic), and it differs from the current Bible metadata, **YOU MUST UPDATE IT** using \`update_story_metadata\`.
- Do not ask for permission to update metadata if the inference is obvious. Just do it and inform the user.

DATA AWARENESS:
- 'worldClasses' are the types (e.g. Geography, Rules, Glossary). 'worldItems' are the instances.
- 'characterCategories' are classes (e.g. Human). 'characters' are instances.
- 'timeline' is hierarchical: Saga > Arc > Episode.
`;

const GM_SYSTEM_INSTRUCTION = `
You are the "Game Master" (GM) for a text-based Roleplay session.
LANGUAGE: THAI (ภาษาไทย).
ROLE: Dungeon Master / Storyteller.
Tone: Immersive, Vivid.
- Describe surroundings based on 'worldItems' (Locations, Rules).
- Act as NPCs based on 'characters' (Use their 'dialogueExamples' and 'personality').
- If the user tries something impossible according to 'World Rules', describe the failure naturally.
`;

// --- TOOL DEFINITIONS ---
const toolDefinitions: FunctionDeclaration[] = [
  // --- METADATA TOOLS ---
  {
    name: "update_story_metadata",
    description: "Update the global project metadata (Genre, Tone, Title) based on context.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        genre: { type: Type.STRING, description: " inferred genre (e.g. Cyberpunk, Dark Fantasy)" },
        tone: { type: Type.STRING, description: "inferred tone (e.g. Gritty, Wholesome, Philosophical)" },
        title: { type: Type.STRING, description: "Project title if mentioned" }
      },
      required: []
    }
  },
  // --- CREATE TOOLS ---
  {
    name: "create_character",
    description: "Create a new character with detailed profile.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Name" },
        role: { type: Type.STRING, description: "Role" },
        description: { type: Type.STRING, description: "General bio" },
        personality: { type: Type.STRING, description: "Detailed habits, likes/dislikes, internal logic" },
        appearance: { type: Type.STRING, description: "Physical look, clothing, distinct features" },
        dialogue_examples: { type: Type.STRING, description: "Sample quotes or speech patterns (e.g., 'Huh?', 'Yes, my lord')" },
        category_name: { type: Type.STRING, description: "Class Name (e.g. Human)" }
      },
      required: ["name", "role", "description"]
    }
  },
  {
    name: "create_world_item",
    description: "Create a new world item, rule, or glossary term.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Name of the item, rule, or term" },
        class_name: { type: Type.STRING, description: "Class Name (e.g. Location, World Rules, Glossary, Organization)" },
        description: { type: Type.STRING, description: "Detailed definition, mechanics, or lore" }
      },
      required: ["name", "class_name", "description"]
    }
  },
  {
    name: "create_timeline_event",
    description: "Add a timeline event.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Title" },
        type: { type: Type.STRING, enum: ['Saga', 'Arc', 'Episode'] },
        description: { type: Type.STRING },
        parent_title: { type: Type.STRING, description: "Parent event title (optional)" }
      },
      required: ["title", "type", "description"]
    }
  },
  // --- UPDATE TOOLS ---
  {
    name: "update_character",
    description: "Update an existing character found by name.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        target_name: { type: Type.STRING, description: "Current name of the character to update" },
        new_name: { type: Type.STRING, description: "New name (optional)" },
        role: { type: Type.STRING, description: "New role (optional)" },
        description: { type: Type.STRING, description: "New description (optional)" },
        personality: { type: Type.STRING, description: "New personality details (optional)" },
        appearance: { type: Type.STRING, description: "New appearance details (optional)" },
        dialogue_examples: { type: Type.STRING, description: "New dialogue examples (optional)" }
      },
      required: ["target_name"]
    }
  },
  {
    name: "update_world_item",
    description: "Update an existing world item found by name.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        target_name: { type: Type.STRING, description: "Current name of the item" },
        new_name: { type: Type.STRING, description: "New name (optional)" },
        description: { type: Type.STRING, description: "New description (optional)" }
      },
      required: ["target_name"]
    }
  },
  {
    name: "update_timeline_event",
    description: "Update a timeline event found by title.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        target_title: { type: Type.STRING, description: "Current title" },
        new_title: { type: Type.STRING, description: "New title (optional)" },
        description: { type: Type.STRING, description: "New description (optional)" }
      },
      required: ["target_title"]
    }
  }
];

// --- API CLIENT FACTORY ---
const getGenAI = (): GoogleGenAI | null => {
    // Check localStorage first, then environment variable
    const apiKey = localStorage.getItem('cana_api_key') || process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

// --- API CALLS ---

export interface ToolExecutor {
    updateStoryMetadata: (args: any) => string;
    createCharacter: (args: any) => string;
    createWorldItem: (args: any) => string;
    createTimelineEvent: (args: any) => string;
    updateCharacter: (args: any) => string;
    updateWorldItem: (args: any) => string;
    updateTimelineEvent: (args: any) => string;
}

export const sendMessageToArchitect = async (
    bible: StoryBible, 
    history: ChatMessage[], 
    newMessage: string,
    toolsHandler?: ToolExecutor
): Promise<string> => {
    const ai = getGenAI();
    if (!ai) return "Error: No API Key found. Please add your Gemini API Key in Settings.";

    try {
        const contextPayload = JSON.stringify(bible, null, 2);
        const contents: Content[] = [];

        contents.push({
            role: 'user',
            parts: [{ text: `
${ARCHITECT_SYSTEM_INSTRUCTION}

[CURRENT STORY BIBLE JSON]
${contextPayload}
[END JSON]
            ` }]
        });

        history.filter(h => h.id !== 'welcome').forEach(h => {
             contents.push({
                 role: h.role,
                 parts: [{ text: h.content }]
             });
        });

        contents.push({
            role: 'user',
            parts: [{ text: newMessage }]
        });

        const modelConfig = {
            temperature: 0.7,
            tools: toolsHandler ? [{ functionDeclarations: toolDefinitions }] : undefined,
        };

        // --- FIRST CALL ---
        let response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: contents,
            config: modelConfig
        });

        // --- TOOL HANDLING LOOP ---
        const functionCalls = response.functionCalls;
        
        if (functionCalls && functionCalls.length > 0 && toolsHandler) {
             const toolParts: Part[] = [];

             // 1. Add model's request to history
             contents.push({
                 role: 'model',
                 parts: response.candidates?.[0]?.content?.parts || []
             });

             // 2. Execute tools
             for (const call of functionCalls) {
                 let result = "Error: Unknown tool";
                 try {
                     const args = call.args;
                     console.log(`Executing tool: ${call.name}`, args);

                     if (call.name === 'update_story_metadata') {
                         result = toolsHandler.updateStoryMetadata(args);
                     } else if (call.name === 'create_character') {
                         result = toolsHandler.createCharacter(args);
                     } else if (call.name === 'create_world_item') {
                         result = toolsHandler.createWorldItem(args);
                     } else if (call.name === 'create_timeline_event') {
                         result = toolsHandler.createTimelineEvent(args);
                     } else if (call.name === 'update_character') {
                         result = toolsHandler.updateCharacter(args);
                     } else if (call.name === 'update_world_item') {
                         result = toolsHandler.updateWorldItem(args);
                     } else if (call.name === 'update_timeline_event') {
                         result = toolsHandler.updateTimelineEvent(args);
                     }
                 } catch (e: any) {
                     result = `Error executing tool: ${e.message}`;
                 }
                 
                 toolParts.push({
                     functionResponse: {
                         name: call.name,
                         response: { result: result }
                     }
                 });
             }

             // 3. Add results to history
             contents.push({
                 role: 'user',
                 parts: toolParts
             });

             // 4. Final Response
             response = await ai.models.generateContent({
                 model: 'gemini-3-pro-preview',
                 contents: contents,
                 config: modelConfig 
             });
        }

        return response.text || "No response.";

    } catch (error: any) {
        console.error("Gemini Architect Error:", error);
        if (error.message && error.message.includes("429")) {
            return "Error 429: Quota Exceeded. Please check your API Key in Settings or wait before trying again.";
        }
        return `System Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
};

export const sendMessageToGameMaster = async (bible: StoryBible, history: ChatMessage[], newMessage: string) => {
    const ai = getGenAI();
    if (!ai) return "Error: No API Key found. Please add your Gemini API Key in Settings.";

    try {
        const contextPayload = JSON.stringify(bible, null, 2);
        const recentHistory = history.slice(-10).map(h => `${h.role === 'user' ? 'User' : 'Model'}: ${h.content}`).join('\n');

        const finalPrompt = `
${GM_SYSTEM_INSTRUCTION}

[WORLD CONTEXT]
${contextPayload}
[END CONTEXT]

[HISTORY]
${recentHistory}

[USER]
${newMessage}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: finalPrompt,
            config: { temperature: 0.9, thinkingConfig: { thinkingBudget: 1024 } }
        });
        return response.text || "...";
    } catch (e: any) {
        if (e.message && e.message.includes("429")) {
            return "Error 429: Quota Exceeded. Please check your API Key settings.";
        }
        return "GM Error: " + (e.message || "Unknown");
    }
};
