# V1.1.9 → V1.1.10 更新

下载更新包不会自动更新网站。此包修改启动加载流程，前端和版本文件需一起上传。

## 上传 GitHub

打开 https://github.com/ChenghsienS/DeadTown2.0 ，点击 Add file → Upload files。

解压 DeadTown-V1.1.10-update.zip，进入 DeadTown 文件夹，将里面的文件和文件夹全部上传到仓库根目录，再提交。同名文件会更新。不要上传 ZIP 本身，也不要再套一层 DeadTown 文件夹。无需清空仓库。

特别注意：新增 boot.js，且 index.html 已改为由它启动游戏；两者必须一起上传。更新包以 V1.1.9 为基础，也包含完整 tests 文件夹，补齐之前网页上传漏掉的测试。其他未变化的音频、头像与美术文件保留。

如果想使用完整项目，可解压 DeadTown-V1.1.10.zip 上传里面的 DeadTown 文件夹内容；不必先删除旧文件。

## VPS 更新

等当前对局结束，在 Hostinger VPS Web console 执行：

```bash
cd /opt/deadtown &&
git pull --ff-only &&
npm run check &&
systemctl restart deadtown
```

如果拉取或检查失败，后续重启不会执行，请保留错误文字。内置 WebSocket 依赖未变，无须重新安装 npm 包。

完成后单独执行：

```bash
systemctl is-active deadtown
curl -fsS http://127.0.0.1:3000/health
```

应显示 active，健康接口 version 应为 1.1.10。所有玩家按 Ctrl + F5，确认主页 V1.1.10。Nginx、域名、证书和 systemd 配置不需改动。

## 验证加载

首次打开显示真实完成项和百分比，资源快时可迅速进入，不再强制播放固定时长的加载动画。限速或临时阻止某个文件时，进度不会自行走到 100%；加载错误时可重新加载重试。菜单就绪后可进入单人或多人，排行榜后台读取不影响入口。

完整 tests 文件夹上传后可运行 npm test（Node.js 22+），不写入真实排行榜。本包未自动部署到线上。
