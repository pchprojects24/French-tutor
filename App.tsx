import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  MessageCircle,
  Mic2,
  LayoutDashboard,
  ChevronRight,
  Volume2,
  RotateCcw,
  Sparkles,
  GraduationCap,
  Languages,
  Trophy,
  Heart,
  BrainCircuit,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Search,
  Settings,
  Trash2,
  Info,
  Star,
  Zap,
  Flame
} from 'lucide-react';
import { AppView, Flashcard, ChatMessage, QuizQuestion, UserStats, DictionaryEntry } from './types';
import { geminiService } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Confetti Component
const Confetti = ({ show, onComplete }: { show: boolean; onComplete: () => void }) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; rotation: number }>>([]);

  useEffect(() => {
    if (show) {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10,
        color: ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#FBBF24', '#F97316'][Math.floor(Math.random() * 6)],
        rotation: Math.random() * 360
      }));
      setParticles(newParticles);
      setTimeout(onComplete, 3000);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-3 h-3 rounded-full"
          style={{
            backgroundColor: particle.color,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          initial={{ y: -100, opacity: 1, rotate: particle.rotation }}
          animate={{
            y: window.innerHeight + 100,
            opacity: 0,
            rotate: particle.rotation + 360,
          }}
          transition={{
            duration: 2 + Math.random(),
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
};

export default function App() {
  const safeParse = <T,>(value: string | null, fallback: T): T => {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn('Invalid localStorage payload, using defaults.', error);
      return fallback;
    }
  };

  const [view, setView] = useState<AppView>('dashboard');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [favorites, setFavorites] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const [grammarTip, setGrammarTip] = useState<string>('');
  const [grammarTopic, setGrammarTopic] = useState('Articles');

  const [searchQuery, setSearchQuery] = useState('');
  const [dictionaryResult, setDictionaryResult] = useState<DictionaryEntry | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');

  const [stats, setStats] = useState<UserStats>(() => {
    return safeParse<UserStats>(localStorage.getItem('french_stats'), {
      xp: 0,
      level: 1,
      streak: 0,
      cardsMastered: 0,
      lastActive: Date.now()
    });
  });

  useEffect(() => {
    localStorage.setItem('french_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    setFavorites(safeParse<Flashcard[]>(localStorage.getItem('french_favorites'), []));
  }, []);

  useEffect(() => {
    localStorage.setItem('french_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (view === 'flashcards' && flashcards.length === 0) {
      loadFlashcards('Common Phrases');
    }
    if (view === 'quiz' && quizQuestions.length === 0) {
      loadQuiz('General');
    }
    if (view === 'grammar' && !grammarTip) {
      loadGrammarTip('Articles');
    }
  }, [view]);

  const addXP = (amount: number) => {
    setStats(prev => {
      const newXP = prev.xp + amount;
      const newLevel = Math.floor(newXP / 500) + 1;
      const leveledUp = newLevel > prev.level;

      if (leveledUp) {
        setShowConfetti(true);
        setCelebrationMessage(`🎉 Level ${newLevel} Unlocked!`);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }

      return { ...prev, xp: newXP, level: newLevel };
    });
  };

  const loadFlashcards = async (category: string) => {
    setIsLoading(true);
    try {
      const cards = await geminiService.generateFlashcards(category);
      setFlashcards(cards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuiz = async (category: string) => {
    setIsLoading(true);
    setQuizFinished(false);
    setQuizScore(0);
    setCurrentQuizIndex(0);
    try {
      const questions = await geminiService.generateQuiz(category);
      setQuizQuestions(questions);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGrammarTip = async (topic: string) => {
    setIsLoading(true);
    setGrammarTopic(topic);
    try {
      const tip = await geminiService.generateGrammarTip(topic);
      setGrammarTip(tip);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const result = await geminiService.lookupWord(searchQuery);
      setDictionaryResult(result);
      addXP(5);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearProgress = () => {
    if (confirm("Are you sure you want to clear all progress? This cannot be undone.")) {
      localStorage.removeItem('french_stats');
      localStorage.removeItem('french_favorites');
      window.location.reload();
    }
  };

  const toggleFavorite = (card: Flashcard) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === card.id);
      if (exists) return prev.filter(f => f.id !== card.id);
      return [...prev, { ...card, isFavorite: true }];
    });
  };

  const handleOptionSelect = (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
    setShowExplanation(true);
    if (option === quizQuestions[currentQuizIndex].correctAnswer) {
      setQuizScore(prev => prev + 1);
      addXP(20);
    }
  };

  const nextQuizQuestion = () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizFinished(true);
      setShowConfetti(true);
      addXP(50); // Bonus for finishing
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputMessage,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);
    addXP(10);

    try {
      const response = await geminiService.getTutorResponse(inputMessage, []);
      const tutorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, tutorMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (text: string) => {
    setAudioLoading(text);
    try {
      const base64 = await geminiService.speak(text);
      if (base64) {
        const audio = new Audio(`data:audio/mp3;base64,${base64}`);
        // Ensure audio plays on mobile devices
        audio.addEventListener('canplaythrough', () => {
          audio.play().catch((error) => {
            console.warn('Audio playback failed:', error);
            // On mobile, audio might need user interaction first
          });
        });
        audio.addEventListener('ended', () => {
          setAudioLoading(null);
        });
        audio.load();
      } else {
        // No audio available (demo mode)
        setAudioLoading(null);
      }
    } catch (error) {
      console.error('Audio error:', error);
      setAudioLoading(null);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl font-serif gradient-text font-bold">Bonjour!</h1>
          <p className="text-base md:text-lg text-brand-ink/60">Ready to continue your French journey?</p>
        </div>
        <div className="flex gap-4">
          <div className="gradient-card px-6 py-3 flex items-center gap-3 pulse-glow">
            <Trophy className="text-brand-clay" size={20} />
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-50">Level {stats.level}</p>
              <p className="font-bold">{stats.xp} XP</p>
            </div>
          </div>
          <div className="gradient-card px-6 py-3 flex items-center gap-3">
            <Flame className="text-brand-orange" size={20} />
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-50">Streak</p>
              <p className="font-bold">{stats.streak} Days</p>
            </div>
          </div>
        </div>
      </header>

      <div className="gradient-card p-8 gradient-bg text-white shine-effect">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center float">
            <Sparkles className="text-white" />
          </div>
          <span className="text-xs uppercase tracking-widest opacity-60">Daily Goal</span>
        </div>
        <div className="flex items-end justify-between mb-2">
          <h3 className="text-2xl">Almost there!</h3>
          <span className="text-sm opacity-80">350 / 500 XP</span>
        </div>
        <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
          <motion.div
            className="bg-white h-full"
            initial={{ width: 0 }}
            animate={{ width: '70%' }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <p className="mt-4 text-sm opacity-80">You're 150 XP away from your daily goal. Keep going!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <motion.button
          onClick={() => setView('flashcards')}
          className="gradient-card p-6 text-left hover:scale-105 transition-all group"
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-brand-purple to-brand-blue rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BookOpen className="text-white" size={20} />
          </div>
          <h3 className="text-xl mb-1">Vocabulary</h3>
          <p className="text-brand-ink/50 text-xs">AI Flashcards</p>
        </motion.button>

        <motion.button
          onClick={() => setView('quiz')}
          className="gradient-card p-6 text-left hover:scale-105 transition-all group"
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-brand-yellow to-brand-orange rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BrainCircuit className="text-white" size={20} />
          </div>
          <h3 className="text-xl mb-1">Quiz</h3>
          <p className="text-brand-ink/50 text-xs">Test Knowledge</p>
        </motion.button>

        <motion.button
          onClick={() => setView('tutor')}
          className="gradient-card p-6 text-left hover:scale-105 transition-all group"
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-brand-clay to-brand-purple rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <MessageCircle className="text-white" size={20} />
          </div>
          <h3 className="text-xl mb-1">AI Tutor</h3>
          <p className="text-brand-ink/50 text-xs">Chat Practice</p>
        </motion.button>

        <motion.button
          onClick={() => setView('dictionary')}
          className="gradient-card p-6 text-left hover:scale-105 transition-all group"
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-brand-blue to-brand-green rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Search className="text-white" size={20} />
          </div>
          <h3 className="text-xl mb-1">Dictionary</h3>
          <p className="text-brand-ink/50 text-xs">Word Lookup</p>
        </motion.button>

        <motion.button
          onClick={() => setView('grammar')}
          className="gradient-card p-6 text-left hover:scale-105 transition-all group"
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-brand-purple to-brand-clay rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Lightbulb className="text-white" size={20} />
          </div>
          <h3 className="text-xl mb-1">Grammar</h3>
          <p className="text-brand-ink/50 text-xs">Quick Lessons</p>
        </motion.button>

        <motion.button
          onClick={() => setView('pronunciation')}
          className="gradient-card p-6 text-left hover:scale-105 transition-all group"
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-brand-green to-brand-blue rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Mic2 className="text-white" size={20} />
          </div>
          <h3 className="text-xl mb-1">Pronunciation</h3>
          <p className="text-brand-ink/50 text-xs">Accent Lab</p>
        </motion.button>

        <motion.button
          onClick={() => setView('favorites')}
          className="gradient-card p-6 text-left hover:scale-105 transition-all group"
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-brand-clay to-brand-orange rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Heart className="text-white" size={20} />
          </div>
          <h3 className="text-xl mb-1">Favorites</h3>
          <p className="text-brand-ink/50 text-xs">Saved Phrases</p>
        </motion.button>

        <motion.button
          onClick={() => setView('settings')}
          className="gradient-card p-6 text-left hover:scale-105 transition-all group"
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-brand-olive to-brand-purple rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Settings className="text-white" size={20} />
          </div>
          <h3 className="text-xl mb-1">Settings</h3>
          <p className="text-brand-ink/50 text-xs">App Config</p>
        </motion.button>
      </div>
    </div>
  );

  const renderDictionary = () => (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <motion.button
          onClick={() => setView('dashboard')}
          className="text-brand-clay flex items-center gap-2 hover:underline"
          whileHover={{ x: -5 }}
        >
          <RotateCcw size={18} /> Back
        </motion.button>
        <h2 className="text-3xl font-serif gradient-text">Dictionary</h2>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-clay/50" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for a French word..."
            className="w-full bg-white border-2 border-brand-clay/20 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-brand-clay/40 focus:border-brand-clay transition-all"
          />
        </div>
        <motion.button
          onClick={handleSearch}
          disabled={isLoading || !searchQuery.trim()}
          className="gradient-bg text-white px-8 rounded-2xl hover:shadow-xl disabled:opacity-50 transition-all font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Lookup
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-20"
          >
            <motion.div
              className="h-12 w-12 border-4 border-brand-clay border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        ) : dictionaryResult ? (
          <motion.div
            key="result"
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            className="gradient-card p-10 space-y-8"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h3 className="text-5xl font-serif gradient-text font-bold">{dictionaryResult.word}</h3>
                <p className="text-2xl text-brand-clay font-serif italic">{dictionaryResult.translation}</p>
              </div>
              <motion.button
                onClick={() => playAudio(dictionaryResult.word)}
                className="p-4 bg-gradient-to-br from-brand-purple to-brand-blue rounded-full text-white shadow-lg"
                whileHover={{ scale: 1.1, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
              >
                <Volume2 size={24} />
              </motion.button>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs uppercase tracking-widest text-brand-ink/40 font-bold">Definition</h4>
              <p className="text-lg leading-relaxed">{dictionaryResult.definition}</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs uppercase tracking-widest text-brand-ink/40 font-bold">Examples</h4>
              <div className="space-y-4">
                {dictionaryResult.examples.map((ex, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 bg-gradient-to-r from-brand-purple/10 to-brand-blue/10 rounded-xl border-l-4 border-brand-clay"
                  >
                    <p className="font-serif text-lg">{ex}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-20 text-brand-ink/30 italic">
            Search for any French word to see its translation, definition, and examples.
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => setView('dashboard')} className="text-brand-olive flex items-center gap-2 hover:underline">
          <RotateCcw size={18} /> Back
        </button>
        <h2 className="text-3xl font-serif">Settings</h2>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-4 text-brand-olive">
            <Info size={24} />
            <h3 className="text-xl font-serif">App Information</h3>
          </div>
          <div className="space-y-4 text-sm text-brand-ink/60">
            <div className="flex justify-between border-b border-brand-olive/5 pb-2">
              <span>Version</span>
              <span className="font-mono">1.2.0</span>
            </div>
            <div className="flex justify-between border-b border-brand-olive/5 pb-2">
              <span>AI Model</span>
              <span className="font-mono">Gemini 3 Flash</span>
            </div>
            <div className="flex justify-between border-b border-brand-olive/5 pb-2">
              <span>Last Sync</span>
              <span className="font-mono">{new Date(stats.lastActive).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 space-y-6 border-rose-100">
          <div className="flex items-center gap-4 text-rose-600">
            <Trash2 size={24} />
            <h3 className="text-xl font-serif">Danger Zone</h3>
          </div>
          <p className="text-sm text-brand-ink/60">Resetting your progress will delete all XP, streaks, and favorite phrases. This action is permanent.</p>
          <button 
            onClick={clearProgress}
            className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-600 hover:text-white transition-all font-medium"
          >
            Reset All Progress
          </button>
        </div>
      </div>
    </div>
  );

  const renderFlashcards = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <motion.button
          onClick={() => setView('dashboard')}
          className="text-brand-clay flex items-center gap-2 hover:underline"
          whileHover={{ x: -5 }}
        >
          <RotateCcw size={18} /> Back
        </motion.button>
        <div className="flex flex-wrap gap-2">
          {['Common', 'Food', 'Travel', 'Work'].map(cat => (
            <motion.button
              key={cat}
              onClick={() => loadFlashcards(cat)}
              className="px-3 py-2 md:px-4 md:py-1 rounded-full border border-brand-clay/30 text-xs md:text-sm bg-white/50 hover:gradient-bg hover:text-white hover:border-transparent transition-all min-h-[36px]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {cat}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="relative min-h-[300px] md:h-[400px] perspective-1000">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                className="h-12 w-12 border-4 border-brand-clay border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          ) : flashcards.length > 0 ? (
            <motion.div
              key={currentCardIndex}
              initial={{ x: 300, opacity: 0, rotateY: -90 }}
              animate={{ x: 0, opacity: 1, rotateY: 0 }}
              exit={{ x: -300, opacity: 0, rotateY: 90 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="absolute inset-0"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <motion.div
                className={cn(
                  "w-full h-full gradient-card flex flex-col items-center justify-center p-12 text-center cursor-pointer transition-all duration-500 transform-style-3d shadow-2xl",
                  isFlipped && "rotate-y-180"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {!isFlipped ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center w-full absolute top-8 px-8">
                      <span className="text-xs uppercase tracking-widest bg-gradient-to-r from-brand-purple to-brand-blue text-transparent bg-clip-text font-bold">
                        {flashcards[currentCardIndex].category}
                      </span>
                      <motion.button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(flashcards[currentCardIndex]); }}
                        className={cn(
                          "p-2 rounded-full transition-colors",
                          favorites.find(f => f.id === flashcards[currentCardIndex].id) ? "text-rose-500" : "text-brand-ink/20 hover:text-rose-500"
                        )}
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Heart fill={favorites.find(f => f.id === flashcards[currentCardIndex].id) ? "currentColor" : "none"} size={20} />
                      </motion.button>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-serif gradient-text font-bold">{flashcards[currentCardIndex].french}</h2>
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); playAudio(flashcards[currentCardIndex].french); }}
                      disabled={audioLoading === flashcards[currentCardIndex].french}
                      className="p-4 bg-gradient-to-br from-brand-purple to-brand-blue rounded-full text-white shadow-lg min-w-[48px] min-h-[48px] flex items-center justify-center disabled:opacity-50"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {audioLoading === flashcards[currentCardIndex].french ? (
                        <motion.div
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                      ) : (
                        <Volume2 size={24} />
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-6 rotate-y-180">
                    <span className="text-xs uppercase tracking-widest text-brand-clay/60">English</span>
                    <h2 className="text-4xl font-serif text-brand-clay">{flashcards[currentCardIndex].english}</h2>
                    <p className="text-brand-ink/40 italic">Phonetic: {flashcards[currentCardIndex].pronunciation}</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-4">
        <motion.button
          disabled={currentCardIndex === 0}
          onClick={() => { setCurrentCardIndex(prev => prev - 1); setIsFlipped(false); }}
          className="px-8 py-3 gradient-card hover:shadow-xl disabled:opacity-30 font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Previous
        </motion.button>
        <motion.button
          disabled={currentCardIndex === flashcards.length - 1}
          onClick={() => { setCurrentCardIndex(prev => prev + 1); setIsFlipped(false); }}
          className="px-8 py-3 gradient-bg text-white hover:shadow-xl disabled:opacity-30 font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Next
        </motion.button>
      </div>
    </div>
  );

  const renderQuiz = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => setView('dashboard')} className="text-brand-olive flex items-center gap-2 hover:underline">
          <RotateCcw size={18} /> Back
        </button>
        <div className="text-sm font-medium">Question {currentQuizIndex + 1} of {quizQuestions.length}</div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-olive"></div>
        </div>
      ) : quizFinished ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="gradient-card p-12 text-center space-y-6 bounce-in"
        >
          <motion.div
            className="w-20 h-20 bg-gradient-to-br from-brand-yellow to-brand-orange rounded-full flex items-center justify-center mx-auto"
            animate={{ rotate: [0, 10, -10, 10, 0] }}
            transition={{ duration: 0.5, repeat: 3 }}
          >
            <Trophy className="text-white" size={40} />
          </motion.div>
          <h2 className="text-4xl font-serif gradient-text">Quiz Complete!</h2>
          <p className="text-xl">You scored <span className="font-bold text-brand-clay">{quizScore}</span> out of {quizQuestions.length}</p>
          <div className="flex justify-center gap-2">
            {Array.from({ length: quizQuestions.length }).map((_, i) => (
              <Star
                key={i}
                className={i < quizScore ? "text-brand-yellow fill-brand-yellow" : "text-brand-ink/20"}
                size={24}
              />
            ))}
          </div>
          <div className="flex justify-center gap-4">
            <motion.button
              onClick={() => loadQuiz('General')}
              className="px-8 py-3 gradient-bg text-white rounded-xl font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Try Again
            </motion.button>
            <motion.button
              onClick={() => setView('dashboard')}
              className="px-8 py-3 gradient-card rounded-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Dashboard
            </motion.button>
          </div>
        </motion.div>
      ) : quizQuestions.length > 0 ? (
        <div className="space-y-6">
          <div className="gradient-card p-8">
            <h3 className="text-2xl font-serif mb-8">{quizQuestions[currentQuizIndex].question}</h3>
            <div className="grid grid-cols-1 gap-4">
              {quizQuestions[currentQuizIndex].options.map((option, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => handleOptionSelect(option)}
                  className={cn(
                    "w-full p-4 text-left rounded-xl border-2 transition-all font-medium",
                    selectedOption === option
                      ? (option === quizQuestions[currentQuizIndex].correctAnswer
                        ? "bg-gradient-to-r from-brand-green/20 to-brand-green/10 border-brand-green text-brand-green"
                        : "bg-gradient-to-r from-rose-500/20 to-rose-500/10 border-rose-500 text-rose-700")
                      : (selectedOption && option === quizQuestions[currentQuizIndex].correctAnswer
                        ? "bg-gradient-to-r from-brand-green/20 to-brand-green/10 border-brand-green text-brand-green"
                        : "bg-white border-brand-ink/10 hover:border-brand-clay hover:shadow-md")
                  )}
                  whileHover={!selectedOption ? { scale: 1.02, x: 5 } : {}}
                  whileTap={!selectedOption ? { scale: 0.98 } : {}}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {selectedOption === option && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        {option === quizQuestions[currentQuizIndex].correctAnswer ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          <XCircle size={20} />
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -20 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0 }}
                className="gradient-card p-6 bg-gradient-to-r from-brand-purple/10 to-brand-blue/10 border-brand-clay/20"
              >
                <p className="text-sm font-medium text-brand-clay mb-2 uppercase tracking-widest">Explanation</p>
                <p className="text-brand-ink/80">{quizQuestions[currentQuizIndex].explanation}</p>
                <motion.button
                  onClick={nextQuizQuestion}
                  className="mt-6 flex items-center gap-2 text-brand-clay font-bold hover:gap-3 transition-all"
                  whileHover={{ x: 5 }}
                >
                  {currentQuizIndex === quizQuestions.length - 1 ? "Finish Quiz" : "Next Question"} <ArrowRight size={18} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  );

  const renderGrammar = () => (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <motion.button
          onClick={() => setView('dashboard')}
          className="text-brand-clay flex items-center gap-2 hover:underline"
          whileHover={{ x: -5 }}
        >
          <RotateCcw size={18} /> Back
        </motion.button>
        <div className="flex gap-2">
          {['Articles', 'Verbs', 'Gender', 'Plurals'].map(topic => (
            <motion.button
              key={topic}
              onClick={() => loadGrammarTip(topic)}
              className={cn(
                "px-4 py-1 rounded-full border text-sm transition-all font-medium",
                grammarTopic === topic
                  ? "gradient-bg text-white border-transparent shadow-lg"
                  : "border-brand-clay/30 bg-white/50 hover:border-brand-clay hover:shadow-md"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {topic}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="gradient-card p-12 min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              className="h-12 w-12 border-4 border-brand-clay border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="prose prose-lg max-w-none"
          >
            <ReactMarkdown>{grammarTip}</ReactMarkdown>
          </motion.div>
        )}
      </div>
    </div>
  );

  const renderFavorites = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <motion.button
          onClick={() => setView('dashboard')}
          className="text-brand-clay flex items-center gap-2 hover:underline"
          whileHover={{ x: -5 }}
        >
          <RotateCcw size={18} /> Back
        </motion.button>
        <h2 className="text-3xl font-serif gradient-text">Your Favorites</h2>
      </div>

      {favorites.length === 0 ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="gradient-card p-20 text-center space-y-4"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Heart className="mx-auto text-brand-clay/30" size={64} />
          </motion.div>
          <p className="text-brand-ink/40 italic">You haven't bookmarked any phrases yet. Go to Vocabulary and click the heart icon!</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {favorites.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="gradient-card p-6 flex items-center justify-between group hover:shadow-xl transition-all"
              whileHover={{ y: -5 }}
            >
              <div>
                <h4 className="text-xl font-serif gradient-text mb-1">{card.french}</h4>
                <p className="text-sm text-brand-ink/40">{card.english}</p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => playAudio(card.french)}
                  className="p-2 text-brand-clay/60 hover:text-brand-clay"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Volume2 size={20} />
                </motion.button>
                <motion.button
                  onClick={() => toggleFavorite(card)}
                  className="p-2 text-rose-500"
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Heart fill="currentColor" size={20} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTutor = () => (
    <div className="max-w-3xl mx-auto min-h-[500px] md:h-[calc(100vh-12rem)] flex flex-col gradient-card overflow-hidden">
      <div className="p-6 border-b border-brand-clay/10 flex items-center justify-between bg-white/50">
        <div className="flex items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-clay to-brand-purple flex items-center justify-center text-white"
            whileHover={{ scale: 1.1, rotate: 10 }}
          >
            <GraduationCap />
          </motion.div>
          <div>
            <h3 className="text-xl gradient-text">Amélie</h3>
            <p className="text-xs text-brand-clay/60">Your French Tutor • Online</p>
          </div>
        </div>
        <motion.button
          onClick={() => setView('dashboard')}
          className="text-brand-ink/40 hover:text-brand-ink"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          Close
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {chatMessages.length === 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-12 space-y-4"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Languages className="mx-auto text-brand-clay/30" size={48} />
            </motion.div>
            <p className="text-brand-ink/40 italic">Start a conversation in French! Try saying "Bonjour, comment vas-tu ?"</p>
          </motion.div>
        )}
        {chatMessages.map((msg, idx) => (
          <motion.div
            key={msg.id}
            initial={{ x: msg.role === 'user' ? 50 : -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              "flex",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "max-w-[80%] p-4 rounded-2xl",
              msg.role === 'user'
                ? "gradient-bg text-white rounded-tr-none shadow-lg"
                : "bg-white border border-brand-clay/20 rounded-tl-none shadow-md"
            )}>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
              {msg.role === 'model' && (
                <motion.button
                  onClick={() => playAudio(msg.text.split('\n')[0])}
                  className="mt-2 text-brand-clay/60 hover:text-brand-clay"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Volume2 size={16} />
                </motion.button>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white border border-brand-clay/20 p-4 rounded-2xl rounded-tl-none">
              <motion.div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-brand-clay rounded-full"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-6 bg-white/50 border-t border-brand-clay/10">
        <div className="flex gap-4">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message in French..."
            className="flex-1 bg-white border-2 border-brand-clay/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-clay/40 focus:border-brand-clay"
          />
          <motion.button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="gradient-bg text-white px-6 py-3 rounded-xl hover:shadow-xl disabled:opacity-50 transition-all font-semibold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Send
          </motion.button>
        </div>
      </div>
    </div>
  );

  const renderPronunciation = () => (
    <div className="max-w-2xl mx-auto space-y-8 text-center">
      <header className="space-y-4">
        <motion.div
          className="w-20 h-20 bg-gradient-to-br from-brand-green to-brand-blue rounded-3xl flex items-center justify-center mx-auto text-white shadow-xl float"
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <Mic2 size={40} />
        </motion.div>
        <h2 className="text-4xl font-serif gradient-text">Pronunciation Lab</h2>
        <p className="text-brand-ink/60">Listen to the native pronunciation and practice your accent.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {[
          "S'il vous plaît",
          "Enchanté",
          "Je ne comprends pas",
          "Où sont les toilettes ?",
          "La vie est belle"
        ].map((phrase, idx) => (
          <motion.div
            key={phrase}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="gradient-card p-6 flex items-center justify-between group hover:shadow-xl transition-all"
          >
            <span className="text-2xl font-serif gradient-text">{phrase}</span>
            <motion.button
              onClick={() => playAudio(phrase)}
              disabled={audioLoading === phrase}
              className="p-4 bg-gradient-to-br from-brand-green to-brand-blue rounded-full text-white shadow-lg disabled:opacity-50"
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
            >
              {audioLoading === phrase ? (
                <motion.div
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <Volume2 size={24} />
              )}
            </motion.button>
          </motion.div>
        ))}
      </div>

      <motion.button
        onClick={() => setView('dashboard')}
        className="text-brand-clay hover:underline"
        whileHover={{ scale: 1.05 }}
      >
        Back to Dashboard
      </motion.button>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-12 max-w-6xl mx-auto">
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />

      {showCelebration && (
        <motion.div
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 gradient-bg text-white px-8 py-4 rounded-2xl shadow-2xl bounce-in"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
        >
          <div className="flex items-center gap-3">
            <Zap className="text-yellow-300" size={24} />
            <span className="text-xl font-bold">{celebrationMessage}</span>
          </div>
        </motion.div>
      )}

      <nav className="flex justify-between items-center mb-8 md:mb-12">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 gradient-bg rounded-xl flex items-center justify-center text-white">
            <Languages size={20} className="md:hidden" />
            <Languages size={24} className="hidden md:block" />
          </div>
          <span className="text-xl md:text-2xl font-serif font-bold tracking-tight gradient-text">L'Atelier Français</span>
        </div>
        <div className="flex gap-2 md:gap-4">
          <motion.button
            onClick={() => setView('dashboard')}
            className={cn(
              "p-2 md:p-2 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center",
              view === 'dashboard' ? "gradient-bg text-white" : "text-brand-ink/40 hover:bg-brand-olive/10"
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <LayoutDashboard size={20} />
          </motion.button>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-brand-clay to-brand-purple flex items-center justify-center text-white font-bold text-xs md:text-sm">
            PF
          </div>
        </div>
      </nav>

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {view === 'dashboard' && renderDashboard()}
            {view === 'flashcards' && renderFlashcards()}
            {view === 'tutor' && renderTutor()}
            {view === 'pronunciation' && renderPronunciation()}
            {view === 'quiz' && renderQuiz()}
            {view === 'grammar' && renderGrammar()}
            {view === 'favorites' && renderFavorites()}
            {view === 'dictionary' && renderDictionary()}
            {view === 'settings' && renderSettings()}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-20 pt-8 border-t border-brand-olive/10 text-center text-sm text-brand-ink/30">
        <p>© 2026 L'Atelier Français • Powered by Gemini AI</p>
      </footer>
    </div>
  );
}
