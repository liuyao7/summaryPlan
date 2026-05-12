'use client';

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import SpaceUniverse from './SpaceUniverse';
import InfoPanel from './InfoPanel';
import LoadingScreen from './LoadingScreen';
import { StarData } from '@/types';

export default function SpaceMode() {
  const [selectedStar, setSelectedStar] = useState<StarData | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleStarSelect = (star: StarData | null) => {
    setSelectedStar(star);
    setShowPanel(true);
  };

  const handleClosePanel = () => {
    setShowPanel(false);
    setSelectedStar(null);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 加载屏幕 */}
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}

      {/* 3D Canvas */}
      <Canvas
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false
        }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 80]} fov={60} />

        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 80, 600]} />

        <SpaceUniverse onStarSelect={handleStarSelect} />

        <OrbitControls
          enableDamping
          dampingFactor={0.03}
          minDistance={15}
          maxDistance={250}
          enablePan={true}
          panSpeed={0.8}
          rotateSpeed={0.6}
          zoomSpeed={1}
        />
      </Canvas>

      {/* 渐变遮罩 - 顶部 */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)'
        }}
      />

      {/* 渐变遮罩 - 底部 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)'
        }}
      />

      {/* 信息面板 */}
      <InfoPanel
        visible={showPanel}
        data={selectedStar}
        onClose={handleClosePanel}
      />

      {/* 左侧装饰线 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-px"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(139, 92, 246, 0.5), transparent)'
        }}
      />

      {/* 标题区域 */}
      <div className="absolute top-8 left-8">
        <h1 className="text-3xl font-bold text-white/90 mb-2 tracking-wider">
          灵感宇宙
        </h1>
        <p className="text-sm text-white/50 tracking-widest">
          INSPIRATION UNIVERSE
        </p>
        {/* 装饰线 */}
        <div
          className="h-px w-16 mt-3"
          style={{
            background: 'linear-gradient(to right, rgba(139, 92, 246, 0.8), transparent)'
          }}
        />
      </div>

      {/* 右下角控制提示 */}
      <div className="absolute bottom-8 right-8 text-right space-y-2">
        <div className="text-white/30 text-xs tracking-widest mb-3">CONTROLS</div>
        <div className="flex items-center gap-3 justify-end">
          <span className="text-white/40 text-sm">拖拽旋转</span>
          <div className="w-8 h-px bg-white/20" />
        </div>
        <div className="flex items-center gap-3 justify-end">
          <span className="text-white/40 text-sm">滚轮缩放</span>
          <div className="w-8 h-px bg-white/20" />
        </div>
        <div className="flex items-center gap-3 justify-end">
          <span className="text-white/40 text-sm">点击星体</span>
          <div className="w-8 h-px bg-white/20" />
        </div>
      </div>

      {/* 星体计数器 */}
      <div className="absolute top-8 right-8 text-right">
        <div className="text-2xl font-bold text-white/60">10</div>
        <div className="text-xs text-white/30 tracking-widest">STARS</div>
      </div>
    </div>
  );
}