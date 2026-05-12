'use client';

import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = '正在加载中...' }: LoadingScreenProps) {
  const [dots, setDots] = useState('');

  // 动态点点点动画
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 z-50">
      {/* 加载动画 */}
      <div className="relative w-20 h-20 mb-8">
        {/* 外圈旋转 */}
        <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full" />
        <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" />

        {/* 内圈脉冲 */}
        <div className="absolute inset-3 bg-purple-600/20 rounded-full animate-pulse" />

        {/* 中心点 */}
        <div className="absolute inset-[38%] bg-purple-500 rounded-full animate-ping" />
      </div>

      {/* 加载文字 */}
      <div className="text-white text-lg font-medium">
        <span>{message}</span>
        <span className="inline-block w-8 text-left">{dots}</span>
      </div>

      {/* 加载进度条 */}
      <div className="mt-6 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-loading-bar" />
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 70%;
            margin-left: 15%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}