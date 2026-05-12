'use client';

import { useAppStore } from '@/lib/store';

export default function AIResultDisplay() {
  const aiResult = useAppStore((state) => state.aiResult);

  if (!aiResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">暂无AI生成结果</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 关键词展示 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-white">关键词</h3>
        <div className="flex flex-wrap gap-2">
          {aiResult.keywords.map((keyword, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-purple-600/30 border border-purple-500/50 rounded-full text-sm text-purple-200"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>

      {/* 主题色展示 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-white">主题色</h3>
        <div className="flex flex-wrap gap-3">
          {aiResult.themeColors.map((color, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-full border-2 border-white/20 shadow-lg"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-300 font-mono">{color}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 情感基调 */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-white">情感基调</h3>
        <div className="bg-gradient-to-r from-indigo-600/30 to-purple-600/30 px-4 py-3 rounded-lg border border-indigo-500/30">
          <p className="text-indigo-200">{aiResult.emotion}</p>
        </div>
      </div>

      {/* 场景推荐 */}
      {aiResult.scenes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-white">推荐场景</h3>
          <div className="flex flex-wrap gap-2">
            {aiResult.scenes.map((scene, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-emerald-600/30 border border-emerald-500/50 rounded-lg text-sm text-emerald-200"
              >
                {scene}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 宇宙元素 */}
      {aiResult.cosmicElements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-white">宇宙元素</h3>
          <div className="flex flex-wrap gap-2">
            {aiResult.cosmicElements.map((element, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-cyan-600/30 border border-cyan-500/50 rounded-full text-sm text-cyan-200"
              >
                {element}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}