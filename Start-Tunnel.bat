@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Dead Town - Public Tunnel
if not defined PORT set PORT=8080
set "DT_CLOUDFLARED="
if exist "tools\cloudflared.exe" set "DT_CLOUDFLARED=%~dp0tools\cloudflared.exe"
if not defined DT_CLOUDFLARED (
  where cloudflared >nul 2>nul
  if not errorlevel 1 set "DT_CLOUDFLARED=cloudflared"
)
if not defined DT_CLOUDFLARED (
  echo 请先安装官方 cloudflared，或将 Windows 可执行文件重命名为 cloudflared.exe 放入 tools 文件夹。
  echo Install official cloudflared, or place cloudflared.exe in the tools folder.
  echo https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/
  pause
  exit /b 1
)
echo 请确认 Start-Server.bat 已启动。此窗口会公开本地游戏服务器。
echo 将生成的 https://...trycloudflare.com 地址发给朋友，保持两个窗口开启。
echo Server must be running. Share the generated https://...trycloudflare.com URL.
"%DT_CLOUDFLARED%" tunnel --url http://localhost:%PORT%
pause
