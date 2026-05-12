// 应用类型定义

// 生日输入
export type BirthdayState = Date | null;

// AI生成结果
export interface AIResult {
  keywords: string[];
  scenes: string[];
  themeColors: string[];
  emotion: string;
  cosmicElements: string[];
}

// 应用模式
export type AppMode = 'input' | 'space' | 'scene';

// 场景类型
export type SceneType = 'forest' | 'beach';

// 场景配置
export interface SceneConfig {
  id: SceneType;
  name: string;
  description: string;
  thumbnail: string;
  colors: {
    sky: string;
    ground: string;
    ambient: string;
  };
}

// 星体数据类型
export interface CelestialBodyData {
  id: string;
  name: string;
  englishName: string;
  type: 'star' | 'planet';
  position: [number, number, number];
  size: number;
  color: string;
  distance: number; // 光年
  description: string;
}

export interface StarData extends CelestialBodyData {
  type: 'star';
}

export interface PlanetData extends CelestialBodyData {
  type: 'planet';
}

export interface InteractionProps {
  onClick?: (data: CelestialBodyData) => void;
  onHover?: (data: CelestialBodyData | null) => void;
}