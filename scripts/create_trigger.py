#!/usr/bin/env python3
"""Create a Railway GitHub deployment trigger (auto-deploy on push to main)."""
import json, os, subprocess

cfg_path = os.path.expanduser("~/.railway/config.json")
with open(cfg_path) as f:
    cfg = json.load(f)
token = cfg["user"]["accessToken"]

query = {
    "query": """
    mutation CreateTrigger($input: DeploymentTriggerCreateInput!) {
        deploymentTriggerCreate(input: $input) {
            id
            branch
            provider
            repository
        }
    }
    """,
    "variables": {
        "input": {
            "projectId": "210bf2ca-cb73-4b85-b33c-42b991b2c37d",
            "environmentId": "6f838e13-2ee2-4f6f-9c1b-0e85722baee2",
            "serviceId": "261a888c-6544-4a4c-9e30-ae176b58d907",
            "provider": "GITHUB",
            "repository": "rjohnt/concilium",
            "branch": "main",
            "checkSuites": True
        }
    }
}

hdr = "Authorization: Bearer *** + token
result = subprocess.run(
    ["curl", "-s", "-H", hdr, "-H", "Content-Type: application/json",
     "https://backboard.railway.com/graphql/v2", "-d", json.dumps(query)],
    capture_output=True, text=True
)

data = json.loads(result.stdout)
if "errors" in data:
    print("ERRORS:", json.dumps(data["errors"], indent=2))
else:
    print("SUCCESS:", json.dumps(data["data"], indent=2))
