# V1.2.0 → V1.2.1 更新

新增账号代币、独立皮肤商店和每日任务，移除 Legacy 历史榜；多人至少两人在房间才能开局。前后端需要一起更新。没有新增生产依赖，无需 SQL 或重新注册。

## 1. 上传 GitHub

打开 <https://github.com/ChenghsienS/DeadTown2.0>。

- 当前已是 **V1.2.0**：使用 `DeadTown-V1.2.1-update.zip`。
- 其他版本或不确定版本：使用 `DeadTown-V1.2.1.zip` 完整版。

解压后进入 `DeadTown` 文件夹，把里面的文件与文件夹上传到仓库根目录并提交。不要上传 ZIP 本身，也不要再套一层 `DeadTown`。**不需要清空仓库。** 增量包要全部上传，包含新增脚本、样式、版本文件及服务器改动；只上传前端会缺少账号接口。

## 2. 备份并更新 VPS

等当前对局结束、结算保存成功后，再在 Hostinger 终端执行：

```bash
install -d -m 700 /var/backups/deadtown &&
cp -p /var/lib/deadtown/accounts.json "/var/backups/deadtown/accounts-$(date +%Y%m%d-%H%M%S).json" &&
cd /opt/deadtown &&
git pull --ff-only &&
npm run check &&
systemctl restart deadtown
```

这些命令先私下备份账号文件，再拉取代码、检查语法、重启服务。任一步失败都会阻止后续命令，保留报错后排查，不要强制清空仓库。重启会结束仍在运行的多人房间。

**保留现有账号目录 `/var/lib/deadtown`。** 你的服务配置 `/etc/systemd/system/deadtown.service.d/20-account-storage.conf` 已设置：

```ini
[Service]
StateDirectory=deadtown
StateDirectoryMode=0700
Environment="DEADTOWN_DATA_DIR=/var/lib/deadtown"
```

不需要修改该配置、切换服务用户或新建空库。数据库和备份不可上传 GitHub。更新会给旧账号添加经济字段，按已有等级一次性补发升级代币，保留旧账号、密码、名称、头像、最高分、经验和改名冷却。皮肤所有权按新规则初始仅为 Ranger / Moss。

## 3. 检查服务

```bash
systemctl is-active deadtown
curl -fsS http://127.0.0.1:3000/health
curl -fsS http://127.0.0.1:3000/api/account
curl -fsS http://127.0.0.1:3000/api/leaderboard
```

应分别看到 `active`、包含 `"version":"1.2.1"` 的健康响应、未携带登录 Cookie 时的 `{"user":null}`，以及包含 `rows` 的排行榜响应。

如果服务未启动，查看：

```bash
journalctl -u deadtown -n 80 --no-pager
```

## 4. 刷新网页与试玩

打开 <https://deadtown-by-cedrrriiiccc.online>，按 **Ctrl + F5**。所有玩家都应刷新到主页 **V1.2.1** 后重新进入房间。

1. 登录原账号，检查等级、经验和一次性补发的代币：`(等级 − 1) × 150`。
2. 点击自己的角色形象，衣柜初始只有 Ranger / Moss；商店有 15 套蓝色独立皮肤，每套 100 代币。
3. 购买并装备一套，刷新后仍保留；另一个未购买的配色仍锁定。房间换肤应同步给队友。
4. 仅一人在房间时开始按钮禁用，准备不会倒计时；第二人加入后房主可开始。两人全准备仍会五秒倒计时，离开到只剩一人应取消。
5. 正常结束单人或多人对局，检查任务进度、本局升级/任务代币；多人采用自己的分数和击杀。
6. 主页任务为 3 简单 + 2 中等 + 1 困难，显示纽约 08:00 刷新。旧 Legacy 按钮消失。

账号接口之前已正常使用时无需修改 Nginx。现有 `/etc/nginx/conf.d/deadtown.conf` 应继续保留 WebSocket Upgrade 和 `Host $http_host`、`X-Real-IP $remote_addr`、`X-Forwarded-Proto $scheme` 代理头。

完整规则见 [ECONOMY.md](ECONOMY.md)，验证见 [ECONOMY-V1.2.1.md](verification/ECONOMY-V1.2.1.md)。发布包未代为上传 GitHub，也未重启你的 VPS。
