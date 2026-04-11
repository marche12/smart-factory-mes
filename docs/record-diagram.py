"""
system-flow.html diagram to video recorder
Uses Playwright to open the diagram, play the animation, and record as WebM video.
"""
import os, time
from playwright.sync_api import sync_playwright

HTML_PATH = os.path.join(os.path.dirname(__file__), 'system-flow.html')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'packflow-diagram.webm')

def main():
    print("[1/4] Starting browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=os.path.dirname(__file__),
            record_video_size={"width": 1920, "height": 1080}
        )
        page = context.new_page()

        file_url = "file:///" + HTML_PATH.replace("\\", "/")
        print("[2/4] Loading diagram...")
        page.goto(file_url)
        page.wait_for_timeout(2000)

        # Set speed to faster for recording
        page.evaluate("document.getElementById('speedRange').value = 1200")
        page.evaluate("document.getElementById('speedVal').textContent = '1.2s'")

        print("[3/4] Playing animation (recording)...")
        # Start playback
        page.evaluate("togglePlay()")

        # Wait for all steps to complete
        # Get number of steps
        num_steps = page.evaluate("steps.length")
        wait_time = num_steps * 1.2 + 5  # steps * speed + buffer
        print(f"    {num_steps} steps, waiting {wait_time:.0f}s...")
        page.wait_for_timeout(int(wait_time * 1000))

        # Show all view for ending
        page.evaluate("showAll()")
        page.wait_for_timeout(3000)

        print("[4/4] Saving video...")
        page.close()

        video_path = context.pages[0].video.path() if context.pages else None
        context.close()
        browser.close()

    # Find the recorded video file
    doc_dir = os.path.dirname(__file__)
    webm_files = [f for f in os.listdir(doc_dir) if f.endswith('.webm') and f != 'packflow-diagram.webm']
    if webm_files:
        latest = max(webm_files, key=lambda f: os.path.getmtime(os.path.join(doc_dir, f)))
        src = os.path.join(doc_dir, latest)
        os.replace(src, OUTPUT_PATH)
        size_mb = os.path.getsize(OUTPUT_PATH) / (1024*1024)
        print(f"\nDone! Video saved:")
        print(f"  {OUTPUT_PATH}")
        print(f"  Size: {size_mb:.1f} MB")
    else:
        print("Warning: Video file not found. Check docs/ folder for .webm files.")

if __name__ == "__main__":
    main()
