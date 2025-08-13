Docker ps 显示容器列表，默认运行中，查看全部-a
docker images 镜像列表
docker exec 进入容器内部 -it(以交互模式)  [容器id]   [/bin/bash] (哪种控制台)    容器的terminal执行命令
docker logs 查看日志
exit 退出容器内部
docker inspect  容器详情
docker volumes 数据卷
Docker start 启动一个镜像应用
docker stop 停止一个镜像应用
docker rm 删除一个容器 -f 强制删除
docker build 构建镜像
docker run -d(后台运行) —name[容器名](指定容器名) -p[主机端口]:[容器端口](端口映射)
* docker run：创建并启动一个新的容器。
* docker start：启动一个已经存在但已停止的容器。