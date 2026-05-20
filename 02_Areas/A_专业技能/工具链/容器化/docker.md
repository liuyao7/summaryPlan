# Docker

## 怎么理解 Docker

### 一句话类比

> Docker 之于软件，就像集装箱之于货运。
> 把应用及其所有依赖打包成一个标准化的"箱子"，在任何装了 Docker 的机器上都能原样运行，不用再纠结"我这能跑，你那怎么就报错了"。

### 核心问题 Docker 解决了什么

| 痛点 | 没有 Docker | 有了 Docker |
|------|-------------|-------------|
| 环境不一致 | "我本地好好的啊" | 镜像保证开发/测试/生产完全一致 |
| 依赖冲突 | 两个项目需要不同版本的 Python/Node | 各自跑在独立容器里，互不干扰 |
| 部署繁琐 | 手动装依赖、配环境、改配置 | 一条 docker run 搞定 |
| 资源隔离 | 多个服务抢端口、抢资源 | 每个容器有独立的网络、文件系统、资源限制 |

### Docker vs 虚拟机

```
虚拟机：每个 VM 有完整 Guest OS，启动慢（分钟级），占用大（几GB）
容器：共享宿主机内核，启动快（秒级），占用小（几十MB）
```

| 对比维度 | 虚拟机 | Docker 容器 |
|----------|--------|-------------|
| 启动速度 | 分钟级 | 秒级 |
| 资源占用 | 几个 GB | 几十 MB |
| 隔离级别 | 操作系统级（强） | 进程级（中） |
| 镜像体积 | GB 级别 | MB 级别 |
| 迁移性 | 差 | 好，推镜像即可 |

---

## 关键概念

### 三大核心对象

```
Dockerfile  --build-->  Image  --run-->  Container
  (蓝图)                 (模板)            (实例)
```

| 概念 | 类比 | 说明 |
|------|------|------|
| **镜像 (Image)** | 代码的"安装包" / 类 (Class) | 只读模板，包含运行应用所需的一切：代码、运行时、系统库、配置 |
| **容器 (Container)** | 运行中的"进程" / 实例 (Object) | 镜像的运行实例，可启动、停止、删除。一个镜像可以跑多个容器 |
| **仓库 (Registry)** | 代码的 GitHub / App Store | 存储和分发镜像的地方，Docker Hub 是默认公共仓库 |
| **Dockerfile** | 构建说明书 / Makefile | 定义如何从零构建一个镜像的文本文件 |
| **数据卷 (Volume)** | 外挂硬盘 | 持久化数据，容器删了数据还在 |
| **网络 (Network)** | 局域网 | 让容器之间、容器和宿主机之间通信 |
| **Compose** | 多服务的编排脚本 | 用 YAML 文件定义和运行多容器应用（如前端+后端+数据库） |

### 分层镜像原理

镜像是由多层只读层叠加而成，每一条 Dockerfile 指令（RUN/COPY/ADD）生成一层：

```
层5: 应用代码 (COPY . .)
层4: 安装依赖 (RUN pip install -r requirements.txt)
层3: 设置工作目录 (WORKDIR /app)
层2: 复制依赖文件 (COPY requirements.txt .)
层1: 基础镜像 (FROM python:3.11)
```

**好处**：不同镜像可以共享相同的层，节省磁盘；修改代码只重建最上层，缓存加速构建。

---

## 常用场景

### 1. 本地开发环境（最常用）
不再需要在本地装 MySQL、Redis、Nginx，一行命令搞定：

```bash
# 起一个 MySQL，无需本地安装
docker run -d --name mysql \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=123456 \
  mysql:8.0

# 起一个 Redis
docker run -d --name redis -p 6379:6379 redis:7

# 起一个 Nginx 做静态资源或反向代理
docker run -d --name nginx -p 80:80 nginx
```

### 2. 微服务开发与调试
前后端 + 数据库 + 缓存等通过 docker-compose 一键启动整个开发环境：

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports: ["8080:8080"]
    depends_on: [mysql, redis]
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: 123456
  redis:
    image: redis:7
```

```bash
docker compose up -d   # 一套命令，整个环境跑起来
```

### 3. 应用部署交付
CI/CD 中：代码提交 → 自动构建镜像 → 推送到镜像仓库 → 服务器拉取运行：

```bash
docker build -t myapp:v1.0 .
docker push registry.example.com/myapp:v1.0
# 服务器上
docker pull registry.example.com/myapp:v1.0
docker run -d -p 80:8080 myapp:v1.0
```

### 4. 一次性任务 / 工具运行
不需要安装就能用各种 CLI 工具：

```bash
# 用 Python 跑脚本，不需要本地装 Python
docker run --rm -v $(pwd):/app python:3.11 python /app/script.py

# 用 FFmpeg 处理视频
docker run --rm -v $(pwd):/data jrottenberg/ffmpeg -i /data/input.mp4 /data/output.avi

# 用 curl 测接口
docker run --rm curlimages/curl https://api.example.com/health
```

### 5. 搭建测试环境 / 一次性环境
快速拉起一套完整环境做集成测试，用完即毁：

```bash
docker compose -f docker-compose.test.yml up --abort-on-container-exit --exit-code-from test
docker compose -f docker-compose.test.yml down -v  # 清理干净
```

---

## 怎么上手（一条路径）

### 阶段一：安装 & 跑起来（10 分钟）

```bash
# Mac 安装
brew install --cask docker
# Linux 安装（CentOS）
yum install -y docker-ce
# Windows 安装：下载 Docker Desktop

# 验证
docker version
docker run hello-world   # 跑一下官方测试镜像
```

### 阶段二：理解核心操作（30 分钟）

```bash
# 搜一个镜像
docker search nginx

# 拉取镜像
docker pull nginx:latest

# 运行容器（端口映射：本机8080 → 容器80）
docker run -d --name my-nginx -p 8080:80 nginx

# 看日志
docker logs -f my-nginx

# 进容器看看里面有什么
docker exec -it my-nginx /bin/bash

# 停止、重启、删除
docker stop my-nginx
docker start my-nginx
docker rm -f my-nginx
```

### 阶段三：写自己的 Dockerfile（1 小时）

创建一个简单的项目试试：

```dockerfile
# Dockerfile —— 以 Python 项目为例
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["python", "app.py"]
```

```bash
docker build -t my-python-app .
docker run -d -p 8000:8000 my-python-app
```

### 阶段四：多服务编排 + 数据持久化（1 小时）

学会 `docker compose` + `volume`：

```yaml
# 一个博客系统：WordPress + MySQL
services:
  db:
    image: mysql:8.0
    volumes:
      - db_data:/var/lib/mysql       # 数据持久化到 volume
    environment:
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_DATABASE: wordpress
  wordpress:
    image: wordpress:latest
    ports:
      - "80:80"
    depends_on:
      - db
    environment:
      WORDPRESS_DB_HOST: db:3306

volumes:
  db_data:   # 声明 volume，容器删了数据不丢
```

### 阶段五：进阶优化

- **多阶段构建（Multi-stage build）**：构建和运行分开，镜像体积大幅缩小
- **镜像瘦身**：用 alpine/slim 基础镜像，减少层数，清理缓存
- **健康检查**：`HEALTHCHECK` 指令让 Docker 知道容器是否真的在正常工作
- **资源限制**：`docker run --memory=512m --cpus=1.5` 限制容器资源

---

## 常用命令速查

### 容器操作

| 命令 | 说明 |
|------|------|
| `docker ps` | 显示运行中的容器列表 |
| `docker ps -a` | 显示所有容器（含已停止） |
| `docker run -d --name xx -p 80:80 image` | 后台运行容器，指定名称和端口映射 |
| `docker start 容器名` | 启动已停止的容器 |
| `docker stop 容器名` | 停止运行中的容器 |
| `docker restart 容器名` | 重启容器 |
| `docker rm 容器名` | 删除容器 |
| `docker rm -f 容器名` | 强制删除（运行中也删） |
| `docker exec -it 容器名 /bin/bash` | 进入容器内部执行命令 |
| `docker logs 容器名` | 查看容器日志 |
| `docker logs -f 容器名` | 实时跟踪日志 |
| `docker inspect 容器名` | 查看容器详细信息（IP、挂载、配置等） |
| `docker cp 本机路径 容器名:容器路径` | 文件拷贝（宿主机 → 容器） |
| `exit` | 退出容器内部 |

### 镜像操作

| 命令 | 说明 |
|------|------|
| `docker images` | 查看本地镜像列表 |
| `docker pull 镜像:tag` | 拉取镜像 |
| `docker search 关键词` | 搜索镜像 |
| `docker build -t 名称:标签 .` | 构建镜像（`.` 是 Dockerfile 所在目录） |
| `docker rmi 镜像ID` | 删除镜像 |
| `docker tag 源镜像 新名称:标签` | 给镜像打标签 |
| `docker push 镜像名:tag` | 推送镜像到仓库 |
| `docker history 镜像名` | 查看镜像构建历史（每一层） |
| `docker save/load` | 导出/导入镜像文件 |

### 系统 & 清理

| 命令 | 说明 |
|------|------|
| `docker system df` | 查看 Docker 磁盘使用情况 |
| `docker system prune` | 清理停掉的容器、未使用的网络、悬空镜像 |
| `docker system prune -a` | 清理所有未使用的镜像（慎用） |
| `docker volume ls` | 查看数据卷列表 |
| `docker volume rm 卷名` | 删除数据卷 |
| `docker volume prune` | 清理未使用的数据卷 |
| `docker network ls` | 查看网络列表 |

### Compose（多容器管理）

| 命令 | 说明 |
|------|------|
| `docker compose up -d` | 启动 docker-compose.yml 中定义的所有服务（后台） |
| `docker compose down` | 停止并删除所有服务 |
| `docker compose down -v` | 同时删除 volumes（数据丢失！） |
| `docker compose ps` | 查看 compose 管理的容器状态 |
| `docker compose logs -f` | 查看 compose 所有服务日志 |
| `docker compose build` | 重新构建镜像 |
| `docker compose restart 服务名` | 重启单个服务 |

---

## Dockerfile 常用指令速查

```dockerfile
# 基础镜像
FROM python:3.11-alpine

# 维护者信息（可选）
LABEL maintainer="name@example.com"

# 设置工作目录
WORKDIR /app

# 复制文件到镜像
COPY requirements.txt .
COPY src/ ./src/

# 和 COPY 类似，但支持 URL 下载和自动解压 tar
ADD https://example.com/file.tar.gz /tmp/

# 执行命令（镜像构建时运行）
RUN pip install --no-cache-dir -r requirements.txt

# 声明容器运行时监听的端口（文档作用，不实际映射）
EXPOSE 8000

# 环境变量
ENV APP_ENV=production

# 挂载点声明（不实际挂载）
VOLUME /data

# 容器启动时默认执行命令（只能有一个）
CMD ["python", "app.py"]

# 和 CMD 类似，但不可被 docker run 参数覆盖
ENTRYPOINT ["python", "app.py"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8000/health || exit 1
```

---

## 常见问题 & 反模式

### 不要做的事

- **不要把容器当虚拟机用**：一个容器只跑一个进程（主进程退出容器就停了）
- **不要存数据在容器内部**：用 Volume 持久化，否则容器一删数据就没了
- **不要用 root 跑应用**：Dockerfile 里 `USER` 切换为非 root 用户
- **不要在 Dockerfile 里放密钥**：用环境变量或 Docker Secrets
- **不要用 latest 标签**：生产环境锁定具体版本号，避免拉取到不同的镜像