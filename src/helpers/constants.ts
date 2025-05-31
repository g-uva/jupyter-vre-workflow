import dayjs from 'dayjs';

export const CONTAINER_ID = 'main-container-id-scroll';

export const DEFAULT_REFRESH_RATE = 2;
export const URL_GRAFANA_KEY = 'url_grafana';
export const METRICS_GRAFANA_KEY = 'metrics_grafana';

export const NR_CHARTS = 4;
export const end = Math.floor(Date.now() / 1000);
export const start = end - 3600; // last hour
export const endDateJs = dayjs(end * 1000);
export const startDateJs = dayjs(start * 1000);

export const mainColour01 = '#6B8E23';
export const mainColour02 = '#A0522D';
export const mainColour03 = '#4682B4';
