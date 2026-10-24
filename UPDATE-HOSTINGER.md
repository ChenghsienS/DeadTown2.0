# V1.1.14 → V1.2.0 更新

本版替换你提供的三种霰弹枪开火声和一种换弹声，实际内嵌音效库同步更新。前后端版本必须一起更新。无新增生产依赖，无须 Supabase SQL 或重新注册账号。

## 1. 上传 GitHub

打开 <https://github.com/ChenghsienS/DeadTown2.0>。从 V1.1.14 升级可用 `DeadTown-V1.2.0-update.zip`；如果仍在 V1.1.13、更早版本，或者版本不明，使用 `DeadTown-V1.2.0.zip` 完整版。

解压并进入 `DeadTown` 文件夹，将里面的文件与文件夹上传到仓库根目录并提交。不要上传 ZIP 本身，也不要在仓库根目录再套一层 `DeadTown`。本次更新不需要清空仓库。

上传更新包中的全部文件，包括 `assets/audio-bank.js`、四个 `assets/audio/` 下的 WAV、`package.json`、`package-lock.json` 和 `version.js`。只传 WAV 不会生效，只改前端版本会导致联机版本不一致。

## 2. 保留并备份账号数据

你当前 VPS 已通过 `/etc/systemd/system/deadtown.service.d/20-account-storage.conf` 设置：

```ini
[Service]
StateDirectory=deadtown
StateDirectoryMode=0700
Environment="DEADTOWN_DATA_DIR=/var/lib/deadtown"
```

**保留此配置。实际数据为 `/var/lib/deadtown/accounts.json`，不在 `/opt/deadtown` 仓库内。** 本次升级不需要更改服务用户、重新建库或移回默认目录。

更新前可在 VPS 私下复制账号文件作为备份；程序采用原子替换写入，复制单个 `accounts.json` 不会读到半个 JSON。停止服务后备份则能固定备份时点。以下备份命令不会停止游戏：

```bash
install -d -m 700 /var/backups/deadtown
cp -p /var/lib/deadtown/accounts.json "/var/backups/deadtown/accounts-$(date +%Y%m%d-%H%M%S).json"
```

不要把账号数据库或备份上传 GitHub。若自己改过 `DEADTOWN_DATA_DIR`，以实际配置为准，不要凭默认路径新建空库。

## 3. 更新 VPS

先等对局结束、经验保存成功；重启会结束正在进行的房间。在 Hostinger VPS 终端执行：

```bash
cd /opt/deadtown &&
git pull --ff-only &&
npm run check &&
systemctl restart deadtown
```

拉取或检查报错时，后续重启不会执行。保留完整报错再排查，不要用重置仓库命令掩盖本地变更。

```bash
systemctl is-active deadtown
curl -fsS http://127.0.0.1:3000/health
curl -fsS http://127.0.0.1:3000/api/account
curl -fsS http://127.0.0.1:3000/api/leaderboard
```

应看到 `active`、版本 `1.2.0`、无登录 Cookie 时的 `{"user":null}`，以及包含 `rows` 的榜单响应。原账号、密码、头像与最高分保留；V1.1.14 已获得的账号经验与改名冷却继续保留。

## 4. 网页刷新与代理

打开 <https://deadtown-by-cedrrriiiccc.online>，按 Ctrl + F5。所有玩家都应刷新，确认主页 V1.2.0 后再开始新对局。

账号接口已正常使用时，不需要改 Nginx。若仍遇到注册/登录来源错误，你的现有配置文件为 `/etc/nginx/conf.d/deadtown.conf`；代理 Node 3000 端口的 `location /` 应保留 WebSocket Upgrade 设置，并包含：

```nginx
proxy_set_header Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
```

修改后先 `nginx -t`，通过后再 `systemctl reload nginx`。这是之前 HTTPS 来源校验的代理要求，不要关闭账号接口的来源校验。其他 Hostinger 站点配置无需跟着修改。

## 5. 试玩检查

1. 刷新后主页显示 V1.2.0，原账号资料、最高分和经验保持。
2. 单人开火使用三种新开火声，按 R 换弹使用新换弹声，正常完成后恢复弹夹。
3. 两个浏览器进入同一多人房间，分别检查自己的开火/换弹以及听到队友的开火/换弹。
4. 旧标签页如果提示版本不匹配，所有玩家 Ctrl + F5 后重新加入。

音效说明见 [AUDIO-UPDATE.md](AUDIO-UPDATE.md)，本地验证见 [AUDIO-V1.2.0.md](verification/AUDIO-V1.2.0.md)。此包未代为上传 GitHub 或重启你的 VPS。
