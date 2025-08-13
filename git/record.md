# 记录
- 推送代码：git push origin HEAD:refs/for/master.
    - HEAD：这是一个引用，指向你当前所在分支的最新提交。HEAD 表示你当前分支的最新状态。

    - refs/for/dev_as_01：这部分是 Gerrit 特有的用法，表示你希望将提交推送到 Gerrit 的一个特定的“引用”或“分支”下，dev_as_01 是你希望提交用来进行代码审查的目标分支的名称。Gerrit 使用 refs/for/ 前缀来区分这些特殊的推送操作，它会将提交放到一个“待审查”的状态，而不是直接合并到目标分支。 
- git 规范commit type
    - 修复bug: fix
    - 新增功能: feat
    - 格式/样式代码: style
    - 代码重构: refactor
    - 性能优化: perf
    - 测试相关: test
    - 文档: docs
    - 构建: build
    - 持续集成: ci
    - 回滚: revert
    - 配置: chore
    - 依赖: deps
    - 注释: comment
    - 删除: delete
    - 初始化: init
    - 合并: merge
    - 命名空间: namespace
    - 类型: type
    - 版本: version
    - 脚本: script
    - 数据库: db
    - 接口: api
    - 第三方: third-party
    - 安全性: security
    - 国际化: i18n
    - 测试: test

- git reset --soft origin/[branchname]后重新commit）
    - 代码回退：将本地的commit信息 回退到和远程分支最后一次的提交那里，即把本地指针回退到和远程一致，（head指针默认指向分支的最新一次commit提交）, 本地领先远端的文件代码修改将被存到本地暂存区相当于commit

- git stash save '' 代码暂存
- git stash list 查看暂存列表
- git stash pop 恢复暂存
- git commit --amend --no-edit 修改上一次提交
- git merge 合并分支到当前分支

