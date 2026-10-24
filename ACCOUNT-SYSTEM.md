# V1.1.14 账号、等级与排行榜

## 玩家使用

- 主页和多人房间提供登录、注册、账号资料与退出按钮。游客仍能游玩单人和多人；单人开局提示登录或注册才能进入全球排行榜。
- **登录用户名**：10–25 位 ASCII 英文字母或 0–9 数字，唯一，判重和登录不区分大小写。用户名只出现在自己的账号卡片，不广播给其他玩家。
- **密码**：8–64 位 ASCII 英文字母或 0–9 数字，至少一个大写英文字母。注册需重复确认。根据“数字和字母”的常见用法实现，不接受 `Ⅰ、Ⅱ、Ⅲ` 等 Unicode 罗马数字符号。
- **游戏内名称**：1–20 个可见字符（Unicode 字素），支持中文、日文、阿拉伯文、组合重音和 emoji，允许同名。不允许换行、控制符或方向覆盖符；去掉首尾空白。
- **改名冷却**：每次成功改名后等待完整 72 小时，按服务器时间判断。注册与旧账号首次改名不触发预先等待；重复保存原名、修改头像不重置冷却。资料界面显示剩余等待时间，客户端改时钟也无法绕过服务器校验。
- **头像**：余烬、救护员、巡林者、防化员、哨兵，共五款像素头像。注册时选择，登录后可修改；与角色皮肤/配色相互独立。
- 头像显示在主页、房间成员、多人局内分数排行和结算排行。游戏名与头像修改后同步到已连接的房间和战斗。自身名称仍为白色，队友蓝色。
- 游客可以在房间中直接注册/登录，无需离开房间。退出登录会结束该登录会话对应的联机连接。
- 登录保持 7 天；无需邮箱。当前没有邮件找回密码功能，请保管好用户名和密码。

## 排行榜迁移

新全球前十按账号 ID 保存单人最高分，显示游戏名、头像与账号等级。重名或改名不会转移成绩。多人局内与结算按本局个人得分排名；合作成绩仍不混入单人全球榜，但可获得账号经验。

原 Supabase 榜单保留为**只读历史榜**。新客户端不再向旧表写分，也不会凭相同游戏名认领旧成绩。本版本没有清空或重新配置你的 Supabase 项目。

单人开局签发绑定账号的局记录，结算才上传。游客成绩不追溯补录，开发者模式不上传。网络故障会在本设备排队，24 小时内登录原账号可自动重试；换账号不会认领这笔成绩。

单人玩法仍在浏览器本地运行。服务器验证登录、局记录、基本数值范围和最高分更新，**并非完整反作弊系统**；修改浏览器运行代码仍可能伪造单人成绩。多人战斗继续由服务器计算。

## 账号等级

登录账号后完整结束一局，按最终分数的十分之一向下取整发放经验。单人死亡结算有效；多人按开局时绑定的账号及服务器确认的个人得分发放，阵亡后继续留在房间到团队结算也有效。退出当前对局、游客、开发者模式以及开局时未建立账号局记录的对局不发经验。

等级从 1 开始，暂时上限为 100。主页和房间显示等级与当前升级进度，结算显示本局经验增长、跨级动画及距下一级的经验。多人和单人的经验累积到同一个账号；等级暂不增加战斗属性。

服务器原子保存经验及该局结算回执。单人成绩丢失响应可在原账号下重试，不会重复发放；多人完成事件只来自服务器房间线程。旧账号缺失经验字段时视为 0 XP，不修改原密码和分数。曲线、上限与补传限制见 [PROGRESSION.md](PROGRESSION.md)。

## 服务端与持久化

无新增 npm 运行依赖，不需要创建 Supabase Auth 项目或执行 SQL。账号由现有 Dead Town Node 服务器保存。

默认数据目录是**运行 Node 服务的系统用户主目录下 `.local/share/deadtown`**。root 服务对应 `/root/.local/share/deadtown`。可设置 `DEADTOWN_DATA_DIR` 为固定绝对路径；改变服务用户或目录前要迁移已有数据。

你当前 Hostinger 的 systemd 配置已使用 `DEADTOWN_DATA_DIR=/var/lib/deadtown`，实际文件为 `/var/lib/deadtown/accounts.json`。更新时保留现有 `20-account-storage.conf`，不要切回默认目录，否则会看到另一个空数据库。

- `accounts.json` 包含账号、加盐密码哈希、会话摘要、最高分、总经验、上次改名时间与局记录。目录权限 0700，文件权限 0600。
- `accounts.lock` 限制一个数据目录只有一个写入进程；房间 worker 不访问账号文件。
- 数据位于代码仓库外，GitHub 重传、`git pull` 和游戏更新包不会覆盖账号。
- 写入使用临时文件、同步落盘和原子替换，按顺序处理并发修改。损坏的数据库会报告失败，绝不以空库覆盖。
- 定期私下备份数据目录，尤其是迁移 VPS 前。不要放进 GitHub、`assets/` 或公开网页目录。停止服务后备份/恢复最稳妥；不要把旧运行锁文件恢复给新进程。
- 密码使用随机盐及异步 scrypt（N=32768、r=8、p=3）。会话 Cookie 为 HttpOnly、SameSite=Lax，HTTPS 下带 Secure；服务器仅保存随机会话值的摘要。
- 注册/登录有限流。前后端都验证输入；写接口要求 JSON、同源与 HTTPS（本机 localhost 开发例外）。公开接口和联机快照不会发送用户名、密码或密码哈希。

直接打开 `file://…/index.html` 仍可离线单人游玩；登录、注册和新榜单需要通过 Node 服务提供的游戏网站。

## Nginx 配置

Hostinger 的 Nginx 应把 `/api/` 交给同一 Node 服务，覆盖以下请求头：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

已有 `location /` 代理所有请求并设置这三项时，无需额外添加。保留原 `/ws` 配置。Node 端口应只供本机 Nginx 访问；程序只信任 loopback 代理的转发协议/IP 请求头。修改配置后先 `nginx -t`，通过后再 `systemctl reload nginx`。

## 验证与限制

运行 `npm run check`、`npm test`。`npm run test:native` 使用可选开发依赖 `@napi-rs/canvas`；`npm run test:browser` 使用单独安装的 Playwright，`DEADTOWN_BROWSER` 可指定 Chromium 路径。生产包不需要这些测试依赖。

浏览器测试创建临时服务器和临时账号，不访问或改动线上账号。测试使用受控分数及加速结算以缩短等待，不代表反作弊验收。新增等级浏览器测试通过 `npm run test:browser:progression` 运行；本版结果见 `verification/PROGRESSION-V1.1.14.md`，前版账号设计见 `verification/ACCOUNTS-V1.1.13.md`。未自动上传 GitHub 或部署 Hostinger。

参考：[OWASP 密码存储](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)、[Node.js Crypto](https://nodejs.org/api/crypto.html)、[OWASP CSRF 防护](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)。
