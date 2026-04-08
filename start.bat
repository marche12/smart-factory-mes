@echo off
chcp 65001 >nul
title 팩플로우 서버
echo ========================================
echo   팩플로우 서버 시작
echo   접속: http://localhost:8080
echo ========================================
echo.
pip install -q fastapi uvicorn aiofiles python-multipart 2>nul
python server.py
pause
