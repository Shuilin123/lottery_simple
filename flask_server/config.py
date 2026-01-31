# 奖品设置

import json
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRIZES_PATH = os.path.join(BASE_DIR, 'data', 'prizes.json')
with open(PRIZES_PATH, 'r', encoding='utf-8') as f:
    p = json.load(f)

prizes = p["prizes"]
EACH_COUNT = []
COMPANY = "💜"
