"""Compare arrival times of identical RTSP frames with automatic vs one decode thread."""
import os
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
import cv2
import hashlib
import json
from pathlib import Path
import threading
import time

root = Path(__file__).resolve().parent.parent
url = json.loads((root / "config/devices.json").read_text(encoding="utf-8-sig"))["camera"]["rtspUrl"]
samples, metadata = {}, {}
def capture(name, threads):
    params = [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000, cv2.CAP_PROP_READ_TIMEOUT_MSEC, 3000]
    if threads is not None:
        params += [cv2.CAP_PROP_N_THREADS, threads]
    started = time.perf_counter()
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG, params)
    metadata[name] = {"opened": cap.isOpened(), "threads": cap.get(cv2.CAP_PROP_N_THREADS), "fps": cap.get(cv2.CAP_PROP_FPS)}
    frames = samples[name] = {}
    end = time.perf_counter() + 14
    try:
        while time.perf_counter() < end:
            ok, frame = cap.read()
            now = time.perf_counter()
            if not ok:
                break
            if not frames:
                metadata[name]["firstFrameMs"] = round((now-started)*1000)
            frames.setdefault(hashlib.sha1(frame.tobytes()).hexdigest(), now)
        metadata[name]["frames"] = len(frames)
        metadata[name]["dtsDelay"] = cap.get(cv2.CAP_PROP_DTS_DELAY)
    finally:
        cap.release()
workers = [threading.Thread(target=capture,args=(name,count)) for name,count in [("automatic",None),("single",1)]]
for worker in workers: worker.start()
for worker in workers: worker.join()
deltas = sorted((samples["automatic"][key]-samples["single"][key])*1000 for key in samples["automatic"].keys() & samples["single"].keys())
report = {"streams":metadata,"identicalFrames":len(deltas),"automaticMinusSingleMs":
    {"p50":round(deltas[len(deltas)//2]),"p95":round(deltas[int(len(deltas)*.95)]),"min":round(min(deltas))} if deltas else None}
(root / "验证记录/camera-decode-comparison.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps(report,indent=2))
