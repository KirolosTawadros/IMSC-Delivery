import urllib.request
import urllib.parse
import json
import time

base_url = "http://test.imsc-eg.com/api/resource/DocType/"
headers = {
    "Authorization": "token 2d0db5446542e2b:5479ba98b785810"
}
doctypes = [
    "Delivery Stop",
    "Delivery Plan Detail",
    "Operation Order Item",
    "Operation Order Requirement"
]

with open("doctypes_meta.json", "r") as f:
    results = json.load(f)

for dt in doctypes:
    if dt in results:
        continue
    url = base_url + urllib.parse.quote(dt)
    req = urllib.request.Request(url, headers=headers)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                data = json.loads(response.read().decode())
                fields = []
                if "data" in data and "fields" in data["data"]:
                    for f in data["data"]["fields"]:
                        fields.append({
                            "fieldname": f.get("fieldname"),
                            "fieldtype": f.get("fieldtype"),
                            "label": f.get("label"),
                            "options": f.get("options")
                        })
                results[dt] = fields
                print(f"Successfully fetched {dt} ({len(fields)} fields)")
                break
        except Exception as e:
            print(f"Failed to fetch {dt} (attempt {attempt+1}): {e}")
            time.sleep(2)

with open("doctypes_meta.json", "w") as f:
    json.dump(results, f, indent=2)

print("Saved child doctypes to doctypes_meta.json")
