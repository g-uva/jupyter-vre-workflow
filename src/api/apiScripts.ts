// User input
// Creator name + email + orcid

// Creation date
// Environment OS
// Platform: GreenDIGIT
// GreenDIGIT node
// Dependencies
// Experiment ID
// Project ID (notebook)
// Session Reading metrics
// System:type -> experiment

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

export interface IExportJsonProps {
  creator: string;
  email: string;
  orcid: string;
}

export const exportJson = ({ creator, email, orcid }: IExportJsonProps) => `
%%bash

${getOS}

WORKFLOW_ID=$WORKFLOW_ID
EXPERIMENT_ID=$EXPERIMENT_ID
OS_INFO="$OS_INFO"
CREATOR=${creator}
EMAIL=${email}
ORCID=${orcid}
START_TIME=$START_TIME
SESSION_READING_METRICS="zip file"

jq -n \
  --arg creator "$CREATOR" \
  --arg workflow_id "$WORKFLOW_ID" \
  --arg experiment_id "$EXPERIMENT_ID" \
  --arg os "$OS_INFO" \
  --arg email "$EMAIL" \
  --arg pi "$ORCID" \
  --arg metrics "session_reading_metrics" \
  --arg platform "GreenDIGIT" \
  --arg node "node_01" \
  --arg lang "python" \
  --arg creation_date "$START_TIME" \
  "{
    name: \\"programmatic_test_attach_curl\\",
    title: \\"Test Experiment Attach Curl\\",
    license_id: \\"AFL-3.0\\",
    private: false,
    notes: \\"Testing call from environment\\",
    url: null,
    tags: [{ name: \\"Test\\" }],
    resources: [{
      name: \\"Parrot image\\",
      url: \\"https://data.d4science.net/5Apv\\",
      format: \\"jpg\\"
    }],
    extras: [
      { key: \\"Creation Date\\", value: \\$creation_date },
      { key: \\"Creator\\", value: \\$creator },
      { key: \\"Creator Email\\", value: \\$email },
      { key: \\"Creator Name PI (Principal Investigator)\\", value: \\$pi },
      { key: \\"Environment OS\\", value: \\$os },
      { key: \\"Environment Platform\\", value: \\$platform },
      { key: \\"Experiment Dependencies\\", value: null },
      { key: \\"Experiment ID\\", value: \\$experiment_id },
      { key: \\"GreenDIGIT Node\\", value: \\$node },
      { key: \\"Programming Language\\", value: \\$lang },
      { key: \\"Project ID\\", value: \\$project_id },
      { key: \\"Session reading metrics\\", value: \\$metrics },
      { key: \\"system:type\\", value: \\"Experiment\\" }
    ]
  }" > .bin/test.json
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
