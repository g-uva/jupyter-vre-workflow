#!/bin/bash
mkdir -p /home/jovyan/.bin
cd /home/jovyan/.bin
mv install-scaphandre-prometheus.sh /home/jovyan/.bin/

# First updates
sudo apt-get update
sudo apt-get install -y pkg-config libssl-dev lsof

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env
rustup install 1.65.0 # Install Rust 1.65.0
rustup override set 1.65.0 # Set the default version to 1.65.0

# Install Scaphandre
cd /home/jovyan/.bin/
git clone https://github.com/hubblo-org/scaphandre.git
cd scaphandre
cargo build --release
sudo mv ./target/release/scaphandre /usr/local/bin/
cd ~ && rm -rf scaphandre

# Run Scaphandre server in the background, with metrics compatible with Prometheus
nohup scaphandre prometheus --address=0.0.0.0 --port=8081 --containers > scaphandre.log 2>&1 &

# Install Prometheus
cd /home/jovyan/.bin/
wget https://github.com/prometheus/prometheus/releases/download/v2.52.0/prometheus-2.52.0.linux-amd64.tar.gz
tar xzf prometheus-2.52.0.linux-amd64.tar.gz
mv ./prometheus-2.52.0.linux-amd64 /home/jovyan/.bin/prometheus-unzipped
rm -rf prometheus-2.52.0.linux-amd64.tar.gz

# Start Prometheus server
PROMETHEUS_CONFIG=$(cat <<EOF
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: 'scaphandre-local'
    static_configs:
      - targets: ['localhost:8081']
EOF
)

echo "$PROMETHEUS_CONFIG" > prometheus.yml
nohup /home/jovyan/.bin/prometheus-unzipped/prometheus --config.file=/home/jovyan/.bin/prometheus.yml --web.listen-address=0.0.0.0:9090 > prometheus.log 2>&1 &


# Install Grafana
# cd /home/jovyan/.bin/
# wget https://dl.grafana.com/enterprise/release/grafana-enterprise-9.5.2.linux-amd64.tar.gz
# tar xzf grafana-enterprise-9.5.2.linux-amd64.tar.gz
# mv grafana-enterprise-9.5.2 grafana-unzipped
# rm -rf grafana-enterprise-9.5.2.linux-amd64.tar.gz
# cd grafana-unzipped

