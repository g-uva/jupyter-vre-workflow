from IPython.core.magic import register_cell_magic
import psutil
import time

@register_cell_magic
def track_usage(line, cell):
    proc = psutil.Process()
    # Record starting metrics
    start_cpu = proc.cpu_times()
    start_mem = proc.memory_info()
    start_time = time.time()

    # Execute the cell code
    exec(cell, globals())

    # Record ending metrics
    end_time = time.time()
    end_cpu = proc.cpu_times()
    end_mem = proc.memory_info()
    
    print("Execution time: {:.2f} seconds".format(end_time - start_time))
    print("CPU times (user+system): {:.2f} seconds".format(
        (end_cpu.user + end_cpu.system) - (start_cpu.user + start_cpu.system)))
    # Memory difference (this is a naive approach; it might not capture the whole picture)
    print("Memory usage change: {} bytes".format(end_mem.rss - start_mem.rss))
