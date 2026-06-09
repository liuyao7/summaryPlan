# 投篮分析助手 · Web 原型 v0

> Spike 目的：在 1 周内验证「浏览器端能否在合理时间内完成 30s 投篮视频的逐帧 BlazePose 姿态检测 + 1 条规则诊断」。验证通过再决定后续平台路线。

## 这是什么
- 纯前端单页应用，无后端
- MediaPipe Tasks Vision (Web) 调用 BlazePose Full 模型
- 浏览器本地推理，视频不上传
- 实现 1 条规则：肘部外翻 (Chicken Wing) 检测

## 怎么跑

```bash
cd prototype
python3 -m http.server 8080
```

浏览器打开 http://localhost:8080，选择一段投篮视频（建议侧面拍摄、5-10s、单次投篮）。

> 注意：MediaPipe 通过 ESM CDN 引入 (jsdelivr)，第一次会下载模型(~10MB)，需要可访问 jsdelivr 和 google storage。

## 文件结构

```
prototype/
├── index.html   # 页面骨架
├── style.css    # 样式
├── main.js      # 主逻辑：模型加载 → 逐帧检测 → 规则 → 可视化
└── README.md
```

## 关键技术点

| 项 | 当前实现 | 备注 |
|----|---------|------|
| 姿态模型 | BlazePose Full (33 点) | Heavy 版精度更高但慢 |
| 推理后端 | GPU (WebGL) | 自动 fallback 到 CPU |
| 抽帧 | 设定 fps=30 + seek | 后续可改 `requestVideoFrameCallback` 提速 |
| 规则 | 上臂外展峰值 > 阈值 | 见下方 |

## 规则 1：肘部外翻

- 关键点：12 右肩, 14 右肘, 24 右髋
- 计算：上臂外展角 ≈ 180° − ∠(肘-肩-髋)
- 阈值：
  - 正常 ≤ 15°
  - 轻度 15–25°
  - 中度 25–35°
  - 严重 > 35°
- 来源：Okazaki & Rodacki / ShotMechanics

> 当前为右手投篮硬编码。后续需加入投篮手识别 + 镜像处理。

## 验证目标 (Spike 成功标准)

- [ ] 模型在桌面 Chrome 加载 < 5s
- [ ] 10 秒视频分析耗时 < 30s
- [ ] 33 点关键点在投篮峰值帧 (出手前后) 不出现明显抖动/丢失
- [ ] 肘外翻规则在标准视频和故意外翻视频上能区分
- [ ] 移动端 Safari / Chrome 也能跑通 (性能可下降)

任何一项不通过都要回头评估方案（换模型 / 服务端推理 / 双视角 / 改平台）。

## 已知不足 / 下一步

1. seek + onseeked 的抽帧方式在某些浏览器精度差，应替换为 `requestVideoFrameCallback`
2. 没做投篮区间切分（动作 segmentation），峰值检测覆盖整段视频
3. 单视角 2D 易受相机角度影响，验证后考虑加入 z 维度（BlazePose 提供 worldLandmarks）
4. 没有时间轴对齐 / 球星影子叠加（v0.2 实现）
5. 没做球检测，无法判定"球出手帧"
