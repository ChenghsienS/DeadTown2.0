# V1.2.1 → V1.2.2 更新

本次调整主页 UI，并新增只对指定账号开放的开发者经验、代币测试工具。前后端需要一起更新；无新增生产依赖，无需 SQL、重建账号或修改现有 Nginx。

## 1. 上传 GitHub

打开 <https://github.com/ChenghsienS/DeadTown2.0>。

- 当前版本为 **V1.2.1**：使用 `DeadTown-V1.2.2-update.zip`。
- 其他版本或不确定版本：使用 `DeadTown-V1.2.2.zip` 完整版。

解压并进入 `DeadTown` 文件夹，将里面所有文件和文件夹上传到仓库根目录，提交更新。不要上传 ZIP 本身，也不要多套一层 DeadTown。无需清空仓库。增量包中的新脚本、服务器文件、样式与版本文件必须一起上传。

## 2. VPS 备份并更新

等当前对局结束、结算已保存后，在 Hostinger 终端执行：

```bash
install -d -m 700 /var/backups/deadtown &&
cp -p /var/lib/deadtown/accounts.json "/var/backups/deadtown/accounts-$(date +%Y%m%d-%H%M%S).json" &&
cd /opt/deadtown &&
git pull --ff-only &&
npm run check &&
systemctl restart deadtown
```

命令会先备份账号，再拉取代码、检查语法并重启。任一步失败会停止后续操作，保留报错排查。重启会结束仍运行的多人房间。

保留 `/var/lib/deadtown` 及 `/etc/systemd/system/deadtown.service.d/20-account-storage.conf`：

```ini
[Service]
StateDirectory=deadtown
StateDirectoryMode=0700
Environment="DEADTOWN_DATA_DIR=/var/lib/deadtown"
```

不要把账号库或备份上传 GitHub。现有账号、密码、经验、代币、皮肤、每日任务均继续使用，不需要重建。

## 3. 检查

```bash
systemctl is-active deadtown
curl -fsS http://127.0.0.1:3000/health
```

应显示 `active`，健康响应版本为 `1.2.2`。若未正常启动：

```bash
journalctl -u deadtown -n 80 --no-pager
```

## 4. 刷新网页

打开 <https://deadtown-by-cedrrriiiccc.online>，按 **Ctrl + F5**，确认主页为 **V1.2.2**。其他玩家也刷新后再进入房间。

1. 普通账号与游客不应看见 DEV。指定 ID 账号在右上角显示 DEV，点击后出现主页经验/代币增减按钮。
2. 检查左侧账号卡片余额、经验进度与硬币图标；右侧衣服图标打开衣柜，下方商店按钮打开商店并显示余额。
3. 开发者增减按钮会真实保存自己的账号。测试经验不直接发放升级奖励或推进任务。退出账号后入口和面板应消失。
4. 单人、多人、账号资料、换装、购买与正常对局结算继续沿用原功能。

详情见 [UI-DEVELOPER.md](UI-DEVELOPER.md) 与 [UI-V1.2.2.md](verification/UI-V1.2.2.md)。此包尚未代为上传 GitHub 或部署 VPS。
