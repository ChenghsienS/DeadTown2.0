# V1.1.12 → V1.1.13 更新

本版加入注册、登录、独立头像、账号排行榜，允许队友在倒地救援圈内移动。前端、服务器与新增文件需一起更新。

## 1. 上传 GitHub

打开 https://github.com/ChenghsienS/DeadTown2.0 。从 V1.1.12 升级使用 `DeadTown-V1.1.13-update.zip`；清空仓库后或旧版本不明时，用 `DeadTown-V1.1.13.zip` 完整版。

解压并进入 `DeadTown` 文件夹，把里面的文件与文件夹上传到仓库根目录并提交。不要上传 ZIP 本身或再套一层 `DeadTown`。不需要清空仓库。

新增 `account-rules.js`、`account-portraits.js`、`accounts.js`、`accounts.css`、`rankings.js`、`server/accounts.cjs` 必须一起上传。没有新增生产依赖，不需要 npm install 或 Supabase SQL 配置。

## 2. 更新 VPS

先等对局结束；重启会结束正在进行的房间。在 Hostinger VPS 终端执行：

```bash
cd /opt/deadtown &&
git pull --ff-only &&
npm run check &&
systemctl restart deadtown
```

拉取或检查报错时，后续重启不会执行。保留完整报错再排查。

```bash
systemctl is-active deadtown
curl -fsS http://127.0.0.1:3000/health
curl -fsS http://127.0.0.1:3000/api/account
curl -fsS http://127.0.0.1:3000/api/leaderboard
```

应看到 active、版本 1.1.13、`{"user":null}` 和包含 rows 的榜单响应。首次使用没有新成绩时，rows 是空数组。

## 3. 检查公网账号接口

打开 HTTPS 游戏网址，按 Ctrl + F5。主页显示 V1.1.13 后注册账号，再刷新确认仍然登录。

如果接口返回 404、405、提示来源不匹配或要求 HTTPS，检查 Nginx：`/api/` 必须转发到 `http://127.0.0.1:3000`，并设置 Host、X-Real-IP 与 X-Forwarded-Proto。完整片段见 `ACCOUNT-SYSTEM.md`。已有代理满足这些条件时，不必更改 Nginx。

注册和登录通过网页完成，不需要把密码输入终端。

## 4. 保存账号数据

默认数据位于**运行 Node 的系统用户主目录下 `.local/share/deadtown/accounts.json`**。root 服务对应 `/root/.local/share/deadtown/accounts.json`；设置了 DEADTOWN_DATA_DIR 时，以该目录为准。

此目录在 GitHub 工作目录外，后续游戏更新不会清空账号。请私下备份；换 VPS、服务用户或数据目录时需要一起迁移，不能上传 GitHub。

## 5. 试玩检查

1. 选择头像注册；刷新、重新登录后头像和游戏名保持。
2. 两个账号进入房间，检查房间成员、局内和结算排行头像。
3. 一人倒地，队友在提示圈内移动 5 秒，进度应持续且复活恢复 20% 血量；离开范围会重新计时。
4. 单人结束后检查账号榜；游客提示登录/注册，可继续游玩但不进全球榜。

旧 Supabase 榜单位于历史榜，不按同名自动归属新账号。多人局内积分规则不变。详细规则见 ACCOUNT-SYSTEM.md。
