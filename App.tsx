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
  Info
} from 'lucide-react';
import { AppView, Flashcard, ChatMessage, QuizQuestion, UserStats, DictionaryEntry } from './types';
import { geminiService } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
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

  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('french_stats');
    return saved ? JSON.parse(saved) : {
      xp: 120,
      level: 2,
      streak: 5,
      cardsMastered: 12,
      lastActive: Date.now()
    };
  });

  useEffect(() => {
    localStorage.setItem('french_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    const savedFavs = localStorage.getItem('french_favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
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
        audio.play();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAudioLoading(null);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-serif text-brand-olive italic">Bonjour!</h1>
          <p className="text-lg text-brand-ink/60">Ready to continue your French journey?</p>
        </div>
        <div className="flex gap-4">
          <div className="glass-card px-6 py-3 flex items-center gap-3">
            <Trophy className="text-brand-clay" size={20} />
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-50">Level {stats.level}</p>
              <p className="font-bold">{stats.xp} XP</p>
            </div>
          </div>
          <div className="glass-card px-6 py-3 flex items-center gap-3">
            <Sparkles className="text-amber-500" size={20} />
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-50">Streak</p>
              <p className="font-bold">{stats.streak} Days</p>
            </div>
          </div>
        </div>
      </header>

      <div className="glass-card p-8 bg-brand-olive text-white">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <Sparkles className="text-white" />
          </div>
          <span className="text-xs uppercase tracking-widest opacity-60">Daily Goal</span>
        </div>
        <div className="flex items-end justify-between mb-2">
          <h3 className="text-2xl">Almost there!</h3>
          <span className="text-sm opacity-80">350 / 500 XP</span>
        </div>
        <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
          <div className="bg-white h-full transition-all duration-1000" style={{ width: '70%' }} />
        </div>
        <p className="mt-4 text-sm opacity-80">You're 150 XP away from your daily goal. Keep going!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button 
          onClick={() => setView('flashcards')}
          className="glass-card p-6 text-left hover:bg-white transition-all group"
        >
          <div className="w-10 h-10 bg-brand-olive/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BookOpen className="text-brand-olive" size={20} />
          </div>
          <h3 className="text-xl mb-1">Vocabulary</h3>
          <p className="text-brand-ink/50 text-xs">AI Flashcards</p>
        </button>

        <button 
          onClick={() => setView('quiz')}
          className="glass-card p-6 text-left hover:bg-white transition-all group"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BrainCircuit className="text-amber-700" size={20} />
          </div>
          <h3 className="text-xl mb-1">Quiz</h3>
          <p className="text-brand-ink/50 text-xs">Test Knowledge</p>
        </button>

        <button 
          onClick={() => setView('tutor')}
          className="glass-card p-6 text-left hover:bg-white transition-all group"
        >
          <div className="w-10 h-10 bg-brand-clay/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <MessageCircle className="text-brand-clay" size={20} />
          </div>
          <h3 className="text-xl mb-1">AI Tutor</h3>
          <p className="text-brand-ink/50 text-xs">Chat Practice</p>
        </button>

        <button 
          onClick={() => setView('dictionary')}
          className="glass-card p-6 text-left hover:bg-white transition-all group"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Search className="text-blue-700" size={20} />
          </div>
          <h3 className="text-xl mb-1">Dictionary</h3>
          <p className="text-brand-ink/50 text-xs">Word Lookup</p>
        </button>

        <button 
          onClick={() => setView('grammar')}
          className="glass-card p-6 text-left hover:bg-white transition-all group"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Lightbulb className="text-indigo-700" size={20} />
          </div>
          <h3 className="text-xl mb-1">Grammar</h3>
          <p className="text-brand-ink/50 text-xs">Quick Lessons</p>
        </button>

        <button 
          onClick={() => setView('pronunciation')}
          className="glass-card p-6 text-left hover:bg-white transition-all group"
        >
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Mic2 className="text-emerald-700" size={20} />
          </div>
          <h3 className="text-xl mb-1">Pronunciation</h3>
          <p className="text-brand-ink/50 text-xs">Accent Lab</p>
        </button>

        <button 
          onClick={() => setView('favorites')}
          className="glass-card p-6 text-left hover:bg-white transition-all group"
        >
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Heart className="text-rose-700" size={20} />
          </div>
          <h3 className="text-xl mb-1">Favorites</h3>
          <p className="text-brand-ink/50 text-xs">Saved Phrases</p>
        </button>

        <button 
          onClick={() => setView('settings')}
          className="glass-card p-6 text-left hover:bg-white transition-all group"
        >
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Settings className="text-slate-700" size={20} />
          </div>
          <h3 className="text-xl mb-1">Settings</h3>
          <p className="text-brand-ink/50 text-xs">App Config</p>
        </button>
      </div>
    </div>
  );

  const renderDictionary = () => (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => setView('dashboard')} className="text-brand-olive flex items-center gap-2 hover:underline">
          <RotateCcw size={18} /> Back
        </button>
        <h2 className="text-3xl font-serif">Dictionary</h2>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-ink/30" size={20} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for a French word..."
            className="w-full bg-white border border-brand-olive/20 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
          />
        </div>
        <button 
          onClick={handleSearch}
          disabled={isLoading || !searchQuery.trim()}
          className="bg-brand-olive text-white px-8 rounded-2xl hover:bg-brand-olive/90 disabled:opacity-50 transition-all"
        >
          Lookup
        </button>
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
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-olive"></div>
          </motion.div>
        ) : dictionaryResult ? (
          <motion.div
            key="result"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-card p-10 space-y-8"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h3 className="text-5xl font-serif text-brand-olive">{dictionaryResult.word}</h3>
                <p className="text-2xl text-brand-clay font-serif italic">{dictionaryResult.translation}</p>
              </div>
              <button 
                onClick={() => playAudio(dictionaryResult.word)}
                className="p-4 bg-brand-olive/10 rounded-full text-brand-olive hover:bg-brand-olive hover:text-white transition-colors"
              >
                <Volume2 size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs uppercase tracking-widest text-brand-ink/40 font-bold">Definition</h4>
              <p className="text-lg leading-relaxed">{dictionaryResult.definition}</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs uppercase tracking-widest text-brand-ink/40 font-bold">Examples</h4>
              <div className="space-y-4">
                {dictionaryResult.examples.map((ex, i) => (
                  <div key={i} className="p-4 bg-brand-cream rounded-xl border-l-4 border-brand-olive">
                    <p className="font-serif text-lg">{ex}</p>
                  </div>
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
      <div className="flex items-center justify-between">
        <button onClick={() => setView('dashboard')} className="text-brand-olive flex items-center gap-2 hover:underline">
          <RotateCcw size={18} /> Back
        </button>
        <div className="flex gap-2">
          {['Common', 'Food', 'Travel', 'Work'].map(cat => (
            <button 
              key={cat}
              onClick={() => loadFlashcards(cat)}
              className="px-4 py-1 rounded-full border border-brand-olive/20 text-sm hover:bg-brand-olive hover:text-white transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[400px] perspective-1000">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-olive"></div>
            </motion.div>
          ) : flashcards.length > 0 ? (
            <motion.div
              key={currentCardIndex}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className={cn(
                "w-full h-full glass-card flex flex-col items-center justify-center p-12 text-center cursor-pointer transition-all duration-500 transform-style-3d",
                isFlipped && "rotate-y-180"
              )}>
                {!isFlipped ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center w-full absolute top-8 px-8">
                      <span className="text-xs uppercase tracking-widest text-brand-olive/60">{flashcards[currentCardIndex].category}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(flashcards[currentCardIndex]); }}
                        className={cn(
                          "p-2 rounded-full transition-colors",
                          favorites.find(f => f.id === flashcards[currentCardIndex].id) ? "text-rose-500" : "text-brand-ink/20 hover:text-rose-500"
                        )}
                      >
                        <Heart fill={favorites.find(f => f.id === flashcards[currentCardIndex].id) ? "currentColor" : "none"} size={20} />
                      </button>
                    </div>
                    <h2 className="text-5xl font-serif">{flashcards[currentCardIndex].french}</h2>
                    <button 
                      onClick={(e) => { e.stopPropagation(); playAudio(flashcards[currentCardIndex].french); }}
                      className="p-3 bg-brand-olive/10 rounded-full text-brand-olive hover:bg-brand-olive hover:text-white transition-colors"
                    >
                      <Volume2 size={24} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 rotate-y-180">
                    <span className="text-xs uppercase tracking-widest text-brand-clay/60">English</span>
                    <h2 className="text-4xl font-serif text-brand-clay">{flashcards[currentCardIndex].english}</h2>
                    <p className="text-brand-ink/40 italic">Phonetic: {flashcards[currentCardIndex].pronunciation}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-4">
        <button 
          disabled={currentCardIndex === 0}
          onClick={() => { setCurrentCardIndex(prev => prev - 1); setIsFlipped(false); }}
          className="px-8 py-3 glass-card hover:bg-white disabled:opacity-30"
        >
          Previous
        </button>
        <button 
          disabled={currentCardIndex === flashcards.length - 1}
          onClick={() => { setCurrentCardIndex(prev => prev + 1); setIsFlipped(false); }}
          className="px-8 py-3 glass-card bg-brand-olive text-white hover:bg-brand-olive/90 disabled:opacity-30"
        >
          Next
        </button>
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
          className="glass-card p-12 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
            <Trophy size={40} />
          </div>
          <h2 className="text-4xl font-serif">Quiz Complete!</h2>
          <p className="text-xl">You scored <span className="font-bold text-brand-olive">{quizScore}</span> out of {quizQuestions.length}</p>
          <div className="flex justify-center gap-4">
            <button onClick={() => loadQuiz('General')} className="px-8 py-3 bg-brand-olive text-white rounded-xl">Try Again</button>
            <button onClick={() => setView('dashboard')} className="px-8 py-3 glass-card rounded-xl">Dashboard</button>
          </div>
        </motion.div>
      ) : quizQuestions.length > 0 ? (
        <div className="space-y-6">
          <div className="glass-card p-8">
            <h3 className="text-2xl font-serif mb-8">{quizQuestions[currentQuizIndex].question}</h3>
            <div className="grid grid-cols-1 gap-4">
              {quizQuestions[currentQuizIndex].options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(option)}
                  className={cn(
                    "w-full p-4 text-left rounded-xl border transition-all",
                    selectedOption === option 
                      ? (option === quizQuestions[currentQuizIndex].correctAnswer ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-rose-50 border-rose-500 text-rose-700")
                      : (selectedOption && option === quizQuestions[currentQuizIndex].correctAnswer ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-brand-olive/10 hover:border-brand-olive/30")
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {selectedOption === option && (
                      option === quizQuestions[currentQuizIndex].correctAnswer ? <CheckCircle2 size={20} /> : <XCircle size={20} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {showExplanation && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="glass-card p-6 bg-brand-olive/5 border-brand-olive/20"
              >
                <p className="text-sm font-medium text-brand-olive mb-2 uppercase tracking-widest">Explanation</p>
                <p className="text-brand-ink/80">{quizQuestions[currentQuizIndex].explanation}</p>
                <button 
                  onClick={nextQuizQuestion}
                  className="mt-6 flex items-center gap-2 text-brand-olive font-bold hover:gap-3 transition-all"
                >
                  {currentQuizIndex === quizQuestions.length - 1 ? "Finish Quiz" : "Next Question"} <ArrowRight size={18} />
                </button>
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
        <button onClick={() => setView('dashboard')} className="text-brand-olive flex items-center gap-2 hover:underline">
          <RotateCcw size={18} /> Back
        </button>
        <div className="flex gap-2">
          {['Articles', 'Verbs', 'Gender', 'Plurals'].map(topic => (
            <button 
              key={topic}
              onClick={() => loadGrammarTip(topic)}
              className={cn(
                "px-4 py-1 rounded-full border text-sm transition-colors",
                grammarTopic === topic ? "bg-brand-olive text-white border-brand-olive" : "border-brand-olive/20 hover:bg-brand-olive/5"
              )}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-12 min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-olive"></div>
          </div>
        ) : (
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown>{grammarTip}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );

  const renderFavorites = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => setView('dashboard')} className="text-brand-olive flex items-center gap-2 hover:underline">
          <RotateCcw size={18} /> Back
        </button>
        <h2 className="text-3xl font-serif">Your Favorites</h2>
      </div>

      {favorites.length === 0 ? (
        <div className="glass-card p-20 text-center space-y-4">
          <Heart className="mx-auto text-brand-ink/10" size={64} />
          <p className="text-brand-ink/40 italic">You haven't bookmarked any phrases yet. Go to Vocabulary and click the heart icon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {favorites.map(card => (
            <div key={card.id} className="glass-card p-6 flex items-center justify-between group hover:bg-white transition-all">
              <div>
                <h4 className="text-xl font-serif mb-1">{card.french}</h4>
                <p className="text-sm text-brand-ink/40">{card.english}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => playAudio(card.french)}
                  className="p-2 text-brand-olive/40 hover:text-brand-olive"
                >
                  <Volume2 size={20} />
                </button>
                <button 
                  onClick={() => toggleFavorite(card)}
                  className="p-2 text-rose-500"
                >
                  <Heart fill="currentColor" size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTutor = () => (
    <div className="max-w-3xl mx-auto h-[calc(100vh-12rem)] flex flex-col glass-card overflow-hidden">
      <div className="p-6 border-b border-brand-olive/10 flex items-center justify-between bg-white/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-olive/20 flex items-center justify-center text-brand-olive">
            <GraduationCap />
          </div>
          <div>
            <h3 className="text-xl">Amélie</h3>
            <p className="text-xs text-brand-olive/60">Your French Tutor • Online</p>
          </div>
        </div>
        <button onClick={() => setView('dashboard')} className="text-brand-ink/40 hover:text-brand-ink">
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {chatMessages.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <Languages className="mx-auto text-brand-olive/20" size={48} />
            <p className="text-brand-ink/40 italic">Start a conversation in French! Try saying "Bonjour, comment vas-tu ?"</p>
          </div>
        )}
        {chatMessages.map(msg => (
          <div key={msg.id} className={cn(
            "flex",
            msg.role === 'user' ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "max-w-[80%] p-4 rounded-2xl",
              msg.role === 'user' 
                ? "bg-brand-olive text-white rounded-tr-none" 
                : "bg-white border border-brand-olive/10 rounded-tl-none"
            )}>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
              {msg.role === 'model' && (
                <button 
                  onClick={() => playAudio(msg.text.split('\n')[0])}
                  className="mt-2 text-brand-olive/60 hover:text-brand-olive"
                >
                  <Volume2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-brand-olive/10 p-4 rounded-2xl rounded-tl-none animate-pulse">
              Amélie is typing...
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white/50 border-t border-brand-olive/10">
        <div className="flex gap-4">
          <input 
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message in French..."
            className="flex-1 bg-white border border-brand-olive/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
          />
          <button 
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="bg-brand-olive text-white px-6 py-3 rounded-xl hover:bg-brand-olive/90 disabled:opacity-50 transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );

  const renderPronunciation = () => (
    <div className="max-w-2xl mx-auto space-y-8 text-center">
      <header className="space-y-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto text-emerald-700">
          <Mic2 size={40} />
        </div>
        <h2 className="text-4xl font-serif">Pronunciation Lab</h2>
        <p className="text-brand-ink/60">Listen to the native pronunciation and practice your accent.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {[
          "S'il vous plaît",
          "Enchanté",
          "Je ne comprends pas",
          "Où sont les toilettes ?",
          "La vie est belle"
        ].map(phrase => (
          <div key={phrase} className="glass-card p-6 flex items-center justify-between group hover:bg-white transition-all">
            <span className="text-2xl font-serif">{phrase}</span>
            <button 
              onClick={() => playAudio(phrase)}
              disabled={audioLoading === phrase}
              className="p-4 bg-emerald-50 rounded-full text-emerald-700 hover:bg-emerald-700 hover:text-white transition-all disabled:opacity-50"
            >
              {audioLoading === phrase ? (
                <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Volume2 size={24} />
              )}
            </button>
          </div>
        ))}
      </div>

      <button onClick={() => setView('dashboard')} className="text-brand-olive hover:underline">
        Back to Dashboard
      </button>
    </div>
  );

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto">
      <nav className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-olive rounded-xl flex items-center justify-center text-white">
            <Languages size={24} />
          </div>
          <span className="text-2xl font-serif font-bold tracking-tight">L'Atelier Français</span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              view === 'dashboard' ? "bg-brand-olive text-white" : "text-brand-ink/40 hover:bg-brand-olive/10"
            )}
          >
            <LayoutDashboard size={20} />
          </button>
          <div className="w-10 h-10 rounded-full bg-brand-clay/20 flex items-center justify-center text-brand-clay font-bold">
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
