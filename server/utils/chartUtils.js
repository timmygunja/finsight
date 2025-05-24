/**
 * Utility functions for chart generation and processing
 */

/**
 * Generate chart component as a string
 * @param {Object} vizData - Visualization data object
 * @returns {String} JSX string for the chart
 */
function generateChartComponentString(vizData) {
  const { type, data, xAxis, yAxis } = vizData;

  // Generate colors for charts
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
  ];

  // Round decimal values to 2 places
  const roundedData = data.map((item) => ({
    ...item,
    value:
      typeof item.value === "number" && item.value % 1 !== 0
        ? Math.round(item.value * 100) / 100
        : item.value,
  }));

  switch (type.toLowerCase()) {
    case "bar":
      return `
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={${JSON.stringify(roundedData)}}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip formatter={(value) => value.toLocaleString()} />
      <Legend />
      <Bar dataKey="value" fill="#3b82f6" name="${yAxis || "Значение"}" />
    </BarChart>
  </ResponsiveContainer>
        `.trim();

    case "line":
      return `
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={${JSON.stringify(roundedData)}}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip formatter={(value) => value.toLocaleString()} />
      <Legend />
      <Line type="monotone" dataKey="value" stroke="#3b82f6" name="${
        yAxis || "Значение"
      }" />
    </LineChart>
  </ResponsiveContainer>
        `.trim();

    case "pie":
      return `
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={${JSON.stringify(roundedData)}}
        cx="50%"
        cy="50%"
        labelLine={true}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
        nameKey="name"
        label={({ name, percent }) => \`\${name}: \${(percent * 100).toFixed(0)}%\`}
      >
        {${JSON.stringify(roundedData)}.map((entry, index) => (
          <Cell key={\`cell-\${index}\`} fill={["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"][index % 6]} />
        ))}
      </Pie>
      <Tooltip formatter={(value) => value.toLocaleString()} />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
        `.trim();

    case "scatter":
      return `
  <ResponsiveContainer width="100%" height={300}>
    <ScatterChart>
      <CartesianGrid />
      <XAxis type="number" dataKey="x" name="${xAxis || "X"}" />
      <YAxis type="number" dataKey="y" name="${yAxis || "Y"}" />
      <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value) => value.toLocaleString()} />
      <Legend />
      <Scatter name="${xAxis || "X"} vs ${yAxis || "Y"}" data={${JSON.stringify(
        roundedData
      )}} fill="#3b82f6" />
    </ScatterChart>
  </ResponsiveContainer>
        `.trim();

    default:
      return `
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={${JSON.stringify(roundedData)}}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip formatter={(value) => value.toLocaleString()} />
      <Legend />
      <Bar dataKey="value" fill="#3b82f6" />
    </BarChart>
  </ResponsiveContainer>
        `.trim();
  }
}

/**
 * Process chart data to ensure it's in the correct format
 * @param {Object} vizData - Visualization data object
 * @returns {Object} Processed visualization data
 */
function processChartData(vizData) {
  // Make sure data is an array
  if (!Array.isArray(vizData.data)) {
    vizData.data = [];
  }

  // Ensure each data point has the required properties based on chart type
  switch (vizData.type.toLowerCase()) {
    case "bar":
    case "line":
      vizData.data = vizData.data.map((item) => {
        let value = typeof item.value === "number" ? item.value : 0;
        // Round decimal values
        if (value % 1 !== 0) {
          value = Math.round(value * 100) / 100;
        }
        return {
          name: item.name || "Unknown",
          value: value,
        };
      });
      break;
    case "pie":
      vizData.data = vizData.data.map((item) => {
        let value = typeof item.value === "number" ? item.value : 0;
        // Round decimal values
        if (value % 1 !== 0) {
          value = Math.round(value * 100) / 100;
        }
        return {
          name: item.name || "Unknown",
          value: value,
        };
      });
      break;
    case "scatter":
      vizData.data = vizData.data.map((item) => {
        let x = typeof item.x === "number" ? item.x : 0;
        let y = typeof item.y === "number" ? item.y : 0;
        // Round decimal values
        if (x % 1 !== 0) x = Math.round(x * 100) / 100;
        if (y % 1 !== 0) y = Math.round(y * 100) / 100;
        return {
          x: x,
          y: y,
          name: item.name || "Point",
        };
      });
      break;
  }

  return vizData;
}

/**
 * Validate chart data
 * @param {Array} data - Chart data array
 * @param {String} chartType - Type of chart
 * @returns {Boolean} True if data is valid
 */
function validateChartData(data, chartType) {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  switch (chartType.toLowerCase()) {
    case "line":
    case "bar":
      return data.every((item) => item.name && typeof item.value === "number");
    case "pie":
      return data.every(
        (item) => item.name && typeof item.value === "number" && item.value >= 0
      );
    case "scatter":
      return data.every(
        (item) => typeof item.x === "number" && typeof item.y === "number"
      );
    default:
      return data.every((item) => item.name && typeof item.value === "number");
  }
}

/**
 * Determine chart type from JSX code
 * @param {String} jsx - JSX code
 * @returns {String} - Chart type
 */
function determineChartType(jsx) {
  if (jsx.includes("BarChart")) return "bar";
  if (jsx.includes("LineChart")) return "line";
  if (jsx.includes("PieChart")) return "pie";
  if (jsx.includes("ScatterChart")) return "scatter";
  if (jsx.includes("AreaChart")) return "area";
  if (jsx.includes("RadarChart")) return "radar";
  return "unknown";
}

/**
 * Generate a simple visualization based on data
 * @param {Array} data - Visualization data
 * @returns {Object|null} Simple visualization object or null
 */
function generateSimpleVisualization(data) {
  try {
    // Extract some meaningful data for visualization
    let chartData = [];
    const chartType = "bar";
    let title = "Data Visualization";
    let description = "Visualization of the provided data";

    // Try to extract data from the first item
    if (data && data.length > 0) {
      const firstItem = data[0];

      if (
        firstItem.type === "tabular" &&
        firstItem.rows &&
        firstItem.rows.length > 0
      ) {
        // For tabular data, create a bar chart of the first 5-10 rows
        const rows = firstItem.rows.slice(0, 10);
        const headers = firstItem.headers || [];

        // Use the first column as name and second column as value if available
        if (headers.length >= 2) {
          chartData = rows.map((row) => {
            let value = Number.parseFloat(row[headers[1]]) || 0;
            // Round decimal values
            if (value % 1 !== 0) {
              value = Math.round(value * 100) / 100;
            }
            return {
              name: String(row[headers[0]] || "Unknown"),
              value: value,
            };
          });

          title = `${headers[0]} vs ${headers[1]}`;
          description = `Comparison of ${headers[0]} and ${headers[1]} values`;
        } else {
          // Just use the first property as name and second as value
          const keys = Object.keys(rows[0]);
          if (keys.length >= 2) {
            chartData = rows.map((row) => {
              let value = Number.parseFloat(row[keys[1]]) || 0;
              // Round decimal values
              if (value % 1 !== 0) {
                value = Math.round(value * 100) / 100;
              }
              return {
                name: String(row[keys[0]] || "Unknown"),
                value: value,
              };
            });

            title = `${keys[0]} vs ${keys[1]}`;
            description = `Comparison of ${keys[0]} and ${keys[1]} values`;
          }
        }
      } else if (firstItem.type === "json" && firstItem.data) {
        // For JSON data, try to extract some meaningful values
        const jsonData = firstItem.data;

        if (Array.isArray(jsonData)) {
          // If it's an array, use the first 10 items
          chartData = jsonData.slice(0, 10).map((item, index) => {
            // Try to find name and value properties
            const name =
              item.name ||
              item.label ||
              item.title ||
              item.id ||
              `Item ${index + 1}`;
            let value = Number.parseFloat(
              item.value || item.count || item.amount || 1
            );

            // Round decimal values
            if (value % 1 !== 0) {
              value = Math.round(value * 100) / 100;
            }

            return { name: String(name), value: value };
          });
        } else if (typeof jsonData === "object") {
          // If it's an object, use its properties
          chartData = Object.entries(jsonData)
            .filter(
              ([_, value]) =>
                typeof value === "number" || !isNaN(Number.parseFloat(value))
            )
            .map(([key, value]) => {
              let numValue = Number.parseFloat(value);
              // Round decimal values
              if (numValue % 1 !== 0) {
                numValue = Math.round(numValue * 100) / 100;
              }
              return {
                name: key,
                value: numValue,
              };
            });
        }
      }
    }

    // If we couldn't extract any meaningful data, return null
    if (chartData.length === 0) {
      return null;
    }

    // Generate JSX for the chart
    const jsx = `
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={${JSON.stringify(chartData)}}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip formatter={(value) => value.toLocaleString()} />
      <Legend />
      <Bar dataKey="value" fill="#3b82f6" />
    </BarChart>
  </ResponsiveContainer>
      `.trim();

    return {
      type: "jsx",
      title,
      description,
      data: jsx,
      chartType: "bar",
    };
  } catch (error) {
    console.error("Error generating simple visualization:", error);
    return null;
  }
}

module.exports = {
  generateChartComponentString,
  processChartData,
  validateChartData,
  determineChartType,
  generateSimpleVisualization,
};
