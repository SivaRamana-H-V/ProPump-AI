import { useEffect, useRef } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { RegressionSeries, PumpHealthStatus } from '../utils/pumpModel';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

interface RegressionChartProps {
  series: RegressionSeries;
  status: PumpHealthStatus;
  assetName: string;
}

export function RegressionChart({ series, status, assetName }: RegressionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const lineColor =
      status === 'failing'
        ? '#f43f5e'
        : status === 'degraded'
          ? '#f59e0b'
          : '#38bdf8';

    chartInstanceRef.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels: series.labels,
        datasets: [
          {
            label: 'Measured ηv (%)',
            data: series.historicalEtaV,
            borderColor: lineColor,
            backgroundColor:
              status === 'failing'
                ? 'rgba(244, 63, 94, 0.12)'
                : status === 'degraded'
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(56, 189, 248, 0.12)',
            borderWidth: 2.5,
            pointRadius: 3.5,
            pointBackgroundColor: lineColor,
            tension: 0.2,
            fill: true,
          },
          {
            label: 'Regression Forecast',
            data: series.projectedEtaV,
            borderColor: '#e2e8f0',
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 2.5,
            pointBackgroundColor: '#e2e8f0',
            tension: 0,
            fill: false,
          },
          {
            label: 'Critical Wear Limit (78%)',
            data: series.thresholdLine,
            borderColor: 'rgba(248, 113, 113, 0.65)',
            borderDash: [3, 3],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 280,
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: '#cbd5e1',
              boxWidth: 12,
              boxHeight: 2,
              font: {
                family: '"IBM Plex Mono", monospace',
                size: 11,
              },
            },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(51, 65, 85, 0.35)',
            },
            ticks: {
              color: '#94a3b8',
              font: {
                family: '"IBM Plex Mono", monospace',
                size: 11,
              },
            },
          },
          y: {
            min: 68,
            max: 100,
            grid: {
              color: 'rgba(51, 65, 85, 0.35)',
            },
            ticks: {
              color: '#94a3b8',
              callback: (v) => `${v}%`,
              font: {
                family: '"IBM Plex Mono", monospace',
                size: 11,
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [series, status]);

  return (
    <div className="relative h-60 w-full">
      <canvas
        ref={canvasRef}
        data-testid="regression-trend-canvas"
        aria-label={`Volumetric efficiency regression trend graph for ${assetName}`}
      />
    </div>
  );
}
