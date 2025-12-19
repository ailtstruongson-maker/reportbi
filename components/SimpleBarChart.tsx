import React from 'react';

interface BarData {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: BarData[];
  yAxisLabel?: string;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, yAxisLabel }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
        Không có dữ liệu để hiển thị biểu đồ.
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 0);
  const chartHeight = 180;
  const numTicks = 5;

  const yAxisTicks = Array.from({ length: numTicks + 1 }, (_, i) => {
    const value = (maxValue / numTicks) * i;
    return value;
  });

  return (
    <div className="w-full flex">
      <div className="flex flex-col justify-between h-full text-xs text-slate-500 dark:text-slate-400 text-right pr-2 shrink-0" style={{ height: `${chartHeight}px` }}>
        {yAxisTicks.reverse().map((tick, i) => (
          <span key={i}>{tick.toLocaleString('vi-VN')}{yAxisLabel}</span>
        ))}
      </div>
      <div className="flex-1 grid gap-2 items-end" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`, height: `${chartHeight}px` }}>
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const isNegative = item.value < 0;

          let colorClass = 'bg-primary-500 dark:bg-primary-600';
          if (item.value >= 100) {
              colorClass = 'bg-green-500 dark:bg-green-600';
          } else if (item.value < 85) {
              colorClass = 'bg-yellow-500 dark:bg-yellow-600';
          }

          return (
            <div key={index} className="flex flex-col items-center justify-end group h-full">
              <div
                className={`w-full ${colorClass} rounded-t-sm transition-all duration-300 ease-in-out group-hover:opacity-80`}
                style={{ height: `${barHeight}%` }}
                title={`${item.label}: ${item.value.toLocaleString('vi-VN')}${yAxisLabel}`}
              ></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimpleBarChart;
