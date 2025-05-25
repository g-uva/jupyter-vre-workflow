from influxdb_client import InfluxDBClient, Point, WritePrecision
import psutil
import time

# Configure InfluxDB
token = "INFLUX_TOKEN"
org = "YOUR_ORG"
bucket = "sci_metrics"
client = InfluxDBClient(url="http://localhost:8086", token=token)

write_api = client.write_api(write_options=WritePrecision.NS)

def write_metrics():
    cpu_percent = psutil.cpu_percent()
    mem_usage = psutil.virtual_memory().percent

    point = Point("sci_metrics") \
        .field("cpu_percent", cpu_percent) \
        .field("memory_percent", mem_usage) \
        .time(time.time_ns(), WritePrecision.NS)

    write_api.write(bucket=bucket, org=org, record=point)

if __name__ == "__main__":
    while True:
        write_metrics()
        time.sleep(60)
