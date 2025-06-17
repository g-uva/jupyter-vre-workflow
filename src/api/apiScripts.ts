export const getOS = `
echo "=== OS Detection ==="
uname_str="$(uname -s)"
os_info=""

case "\${uname_str}" in
    Linux*)
        os="Linux"
        if [ -f /etc/os-release ]; then
            # Parse common distro info
            . /etc/os-release
            os_info="Linux ($NAME $VERSION)"
        else
            os_info="Linux (Unknown distro)"
        fi
        ;;
    Darwin*)
        os="Mac"
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
        os="Windows"
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

// export const sendJson = `

// `;

export interface IExportJsonProps {
  title: string;
  creator: string;
  email: string;
  orcid: string;
  session_metrics: string;
  creation_date: string;
}

export const exportSendJson = (props: IExportJsonProps) => `
%%bash

export EXPORT_JSON_PATH=".lib/export_metadata.json"

title=${props.title}
creator=${props.creator}
workflow_id=$WORKFLOW_ID
experiment_id=$EXPERIMENT_ID
os=$OS_INFO
email=${props.email}
pi=${props.orcid}
metrics=${props.session_metrics}
platform="GreenDIGIT"
node="node_01"
lang="python"
creation_date=${props.creation_date}
project_id="greendigit_development"

json_payload=$(jq -n \
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
    name: $title,
    title: "Testing submitting with the notebook",
    license_id: "AFL-3.0",
    private: "False",
    notes: "Testing call from environment",
    url: "null",
    tags: [{ name: "Test" }],
    resources: [{
      name: "RO-Crate metadata",
      url: "https://data.d4science.net/5Apv",
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

# echo $json_payload > $EXPORT_JSON_PATH

AUTH_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJySUJPYjZZY3p2ZE4xNVpuNHFkUTRLdEQ5VUhyY1dwNWJCT3NaLXpYbXM0In0.eyJleHAiOjE3NTAyMjMyMjMsImlhdCI6MTc1MDE2MjY1MCwiYXV0aF90aW1lIjoxNzUwMTU4NDA0LCJqdGkiOiI0NmVhN2ExNS00NzdiLTRiMTgtYmM3MC1jZmJiZGE2MTc1MmEiLCJpc3MiOiJodHRwczovL2FjY291bnRzLmQ0c2NpZW5jZS5vcmcvYXV0aC9yZWFsbXMvZDRzY2llbmNlIiwiYXVkIjoiJTJGZDRzY2llbmNlLnJlc2VhcmNoLWluZnJhc3RydWN0dXJlcy5ldSUyRkQ0UmVzZWFyY2glMkZHcmVlbkRJR0lUIiwic3ViIjoiOWVkMzU2MzgtODY4ZC00NjIwLWEyYmMtZTVlNWQwOTMxMGU5IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoidG9rZW4tZXhjaGFuZ2UtZGVkaWNhdGVkIiwic2Vzc2lvbl9zdGF0ZSI6ImZjZmRhMDA0LTA5MmEtNDQxNS1iZTVjLTk1OTkwYzU2NDI3MSIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1kNHNjaWVuY2UiLCJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiJTJGZDRzY2llbmNlLnJlc2VhcmNoLWluZnJhc3RydWN0dXJlcy5ldSUyRkQ0UmVzZWFyY2glMkZHcmVlbkRJR0lUIjp7InJvbGVzIjpbIkNhdGFsb2d1ZS1FZGl0b3IiLCJNZW1iZXIiXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwic2lkIjoiZmNmZGEwMDQtMDkyYS00NDE1LWJlNWMtOTU5OTBjNTY0MjcxIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJHb27Dp2FsbyBGZXJyZWlyYSIsInByZWZlcnJlZF91c2VybmFtZSI6ImdvbmNhbG8uZmVycmVpcmE1MzhhNCIsImdpdmVuX25hbWUiOiJHb27Dp2FsbyIsImZhbWlseV9uYW1lIjoiRmVycmVpcmEiLCJlbWFpbCI6ImdvbmNhbG8uZmVycmVpcmFAc3R1ZGVudC51dmEubmwifQ.AftngCY9vX6LVsM7NRm-VL9eMLaLSjfoO0EB_dNVYzVXC2G5KGJmx-OOSQOZy1IrE36V92yj1BJZgn7IZPqd03q-f1gO26NlcL2mgiwmxj9XWp9rusSuwhpx_pw7Xi1ebT52QDa60XlprJQv6ixQHD8kmRO57Zo85m2IXbd2K3S32-CKkouMMWUFJ8tMDQ_d9oGh5vEsXMwyCHlXHyqcSjR-cnwM-bKqvwnHS_PKpBj-dTF-uiRp23jxVLtUf6onkCRN2X00_rEdT4MA5Iw7_fbwiqU2KwurOmzyUaJTHIqVwdL4TCy80plrz9OvhgxCVNzyd-V5SEqe_SNdThaAkQ"

curl \
--header "Content-Type: application/json" \
--header "Authorization: Bearer $AUTH_TOKEN" \
--location "https://api.d4science.org/gcat/items" \
--data-raw "$json_payload"
`;

export const saveUsernameSh = `
%%bash
mkdir -p .lib
echo \${HOSTNAME#jupyter-} > .lib/hostname
echo "Username saved to .lib/hostname"
`;

export const generateExperimentId = `
import os
from datetime import UTC, datetime, timezone
import hashlib

ts = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
os.environ["START_TIME"] = ts
experiment_id = f"experiment-{hashlib.sha256(ts.encode()).hexdigest()[:8]}-{ts}"
os.environ["EXPERIMENT_ID"] = experiment_id
print("Created experiment ID environment var $EXPERIMENT_ID")
`;

export const createExperimentIdFolderSh = `
%%bash
mkdir -p ".lib/experiments/$EXPERIMENT_ID"
echo "Created experiment ID folder $EXPERIMENT_ID"
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

export const cleanExperimentId = `
import os
os.environ["EXPERIMENT_ID"] = ""
os.environ["WORKFLOW_ID"] = ""
print("Cleared EXPERIMENT_ID and WORKFLOW_ID.")
`;

export const getExperimentList = `
%%bash
BASE_PATH=".lib/experiments/"
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

export const getStartEndTime = `
import os
st = os.environ["START_TIME"]
et = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
print(st + et)
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
