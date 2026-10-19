# V1.1.6 → V1.1.7 更新

下载更新包不会自动更新网站。

## 上传 GitHub

打开 https://github.com/ChenghsienS/DeadTown2.0 ，点击 Add file → Upload files。

解压 DeadTown-V1.1.7-update.zip，进入 DeadTown 文件夹，将里面的文件和文件夹上传到仓库根目录，提交覆盖同名文件。不要上传 ZIP 本身，不要再套一层 DeadTown 文件夹。更新包仅包含变化的文件，美术和声音资源不需重传。

新增的 player-skins.js、squad-ui.js 必须与 index、network、game、server、server 文件夹、package/version 等修改一起上传，不要只替换其中一部分。

## VPS 更新

等当前对局结束，在 Hostinger VPS Web console 执行：

```bash
cd /opt/deadtown &&
git pull --ff-only &&
npm run check &&
systemctl restart deadtown
```

如果拉取或检查失败，后续重启不会执行；请保留错误文字。内置 WebSocket 依赖不变，不必重新安装 npm 包。

检查运行状态：

```bash
systemctl is-active deadtown
curl -fsS http://127.0.0.1:3000/health
```

应显示 active，健康接口 version 应为 1.1.7。

Nginx、域名、证书、现有 systemd 的 MAX_ROOMS 设置不需修改。重启会结束现有房间，应在无人对局时更新。

## 刷新与试玩

所有玩家按 Ctrl + F5，确认主页 V1.1.7。检查角色选择和配色，按 Enter 发送房间消息，验证倒地者匍匐、队友站定 5 秒救援、20% 复活血量及队伍个人排名。对照游戏内 Ping 与 FPS 评估体验。

完整项目目录内可以运行 npm test，使用 Node.js 22+。测试使用独立临时房间，不写入真实排行榜。
