# V1.1.13 → V1.1.14 更新

本版加入账号等级、单人/多人结算经验条和 72 小时改名冷却。前端、服务器与新增文件必须一起更新。无新增生产依赖，无须 Supabase SQL 或重新注册账号。

## 1. 上传 GitHub

打开 <https://github.com/ChenghsienS/DeadTown2.0>。从 V1.1.13 升级可用 `DeadTown-V1.1.14-update.zip`；仓库版本不明或需要重传全部文件时，使用 `DeadTown-V1.1.14.zip` 完整版。

解压并进入 `DeadTown` 文件夹，将里面的文件与文件夹上传到仓库根目录并提交。不要上传 ZIP 本身，也不要在仓库根目录再套一层 `DeadTown`。本次更新不需要清空仓库。

新增 `account-progress.js` 与 `progression-ui.js`，以及修改后的账号、排行榜、联机、服务器文件必须全部上传；不能只上传这两个新文件。

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

应看到 `active`、版本 `1.1.14`、无登录 Cookie 时的 `{"user":null}`，以及包含 `rows` 的榜单响应。原账号、密码、头像与最高分保留；已有账号第一次加载本版为 1 级、0 XP。

## 4. 网页刷新与代理

打开 <https://deadtown-by-cedrrriiiccc.online>，按 Ctrl + F5。所有玩家都应刷新，确认主页 V1.1.14 后再开始新对局。

账号接口已正常使用时，不需要改 Nginx。若仍遇到注册/登录来源错误，你的现有配置文件为 `/etc/nginx/conf.d/deadtown.conf`；代理 Node 3000 端口的 `location /` 应保留 WebSocket Upgrade 设置，并包含：

```nginx
proxy_set_header Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
```

修改后先 `nginx -t`，通过后再 `systemctl reload nginx`。这是之前 HTTPS 来源校验的代理要求，不要关闭账号接口的来源校验。其他 Hostinger 站点配置无需跟着修改。

## 5. 试玩检查

1. 登录原账号，确认原名称、头像和最高分保留，主页显示 LV. 1 与 0 / 500 XP。
2. 正常完成一局，结算出现本局经验增长条；例：5,100 分应为 +510 XP，升至 2 级并保留 10 / 605 XP。
3. 两个账号完成合作局，各自按个人最终分数获得经验，团队总分不重复发给每个人；刷新后等级仍保留。
4. 成功改名后再次打开资料，名称显示等待时间、头像仍可改；每次改名之后需等待 72 小时。
5. 中途退出不发经验。游客仍可游玩；原圈内移动救援、头像、皮肤和聊天继续使用。

完整成长规则见 [PROGRESSION.md](PROGRESSION.md)，本地验证见 [PROGRESSION-V1.1.14.md](verification/PROGRESSION-V1.1.14.md)。此包未代为上传 GitHub 或重启你的 VPS。
