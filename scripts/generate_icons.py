"""
팩플로우 PWA 아이콘 생성 스크립트
=================================
가독성 우선 시안: 선 두께↑, 로고 중앙 배치, 그림자/외곽선으로 대비 강화
Pillow 필요: pip install Pillow
"""
import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ===== 디자인 상수 =====
BG_COLOR_CENTER = (59, 130, 246)       # #3B82F6 — 테마 파란색
BG_COLOR_EDGE   = (37, 99, 235)        # #2563EB — 그라디언트 가장자리
LOGO_COLOR      = (255, 255, 255)      # 흰색 로고
LOGO_SHADOW     = (20, 60, 160, 80)    # 로고 아래 어두운 그림자 (RGBA)
LOGO_OUTLINE    = (30, 64, 175, 50)    # 로고 외곽 얇은 테두리 (RGBA)

# 해상도별 파라미터: (size, line_width, logo_scale, outline_width)
ICON_CONFIGS = {
    192:  {"line_w": 6,  "logo_scale": 0.42, "outline_w": 1.5, "shadow_blur": 3},
    512:  {"line_w": 12, "logo_scale": 0.40, "outline_w": 2.5, "shadow_blur": 6},
}

# Maskable 안전 영역: 전체의 80% (중앙 원 안에 콘텐츠)
MASKABLE_SAFE_RATIO = 0.80

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")


def radial_gradient(size: int, center_color: tuple, edge_color: tuple) -> Image.Image:
    """원형 그라디언트 배경 생성."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx, cy = size / 2, size / 2
    radius = size / 2
    pixels = img.load()
    for y in range(size):
        for x in range(size):
            dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            t = min(dist / radius, 1.0)
            t = t * t  # 부드러운 곡선
            r = int(center_color[0] + (edge_color[0] - center_color[0]) * t)
            g = int(center_color[1] + (edge_color[1] - center_color[1]) * t)
            b = int(center_color[2] + (edge_color[2] - center_color[2]) * t)
            pixels[x, y] = (r, g, b, 255)
    return img


def draw_packflow_logo(draw: ImageDraw.Draw, cx: float, cy: float,
                       logo_size: float, line_w: int, color: tuple):
    """
    팩플로우 'ㅍ' 로고 그리기.
    ㅍ = 상단 가로선 + 좌측 세로선 + 우측 세로선 + 하단 가로선
    가독성 우선: 균형 잡힌 비율, 선 두께 강화
    """
    half = logo_size / 2
    # 상자 경계 (중앙 정렬)
    left = cx - half
    right = cx + half
    top = cy - half * 0.85   # 약간 위로 올려 시각 중심 보정
    bottom = cy + half * 0.85

    # 내부 칸막이 위치 (우측 60% 지점 — ㅍ의 세로 칸막이)
    inner_x = left + (right - left) * 0.62

    hw = line_w / 2  # 반폭

    # 상단 가로선
    draw.rectangle([left, top - hw, right, top + hw], fill=color)
    # 하단 가로선
    draw.rectangle([left, bottom - hw, right, bottom + hw], fill=color)
    # 좌측 세로선
    draw.rectangle([left - hw, top, left + hw, bottom], fill=color)
    # 우측 세로선
    draw.rectangle([right - hw, top, right + hw, bottom], fill=color)
    # 내부 세로 칸막이 (ㅍ 형태)
    draw.rectangle([inner_x - hw, top, inner_x + hw, bottom], fill=color)


def generate_icon(size: int, maskable: bool = False) -> Image.Image:
    """아이콘 한 장 생성."""
    cfg = ICON_CONFIGS.get(size, ICON_CONFIGS[512])
    line_w = cfg["line_w"]
    logo_scale = cfg["logo_scale"]
    outline_w = cfg["outline_w"]
    shadow_blur = cfg["shadow_blur"]

    # 고해상도에서 작업 후 다운스케일 (안티앨리어싱 개선)
    scale = 2
    ws = size * scale
    img = Image.new("RGBA", (ws, ws), (0, 0, 0, 0))

    cx, cy = ws / 2, ws / 2
    radius = ws / 2

    if maskable:
        # Maskable: 배경 꽉 채움 (사각형), 로고는 안전 영역 안
        bg = Image.new("RGBA", (ws, ws), BG_COLOR_CENTER + (255,))
        grad = radial_gradient(ws, BG_COLOR_CENTER, BG_COLOR_EDGE)
        img = Image.alpha_composite(bg, grad)
        logo_size = ws * logo_scale * MASKABLE_SAFE_RATIO
    else:
        # 일반: 원형 배경
        bg = radial_gradient(ws, BG_COLOR_CENTER, BG_COLOR_EDGE)
        # 원형 마스크
        mask = Image.new("L", (ws, ws), 0)
        mask_draw = ImageDraw.Draw(mask)
        margin = ws * 0.02  # 가장자리 약간의 여백
        mask_draw.ellipse([margin, margin, ws - margin, ws - margin], fill=255)
        # 부드러운 엣지 (안티앨리어싱)
        mask = mask.filter(ImageFilter.GaussianBlur(scale * 1.2))
        img = Image.new("RGBA", (ws, ws), (240, 244, 248, 255))  # 연한 배경
        img.paste(bg, mask=mask)
        logo_size = ws * logo_scale

    lw = int(line_w * scale)
    ow = max(1, int(outline_w * scale))

    # --- 그림자 레이어 ---
    shadow_layer = Image.new("RGBA", (ws, ws), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    draw_packflow_logo(shadow_draw, cx + scale, cy + scale * 2,
                       logo_size, lw + ow * 2, LOGO_SHADOW)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(shadow_blur * scale))
    img = Image.alpha_composite(img, shadow_layer)

    # --- 외곽선 레이어 (얇은 어두운 테두리) ---
    outline_layer = Image.new("RGBA", (ws, ws), (0, 0, 0, 0))
    outline_draw = ImageDraw.Draw(outline_layer)
    draw_packflow_logo(outline_draw, cx, cy, logo_size, lw + ow * 2, LOGO_OUTLINE)
    img = Image.alpha_composite(img, outline_layer)

    # --- 메인 로고 ---
    logo_layer = Image.new("RGBA", (ws, ws), (0, 0, 0, 0))
    logo_draw = ImageDraw.Draw(logo_layer)
    draw_packflow_logo(logo_draw, cx, cy, logo_size, lw, LOGO_COLOR + (255,))
    img = Image.alpha_composite(img, logo_layer)

    # 다운스케일 (LANCZOS = 고품질 리사이즈)
    img = img.resize((size, size), Image.LANCZOS)

    # RGBA → RGB (PNG는 투명 필요 없으면 RGB가 파일 크기 작음)
    if not maskable:
        final = Image.new("RGB", (size, size), (240, 244, 248))
        final.paste(img, mask=img.split()[3])
        return final
    else:
        final = Image.new("RGB", (size, size), BG_COLOR_CENTER)
        final.paste(img, mask=img.split()[3])
        return final


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    files_generated = []

    for size in [192, 512]:
        # 일반 아이콘
        icon = generate_icon(size, maskable=False)
        path = os.path.join(OUTPUT_DIR, f"icon-{size}.png")
        icon.save(path, "PNG", optimize=True)
        files_generated.append(path)
        print(f"[OK] icon-{size}.png ({os.path.getsize(path):,} bytes)")

        # Maskable 아이콘
        maskable = generate_icon(size, maskable=True)
        mask_path = os.path.join(OUTPUT_DIR, f"icon-{size}-maskable.png")
        maskable.save(mask_path, "PNG", optimize=True)
        files_generated.append(mask_path)
        print(f"[OK] icon-{size}-maskable.png ({os.path.getsize(mask_path):,} bytes)")

    print(f"\n총 {len(files_generated)}개 아이콘 생성 완료")
    return files_generated


if __name__ == "__main__":
    main()
