'use client';

import { Canvas } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';

// 树组件
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 树干 - 圆柱 */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 1, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* 树冠 - 圆锥 */}
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[0.8, 1.5, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
    </group>
  );
}

// 地面组件
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#3d8c40" side={THREE.DoubleSide} />
    </mesh>
  );
}

// 森林场景内容
function ForestScene() {
  const trees = [
    { position: [-5, 0, -5] as [number, number, number] },
    { position: [3, 0, -8] as [number, number, number] },
    { position: [-2, 0, -12] as [number, number, number] },
    { position: [7, 0, -6] as [number, number, number] },
    { position: [-8, 0, -10] as [number, number, number] },
    { position: [0, 0, -15] as [number, number, number] },
    { position: [5, 0, -12] as [number, number, number] },
  ];

  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.5} />
      {/* 太阳光 */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
      />

      {/* 地面 */}
      <Ground />

      {/* 树木 */}
      {trees.map((tree, index) => (
        <Tree key={index} position={tree.position} />
      ))}

      {/* 天空 */}
      <Sky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0.6}
        azimuth={0.25}
      />

      {/* 第一视角控制 */}
      <PointerLockControls />
    </>
  );
}

export default function SceneMode() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 1.6, 5], fov: 75 }}
        shadows
      >
        <Suspense fallback={null}>
          <ForestScene />
        </Suspense>
      </Canvas>

      {/* 提示文字 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-center pointer-events-none">
        <p className="text-sm opacity-70">点击屏幕进入第一视角模式，使用 WASD 或方向键移动</p>
        <p className="text-xs opacity-50 mt-1">按 ESC 退出第一视角模式</p>
      </div>
    </div>
  );
}