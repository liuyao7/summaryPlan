'use client';

  import { useState } from 'react';
  import { useAppStore } from '@/lib/store';
  import { generateAIResult } from '@/lib/ai';

  export default function BirthdayInput() {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const { setBirthday, setAiResult, setMode, setLoading, setError } = useAppStore();

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedDate) {
        setError('请选择一个日期');
        return;
      }

      setLoading(true);
      setError(null);
      setBirthday(selectedDate);

      try {
        const result = await generateAIResult(selectedDate);
        setAiResult(result);
        setMode('space');
      } catch (err) {
        setError('AI生成失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-3">灵感宇宙</h1>
            <p className="text-purple-200 text-lg">输入你的生日，探索专属的宇宙灵感</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="birthday" className="block text-sm font-medium text-purple-200 mb-2">
                选择你的生日
              </label>
              <input
                id="birthday"
                type="date"
                value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!selectedDate}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50"
            >
              开始探索
            </button>
          </form>
        </div>
      </div>
    );
  }