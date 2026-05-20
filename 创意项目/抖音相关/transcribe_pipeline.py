#!/usr/bin/env python3
"""
抖音 / TikTok / Bilibili 视频 → 音频 → 文字稿 一键流水线

用法:
    python transcribe_pipeline.py "https://v.douyin.com/xxxx/"
    python transcribe_pipeline.py "https://www.tiktok.com/@user/video/123456"
    python transcribe_pipeline.py "https://www.bilibili.com/video/BV1xxxxxxxxx"

依赖:
    - 本项目依赖 (pip install -r requirements.txt)
    - ffmpeg (需系统安装)
    - whisper-cpp (需已编译好 whisper-cli)

前置准备:
    1. 修改 crawlers/douyin/web/config.yaml 和 crawlers/tiktok/web/config.yaml 中的 Cookie
    2. 确保 whisper-cli 在 PATH 中，或通过 --whisper-bin 指定路径
    3. 下载好 whisper 模型，默认路径 ~/.whisper-models/ggml-large-v3-turbo.bin
"""

import argparse
import asyncio
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import aiofiles
import httpx

from crawlers.hybrid.hybrid_crawler import HybridCrawler
from crawlers.utils.utils import extract_valid_urls

# ============================================================
# 默认配置（可通过命令行参数覆盖）
# ============================================================
DEFAULT_DOWNLOAD_DIR = "./download"
DEFAULT_AUDIO_DIR = "./audio"
DEFAULT_OUTPUT_DIR = "./transcripts"
DEFAULT_WHISPER_MODEL = os.path.expanduser("~/.whisper-models/ggml-large-v3-turbo.bin")
DEFAULT_WHISPER_BIN = "whisper-cli"
DEFAULT_LANGUAGE = "zh"
DEFAULT_SAMPLE_RATE = 16000


def check_prerequisites(whisper_bin: str) -> None:
    """检查 ffmpeg 和 whisper-cli 是否可用"""
    # 检查 ffmpeg
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("[错误] ffmpeg 未安装或不在 PATH 中，请先安装 ffmpeg")
        sys.exit(1)

    # 检查 whisper-cli
    try:
        subprocess.run([whisper_bin, "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(f"[错误] {whisper_bin} 未安装或不在 PATH 中")
        print("请编译 whisper.cpp 并将 whisper-cli 加入 PATH，或使用 --whisper-bin 指定路径")
        sys.exit(1)


def run_ffmpeg_extract_audio(video_path: str, audio_path: str, sample_rate: int = DEFAULT_SAMPLE_RATE) -> bool:
    """用 ffmpeg 从视频提取 16kHz 单声道 wav 音频"""
    cmd = [
        "ffmpeg",
        "-i", str(video_path),
        "-vn",                     # 不要视频流
        "-ar", str(sample_rate),   # 采样率 16kHz
        "-ac", "1",                # 单声道
        "-sample_fmt", "s16",     # 16-bit PCM
        "-y",                      # 覆盖已存在文件
        str(audio_path),
    ]
    print(f"  [ffmpeg] 提取音频: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"  [ffmpeg] 失败: {result.stderr}")
        return False

    file_size = os.path.getsize(audio_path) / (1024 * 1024)
    print(f"  [ffmpeg] 完成 → {audio_path} ({file_size:.1f} MB)")
    return True


def run_whisper_transcribe(
    audio_path: str,
    output_path: str,
    model_path: str,
    language: str,
    whisper_bin: str,
) -> bool:
    """用 whisper-cpp 识别音频并保存文字稿"""
    # whisper-cli 的 -of 参数会自动加后缀 .txt
    output_base = str(output_path).replace(".txt", "")

    cmd = [
        whisper_bin,
        "-m", model_path,
        "-f", str(audio_path),
        "-l", language,
        "-otxt",
        "-of", output_base,
    ]
    print(f"  [whisper] 开始识别: {' '.join(cmd)}")

    result = subprocess.run(cmd, capture_output=True, text=True)

    # 打印 whisper 的关键日志
    if result.stderr:
        for line in result.stderr.splitlines():
            if "error" in line.lower() or "fail" in line.lower():
                print(f"  [whisper] {line}")

    if result.returncode != 0:
        print(f"  [whisper] 识别失败 (exit code {result.returncode})")
        return False

    # whisper 自动加 .txt 后缀
    final_output = f"{output_base}.txt"
    if os.path.exists(final_output):
        print(f"  [whisper] 完成 → {final_output}")
        return True
    else:
        print(f"  [whisper] 未生成输出文件 {final_output}")
        return False


async def download_video(url: str, download_dir: str) -> dict | None:
    """解析视频链接并下载到本地

    返回 dict: {video_path, platform, video_id, type} 或 None
    """
    crawler = HybridCrawler()

    # 第1步：从文本中提取纯URL（支持分享口令等包含额外文字的情况）
    clean_url = extract_valid_urls(url)
    if not clean_url:
        print(f"  [错误] 未能从输入中提取出有效链接")
        return None
    if clean_url != url:
        print(f"  从分享口令中提取链接: {clean_url}")

    print(f"[1/3] 解析视频链接: {clean_url}")
    try:
        data = await crawler.hybrid_parsing_single_video(clean_url, minimal=True)
    except Exception as e:
        print(f"  [错误] 解析失败: {e}")
        return None

    platform = data["platform"]
    video_id = data["video_id"]
    data_type = data["type"]

    print(f"  平台: {platform}, 类型: {data_type}, ID: {video_id}")

    if data_type != "video":
        print(f"  [跳过] 当前仅支持视频，不支持图集（类型={data_type}）")
        return None

    # 第2步：准备下载目录和文件路径
    video_dir = os.path.join(download_dir, f"{platform}_video")
    os.makedirs(video_dir, exist_ok=True)
    video_path = os.path.join(video_dir, f"{platform}_{video_id}.mp4")

    # 已存在则跳过下载
    if os.path.exists(video_path):
        file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
        print(f"  [跳过下载] 文件已存在: {video_path} ({file_size_mb:.1f} MB)")
        return {
            "video_path": video_path,
            "platform": platform,
            "video_id": video_id,
            "type": data_type,
        }

    # 第3步：获取平台专属 headers
    print(f"  [下载] 开始下载视频...")
    if platform == "tiktok":
        headers_dict = await crawler.TikTokWebCrawler.get_tiktok_headers()
    elif platform == "bilibili":
        headers_dict = await crawler.BilibiliWebCrawler.get_bilibili_headers()
    else:
        headers_dict = await crawler.DouyinWebCrawler.get_douyin_headers()

    headers = headers_dict.get("headers", {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    })

    video_data = data.get("video_data", {})

    # Bilibili 音视频分离，需要先合并
    if platform == "bilibili":
        video_url = video_data.get("nwm_video_url_HQ")
        audio_url = video_data.get("audio_url")

        if not video_url or not audio_url:
            print("  [错误] 无法获取 Bilibili 视频/音频 URL")
            return None

        # 下载到临时文件再合并
        with tempfile.NamedTemporaryFile(suffix=".m4v", delete=False) as vf:
            video_tmp = vf.name
        with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as af:
            audio_tmp = af.name

        async with httpx.AsyncClient() as client:
            # 下载视频流
            async with client.stream("GET", video_url, headers=headers) as resp:
                resp.raise_for_status()
                async with aiofiles.open(video_tmp, "wb") as f:
                    async for chunk in resp.aiter_bytes():
                        await f.write(chunk)
            # 下载音频流
            async with client.stream("GET", audio_url, headers=headers) as resp:
                resp.raise_for_status()
                async with aiofiles.open(audio_tmp, "wb") as f:
                    async for chunk in resp.aiter_bytes():
                        await f.write(chunk)

        # ffmpeg 合并
        merge_cmd = [
            "ffmpeg", "-y",
            "-i", video_tmp,
            "-i", audio_tmp,
            "-c:v", "copy", "-c:a", "copy",
            video_path,
        ]
        result = subprocess.run(merge_cmd, capture_output=True, text=True)
        os.unlink(video_tmp)
        os.unlink(audio_tmp)

        if result.returncode != 0:
            print(f"  [错误] Bilibili 音视频合并失败: {result.stderr}")
            return None
    else:
        # 抖音/TikTok：直接下载视频流
        video_url = video_data.get("nwm_video_url_HQ")
        if not video_url:
            print("  [错误] 无法获取视频下载地址")
            return None

        async with httpx.AsyncClient() as client:
            async with client.stream("GET", video_url, headers=headers) as resp:
                resp.raise_for_status()
                async with aiofiles.open(video_path, "wb") as f:
                    async for chunk in resp.aiter_bytes():
                        await f.write(chunk)

    # 验证下载结果
    if os.path.exists(video_path) and os.path.getsize(video_path) > 0:
        file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
        print(f"  [下载] 完成 → {video_path} ({file_size_mb:.1f} MB)")
        return {
            "video_path": video_path,
            "platform": platform,
            "video_id": video_id,
            "type": data_type,
        }
    else:
        print("  [错误] 下载失败，文件为空或不存在")
        return None


async def process_video(
    url: str,
    download_dir: str,
    audio_dir: str,
    output_dir: str,
    model_path: str,
    language: str,
    whisper_bin: str,
    sample_rate: int,
    keep_audio: bool = False,
) -> bool:
    """处理单个视频的完整流水线"""

    # ===== 第1步：下载视频 =====
    video_info = await download_video(url, download_dir)
    if video_info is None:
        return False
    video_path = video_info["video_path"]
    platform = video_info["platform"]
    video_id = video_info["video_id"]

    # ===== 第2步：ffmpeg 提取音频 =====
    print(f"\n[2/3] 提取音频: {video_path}")
    os.makedirs(audio_dir, exist_ok=True)
    audio_path = os.path.join(audio_dir, f"{platform}_{video_id}.wav")

    if os.path.exists(audio_path):
        print(f"  [跳过] 音频文件已存在: {audio_path}")
    else:
        if not run_ffmpeg_extract_audio(video_path, audio_path, sample_rate):
            return False

    # ===== 第3步：whisper 语音识别 =====
    print(f"\n[3/3] Whisper 语音识别")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{platform}_{video_id}.txt")

    if os.path.exists(output_path):
        print(f"  [跳过] 文字稿已存在: {output_path}")
    else:
        if not run_whisper_transcribe(audio_path, output_path, model_path, language, whisper_bin):
            return False

    # ===== 输出结果 =====
    print(f"\n{'=' * 60}")
    print(f"  流水线完成！")
    print(f"  视频:    {video_path}")
    print(f"  音频:    {audio_path}")
    print(f"  文字稿:  {output_path}")
    print(f"{'=' * 60}\n")

    # 打印文字稿内容
    try:
        with open(output_path, "r", encoding="utf-8") as f:
            transcript = f.read()
        print(f"[文字稿] ({len(transcript)} 字符):")
        print(transcript[:500] + ("..." if len(transcript) > 500 else ""))
    except FileNotFoundError:
        print("[警告] 无法读取文字稿文件")

    # 可选：清理音频文件
    if not keep_audio and os.path.exists(audio_path):
        os.remove(audio_path)
        print(f"\n[清理] 已删除中间音频文件: {audio_path}")

    return True


async def main():
    parser = argparse.ArgumentParser(
        description="抖音 / TikTok / Bilibili 视频下载 + 语音转文字 一键流水线",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python transcribe_pipeline.py "https://v.douyin.com/xxxx/"
  python transcribe_pipeline.py "https://www.tiktok.com/@user/video/123456"
  python transcribe_pipeline.py -l en "https://www.tiktok.com/@user/video/123456"
  python transcribe_pipeline.py --keep-audio "https://www.bilibili.com/video/BV1xxxxxxxxx"
  python transcribe_pipeline.py -m ~/.whisper-models/ggml-medium.bin "https://v.douyin.com/xxxx/"
        """,
    )
    parser.add_argument("url", help="视频链接（支持抖音/TikTok/Bilibili 分享链接）")
    parser.add_argument(
        "--download-dir", default=DEFAULT_DOWNLOAD_DIR,
        help=f"视频下载目录（默认: {DEFAULT_DOWNLOAD_DIR}）",
    )
    parser.add_argument(
        "--audio-dir", default=DEFAULT_AUDIO_DIR,
        help=f"音频输出目录（默认: {DEFAULT_AUDIO_DIR}）",
    )
    parser.add_argument(
        "--output-dir", default=DEFAULT_OUTPUT_DIR,
        help=f"文字稿输出目录（默认: {DEFAULT_OUTPUT_DIR}）",
    )
    parser.add_argument(
        "--model", "-m", default=DEFAULT_WHISPER_MODEL,
        help=f"whisper 模型路径（默认: {DEFAULT_WHISPER_MODEL}）",
    )
    parser.add_argument(
        "--whisper-bin", default=DEFAULT_WHISPER_BIN,
        help=f"whisper-cli 可执行文件路径（默认: {DEFAULT_WHISPER_BIN}）",
    )
    parser.add_argument(
        "--language", "-l", default=DEFAULT_LANGUAGE,
        help=f"识别语言（默认: {DEFAULT_LANGUAGE}）",
    )
    parser.add_argument(
        "--sample-rate", "-r", type=int, default=DEFAULT_SAMPLE_RATE,
        help=f"音频采样率 Hz（默认: {DEFAULT_SAMPLE_RATE}）",
    )
    parser.add_argument(
        "--keep-audio", action="store_true",
        help="保留中间音频 wav 文件（默认处理完自动删除）",
    )

    args = parser.parse_args()

    # 环境检查
    check_prerequisites(args.whisper_bin)

    if not os.path.exists(args.model):
        print(f"[错误] 模型文件不存在: {args.model}")
        print("请先下载 whisper 模型，例如:")
        print(f"  mkdir -p ~/.whisper-models")
        print(f"  curl -L <模型URL> -o {args.model}")
        sys.exit(1)

    # 执行流水线
    success = await process_video(
        url=args.url,
        download_dir=args.download_dir,
        audio_dir=args.audio_dir,
        output_dir=args.output_dir,
        model_path=args.model,
        language=args.language,
        whisper_bin=args.whisper_bin,
        sample_rate=args.sample_rate,
        keep_audio=args.keep_audio,
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())