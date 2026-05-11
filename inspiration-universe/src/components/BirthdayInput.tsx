'use client';

import { useState } from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { generateAIResult } from '@/lib/ai';

export function BirthdayInput() {
  const [date, setDate] = useState<string>('');
  const { setBirthday, setAiResult, setMode, setLoading, setError } = useAppStore();

  const handleSubmit = async () => {
    if (!date) return;

    const birthdayDate = new Date(date);
    setBirthday(birthdayDate);
    setLoading(true);
    setError(null);

    try {
      const result = await generateAIResult(birthdayDate);
      setAiResult(result);
      setMode('space');
    } catch (error) {
      setError('生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl">
        <div className="flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-purple-400 mr-2" />
          <h1 className="text-2xl font-bold text-white">灵感宇宙</h1>
        </div>

        <p className="text-center text-slate-300 mb-8">
          输入你的生日，探索专属于你的灵感宇宙
        </p>

        <div className="space-y-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!date}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all"
          >
            生成我的灵感宇宙
          </Button>
        </div>
      </div>
    </div>
  );
}