#!/usr/bin/env python3
"""Generate a Railway deploy token for CI/CD."""
import json, subprocess

# Read the existing token from railway config
with open("/Users/openclaw/.railway/config.json") as f:
    cfg = json.load(f)

token = cfg["user"]["accessToken"]
project_id = "210bf2ca-cb73-4b85-b33c-42b991b2c37d"
environment_id = "6f838e13-2ee2-4f6f-9c1b-0e85722baee2"

query = {
    "query": """
    mutation CreateProjectToken($input: ProjectTokenCreateInput!) {
        projectTokenCreate(input: $input) {
            id
            token
            name
        }
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

result = subprocess.run(
    ["curl", "-s", "-H", f"Authorization: Bearer {token}",
     "-H", "Content-Type: application/json",
     "https://backboard.railway.com/graphql/v2",
     "-d", json.dumps(query)],
    capture_output=True, text=True
)

data = json.loads(result.stdout)
print(json.dumps(data, indent=2))
