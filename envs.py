import os
import json

if os.path.isfile(os.path.join(os.getcwd(), ".env.json")):
    with open(".env.json") as f:
        data = json.load(f)
    for k, v in data.items():
        os.environ[k] = v

