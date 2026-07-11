import React, { useEffect, useRef } from "react";
import { Chart, registerables, ChartData, ChartOptions } from "chart.js";

Chart.register(...registerables);

interface FinanceChartProps {
  categoryData: Record<string, number>;
  type: "รายรับ" | "รายจ่าย";
}

export default function FinanceChart({ categoryData, type }: FinanceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const keys = Object.keys(categoryData);
  const values = Object.values(categoryData);
  const hasData = keys.length > 0 && values.some((val) => val > 0);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart instance to prevent canvas reuse errors
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    if (!hasData) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Palette of vibrant, elegant colors for our financial segments
    const bgColors = type === "รายจ่าย" 
      ? [
          "#f59e0b", // amber
          "#3b82f6", // blue
          "#ec4899", // pink
          "#8b5cf6", // purple
          "#ef4444", // red
          "#10b981", // emerald
          "#6366f1", // indigo
          "#64748b", // slate
        ]
      : [
          "#10b981", // emerald
          "#14b8a6", // teal
          "#eab308", // yellow
          "#a855f7", // purple
          "#64748b", // slate
        ];

    const borderColors = bgColors.map(color => color + "22");

    const chartData: ChartData<"doughnut"> = {
      labels: keys,
      datasets: [
        {
          data: values,
          backgroundColor: bgColors,
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 12,
        },
      ],
    };

    const chartOptions: ChartOptions<"doughnut"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 16,
            font: {
              family: "Inter, sans-serif",
              size: 12,
              weight: 500,
            },
            color: "#334155",
          },
        },
        tooltip: {
          backgroundColor: "#0f172a",
          padding: 12,
          titleFont: {
            family: "Inter, sans-serif",
            size: 13,
            weight: "bold",
          },
          bodyFont: {
            family: "Inter, sans-serif",
            size: 12,
          },
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function (context) {
              const value = context.parsed;
              return ` ฿${value.toLocaleString("th-TH")}`;
            },
          },
        },
      },
      cutout: "70%",
    };

    chartInstanceRef.current = new Chart(ctx, {
      type: "doughnut",
      data: chartData,
      options: chartOptions,
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [categoryData, type, hasData]);

  // Calculate total amount in chart
  const total = values.reduce((sum, val) => sum + val, 0);

  return (
    <div className="relative w-full h-80 flex flex-col justify-center items-center" id="finance-chart-container">
      {hasData ? (
        <>
          <div className="w-full h-64">
            <canvas ref={canvasRef} id={`canvas-${type}`} />
          </div>
          {/* Centered Total Indicator */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {type === "รายจ่าย" ? "รายจ่ายรวม" : "รายรับรวม"}
            </span>
            <span className="text-xl font-bold text-slate-800 tracking-tight font-sans mt-0.5">
              ฿{total.toLocaleString("th-TH")}
            </span>
          </div>
        </>
      ) : (
        <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 w-full">
          <p className="text-slate-400 text-sm font-medium">ยังไม่มีข้อมูลธุรกรรมประเภท{type}</p>
          <p className="text-slate-300 text-xs mt-1">เริ่มบันทึกรายการรายวันของคุณเพื่อดูสถิติแยกตามหมวดหมู่</p>
        </div>
      )}
    </div>
  );
}
