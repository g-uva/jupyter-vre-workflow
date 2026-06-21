export interface IExportJsonProps {
  title: string;
  creator: string;
  email: string;
  orcid: string;
  session_metrics: string;
  creation_date: string;
  token: string;
  experiment_id: string;
  workflow_id: string;
}

export const getUsername = `
import os
hostname = os.environ.get("HOSTNAME", "")
print(hostname[8:] if hostname.startswith("jupyter-") else hostname)
`;

export const generateExperimentIdAndStartTime = (
  workflowId: string,
  notebookDirectory: string
) => `
import os
import json
from datetime import datetime, timezone
import hashlib

ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
os.environ["START_TIME"] = ts
experiment_id = f"experiment-{hashlib.sha256(ts.encode()).hexdigest()[:8]}-{ts}"
os.environ["EXPERIMENT_ID"] = experiment_id
os.environ["WORKFLOW_ID"] = ${JSON.stringify(workflowId)}
experiment_dir = os.path.join(
    os.getcwd(),
    ${JSON.stringify(notebookDirectory)},
    ".lib",
    "experiments",
    os.environ["WORKFLOW_ID"],
    experiment_id,
)
os.makedirs(experiment_dir, exist_ok=True)
print(json.dumps({
    "start_time": ts,
    "experiment_id": experiment_id,
    "workflow_id": os.environ["WORKFLOW_ID"],
}))
`;

export const getExperimentId = `
import os
print("Getting experiment ID: " + os.environ["EXPERIMENT_ID"])
`;

export const cleanExperimentMetadata = `
import os
experiment_temp = os.environ.get("EXPERIMENT_ID", "")
for key in ["EXPERIMENT_ID", "WORKFLOW_ID", "START_TIME", "END_TIME"]:
    os.environ.pop(key, None)
print(f"Cleared Experiment {experiment_temp} metadata.")
`;

export const getEndTime = `
import os
from datetime import datetime, timezone
et = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
os.environ["END_TIME"] = et
print(et)
`;

export const getExperimentEnvironment = `
import os
import json
print(json.dumps({
    "workflow_id": os.environ.get("WORKFLOW_ID"),
    "experiment_id": os.environ.get("EXPERIMENT_ID"),
    "start_time": os.environ.get("START_TIME"),
    "end_time": os.environ.get("END_TIME"),
}))
`;
