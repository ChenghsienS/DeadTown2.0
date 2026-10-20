# V1.1.10 → V1.1.11 更新

此更新同时修改多人客机和服务器，必须一起更新；下载不会自动更新网站。

## 上传 GitHub

打开 https://github.com/ChenghsienS/DeadTown2.0 ，点击 Add file → Upload files。

解压 DeadTown-V1.1.11-update.zip，进入 DeadTown 文件夹，将里面的文件和文件夹全部上传到仓库根目录，再提交。无需清空仓库；不要上传 ZIP 本身，不要再套一层 DeadTown 文件夹。

请特别确认新增 interpolation.js、server/snapshot-stream.cjs、assets/author-avatar.png 已上传。index.html、network.js、prediction.js、server.js 和版本文件需同步更新。更新包以 V1.1.10 为基础，并包含完整 tests 文件夹。

需要完整项目时可使用 DeadTown-V1.1.11.zip。前一版 boot.js 和资源加载功能继续保留。

## VPS 更新

等当前对局结束，在 Hostinger VPS Web console 执行：

```bash
cd /opt/deadtown &&
git pull --ff-only &&
npm run check &&
systemctl restart deadtown
```

如果拉取或检查失败，后续重启不会执行；请保留错误文字。没有新增 npm 依赖。

完成后单独执行：

```bash
systemctl is-active deadtown
curl -fsS http://127.0.0.1:3000/health
```

应显示 active，健康接口 version 为 1.1.11。所有玩家都按 Ctrl + F5，主页也应为 V1.1.11，否则版本检查会拒绝混用。Nginx、域名、证书和 systemd 配置不需改动。

## 试玩重点

让原先网络较慢的客机持续走直线、转向、松开按键，观察角色和丧尸是否仍反复回拉。短暂网络抖动时本地移动会继续；长时间完全无状态则有等待提示，收到新状态后恢复。主页作者头像应显示为上传的像素电脑头角色。

真实网络往返延迟仍由玩家线路和服务器位置决定。这次针对抖动、积压和过早停止预测的修复，不能替代实际异地网络测试。若仍停顿，请记录当时的 Ping、FPS、1% Low、是否出现“等待服务器”，以及房主是否同时停住。

完整 tests 上传后可运行 npm test（Node.js 22+）。本包没有自动部署到线上。
