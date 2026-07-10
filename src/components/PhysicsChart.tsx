import React, { useRef, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Line, Scatter, Bar } from 'react-chartjs-2';
import { Download, Maximize2, Minimize2, RotateCcw, TrendingUp, Activity, BarChart3 } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PhysicsChartProps {
  data: { x: number; y: number }[];
  title?: string;
  xLabel: string;
  yLabel: string;
  chartType: 'line' | 'scatter' | 'bar';
  color?: string;
  secondaryData?: { x: number; y: number }[];
  secondaryLabel?: string;
  secondaryColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  animated?: boolean;
  height?: number;
}

const PHYSICS_COLORS = {
  cyan: { primary: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },
  emerald: { primary: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  amber: { primary: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  rose: { primary: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)' },
  violet: { primary: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  blue: { primary: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
};

const getColorSet = (color: string) => {
  const colorMap: Record<string, { primary: string; bg: string }> = PHYSICS_COLORS;
  return colorMap[color] || { primary: color, bg: `${color}20` };
};

export default function PhysicsChart({
  data,
  title,
  xLabel,
  yLabel,
  chartType,
  color = 'cyan',
  secondaryData,
  secondaryLabel,
  secondaryColor = 'amber',
  showGrid = true,
  showLegend = true,
  animated = true,
  height = 280
}: PhysicsChartProps) {
  const chartRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number } | null>(null);
  
  const { primary, bg } = getColorSet(color);
  const { primary: secondary } = getColorSet(secondaryColor);

  // Calculate statistics
  const stats = {
    minX: Math.min(...data.map(d => d.x)),
    maxX: Math.max(...data.map(d => d.x)),
    minY: Math.min(...data.map(d => d.y)),
    maxY: Math.max(...data.map(d => d.y)),
    avgY: data.reduce((a, b) => a + b.y, 0) / data.length,
    range: Math.max(...data.map(d => d.y)) - Math.min(...data.map(d => d.y))
  };

  const chartData: ChartData<any> = {
    datasets: [
      {
        label: title || `${yLabel} vs ${xLabel}`,
        data: data.map(d => ({ x: d.x, y: d.y })),
        borderColor: primary,
        backgroundColor: chartType === 'scatter' ? primary : bg,
        fill: chartType === 'line' && !secondaryData,
        tension: 0.4,
        pointRadius: chartType === 'scatter' ? 6 : 4,
        pointHoverRadius: 8,
        pointBackgroundColor: primary,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2.5,
        ...(chartType === 'bar' && {
          borderRadius: 6,
          barThickness: 'flex' as const,
          maxBarThickness: 40,
        }),
      },
      ...(secondaryData && secondaryLabel ? [{
        label: secondaryLabel,
        data: secondaryData.map(d => ({ x: d.x, y: d.y })),
        borderColor: secondary,
        backgroundColor: `${secondary}20`,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        borderDash: [5, 5] as any,
      }] : []),
    ],
  };

  const options: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animated ? {
      duration: 1000,
      easing: 'easeOutQuart'
    } : false,
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    plugins: {
      legend: {
        display: showLegend && (!!secondaryLabel),
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: { size: 11, weight: '500' },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
        },
      },
      title: {
        display: !!title,
        text: title,
        color: '#e2e8f0',
        font: { size: 14, weight: 'bold' },
        padding: { bottom: 10 },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(100, 116, 139, 0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        callbacks: {
          title: (items) => `${xLabel}: ${items[0].parsed.x.toFixed(3)}`,
          label: (item) => {
            const value = item.parsed.y;
            const formula = getFormula(value, item.dataset.label || yLabel);
            return [
              `${yLabel}: ${value.toFixed(3)}`,
              formula ? `📐 ${formula}` : ''
            ].filter(Boolean);
          },
          afterLabel: (item) => {
            const idx = item.dataIndex;
            if (data[idx]) {
              return `📊 نقطة #${idx + 1}`;
            }
            return '';
          }
        }
      },
    },
    scales: {
      x: {
        type: 'linear',
        display: true,
        title: {
          display: true,
          text: xLabel,
          color: '#94a3b8',
          font: { size: 11, weight: '600' },
        },
        grid: {
          display: showGrid,
          color: 'rgba(100, 116, 139, 0.15)',
          drawBorder: false,
        },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          maxTicksLimit: 10,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: yLabel,
          color: '#94a3b8',
          font: { size: 11, weight: '600' },
        },
        grid: {
          display: showGrid,
          color: 'rgba(100, 116, 139, 0.15)',
          drawBorder: false,
        },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          maxTicksLimit: 8,
        },
        suggestedMin: stats.minY - stats.range * 0.1,
        suggestedMax: stats.maxY + stats.range * 0.1,
      },
    },
  };

  const handleExport = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image();
      const link = document.createElement('a');
      link.download = `physics_chart_${Date.now()}.png`;
      link.href = url;
      link.click();
    }
  };

  const handleReset = () => {
    if (chartRef.current) {
      chartRef.current.reset();
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'scatter':
        return <Scatter ref={chartRef} data={chartData} options={options} />;
      case 'bar':
        return <Bar ref={chartRef} data={chartData} options={options} />;
      default:
        return <Line ref={chartRef} data={chartData} options={options} />;
    }
  };

  return (
    <div className={`bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden ${
      isFullscreen ? 'fixed inset-4 z-50' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-800/80">
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: primary }}
          />
          <h4 className="text-xs font-bold text-slate-200">{title || 'رسم بياني فيزيائي'}</h4>
        </div>
        
        {/* Chart Type Indicator */}
        <div className="flex items-center gap-1">
          {chartType === 'line' && <TrendingUp className="w-4 h-4 text-cyan-400" />}
          {chartType === 'scatter' && <Activity className="w-4 h-4 text-emerald-400" />}
          {chartType === 'bar' && <BarChart3 className="w-4 h-4 text-amber-400" />}
          <span className="text-[10px] text-slate-400">
            {chartType === 'line' ? 'خطي' : chartType === 'scatter' ? 'نقاط' : 'أعمدة'}
          </span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="إعادة تعيين"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title={isFullscreen ? 'تصغير' : 'تكبير'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleExport}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="تصدير كصورة"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Chart Container */}
      <div 
        className="p-4 bg-slate-900/30"
        style={{ height: isFullscreen ? 'calc(100% - 50px)' : height }}
      >
        {renderChart()}
      </div>
      
      {/* Stats Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-4 text-[9px] text-slate-400">
          <span>📊 {data.length} نقطة</span>
          <span>📈 min: {stats.minY.toFixed(2)}</span>
          <span>📉 max: {stats.maxY.toFixed(2)}</span>
          <span>📐 avg: {stats.avgY.toFixed(2)}</span>
        </div>
        {hoveredPoint && (
          <div className="text-[9px] text-cyan-400">
            ({hoveredPoint.x.toFixed(2)}, {hoveredPoint.y.toFixed(2)})
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to display physics formulas based on value type
function getFormula(value: number, label: string): string {
  if (label.includes('الطاقة') || label.includes('KE')) return 'E = ½mv²';
  if (label.includes('السرعة') || label.includes('v')) return 'v = v₀ + at';
  if (label.includes('الارتفاع') || label.includes('h')) return 'h = ½gt²';
  if (label.includes('القوة') || label.includes('F')) return 'F = ma';
  return '';
}
