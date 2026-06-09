// 投篮分析助手 - Web 原型 v0
// 目标：验证浏览器端能否完成 视频上传 → 逐帧 BlazePose 检测 → 简单规则 → 可视化
// 模型：MediaPipe Tasks Vision PoseLandmarker (Web)

import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const $ = (id) => document.getElementById(id);
const videoEl = $("video");
const canvasEl = $("overlay");
const ctx = canvasEl.getContext("2d");
const statusEl = $("status");

let poseLandmarker = null;
let frameLandmarks = []; // 每帧 33 关键点序列

const setStatus = (msg) => {
  statusEl.textContent = msg;
  console.log("[status]", msg);
};

// ---------- 1. 模型初始化 ----------
async function initPose() {
  setStatus("加载 BlazePose 模型...");
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
  setStatus("模型已就绪，请选择视频");
}

// ---------- 2. 视频加载 ----------
$("videoInput").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  videoEl.src = URL.createObjectURL(file);
  videoEl.onloadedmetadata = () => {
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    $("canvasWrap").hidden = false;
    $("controls").hidden = false;
    setStatus(`视频已加载: ${videoEl.videoWidth}x${videoEl.videoHeight} · ${videoEl.duration.toFixed(1)}s`);
  };
});

// ---------- 3. 逐帧分析 ----------
$("analyzeBtn").addEventListener("click", async () => {
  if (!poseLandmarker) {
    setStatus("模型未就绪");
    return;
  }
  frameLandmarks = [];
  videoEl.pause();
  videoEl.currentTime = 0;
  const fps = 30;
  const total = Math.floor(videoEl.duration * fps);
  setStatus(`分析中 0/${total}`);

  const t0 = performance.now();

  // 使用 requestVideoFrameCallback (Chrome) / 退化为 timeupdate
  await new Promise((resolve) => {
    let i = 0;
    const step = async () => {
      if (i >= total) return resolve();
      videoEl.currentTime = i / fps;
      await new Promise((r) => (videoEl.onseeked = r));
      const result = poseLandmarker.detectForVideo(videoEl, performance.now());
      if (result.landmarks?.[0]) {
        frameLandmarks.push({ t: i / fps, points: result.landmarks[0] });
      }
      // 绘制最后一帧用于预览
      drawPose(result.landmarks?.[0]);
      i++;
      if (i % 5 === 0) setStatus(`分析中 ${i}/${total}`);
      requestAnimationFrame(step);
    };
    step();
  });

  const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
  setStatus(`分析完成 · ${frameLandmarks.length} 帧 · 耗时 ${elapsed}s`);
  $("replayBtn").disabled = false;
  runRules();
});

// ---------- 4. 绘制骨骼 ----------
function drawPose(landmarks) {
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  if (!landmarks) return;
  const utils = new DrawingUtils(ctx);
  utils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
    color: "#22d3ee",
    lineWidth: 3,
  });
  utils.drawLandmarks(landmarks, { color: "#f472b6", radius: 3 });
}

// ---------- 5. 规则引擎 (MVP 仅 1 条: 肘部外翻) ----------
// BlazePose 关键点编号: 12=右肩, 14=右肘, 24=右髋
function angle(a, b, c) {
  // 返回 ∠ABC, 单位度
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  return (Math.acos(dot / (m1 * m2)) * 180) / Math.PI;
}

function detectChickenWing(framePoints) {
  // 上臂外展角 = ∠(肩-肘, 肩-髋)
  const shoulder = framePoints[12];
  const elbow = framePoints[14];
  const hip = framePoints[24];
  if (!shoulder || !elbow || !hip) return null;
  const abduction = 180 - angle(elbow, shoulder, hip);
  return abduction;
}

function runRules() {
  const metrics = $("metrics");
  const issues = $("issues");
  metrics.innerHTML = "";
  issues.innerHTML = "";
  $("report").hidden = false;

  if (frameLandmarks.length === 0) {
    issues.innerHTML = "<p>未检测到姿态</p>";
    return;
  }

  // 取上臂外展角峰值（粗略代表 set→release 区间）
  let maxAbd = 0;
  for (const f of frameLandmarks) {
    const abd = detectChickenWing(f.points);
    if (abd != null && abd > maxAbd) maxAbd = abd;
  }

  metrics.innerHTML = `
    <div class="metric-row"><span>检测帧数</span><span>${frameLandmarks.length}</span></div>
    <div class="metric-row"><span>上臂外展峰值</span><span>${maxAbd.toFixed(1)}°</span></div>
  `;

  let level = "minor", text = "";
  if (maxAbd > 35) {
    level = "major";
    text = `严重外翻 (${maxAbd.toFixed(1)}° > 35°)：肘部明显偏离身体中线，可能导致出手方向不稳。`;
  } else if (maxAbd > 25) {
    level = "moderate";
    text = `中度外翻 (${maxAbd.toFixed(1)}°)：建议保持肘下沉、对齐目标。`;
  } else if (maxAbd > 15) {
    level = "minor";
    text = `轻度外翻 (${maxAbd.toFixed(1)}°)：基本健康区间，可继续观察。`;
  } else {
    level = "minor";
    text = `肘位正常 (${maxAbd.toFixed(1)}°)`;
  }

  issues.innerHTML = `<div class="issue ${level}">${text}</div>`;
}

// ---------- 6. 启动 ----------
initPose().catch((err) => {
  console.error(err);
  setStatus("模型加载失败: " + err.message);
});
