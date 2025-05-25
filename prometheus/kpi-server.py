from prometheus_client import start_http_server, Gauge
import psutil
import time


sci_metric = Gauge('sci_score', 'Software Carbon Intensity Score')
energy_consumed = Gauge('energy_consumed_kwh', 'Energy Consumed in kWh')
carbon_intensity = Gauge('carbon_intensity_g_per_kwh', 'Carbon Intensity in gCO2eq/kWh')
embodied_emissions = Gauge('embodied_emissions_g', 'Embodied Emissions in gCO2eq')
functional_unit = Gauge('functional_unit_count', 'Count of Functional Units')

def calculate_metrics():
    # Placeholder values for demonstration
    E = psutil.cpu_percent() * 0.0001  # Simplified energy estimation
    I = 400  # Example carbon intensity
    M = 50000  # Example embodied emissions
    R = 10  # Example functional unit count

    # Update Prometheus metrics
    energy_consumed.set(E)
    carbon_intensity.set(I)
    embodied_emissions.set(M)
    functional_unit.set(R)
    sci = ((E * I) + M) / R
    sci_metric.set(sci)

if __name__ == '__main__':
    start_http_server(8002)
    while True:
        calculate_metrics()
        time.sleep(60)
