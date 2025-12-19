import React from 'react';
import { ResetIcon } from './Icons';

interface SliderProps {
    label: React.ReactNode;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    displayValue?: React.ReactNode;
    onReset?: () => void;
}

const Slider: React.FC<SliderProps> = ({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    unit = '%',
    displayValue,
    onReset,
}) => {
    const defaultDisplayValue = step >= 1 ? value.toFixed(0) : value.toFixed(1);
    const defaultDisplayValueString = `${defaultDisplayValue}${unit}`;

    return (
        <div>
            <div className="flex justify-between items-start mb-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 pt-px truncate" title={typeof label === 'string' ? label : ''}>
                    {label}
                </label>
                <div className="text-sm text-right flex-shrink-0 pl-2 flex items-center gap-2">
                     <div>
                        {displayValue !== undefined ? (
                            displayValue
                        ) : (
                            <span className="font-bold text-primary-600 dark:text-primary-400">{defaultDisplayValueString}</span>
                        )}
                    </div>
                    {onReset && (
                        <button
                            type="button"
                            onClick={onReset}
                            aria-label="Reset về mặc định"
                            className="p-1 text-slate-400 dark:text-slate-500 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-400 transition-colors"
                        >
                            <ResetIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-primary-500 dark:[&::-webkit-slider-thumb]:bg-primary-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400"
            />
        </div>
    );
};

export default Slider;