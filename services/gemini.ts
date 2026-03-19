import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Flashcard, QuizQuestion, DictionaryEntry } from "../types";

const apiKey =
  import.meta.env.VITE_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const demoFlashcards: Flashcard[] = [
  { id: 'demo-1', french: 'Bonjour', english: 'Hello', pronunciation: 'bohn-zhoor', category: 'Greetings', difficulty: 'beginner' },
  { id: 'demo-2', french: 'Merci beaucoup', english: 'Thank you very much', pronunciation: 'mehr-see boh-koo', category: 'Politeness', difficulty: 'beginner' },
  { id: 'demo-3', french: "Où sont les toilettes ?", english: 'Where is the restroom?', pronunciation: 'oo sohn lay twah-let', category: 'Travel', difficulty: 'beginner' },
  { id: 'demo-4', french: "Je voudrais un café", english: 'I would like a coffee', pronunciation: 'zhuh voo-dray uh kah-fay', category: 'Café', difficulty: 'beginner' },
  { id: 'demo-5', french: "Parlez-vous anglais ?", english: 'Do you speak English?', pronunciation: 'par-lay voo zahng-glay', category: 'Conversation', difficulty: 'beginner' },
];

const demoQuiz: QuizQuestion[] = [
  {
    id: 'quiz-1',
    question: "How do you say 'Thank you' in French?",
    options: ['Bonjour', 'Merci', 'Au revoir', "S'il vous plaît"],
    correctAnswer: 'Merci',
    explanation: "Merci means 'thank you'; \"S'il vous plaît\" means 'please'.",
    type: 'multiple-choice',
  },
  {
    id: 'quiz-2',
    question: "Translate to English: 'Je suis étudiant.'",
    options: ['I am a student.', 'I am tired.', 'I am hungry.', 'I am lost.'],
    correctAnswer: 'I am a student.',
    explanation: "'Je suis' = 'I am'; 'étudiant' = 'student'.",
    type: 'translation',
  },
  {
    id: 'quiz-3',
    question: "Which phrase politely asks someone to repeat?",
    options: ["Répétez, s'il vous plaît.", 'Enchanté.', 'À bientôt.', 'De rien.'],
    correctAnswer: "Répétez, s'il vous plaît.",
    explanation: "It literally means 'Repeat, please.'",
    type: 'multiple-choice',
  },
];

const demoDictionaryEntry: DictionaryEntry = {
  word: 'amour',
  translation: 'love',
  definition: "Sentiment d'affection profonde pour quelqu'un ou quelque chose.",
  examples: [
    "L'amour est plus fort que tout. - Love is stronger than anything.",
    "Ils ont déclaré leur amour au bord de la Seine. - They declared their love by the Seine."
  ],
};

export const geminiService = {
  async generateFlashcards(category: string, count: number = 5): Promise<Flashcard[]> {
    if (!ai) {
      console.warn('GEMINI_API_KEY missing - serving demo flashcards.');
      return demoFlashcards.map((card, i) => ({
        ...card,
        category,
        id: `${card.id}-${i}`,
      })).slice(0, count);
    }

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
    if (!ai) {
      console.warn('GEMINI_API_KEY missing - serving demo quiz.');
      return demoQuiz.map((quiz, i) => ({
        ...quiz,
        id: `${quiz.id}-${i}`,
        question: `${quiz.question} (${category})`,
      })).slice(0, count);
    }

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
    if (!ai) {
      console.warn('GEMINI_API_KEY missing - serving demo grammar tip.');
      return `### ${topic}\n\n- Use **le/la/les** with known items: *la table*, *le livre*.\n- Use **un/une/des** for something unspecified: *une idée*, *des amis*.\n- Remember elision: **l'** before vowels, e.g., *l'ecole*.\n\n_Practice_: Écrivez deux phrases avec **un** et **le** pour ${topic.toLowerCase()}.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a concise and helpful French grammar tip about: ${topic}. Use Markdown formatting. Include examples.`,
    });
    return response.text;
  },

  async lookupWord(word: string): Promise<DictionaryEntry> {
    if (!ai) {
      console.warn('GEMINI_API_KEY missing - serving demo dictionary entry.');
      return { ...demoDictionaryEntry, word };
    }

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
    if (!ai) {
      console.warn('GEMINI_API_KEY missing - serving demo tutor reply.');
      return `Bien sûr ! Tu as dit: "${message}". Continue en français et je corrigerai doucement si besoin.`;
    }

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
    if (!ai) {
      console.warn('GEMINI_API_KEY missing - skipping TTS.');
      return undefined;
    }

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
