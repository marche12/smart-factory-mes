@echo off
chcp 65001 >nul
title 이노패키지 MES 서버
echo ========================================
echo   이노패키지 MES 서버 시작
echo   접속: http://localhost:8080
echo ========================================
echo.
pip install -q fastapi uvicorn aiofiles python-multipart 2>nul
python server.py
pause
