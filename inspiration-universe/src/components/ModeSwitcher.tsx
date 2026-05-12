'use client';

import { useAppStore } from '@/lib/store';

export default function ModeSwitcher() {
  const currentMode = useAppStore((state) => state.currentMode);
  const setMode = useAppStore((state) => state.setMode);

  return (
    <div className="flex gap-2 p-2 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10">
      <button
        onClick={() => setMode('space')}
        className={`
          px-6 py-2.5 rounded-lg font-medium transition-all duration-300
          ${currentMode === 'space'
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
            : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
          }
        `}
      >
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          空间模式
        </span>
      </button>

      <button
        onClick={() => setMode('scene')}
        className={`
          px-6 py-2.5 rounded-lg font-medium transition-all duration-300
          ${currentMode === 'scene'
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
            : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
          }
        `}
      >
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          场景模式
        </span>
      </button>
    </div>
  );
}