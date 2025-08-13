rm 删除文件
rm -rf 删除文件夹 rmdir
cp  复制  文件   目标位置
 -r 递归的复制整个文件夹
 -f 强制
mv 移动文件或目录
cat 查看文件
more 查看大文件
less 分屏查看
echo 输出到控制台
cd 进入文件
cd ..退出文件夹
cd ~/Desktop/	 进入桌面
ls 查看当前文件夹的内容
pwd 查看当前所在文件夹
touch 如果文件不存在，新建文件
mkdir 创建目录
clear  清屏
tar -cvf 打包文件
tar -xvf 解包文件


command [-options] [parameter]
* command ：命令名，相应功能的英文单词或单词的缩写
* [-options] ：选项，可用来对命令进行控制，也可以省略
* parameter ：传给命令的参数，可以是 零个、一个 或者 多个
head  显示文件头部内容
tail  现实文件尾部内容
tail -f 实时追踪文件所有实时变化
ln 创建一个链接

  echo  $ 查看系统环境变量
 x  >	y	x写入到y
 x  >> y	x追加到y
 echo  ‘’  >> txt
mkdir -p /home/work  新建目录 -p 如果没有父目录连父目录一块儿建了
User add -d /user/work work 在系统中添加一个用户，并设置新用户的家目录，work是新的用户名
COPY --chown=work ./output /home/work/$appPath
Docker的命令，用于将当前目录下的'output'目录复制到容器中的'/home/work/$appPath'路径，并且将新复制的文件的所有者设为'work'
CMD ["sh","-c","/usr/sbin/nginx -c /home/work/nginx/nginx.conf -p /home/work/nginx"]
1. 'sh'：这是使用Shell解释器来执行后续的命令。
2. '-c'：这是Shell命令的选项，允许你传递一个命令作为字符串。它会告诉Shell执行后面的字符串作为一个命令。
3. '/usr/sbin/nginx -c /home/work/nginx/nginx.conf -p /home/work/nginx'：这是实际的命令，告诉Nginx应该执行的操作。这个命令启动Nginx服务器，并传递了三个参数：
    * '-c'：这个参数告诉Nginx使用指定的配置文件，本例中是'/home/work/nginx/nginx.conf'。
    * '-p'：这个参数指定Nginx的工作目录，本例中是'/home/work/nginx'。
    * '/usr/sbin/nginx'：这是Nginx的可执行文件路径，告诉Nginx服务器在哪里可以找到它的可执行文件