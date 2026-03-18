export interface Flashcard {
  id: string;
  french: string;
  english: string;
  pronunciation?: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isFavorite?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  type: 'multiple-choice' | 'translation';
}

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  cardsMastered: number;
  lastActive: number;
}

export interface DictionaryEntry {
  word: string;
  translation: string;
  definition: string;
  examples: string[];
}

export type AppView = 'dashboard' | 'flashcards' | 'tutor' | 'pronunciation' | 'quiz' | 'grammar' | 'favorites' | 'dictionary' | 'settings';
