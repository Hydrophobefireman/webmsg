import os
import json

with open(".env.json") as f:
    data = json.load(f)
for k, v in data.items():
    os.environ[k] = v

