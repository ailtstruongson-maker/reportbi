import React, { useState, useMemo, useRef } from 'react';

export interface TrendDataPoint {
  date: string;
  value: number;
  name: string;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  employeeName: string;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, employeeName }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; point: TrendDataPoint } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const width = 500;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };

    const { points, xTicks, yTicks, x, y, path } = useMemo(() => {
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        if (data.length === 0) {
            return { points: [], xTicks: [], yTicks: [], x: () => 0, y: () => 0, path: '' };
        }

        const x = (index: number) => margin.left + (index / (data.length - 1)) * innerWidth;
        
        const yValues = data.map(d => d.value);
        const yMin = Math.min(0, ...yValues);
        const yMax = Math.max(...yValues);
        
        const y = (value: number) => margin.top + innerHeight - ((value - yMin) / (yMax - yMin)) * innerHeight;

        const pathData = data.map((point, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(point.value)}`).join(' ');

        const tickCount = 5;
        const yTickValues = Array.from({ length: tickCount + 1 }, (_, i) => yMin + (i * (yMax - yMin)) / tickCount);
        
        return {
            points: data.map((point, i) => ({ ...point, x: x(i), y: y(point.value) })),
            xTicks: data.map((point, i) => ({ ...point, x: x(i) })),
            yTicks: yTickValues.map(value => ({ value, y: y(value) })),
            x,
            y,
            path: pathData,
        };
    }, [data, width, height, margin]);

    const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current || points.length === 0) return;
        const svgRect = svgRef.current.getBoundingClientRect();
        const mouseX = event.clientX - svgRect.left;

        const closestPoint = points.reduce((prev, curr) => 
            Math.abs(curr.x - mouseX) < Math.abs(prev.x - mouseX) ? curr : prev
        );
        
        setTooltip({ x: closestPoint.x, y: closestPoint.y, point: closestPoint });
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

    if (data.length < 2) {
        return (
            <div className="flex items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
                <p>Cần ít nhất 2 snapshot dữ liệu để vẽ biểu đồ xu hướng.</p>
            </div>
        );
    }
  
    return (
        <div>
            <h4 className="text-lg font-semibold text-center text-slate-700 dark:text-slate-200 mb-2">
                Xu hướng Hiệu suất của {employeeName}
            </h4>
            <svg
                ref={svgRef}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="w-full h-auto"
            >
                {/* Axes */}
                <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="currentColor" className="text-slate-300 dark:text-slate-600" />
                <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="currentColor" className="text-slate-300 dark:text-slate-600" />

                {/* Ticks */}
                {yTicks.map(tick => (
                    <g key={tick.value} className="text-xs text-slate-500 dark:text-slate-400">
                        <text x={margin.left - 8} y={tick.y} textAnchor="end" alignmentBaseline="middle">{f.format(tick.value)}</text>
                        <line x1={margin.left} y1={tick.y} x2={width - margin.right} y2={tick.y} strokeDasharray="2,2" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                    </g>
                ))}
                {xTicks.map((tick, i) => (
                    <text key={i} x={tick.x} y={height - margin.bottom + 15} textAnchor="middle" className="text-xs text-slate-500 dark:text-slate-400">
                        {tick.name}
                    </text>
                ))}

                {/* Line */}
                <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500" />

                {/* Points */}
                {points.map((point, i) => (
                    <circle key={i} cx={point.x} cy={point.y} r="4" fill="currentColor" className="text-primary-500" />
                ))}

                {/* Tooltip */}
                {tooltip && (
                    <g>
                        <line x1={tooltip.x} y1={margin.top} x2={tooltip.x} y2={height - margin.bottom} strokeDasharray="3,3" stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                        <circle cx={tooltip.x} cy={tooltip.y} r="6" fill="currentColor" stroke="white" strokeWidth="2" className="text-primary-500" />
                        
                        <g transform={`translate(${tooltip.x + 10}, ${tooltip.y - 10})`}>
                            <rect x="0" y="-20" width="120" height="40" rx="4" fill="rgba(0,0,0,0.7)" />
                            <text x="10" y="-5" fill="white" className="text-sm font-semibold">{f.format(tooltip.point.value)}</text>
                            <text x="10" y="10" fill="white" className="text-xs">{tooltip.point.name}</text>
                        </g>
                    </g>
                )}
            </svg>
        </div>
    );
};

export default TrendChart;