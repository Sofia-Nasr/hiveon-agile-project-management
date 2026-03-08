import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale);

export default function SprintBurndownChart({ data }) {

  if (!data || data.length === 0) return null;

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        label: "Story Points",
        data: data.map(d => d.value),
        backgroundColor: "#f59e0b"
      }
    ]
  };

  return <Bar data={chartData} />;
}