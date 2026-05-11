import { create } from 'zustand';
import type { BirthdayState, AIResult, AppMode, SceneType } from '@/types';

interface AppState {
  // 用户输入
  birthday: BirthdayState;

  // AI生成结果
  aiResult: AIResult | null;

  // 当前模式
  currentMode: AppMode;
  selectedScene: SceneType;

  // UI状态
  loading: boolean;
  error: string | null;

  // Actions
  setBirthday: (date: BirthdayState) => void;
  setAiResult: (result: AIResult) => void;
  setMode: (mode: AppMode) => void;
  setSelectedScene: (scene: SceneType) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // 初始状态
  birthday: null,
  aiResult: null,
  currentMode: 'input',
  selectedScene: 'forest',
  loading: false,
  error: null,

  // Actions
  setBirthday: (date) => set({ birthday: date }),

  setAiResult: (result) => set({ aiResult: result }),

  setMode: (mode) => set({ currentMode: mode }),

  setSelectedScene: (scene) => set({ selectedScene: scene }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  reset: () => set({
    birthday: null,
    aiResult: null,
    currentMode: 'input',
    selectedScene: 'forest',
    loading: false,
    error: null,
  }),
}));