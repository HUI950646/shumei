import os
os.environ["YOLO_AUTOINSTALL"] = "false"
import cv2
import json
import numpy as np
from pathlib import Path
import statistics
import time
import torch
from ultralytics import YOLO
from urllib.request import urlopen
root = Path(__file__).resolve().parent.parent
frame = json.load(urlopen("http://127.0.0.1:3001/api/live/frame"))
image = cv2.imdecode(np.frombuffer(urlopen("http://127.0.0.1:3001" + frame["vision"]["imageUrl"]).read(),np.uint8),cv2.IMREAD_COLOR)
model = YOLO(str(root / "models/yolov8n.pt"))
torch.set_num_threads(2)
def predict():
    return model.predict(image,imgsz=640,conf=.3,classes=[0,1,2,3,5,7],max_det=100,device="cpu",verbose=False)[0]
predict()
default_threads = torch.get_num_threads()
results = []
for threads in [default_threads, 4, 2, 1]:
    torch.set_num_threads(threads)
    predict()
    timings = []
    for _ in range(8):
        started = time.perf_counter()
        result = predict()
        timings.append((time.perf_counter()-started)*1000)
    results.append({"threads":threads,"p50Ms":round(statistics.median(timings)),"maxMs":round(max(timings)),
                    "detections":len(result.boxes),"actualThreads":torch.get_num_threads()})
report = {"initialThreadsAfterModelSetup":default_threads,"results":results}
(root / "验证记录/camera-inference-comparison.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps(report,indent=2))
