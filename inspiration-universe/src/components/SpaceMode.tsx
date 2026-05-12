import { useRef } from 'react';
  import { Canvas, useFrame } from '@react-three/fiber';
  import { OrbitControls, Points, PointMaterial } from '@react-three/drei';
  import * as THREE from 'three';

  interface SpaceModeProps {
    themeColor?: string;
  }

  function Particles({ themeColor }: { themeColor: string }) {
    const ref = useRef<THREE.Points>(null);
    const particlesCount = 2000;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 5 + Math.random() * 10;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      const color = new THREE.Color(themeColor);
      const variation = Math.random() * 0.3 - 0.15;
      colors[i * 3] = Math.max(0, Math.min(1, color.r + variation));
      colors[i * 3 + 1] = Math.max(0, Math.min(1, color.g + variation));
      colors[i * 3 + 2] = Math.max(0, Math.min(1, color.b + variation));
    }

    useFrame((state) => {
      if (ref.current) {
        ref.current.rotation.x = state.clock.getElapsedTime() * 0.05;
        ref.current.rotation.y = state.clock.getElapsedTime() * 0.03;
      }
    });

    return (
      <Points ref={ref} positions={positions} colors={colors} stride={3}>
        <PointMaterial transparent vertexColors size={0.05} sizeAttenuation={true} depthWrite={false} />
      </Points>
    );
  }

  export default function SpaceMode({ themeColor = '#8B5CF6' }: SpaceModeProps) {
    return (
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }} style={{ width: '100%', height: '100%' }}>
        <color attach="background" args={['#000000']} />
        <OrbitControls enableDamping dampingFactor={0.05} minDistance={5} maxDistance={30} />
        <Particles themeColor={themeColor} />
        <ambientLight intensity={0.5} />
      </Canvas>
    );
  }