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