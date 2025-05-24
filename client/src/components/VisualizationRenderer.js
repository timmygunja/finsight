import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Pre-defined visualization components
const LineChartComponent = ({ data, xKey, yKey, title }) => (
  <div className="chart-container">
    <h3>{title}</h3>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip
          formatter={(value) => {
            const valueLabel =
              typeof value === "number" ? value.toFixed(2) : value;
            return [valueLabel, "Сумма (тыс. руб.)"];
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke="#8884d8"
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const BarChartComponent = ({ data, xKey, yKey, title }) => (
  <div className="chart-container">
    <h3>{title}</h3>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip
          formatter={(value) => {
            const valueLabel =
              typeof value === "number" ? value.toFixed(2) : value;
            return [valueLabel, "Сумма (тыс. руб.)"];
          }}
        />
        <Legend />
        <Bar dataKey={yKey} fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const PieChartComponent = ({ data, nameKey, valueKey, title }) => {
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
  ];

  return (
    <div className="chart-container">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            outerRadius={80}
            fill="#8884d8"
            dataKey={valueKey}
            nameKey={nameKey}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => {
              const valueLabel =
                typeof value === "number" ? value.toFixed(2) : value;
              return [valueLabel, "Сумма (тыс. руб.)"];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Main component to render visualizations
const VisualizationRenderer = ({ visualizationData }) => {
  if (!visualizationData || !visualizationData.type) {
    return <div className="no-visualization">Нет данных для визуализации</div>;
  }

  try {
    // Instead of trying to render JSX strings, we'll use the data to render pre-defined components
    const { type, data, title } = visualizationData;

    // Parse data if it's a string
    const chartData = typeof data === "string" ? JSON.parse(data) : data;

    switch (type.toLowerCase()) {
      case "line":
        return (
          <LineChartComponent
            data={chartData}
            xKey={visualizationData.xKey || "name"}
            yKey={visualizationData.yKey || "value"}
            title={title || "Линейный график"}
          />
        );

      case "bar":
        return (
          <BarChartComponent
            data={chartData}
            xKey={visualizationData.xKey || "name"}
            yKey={visualizationData.yKey || "value"}
            title={title || "Столбчатая диаграмма"}
          />
        );

      case "pie":
        return (
          <PieChartComponent
            data={chartData}
            nameKey={visualizationData.nameKey || "name"}
            valueKey={visualizationData.valueKey || "value"}
            title={title || "Круговая диаграмма"}
          />
        );

      default:
        return (
          <div className="unsupported-visualization">
            Неподдерживаемый тип визуализации: {type}
          </div>
        );
    }
  } catch (error) {
    console.error("Error rendering visualization:", error);
    return (
      <div className="error-message">Ошибка визуализации: {error.message}</div>
    );
  }
};

export default VisualizationRenderer;
