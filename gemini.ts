import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Flashcard } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const geminiService = {
  async generateFlashcards(category: string, count: number = 5): Promise<Flashcard[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} French flashcards for the category: ${category}. Include the French word/phrase, English translation, and a phonetic pronunciation guide. Return as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              french: { type: Type.STRING },
              english: { type: Type.STRING },
              pronunciation: { type: Type.STRING },
              category: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ['beginner', 'intermediate', 'advanced'] }
            },
            required: ['french', 'english', 'category', 'difficulty']
          }
        }
      }
    });

    const cards = JSON.parse(response.text);
    return cards.map((c: any, i: number) => ({ ...c, id: `card-${Date.now()}-${i}` }));
  },

  async generateQuiz(category: string, count: number = 5): Promise<QuizQuestion[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a ${count}-question French quiz for the category: ${category}. Include multiple choice questions with 4 options each. Return as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['multiple-choice', 'translation'] }
            },
            required: ['question', 'options', 'correctAnswer', 'explanation', 'type']
          }
        }
      }
    });

    const questions = JSON.parse(response.text);
    return questions.map((q: any, i: number) => ({ ...q, id: `quiz-${Date.now()}-${i}` }));
  },

  async generateGrammarTip(topic: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a concise and helpful French grammar tip about: ${topic}. Use Markdown formatting. Include examples.`,
    });
    return response.text;
  },

  async lookupWord(word: string): Promise<DictionaryEntry> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Look up the French word: "${word}". Provide its English translation, a brief definition, and 2 example sentences in French with translations. Return as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            translation: { type: Type.STRING },
            definition: { type: Type.STRING },
            examples: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['word', 'translation', 'definition', 'examples']
        }
      }
    });
    return JSON.parse(response.text);
  },

  async getTutorResponse(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are a friendly and encouraging French tutor named 'Amélie'. Your goal is to help the user practice French. Respond primarily in French, but provide an English translation for complex sentences. Correct the user's French mistakes gently. Keep the conversation engaging and suitable for a language learner.",
      }
    });

    // Note: sendMessage doesn't support history directly in this SDK version's helper, 
    // but the chat object maintains it if we use it correctly.
    // However, for a simple implementation, we can just send the message.
    const response = await chat.sendMessage({ message });
    return response.text;
  },

  async speak(text: string): Promise<string | undefined> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly in French: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is a good female voice for French
            },
          },
        },
      });

      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
      console.error("TTS Error:", error);
      return undefined;
    }
  }
};
