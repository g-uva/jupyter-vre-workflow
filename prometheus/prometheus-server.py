import threading
import time
import os
import psutil

from prometheus_client import start_http_server, Gauge

def start_metrics_server(port=8001, update_interval=5):
    
    # Get the current notebook process.
    process = psutil.Process(os.getpid())
    
    # Define Prometheus Gauges for various metrics.
    cpu_usage = Gauge('notebook_cpu_usage', 'CPU usage percentage of the notebook process')
    memory_usage_bytes = Gauge('notebook_memory_usage_bytes', 'Memory usage (RSS in bytes) of the notebook process')
    memory_usage_percent = Gauge('notebook_memory_usage_percent', 'Memory usage percentage of the notebook process')
    num_threads = Gauge('notebook_num_threads', 'Number of threads in the notebook process')
    disk_usage_used = Gauge('notebook_disk_usage_used_bytes', 'Disk usage used on the root partition')
    disk_usage_total = Gauge('notebook_disk_usage_total_bytes', 'Total disk space on the root partition')
    network_bytes_sent = Gauge('notebook_network_bytes_sent', 'Total network bytes sent from the host')
    network_bytes_recv = Gauge('notebook_network_bytes_received', 'Total network bytes received by the host')
    
    # Start the HTTP server to expose metrics.
    start_http_server(port)
    print(f"Prometheus metrics server started on port {port}.")
    
    while True:
        # Update metrics for the notebook process.
        cpu = process.cpu_percent(interval=0.1)
        mem_info = process.memory_info()
        mem_percent = process.memory_percent()
        threads = process.num_threads()
        
        # System-wide disk usage (for root partition).
        disk = psutil.disk_usage('/')
        
        # System-wide network I/O counters.
        net_io = psutil.net_io_counters()
        
        # Set the metrics.
        cpu_usage.set(cpu)
        memory_usage_bytes.set(mem_info.rss)
        memory_usage_percent.set(mem_percent)
        num_threads.set(threads)
        disk_usage_used.set(disk.used)
        disk_usage_total.set(disk.total)
        network_bytes_sent.set(net_io.bytes_sent)
        network_bytes_recv.set(net_io.bytes_recv)
        
        time.sleep(update_interval)

# # Run the metrics server in a background thread.
# metrics_thread = threading.Thread(target=start_metrics_server, kwargs={'port': 8001, 'update_interval': 5}, daemon=True)
# metrics_thread.start()

# print("Metrics server is running in the background. You can now continue working in your notebook.")

if __name__ == '__main__':
    # Start the metrics server (this call will block)
    start_metrics_server(port=8001, update_interval=5)
