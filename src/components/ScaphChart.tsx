import React from 'react';
import { scaleTime, scaleLinear } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Group } from '@visx/group';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { extent, min, max, bisector } from 'd3-array';
import { downSample, parseData, shortNumber } from '../helpers/utils';

const margin = { top: 20, right: 30, bottom: 40, left: 60 };
const width = 400;
const height = 300;

interface IParsedDataPoint {
  date: Date;
  value: number;
}

const bisectDate = bisector<IParsedDataPoint, Date>(d => d.date).left;

type TimeSeriesLineChartProps = {
  rawData: [number, string][];
};

// Scales
interface IParsedDataPoint {
  date: Date;
  value: number;
}

export default function TimeSeriesLineChart({
  rawData
}: TimeSeriesLineChartProps) {
  const [data, setData] = React.useState<IParsedDataPoint[]>([]);

  React.useEffect(() => {
    const data = downSample(parseData(rawData));
    setData(data);
  }, [rawData]);

  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop } =
    useTooltip<IParsedDataPoint>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal();

  function handleTooltip(event: React.MouseEvent<SVGRectElement>) {
    const { x: xPoint } = localPoint(event) || { x: 0 };
    const x0 = xScale.invert(xPoint as number);
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
  const x = (d: IParsedDataPoint): Date => d.date;
  const y: (d: IParsedDataPoint) => number = (d: IParsedDataPoint): number =>
    d.value;

  const xExtent = extent(data, x);
  const xDomain: [Date, Date] =
    xExtent[0] && xExtent[1]
      ? [xExtent[0] as Date, xExtent[1] as Date]
      : [new Date(), new Date()];
  const xScale = scaleTime({
    domain: xDomain,
    range: [margin.left, width - margin.right]
  });

  const yMin = min(data, y) ?? 0;
  const yMax = max(data, y) ?? 0;
  const yBuffer = (yMax - yMin) * 0.1; // 10% buffer
  const baseline = Math.max(0, yMin - yBuffer);
  const yScale = scaleLinear({
    domain: [baseline, yMax],
    nice: true,
    range: [height - margin.bottom, margin.top]
  });

  const TooltipPortal = ({
    tooltipData
  }: {
    tooltipData: IParsedDataPoint | undefined;
  }) =>
    TooltipInPortal({
      top: tooltipTop,
      left: tooltipLeft,
      style: {
        backgroundColor: 'white',
        color: '#1976d2',
        border: '1px solid #1976d2',
        padding: '6px 10px',
        borderRadius: 4,
        fontSize: 13,
        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
        maxWidth: '80px'
      },
      children: (
        <div>
          <div>
            <strong>
              {tooltipData?.value ? shortNumber(tooltipData?.value) : 'N/A'}
            </strong>
          </div>
          <div style={{ fontSize: 11, color: '#333' }}>
            {tooltipData?.date.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </div>
      )
    }) as React.ReactNode;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <Group>
          <LinePath
            data={data}
            x={d => xScale(x(d))}
            y={d => yScale(y(d))}
            stroke="#1976d2"
            strokeWidth={2}
            // curve={null}
          />
        </Group>
        <AxisLeft
          scale={yScale}
          top={0}
          left={margin.left}
          // label="Value"
          tickFormat={v => shortNumber(Number(v))}
          stroke="#888"
          tickStroke="#888"
          tickLabelProps={() => ({
            fill: '#333',
            fontSize: 12,
            textAnchor: 'end',
            dx: '-0.25em',
            dy: '0.25em'
          })}
        />
        <AxisBottom
          scale={xScale}
          top={height - margin.bottom}
          left={0}
          label="Time"
          numTicks={6}
          tickFormat={date =>
            date instanceof Date
              ? date.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : new Date(Number(date)).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
          }
          stroke="#888"
          tickStroke="#888"
          tickLabelProps={() => ({
            fill: '#333',
            fontSize: 12,
            textAnchor: 'middle'
          })}
        />
        <rect
          width={width - margin.left - margin.right}
          height={height - margin.top - margin.bottom}
          fill="transparent"
          rx={14}
          x={margin.left}
          y={margin.top}
          onMouseMove={handleTooltip}
          onMouseLeave={hideTooltip}
        />
        {tooltipData ? (
          <g>
            <circle
              cx={tooltipLeft}
              cy={tooltipTop}
              r={5}
              fill="#1976d2"
              stroke="#fff"
              strokeWidth={2}
              pointerEvents="none"
            />
          </g>
        ) : null}
      </svg>
      {tooltipData ? TooltipPortal({ tooltipData }) : null}
    </div>
  );
}
