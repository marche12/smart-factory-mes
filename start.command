#!/bin/bash
cd "$(dirname "$0")"
echo "=================================================="
echo "  이노패키지 MES 서버 시작..."
echo "  접속: http://localhost:8080"
echo "=================================================="
echo ""
pip3 install -q fastapi uvicorn aiofiles python-multipart 2>/dev/null
python3 server.py
