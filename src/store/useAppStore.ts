// État global de l'application avec Zustand

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '@/types/progress';
import type { InstantiatedQuestion, ModuleId } from '@/types/question';
import type { UserAnswer, ValidationResult } from '@/types/validation';

interface QuizState {
  questions: InstantiatedQuestion[];
  currentIndex: number;
  answers: Map<string, UserAnswer>;
  results: Map<string, ValidationResult>;
  startTime: number;
  isComplete: boolean;
}

interface AppState {
  // Utilisateur
  user: User | null;
  setUser: (user: User | null) => void;

  // Session courante
  currentSession: Session | null;
  setCurrentSession: (session: Session | null) => void;

  // Quiz en cours
  quiz: QuizState | null;
  startQuiz: (questions: InstantiatedQuestion[]) => void;
  setQuizAnswer: (questionId: string, answer: UserAnswer, result: ValidationResult) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (index: number) => void;
  completeQuiz: () => void;
  resetQuiz: () => void;

  // Problème interactif en cours
  currentProblem: InstantiatedQuestion | null;
  currentView: 'schema' | 'equations' | 'calculation' | 'guided';
  setProblem: (problem: InstantiatedQuestion | null) => void;
  setView: (view: 'schema' | 'equations' | 'calculation' | 'guided') => void;

  // Préférences
  preferences: {
    showHints: boolean;
    soundEnabled: boolean;
    darkMode: boolean;
  };
  setPreference: <K extends keyof AppState['preferences']>(
    key: K,
    value: AppState['preferences'][K]
  ) => void;

  // Navigation
  selectedModule: ModuleId | null;
  setSelectedModule: (moduleId: ModuleId | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Utilisateur
      user: null,
      setUser: (user) => set({ user }),

      // Session
      currentSession: null,
      setCurrentSession: (session) => set({ currentSession: session }),

      // Quiz
      quiz: null,

      startQuiz: (questions) =>
        set({
          quiz: {
            questions,
            currentIndex: 0,
            answers: new Map(),
            results: new Map(),
            startTime: Date.now(),
            isComplete: false,
          },
        }),

      setQuizAnswer: (questionId, answer, result) =>
        set((state) => {
          if (!state.quiz) return state;

          const newAnswers = new Map(state.quiz.answers);
          const newResults = new Map(state.quiz.results);
          newAnswers.set(questionId, answer);
          newResults.set(questionId, result);

          return {
            quiz: {
              ...state.quiz,
              answers: newAnswers,
              results: newResults,
            },
          };
        }),

      nextQuestion: () =>
        set((state) => {
          if (!state.quiz) return state;
          const nextIndex = Math.min(
            state.quiz.currentIndex + 1,
            state.quiz.questions.length - 1
          );
          return {
            quiz: {
              ...state.quiz,
              currentIndex: nextIndex,
            },
          };
        }),

      previousQuestion: () =>
        set((state) => {
          if (!state.quiz) return state;
          const prevIndex = Math.max(state.quiz.currentIndex - 1, 0);
          return {
            quiz: {
              ...state.quiz,
              currentIndex: prevIndex,
            },
          };
        }),

      goToQuestion: (index) =>
        set((state) => {
          if (!state.quiz) return state;
          const validIndex = Math.max(
            0,
            Math.min(index, state.quiz.questions.length - 1)
          );
          return {
            quiz: {
              ...state.quiz,
              currentIndex: validIndex,
            },
          };
        }),

      completeQuiz: () =>
        set((state) => {
          if (!state.quiz) return state;
          return {
            quiz: {
              ...state.quiz,
              isComplete: true,
            },
          };
        }),

      resetQuiz: () => set({ quiz: null }),

      // Problème interactif
      currentProblem: null,
      currentView: 'schema',
      setProblem: (problem) => set({ currentProblem: problem }),
      setView: (view) => set({ currentView: view }),

      // Préférences
      preferences: {
        showHints: true,
        soundEnabled: false,
        darkMode: false,
      },
      setPreference: (key, value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        })),

      // Navigation
      selectedModule: null,
      setSelectedModule: (moduleId) => set({ selectedModule: moduleId }),
    }),
    {
      name: 'staticamaster-storage',
      partialize: (state) => ({
        user: state.user,
        preferences: state.preferences,
      }),
    }
  )
);

// Sélecteurs utiles
export const useUser = () => useAppStore((state) => state.user);
export const useQuiz = () => useAppStore((state) => state.quiz);
export const useCurrentQuestion = () =>
  useAppStore((state) =>
    state.quiz ? state.quiz.questions[state.quiz.currentIndex] : null
  );
export const useQuizProgress = () =>
  useAppStore((state) => {
    if (!state.quiz) return { current: 0, total: 0, answered: 0 };
    return {
      current: state.quiz.currentIndex + 1,
      total: state.quiz.questions.length,
      answered: state.quiz.answers.size,
    };
  });
