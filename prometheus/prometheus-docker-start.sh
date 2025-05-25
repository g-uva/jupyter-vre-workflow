docker run -p 9090:9090 \
	-d \
	--name="prometheus" \
	--network="prometheus-grafana" \
     -v /Users/goncaloferreira/Work/uva/greendigit/egi-jupyterlab-extension/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
	prom/prometheus