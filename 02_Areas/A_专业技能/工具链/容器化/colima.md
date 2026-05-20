Colima 是 Mac（和 Linux）上用来替代厚重的 Docker Desktop 的绝佳神器。它轻量、省内存，而且完全免费。

它的本质是**在后台帮你跑一个微型的 Linux 虚拟机**，并在里面运行 Docker 服务。

日常开发中，你只需要掌握以下这几组最常用的命令即可：

### 一、 日常高频操作（最基本）

这四个是你几乎每天都会用到的：

*   **`colima start`**
    启动 Colima 虚拟机及 Docker 后台服务。（就是你刚才用来解决报错的命令）。
*   **`colima stop`**
    关闭虚拟机。如果你当前不开发了，建议关闭，能帮你**省下不少 Mac 的内存和电池续航**。
*   **`colima status`**
    查看当前运行状态。会告诉你虚拟机是否在跑，以及当前的引擎是 Docker 还是 Containerd。
*   **`colima restart`**
    重启服务。当你的 Docker 突然卡死、容器无响应时，用这个“重启大法”。

---

### 二、 资源配置（非常重要！）

Colima 默认只会分配 **2核 CPU、2GB 内存、60GB 硬盘**。如果你要跑大型数据库或者编译大项目，极大概率会“内存溢出（OOM）”。你需要自定义启动资源：

*   **`colima start --cpu 4 --memory 8 --disk 100`**
    启动并分配给 Docker：4核 CPU，8GB 内存，100GB 存储空间。（首次配置或修改时使用）。
*   **`colima start -e`** （或 `--edit`）
    用默认文本编辑器打开 Colima 的 `yaml` 配置文件。你可以在里面永久修改 CPU、内存分配，修改保存并退出后，Colima 会自动用新配置重启。

---

### 三、 深度排错与清理（出问题时用）

*   **`colima ssh`**
    直接登录到 Colima 的后台 Linux 虚拟机里。
    *(使用场景：有时候 Docker 报错“磁盘空间不足”，你可以 ssh 进去清理垃圾文件。)*
*   **`colima delete`** ⚠️ **慎用！**
    彻底删除默认的 Colima 虚拟机。
    *(使用场景：如果 Colima 彻底崩溃、怎么也启动不了，就用这个命令销毁它，然后再 `colima start` 重新创建一个干净的。**注意：这会清空你本地所有的 Docker 镜像和容器数据**。)*
*   **`colima list`**
    列出当前所有的 Colima 实例（查看它们的状态、IP地址、占用的资源）。

---

### 四、 高级玩法（可选）

*   **多环境隔离（Profile）：**
    如果你想同时拥有两个完全隔离的 Docker 环境（比如一个公司用，一个私人玩），可以起名字：
    `colima start 公司项目`
    `colima start 私人项目`
    关闭时对应写 `colima stop 公司项目` 即可。

*   **一键跑 K8s：**
    如果你要学 Kubernetes，无需复杂配置，直接加个参数：
    `colima start --kubernetes` 
    它会顺带帮你把本地的 k8s 集群给搭好。

### 💡 总结小贴士
其实对于 90% 的开发者来说，只需要记住这一个工作流即可：
上班时敲 `colima start` -> 愉快地使用各种 docker 命令 -> 下班时敲 `colima stop` 关机走人。