import urllib.request
import urllib.parse
import json

base_url = "http://test.imsc-eg.com/api/resource/DocType/"
headers = {
    "Authorization": "token 2d0db5446542e2b:5479ba98b785810"
}
doctypes = [
    "Operation Order",
    "Stock Fulfillment",
    "Delivery Plan",
    "Delivery Trip",
    "Delivery Form"
]

results = {}

for dt in doctypes:
    url = base_url + urllib.parse.quote(dt)
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
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
            
            # Check for Table fields (child tables) and fetch them
            for f in fields:
                if f["fieldtype"] == "Table" and f["options"]:
                    child_dt = f["options"]
                    if child_dt not in doctypes:
                        doctypes.append(child_dt)
                        
    except Exception as e:
        print(f"Failed to fetch {dt}: {e}")

with open("doctypes_meta.json", "w") as f:
    json.dump(results, f, indent=2)

print("Saved to doctypes_meta.json")
