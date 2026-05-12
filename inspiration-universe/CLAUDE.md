@AGENTS.md

# 灵感宇宙 - 项目开发指南

## 项目概述

灵感宇宙是一个沉浸式3D星际探索体验网站，使用 Next.js 14 + Three.js + React Three Fiber 构建。

## 技术栈

- **框架**: Next.js 16.2.6
- **3D引擎**: Three.js 0.184 + React Three Fiber 9.6 + Drei 10.7
- **后期处理**: @react-three/postprocessing 3.0.4
- **样式**: Tailwind CSS 4 + tw-animate-css
- **图标**: Lucide React

## 项目结构

```
src/
├── app/
│   ├── page.tsx          # 主页面入口
│   ├── layout.tsx        # 布局组件
│   └── globals.css       # 全局样式
├── components/
│   ├── SpaceMode.tsx     # 主模式容器 (整合所有3D组件)
│   ├── SpaceUniverse.tsx # 3D场景主组件
│   ├── StarField.tsx     # 星空背景组件
│   ├── Nebula.tsx        # 粒子星云效果
│   ├── CelestialBody.tsx # 可交互星体组件
│   └── InfoPanel.tsx     # 信息展示面板
├── lib/
│   └── data.ts           # 星体数据配置
├── types/
│   └── index.ts          # TypeScript 类型定义
└── store/                # Zustand 状态管理 (可选)
```

## 已实现功能

### 核心功能
- ✅ 真实星空背景 (10000颗星，多层分布)
- ✅ 粒子星云效果 (3个星云层，多彩渐变)
- ✅ 可交互星体 (10颗真实恒星，高亮+脉冲动画)
- ✅ 信息面板 (滑入式展示星体详情)
- ✅ 视角控制 (OrbitControls 旋转/缩放/平移)

### 视觉效果
- ✅ Bloom 光晕效果
- ✅ 色差效果 (Chromatic Aberration)
- ✅ 景深雾气 (Fog)
- ✅ 星体自转动画
- ✅ 星体脉冲效果
- ✅ 星云缓慢旋转

### 交互设计
- ✅ 鼠标悬停高亮 + 显示星体名称
- ✅ 点击星体弹出信息面板
- ✅ 拖拽旋转视角
- ✅ 滚轮缩放
- ✅ 提示文字说明

## 运行项目

```bash
pnpm install
pnpm dev
```

## 后续可扩展功能

- [ ] 截图保存功能 (按 S 键)
- [ ] 双击快速传送到星体
- [ ] WASD 键盘飞行控制
- [ ] 更多星体数据 (行星、星云)
- [ ] 音效背景
- [ ] 流星动画