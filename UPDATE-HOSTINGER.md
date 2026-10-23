# V1.1.11 → V1.1.12 更新

本版同时修改共享玩法、浏览器显示和多人服务器。前后端必须一起更新；下载不会自动更新网站。

## 上传 GitHub

打开 https://github.com/ChenghsienS/DeadTown2.0 ，点击 Add file → Upload files。

解压 `DeadTown-V1.1.12-update.zip`，进入 `DeadTown` 文件夹，把其中的文件和文件夹上传到仓库根目录并提交。无需清空仓库；不要上传 ZIP 本身，也不要多套一层 DeadTown 文件夹。更新包只适用于 V1.1.11。若不确定当前版本，使用完整包 `DeadTown-V1.1.12.zip`。

务必一起上传新增 `crowd.js`、`visual-effects.js`、`snapshot-codec.js`，以及更新包里的 `server/`、`tests/`、页面、版本与其他脚本。完整包保留上一版作者头像和音效，不需要另外下载素材。

## VPS 更新

先等当前对局结束；重启会结束正在进行的房间。在 Hostinger VPS Web console 执行：

```bash
cd /opt/deadtown &&
git pull --ff-only &&
npm run check &&
systemctl restart deadtown
```

如果拉取或检查失败，后续重启不会执行；保留错误文字再排查。没有新增服务器 npm 依赖。

完成后单独执行：

```bash
systemctl is-active deadtown
curl -fsS http://127.0.0.1:3000/health
```

应显示 `active`，健康接口 `version` 为 `1.1.12`。所有玩家按 **Ctrl + F5**，主页也应为 V1.1.12。Nginx、域名、证书、端口和 systemd 配置不用改。

## 上线后验证

1. 单人和多人分别走动、持续开火、翻滚和撞墙，检查动作与碰撞。
2. 多人中用原先延迟较高的客机走直线、转向和停止，观察回拉；测试聊天、倒地救援、死亡动画和再次开局。
3. 展开右上角“性能详情”。记录 Ping、抖动/缓冲、FPS/1% LOW、服务器每步耗时和更新频率，尤其是停顿发生时。
4. 短时间网络波动应继续响应本地移动；超过 1.2 秒没有可用状态则停止预测并等待恢复。真正断开连接后仍需重新进入大厅，不支持恢复原对局。

本版针对同步积压、重复传输和计算开销。网络地理距离没有改变，不保证公网 Ping 下降到某个数字。此次未在你的 VPS 或真实浏览器中实测，测试范围与压力数据见 `verification/PERFORMANCE-V1.1.12.md`。

常规自动化验证：`npm test`（Node.js 22+）。原生 Canvas 专项测试只用于开发验证，不需要在 VPS 安装其可选依赖。
