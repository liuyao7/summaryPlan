whisper.cpp 不走 pip，完全不需要 Python。 它是 C++ 写的，安装方式是：

bash

插入到终端中

复制
# 方式1：Homebrew 直接装（推荐）
brew install whisper-cpp

# 下载模型后直接用，跟 Python 没关系
whisper-cli -m ggml-large-v3-turbo.bin -f audio.wav -l zh
bash

插入到终端中

复制
# 方式2：源码编译
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make
所以之前提到的 Python 3.8 太低的问题，在 whisper.cpp 这条路完全不存在。这也是 whisper.cpp 在 M1 上的另一个优势——零 Python 依赖，brew 装完就开工。

简单对比：

mlx-whisper	whisper.cpp
依赖	Python ≥ 3.9 + pip	仅需 C++ 编译器 / Homebrew
安装	pip install mlx-whisper	brew install whisper-cpp
你的环境能直接用？	不行（Python 3.8）	可以


# 需要手动下载模型
mkdir -p ~/.whisper-models && cd ~/.whisper-models
curl -LO "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin"

之后跑的时候用绝对路径：

bash
whisper-cli -m ~/.whisper-models/ggml-large-v3-turbo.bin -f /path/to/audio.wav -l zh
如果想方便点，写个别名到 ~/.zshrc：

bash

alias asr='whisper-cli -m ~/.whisper-models/ggml-large-v3-turbo.bin -l zh'
之后直接 asr -f audio.wav 就行。