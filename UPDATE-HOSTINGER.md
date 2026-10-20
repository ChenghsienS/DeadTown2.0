# V1.1.7 / V1.1.8 → V1.1.9 更新

下载更新包不会自动更新网站。前端与多人服务器必须一起更新。

## 上传 GitHub

打开 https://github.com/ChenghsienS/DeadTown2.0 ，点击 Add file → Upload files。

解压 DeadTown-V1.1.9-update.zip，进入 DeadTown 文件夹，将里面的文件和文件夹全部上传到仓库根目录，提交更新同名文件。不要上传 ZIP 本身，不要再套一层 DeadTown 文件夹。

此次更新包包含 V1.1.8 和 V1.1.9 的累计变化，可直接覆盖 V1.1.7 或 V1.1.8，无须逐个安装旧更新包。同时包含完整 tests 文件夹，补齐此前缺少的测试。请连同 tests、verification 文件夹上传；声音和其他未变化资源不必重传。原仓库其他文件保留，不要清空仓库。

## VPS 更新

等当前对局结束，在 Hostinger VPS Web console 执行：

```bash
cd /opt/deadtown &&
git pull --ff-only &&
npm run check &&
systemctl restart deadtown
```

如果拉取或检查失败，后续重启不会执行；请保留错误文字。内置 WebSocket 依赖未变，无须重新安装 npm 包。

完成后单独执行：

```bash
systemctl is-active deadtown
curl -fsS http://127.0.0.1:3000/health
```

应显示 active，健康接口 version 应为 1.1.9。只看到主页 V1.1.9 并不代表服务器已重启，应同时确认健康接口版本。

Nginx、域名、证书、systemd 配置均不需修改。重启会结束现有房间，应在无人对局时更新。

## 刷新与试玩

所有玩家按 Ctrl + F5，确认主页 V1.1.9。验证：最后一名站立玩家倒地后本局结束；还有队友存活时倒地者仍可等待救援；救援者受伤或轻微被推时进度不清空；主动走动、被推出范围或自己倒地时中断。复活后旧火焰、角色独立配色、结算换肤和近身柔光的上一版修复继续生效。

完整项目及上传完整 tests 后可运行 npm test（Node.js 22+）。测试使用独立临时房间，不写入真实排行榜。本包未自动部署到线上。
