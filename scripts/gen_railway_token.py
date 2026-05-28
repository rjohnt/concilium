#!/usr/bin/env python3
"""Generate a Railway deploy token for CI/CD using the existing auth session."""
import json
import os
import subprocess

cfg_path = os.path.expanduser("~/.railway/config.json")
with open(cfg_path) as f:
    cfg = json.load(f)

token = cfg["user"]["accessToken"]
project_id = "210bf2ca-cb73-4b85-b33c-42b991b2c37d"
environment_id = "6f838e13-2ee2-4f6f-9c1b-0e85722baee2"

query = {
    "query": """
    mutation CreateProjectToken($input: ProjectTokenCreateInput!) {
        projectTokenCreate(input: $input)
    }
    """,
    "variables": {
        "input": {
            "projectId": project_id,
            "environmentId": environment_id,
            "name": "github-actions-auto-deploy"
        }
    }
}

auth_header = "Authorization: Bearer " + token
result = subprocess.run(
    ["curl", "-s",
     "-H", auth_header,
     "-H", "Content-Type: application/json",
     "https://backboard.railway.com/graphql/v2",
     "-d", json.dumps(query)],
    capture_output=True, text=True
)

data = json.loads(result.stdout)
if "errors" in data:
    print("ERRORS:", json.dumps(data["errors"], indent=2))
else:
    tok = data.get("data", {}).get("projectTokenCreate")
    print("TOKEN:", tok)
    print("ID:", "N/A - String type")
    print("NAME:", "github-actions-auto-deploy")
