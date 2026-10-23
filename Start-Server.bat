@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Dead Town - Multiplayer Server
where node >nul 2>nul
if errorlevel 1 (
  echo 请先从 https://nodejs.org/ 安装 Node.js LTS，然后重新打开此文件。
  echo Install Node.js LTS from https://nodejs.org/ and try again.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 (
  echo 需要 Node.js 22 或更新版本。 / Node.js 22 or newer is required.
  pause
  exit /b 1
)
if not defined PORT set PORT=8080
if not defined MAX_ROOMS set MAX_ROOMS=4
if not defined SERVER_NAME set SERVER_NAME=Dead Town
if not defined HOST set HOST=0.0.0.0
echo 启动后，在浏览器打开下方 Local 地址。请保持此窗口开启。
echo Open the Local address below. Keep this window running.
node server.js
pause
