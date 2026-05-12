'use client';

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SpaceUniverse from './SpaceUniverse';
import InfoPanel from './InfoPanel';
import { StarData } from '@/types';

export default function SpaceMode() {
  const [selectedStar, setSelectedStar] = useState<StarData | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  const handleStarSelect = (star: StarData | null) => {
    setSelectedStar(star);
    setShowPanel(true);
  };

  const handleClosePanel = () => {
    setShowPanel(false);
    setSelectedStar(null);
  };

  return (
    <div className="relative w-full h-screen bg-black">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 80], fov: 60 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 100, 500]} />

        <SpaceUniverse onStarSelect={handleStarSelect} />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={20}
          maxDistance={200}
          enablePan={true}
          panSpeed={0.5}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
        />
      </Canvas>

      {/* 信息面板 */}
      <InfoPanel
        visible={showPanel}
        data={selectedStar}
        onClose={handleClosePanel}
      />

      {/* 提示文字 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-sm pointer-events-none">
        <p>拖拽旋转视角 | 滚轮缩放 | 点击星体查看详情</p>
      </div>

      {/* 标题 */}
      <div className="absolute top-8 left-8">
        <h1 className="text-2xl font-bold text-white/80 mb-1">灵感宇宙</h1>
        <p className="text-sm text-white/40">探索星际的无限可能</p>
      </div>
    </div>
  );
}