import React from 'react';
import { scaleTime, scaleLinear } from '@visx/scale';
import { LinePath, AreaClosed } from '@visx/shape';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Group } from '@visx/group';
import { useTooltip } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { extent, min, max, bisector } from 'd3-array';
import { downSample, parseData, shortNumber } from '../helpers/utils';
import { mainColour03 } from '../helpers/constants';

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 240;
const margin = { top: 16, right: 20, bottom: 36, left: 56 };

const STROKE_COLOR = mainColour03;

interface IParsedDataPoint {
  date: Date;
  value: number;
}

const bisectDate = bisector<IParsedDataPoint, Date>(d => d.date).left;

type TimeSeriesLineChartProps = {
  rawData: [number, string][];
  color?: string;
  width?: number;
  height?: number;
};

export default function TimeSeriesLineChart({
  rawData,
  color = STROKE_COLOR,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT
}: TimeSeriesLineChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = React.useState(width);
  const [data, setData] = React.useState<IParsedDataPoint[]>([]);

  React.useEffect(() => {
    setData(downSample(parseData(rawData)));
  }, [rawData]);

  React.useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect.width;
      if (nextWidth) {
        setMeasuredWidth(nextWidth);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop } =
    useTooltip<IParsedDataPoint>();

  const chartWidth = Math.max(220, Math.floor(measuredWidth || width));
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xExtent = extent(data, d => d.date);
  const xDomain: [Date, Date] =
    xExtent[0] && xExtent[1]
      ? [xExtent[0], xExtent[1]]
      : [new Date(), new Date()];

  const xScale = scaleTime({
    domain: xDomain,
    range: [margin.left, chartWidth - margin.right]
  });

  const yMin = min(data, d => d.value) ?? 0;
  const yMax = max(data, d => d.value) ?? 0;
  const yBuffer = (yMax - yMin) * 0.15;

  const yScale = scaleLinear({
    domain: [Math.max(0, yMin - yBuffer), yMax + yBuffer],
    nice: true,
    range: [height - margin.bottom, margin.top]
  });

  const gradientId = React.useId().replace(/:/g, '');
  const tooltipWidth = 108;
  const tooltipX = Math.min(
    Math.max((tooltipLeft ?? 0) - tooltipWidth / 2, 4),
    chartWidth - tooltipWidth - 4
  );
  const tooltipY = Math.max((tooltipTop ?? 0) - 52, 4);

  function handleTooltip(event: React.MouseEvent<SVGRectElement>) {
    const { x: xPoint } = localPoint(event) || { x: 0 };
    const x0 = xScale.invert(xPoint);
    const index = bisectDate(data, x0, 1);
    const d0 = data[index - 1];
    const d1 = data[index];
    let d = d0;
    if (d1 && d0) {
      d =
        x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime()
          ? d1
          : d0;
    }
    showTooltip({
      tooltipData: d,
      tooltipLeft: xScale(d.date),
      tooltipTop: yScale(d.value)
    });
  }

  if (data.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 13
        }}
      >
        No data
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden'
      }}
    >
      <svg width={chartWidth} height={height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="90%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
          <pattern
            id={`${gradientId}-grid`}
            width={innerWidth / 6}
            height={innerHeight / 4}
            patternUnits="userSpaceOnUse"
            x={margin.left}
            y={margin.top}
          >
            <path
              d={`M ${innerWidth / 6} 0 L 0 0 0 ${innerHeight / 4}`}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={0.6}
            />
          </pattern>
        </defs>

        <rect
          x={margin.left}
          y={margin.top}
          width={innerWidth}
          height={innerHeight}
          fill={`url(#${gradientId}-grid)`}
          rx={4}
        />

        <Group>
          <AreaClosed
            data={data}
            x={d => xScale(d.date)}
            y={d => yScale(d.value)}
            yScale={yScale}
            fill={`url(#${gradientId})`}
          />
          <LinePath
            data={data}
            x={d => xScale(d.date)}
            y={d => yScale(d.value)}
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Group>

        <AxisLeft
          scale={yScale}
          top={0}
          left={margin.left}
          tickFormat={v => shortNumber(Number(v))}
          stroke="#cbd5e1"
          tickStroke="#cbd5e1"
          numTicks={4}
          tickLabelProps={() => ({
            fill: '#64748b',
            fontSize: 11,
            textAnchor: 'end',
            dx: '-0.3em',
            dy: '0.3em'
          })}
        />
        <AxisBottom
          scale={xScale}
          top={height - margin.bottom}
          numTicks={Math.max(3, Math.floor(innerWidth / 80))}
          tickFormat={date =>
            date instanceof Date
              ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : new Date(Number(date)).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
          }
          stroke="#cbd5e1"
          tickStroke="#cbd5e1"
          tickLabelProps={() => ({
            fill: '#64748b',
            fontSize: 11,
            textAnchor: 'middle'
          })}
        />

        <rect
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          x={margin.left}
          y={margin.top}
          onMouseMove={handleTooltip}
          onMouseLeave={hideTooltip}
        />

        {tooltipData && (
          <g>
            <circle
              cx={tooltipLeft}
              cy={tooltipTop}
              r={4.5}
              fill={color}
              stroke="#fff"
              strokeWidth={2}
              pointerEvents="none"
            />
            <line
              x1={tooltipLeft}
              y1={margin.top}
              x2={tooltipLeft}
              y2={height - margin.bottom}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.55}
              pointerEvents="none"
            />
          </g>
        )}
      </svg>
      {tooltipData ? (
        <div
          style={{
            position: 'absolute',
            top: tooltipY,
            left: tooltipX,
            width: tooltipWidth,
            boxSizing: 'border-box',
            backgroundColor: '#1e293b',
            color: '#f1f5f9',
            border: `1px solid ${color}`,
            padding: '5px 9px',
            borderRadius: 6,
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            pointerEvents: 'none',
            zIndex: 2
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {tooltipData.value != null ? shortNumber(tooltipData.value) : 'N/A'}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
            {tooltipData.date.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
