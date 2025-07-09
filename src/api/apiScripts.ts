import { toLowerCaseWithUnderscores } from '../helpers/utils';

export const getOS = `
uname_str="$(uname -s)"
os_info=""

case "\${uname_str}" in
    Linux*)
        if [ -f /etc/os-release ]; then
            # Parse common distro info
            . /etc/os-release
            os_info="Linux ($NAME $VERSION)"
        else
            os_info="Linux (Unknown distro)"
        fi
        ;;
    Darwin*)
        # Use sw_vers for macOS version info
        if command -v sw_vers &>/dev/null; then
            product_name=$(sw_vers -productName)
            product_version=$(sw_vers -productVersion)
            os_info="Mac ($product_name $product_version)"
        else
            os_info="Mac (Unknown version)"
        fi
        ;;
    CYGWIN*|MINGW*|MSYS*)
        # Try to get Windows version info
        if command -v cmd.exe &>/dev/null; then
            win_ver=$(cmd.exe /c ver | tr -d '\r')
            os_info="Windows ($win_ver)"
        else
            os_info="Windows (Unknown version)"
        fi
        ;;
    *)
        os="UNKNOWN:\${uname_str}"
        os_info="Unknown OS"
        ;;
esac
export OS_INFO="$os_info"
`;

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

export const exportSendJson = (props: IExportJsonProps) => `
%%bash

${getOS}

export EXPORT_JSON_PATH=".lib/export_metadata.json"

name=${toLowerCaseWithUnderscores(props.title)}
title="${props.title}"
creator="${props.creator}"
workflow_id="${props.workflow_id}"
experiment_id="${props.experiment_id}"
os="$OS_INFO"
email="${props.email}"
pi="${props.orcid}"
metrics="${props.session_metrics}"
platform="GreenDIGIT"
node="node_01"
lang="python"
creation_date="${props.creation_date}"
project_id="greendigit_development"

json_payload=$(jq -n \
  --arg name $name \
  --arg title "$title" \
  --arg creator "$creator" \
  --arg workflow_id "$workflow_id" \
  --arg experiment_id "$experiment_id" \
  --arg os "$os" \
  --arg email "$email" \
  --arg pi "$pi" \
  --arg metrics "$metrics" \
  --arg platform "$platform" \
  --arg node "$node" \
  --arg lang "$lang" \
  --arg creation_date "$creation_date" \
  --arg project_id "$project_id" \
  '{
    name: $name,
    title: $title,
    license_id: "AFL-3.0",
    private: "False",
    notes: "GreenDIGIT EcoJupyter submission dev.",
    url: "null",
    tags: [{ name: "sustainability" }],
    resources: [{
      name: "RO-Crate metadata",
      url: "https://mc-a4.lab.uvalight.net/",
      format: "zip"
    }],
    extras: [
      { key: "Creation Date", value: $creation_date },
      { key: "Creator", value: $creator },
      { key: "Creator Email", value: $email },
      { key: "Creator Name PI (Principal Investigator)", value: $pi },
      { key: "Environment OS", value: $os },
      { key: "Environment Platform", value: $platform },
      { key: "Experiment Dependencies", value: "null" },
      { key: "Experiment ID", value: $experiment_id },
      { key: "GreenDIGIT Node", value: $node },
      { key: "Programming Language", value: $lang },
      { key: "Project ID", value: $project_id },
      { key: "Session reading metrics", value: $metrics },
      { key: "system:type", value: "Experiment" }
    ]
  }')

echo $json_payload > $EXPORT_JSON_PATH

AUTH_TOKEN="${props.token}"

json_obj=$(jq . ".lib/export_metadata.json")
echo $json_obj
curl --header "Content-Type: application/json" \
    --header "Authorization: Bearer $AUTH_TOKEN" \
    --location "https://api.d4science.org/gcat/items" \
    --data-raw "$json_obj"
`;

export const saveUsernameSh = `
%%bash
mkdir -p .lib
echo \${HOSTNAME#jupyter-} > .lib/hostname
echo "Username saved to .lib/hostname"
`;

export const generateExperimentIdAndStartTime = `
import os
from datetime import UTC, datetime, timezone
import hashlib

ts = datetime.now(UTC).strftime("%Y-%m-%d %H:%M")
os.environ["START_TIME"] = ts
experiment_id = f"experiment-{hashlib.sha256(ts.encode()).hexdigest()[:8]}-{ts}"
os.environ["EXPERIMENT_ID"] = experiment_id
print("Created experiment ID environment var $EXPERIMENT_ID")
`;

export const createExperimentIdFolderSh = `
%%bash
mkdir -p ".lib/experiments/$WORKFLOW_ID/$EXPERIMENT_ID"
echo "Created Experiment ID folder $EXPERIMENT_ID in workflow $WORKFLOW_ID"
`;

export const getExperimentId = `
import os
print("Getting experiment ID: " + os.environ["EXPERIMENT_ID"])
`;

export const getUsernameSh = `
%%bash
echo "$(cat .lib/hostname)"
`;

export const installPrometheusScaphandre: string = `
%%bash
curl -O https://raw.githubusercontent.com/g-uva/JupyterK8sMonitor/refs/heads/master/scaphandre-prometheus-ownpod/install-scaphandre-prometheus.sh
sudo chmod +x install-scaphandre-prometheus.sh
./install-scaphandre-prometheus.sh
sudo rm -rf ./install-scaphandre-prometheus.sh
`;

export const cleanExperimentMetadata = `
%%bash
experiment_temp = $EXPERIMENT_ID
unset EXPERIMENT_ID
unset WORKFLOW_ID
unset START_TIME
unset END_TIME
echo "Cleared Experiment $experiment_temp metadata."
`;

export const getWorkflowList = `
%%bash
BASE_PATH=".lib/experiments/"
FOLDER_NAMES=()

for dir in "$BASE_PATH"/*/; do
  [ -d "$dir" ] && FOLDER_NAMES+=("$(basename "$dir")")
done

echo "\${FOLDER_NAMES[@]}"
`;

export const getExperimentList = (workflowId: string) => `
%%bash
BASE_PATH=".lib/experiments/${workflowId}"
FOLDER_NAMES=()

for dir in "$BASE_PATH"/*/; do
  [ -d "$dir" ] && FOLDER_NAMES+=("$(basename "$dir")")
done

echo "\${FOLDER_NAMES[@]}"
`;

export const moveExperimentFolder = `
%%bash
# HOME="/home/jovyan"
HOME="."
if [ -n os.environ["$WOFKLOW_ID"] ]; then
  if [ -n os.environ["$EXPERIMENT_ID"] ]; then
    mkdir -p $HOME/experiments
    mv $HOME/.lib/experiments/$EXPERIMENT_ID $HOME/experiments/$WORKFLOW_ID/$EXPERIMENT_ID
    echo "Moved experiment: $EXPERIMENT_ID"
  else
    echo "No EXPERIMENT_ID set, skipping move."
  fi
else
  echo "No WORKFLOW_ID set, skipping move."
fi
`;

export const getEndTime = `
import os
et = datetime.now(UTC).strftime("%Y-%m-%d %H:%M")
os.environ["END_TIME"] = et
`;

export const saveStartEndTime = `
%%bash
start_time=$START_TIME
end_time=$END_TIME
jq -n \
    --arg start_time "$start_time" \
    --arg end_time "$end_time" \
    '{
      "start_time": $start_time,
      "end_time": $end_time
    }' > .lib/experiments/"$WORKFLOW_ID"/"$EXPERIMENT_ID"/timestamps.json
`;

export const getTime = (workflow: string, experiment: string) => `
%%bash
TIMESTAMP_FILE=".lib/experiments/${workflow}/${experiment}/timestamps.json"

if [ -f "$TIMESTAMP_FILE" ]; then
  cat "$TIMESTAMP_FILE"
else
  echo -n "{ \\"start_time\\": \\"$START_TIME\\", \\"end_time\\": "
    if [ -z "$END_TIME" ]; then
      echo "null }"
    else
      echo "\\"$END_TIME\\" }"
    fi
fi
`;

export const getAndSetWorkflowId = `
import os
import json
import ipykernel
import urllib.request
from jupyter_server import serverapp

def get_notebook_name():
    connection_file = os.path.basename(ipykernel.get_connection_file())
    kernel_id = connection_file.split('-', 1)[1].split('.')[0]

    for srv in serverapp.list_running_servers():
        try:
            url = srv['url']
            token = srv.get('token', '')
            if token:
                url += f'tree?token={token}'
            sessions_url = srv['url'] + 'api/sessions'
            if token:
                sessions_url += f'?token={token}'

            with urllib.request.urlopen(sessions_url) as response:
                sessions = json.load(response)
                for sess in sessions:
                    if sess['kernel']['id'] == kernel_id:
                        return os.path.basename(sess['notebook']['path']).split('.')[0]
        except Exception as e:
            pass

    return None

print(get_notebook_name())
os.environ["WORKFLOW_ID"] = get_notebook_name()
`;

export const saveRoCrateMetadata = `
import os
import time
import json
import hashlib
import zipfile

# --- CONFIG ---
workflow_id = os.environ["WORKFLOW_ID"]
experiment_id = os.environ["EXPERIMENT_ID"]
NOTEBOOK_PLACEHOLDER = f"/home/jovyan/{workflow_id}.ipynb"

folder_structure = {
    "data": {},
    "logs": {},
    "workflow": {},
    "environment": {},
    "experiment_setup": {
        "test_generator": {}
    },
    "lifecycle-analysis": {},
    "README.md": {}
}

# --- Generate metadata ---
def generate_ro_crate_metadata(notebook_name):
    return {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
            {
                "@id": "./",
                "@type": "Dataset",
                "name": f"RO-Crate for {workflow_id} / {experiment_id}",
                "hasPart": [
                    "workflow/",
                    "data/",
                    "logs/",
                    "environment/",
                    "experiment_setup/",
                    "lifecycle-analysis/",
                    "README.md"
                ],
                "license": "https://creativecommons.org/licenses/by/4.0/"
            },
            {
                "@id": "ro-crate-metadata.json",
                "@type": "CreativeWork",
                "about": { "@id": "./" }
            },
            {
                "@id": f"workflow/{notebook_name}",
                "@type": "ComputationalWorkflow",
                "name": "Jupyter Notebook workflow",
                "programmingLanguage": {
                    "@id": "https://w3id.org/ro/crate/terms/Python"
                }
            }
        ]
    }

# --- Helpers ---
def generate_experiment_path(workflow_id, experiment_id):
    timestamp = int(time.time())
    hash_suffix = hashlib.sha256(f"exp_{timestamp}".encode()).hexdigest()[:8]
    folder_name = f"experiment_{timestamp}_{hash_suffix}"
    return os.path.join(os.path.expanduser("~"), ".lib", "experiments", workflow_id, experiment_id, folder_name)

def create_folders(base_path, structure):
    for name, subdirs in structure.items():
        if not name:
            continue
        path = os.path.join(base_path, name)
        os.makedirs(path, exist_ok=True)
        create_folders(path, subdirs)

def zip_directory(folder_path, output_zip):
    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(folder_path):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, os.path.dirname(folder_path))
                zipf.write(full_path, rel_path)

# --- MAIN ---
full_path = generate_experiment_path(workflow_id, experiment_id)
print(f"Creating: {full_path}")
create_folders(full_path, folder_structure)

# Notebook placeholder
notebook_name = os.path.basename(NOTEBOOK_PLACEHOLDER)
notebook_target = os.path.join(full_path, "workflow", notebook_name)
with open(notebook_target, "w") as f:
    f.write("# Placeholder for notebook")

# Log placeholder
metrics_path = os.path.join(full_path, "logs", "energy_log.json")
with open(metrics_path, "w") as f:
    json.dump({"metrics": "placeholder"}, f, indent=2)

# Metadata
rocrate_path = os.path.join(full_path, "ro-crate-metadata.json")
with open(rocrate_path, "w") as f:
    json.dump(generate_ro_crate_metadata(notebook_name), f, indent=2)

# Final ZIP
zip_path = f"{full_path}.zip"
zip_directory(full_path, zip_path)

# Output summary
print(json.dumps({
    "status": "success",
    "folder": full_path,
    "zip": zip_path
}, indent=2))
`;

export const saveSessionMetrics = `
%%bash
username=$(cat .lib/hostname)
output_file=".lib/experiments/$WORKFLOW_ID/$EXPERIMENT_ID/metrics.csv"
sudo rm -rf $output_file
prom_url="https://mc-a4.lab.uvalight.net/prometheus-$username"
st=$(date -u -d "$START_TIME" +"%Y-%m-%dT%H:%M:%SZ")
et=$(date -u -d "$END_TIME" +"%Y-%m-%dT%H:%M:%SZ")

metric_names=$(curl -s "$prom_url/api/v1/label/__name__/values" | jq -r '.data[] | select(startswith("scaph_"))')

echo $metric_names
echo $st
echo $et

tmp_dir=".lib/tmp_metrics"
rm -rf "$tmp_dir"
mkdir -p "$tmp_dir"

for metric in $metric_names; do
  curl -s -G "$prom_url/api/v1/query_range" \\
    --data-urlencode "query=$metric" \\
    --data-urlencode "start=$st" \\
    --data-urlencode "end=$et" \\
    --data-urlencode "step=15s" | \\
    jq -r '.data.result[]?.values[] | @csv' > "$tmp_dir/$metric.csv"
done

ls -la ".lib/tmp_metrics"

first=1
for file in "$tmp_dir"/*.csv; do
  if [ $first -eq 1 ]; then
    cut -d',' -f1 "$file" > "$output_file"
    first=0
  fi
done

for file in "$tmp_dir"/*.csv; do
  cut -d',' -f2 "$file" > "$file.val"
  paste -d',' "$output_file" "$file.val" > "$output_file.tmp"
  mv "$output_file.tmp" "$output_file"
done

# Add header (except for first timestamp column which has no header)
echo -n "" > "$output_file.header"
for file in "$tmp_dir"/*.csv; do
  metric=$(basename "$file" .csv)
  echo -n ",$metric" >> "$output_file.header"
done
cat "$output_file.header" "$output_file" > "$output_file.final"
mv "$output_file.final" "$output_file"

rm -rf "$tmp_dir"

echo "CSV file generated at: $output_file" 
head -n 100 "$output_file"
`;

export const getSessionMetrics = (workflowId: string, experimentId: string) => `
%%bash
echo $(cat ".lib/experiments/${workflowId}/${experimentId}/metrics.csv")
`;
