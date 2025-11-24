import { GoogleGenAI, Type } from "@google/genai";
import { ComicStory, ComicPage, UserSettings } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateComicScript = async (
  imageBase64: string,
  settings: UserSettings
): Promise<ComicStory> => {
  const model = "gemini-2.5-flash";
  
  const prompt = `
    Create a thrilling 10-page comic book script featuring a superhero based on the user's image.
    
    Here are the details:
    - Hero Name: ${settings.heroName}
    - Superpower: ${settings.superpower}
    - Villain: ${settings.villain}
    - Setting: ${settings.setting}
    - Tone: Action-packed, cinematic, slightly humorous.
    
    For each page, provide:
    1. A visual description for the image generator (focus on action, angle, lighting).
    2. A short, punchy line of dialogue or narration text.

    Return ONLY the JSON object adhering to this schema.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      },
      { text: prompt },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          heroName: { type: Type.STRING },
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pageNumber: { type: Type.INTEGER },
                panelDescription: { type: Type.STRING },
                dialogue: { type: Type.STRING },
              },
              required: ["pageNumber", "panelDescription", "dialogue"],
            },
          },
        },
        required: ["title", "heroName", "pages"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No script generated");
  
  const data = JSON.parse(text) as ComicStory;
  // Initialize local state props
  data.pages = data.pages.map(p => ({ ...p, isLoading: true }));
  return data;
};

export const generatePanelImage = async (
  panelDescription: string,
  referenceImageBase64: string,
  artStyle: string
): Promise<string> => {
  // Use gemini-2.5-flash-image for speed and consistency with reference images
  const model = "gemini-2.5-flash-image"; 

  const fullPrompt = `
    Comic book panel. ${artStyle} style.
    Scene: ${panelDescription}.
    Character must strongly resemble the person in the reference image provided, wearing a superhero costume.
    High quality, detailed, cinematic lighting, 4k resolution.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: referenceImageBase64,
            },
          },
          { text: fullPrompt },
        ],
      },
      config: {
        // Provide a bit of creative freedom but stick to the prompt
        temperature: 0.7, 
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image found in response");
  } catch (error) {
    console.error("Error generating panel:", error);
    // Return a placeholder or retry logic could go here
    return "https://picsum.photos/1024/1024?grayscale";
  }
};
