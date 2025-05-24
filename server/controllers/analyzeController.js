const Conversation = require("../models/conversation");
const { processExcelFile } = require("../utils/excelProcessor");
const { processJsonFile } = require("../utils/jsonProcessor");
const { processImageFile } = require("../utils/imageProcessor");
const { processTextFile } = require("../utils/textProcessor");
const { sendToMLService } = require("../services/mlService");
const {
  generateVisualizationData,
} = require("../services/visualizationService");

/**
 * Обработка запроса на анализ данных
 */
exports.analyzeData = async (req, res) => {
  try {
    const { text } = req.body;
    const files = req.files || [];
    const history = req.body.history ? JSON.parse(req.body.history) : [];
    const conversationId = req.body.conversationId || `conv_${Date.now()}`;
    const userId = req.body.userId || `user_${Date.now()}`;

    console.log(
      `Processing request with ${files.length} files and text: ${text}`
    );

    // Process each file based on its type
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const fileType = file.mimetype;
        const fileName = file.originalname;

        try {
          if (
            fileType.includes("spreadsheet") ||
            fileType.includes("excel") ||
            fileName.endsWith(".csv")
          ) {
            return {
              name: fileName,
              type: fileType,
              data: await processExcelFile(file.buffer),
            };
          } else if (fileType.includes("json") || fileName.endsWith(".json")) {
            return {
              name: fileName,
              type: fileType,
              data: await processJsonFile(file.buffer),
            };
          } else if (fileType.startsWith("image/")) {
            return {
              name: fileName,
              type: fileType,
              data: await processImageFile(file.buffer),
            };
          } else {
            return {
              name: fileName,
              type: fileType,
              data: await processTextFile(file.buffer),
            };
          }
        } catch (error) {
          console.error(`Error processing file ${fileName}:`, error);
          return {
            name: fileName,
            type: fileType,
            error: error.message,
          };
        }
      })
    );

    // Create a unified request object
    const requestData = {
      text,
      files: processedFiles,
      history,
      conversationId,
      userId,
    };

    // Store user message in MongoDB
    await Conversation.updateOne(
      { conversationId },
      {
        $push: {
          messages: {
            role: "user",
            content: text,
            files: files.map((f) => ({
              name: f.originalname,
              type: f.mimetype,
              size: f.size,
            })),
            timestamp: new Date(),
          },
        },
        $setOnInsert: { createdAt: new Date(), userId },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    // Send to ML service for text analysis
    const mlResponse = await sendToMLService(requestData);

    // Generate visualizations using the integrated visualization service
    let visualizations = [];

    // Only attempt visualization if there are processed files with data
    const validFiles = processedFiles.filter(
      (file) => !file.error && file.data
    );

    if (validFiles.length > 0) {
      try {
        console.log("Generating visualizations...");

        // Use the integrated visualization service
        visualizations = await generateVisualizationData([], validFiles, text);

        // Convert traditional visualization format to JSX format if needed
        visualizations = visualizations.map((viz) => {
          // If it's already in JSX format, return as is
          if (viz.type === "jsx") {
            return viz;
          }

          // Convert traditional chart types to JSX format to JSX format
          if (["bar", "line", "pie", "scatter"].includes(viz.type)) {
            return {
              type: "jsx",
              title: viz.title,
              description: viz.description,
              chartType: viz.type,
              data: generateJSXForChartType(
                viz.type,
                viz.data,
                viz.xAxis,
                viz.yAxis
              ),
            };
          }

          // Return other visualization types as is
          return viz;
        });

        console.log(
          `Successfully generated ${visualizations.length} visualizations`
        );
      } catch (vizError) {
        console.error("Visualization generation failed:", vizError.message);

        // Add error visualization to the response
        visualizations.push({
          type: "error",
          title: "Visualization Error",
          description:
            "Unable to generate visualization due to an error: " +
            vizError.message,
          data: null,
        });
      }
    }

    // Combine results
    const response = {
      response: mlResponse.text,
      visualizations,
      conversationId,
    };

    // Store system response in MongoDB
    await Conversation.updateOne(
      { conversationId },
      {
        $push: {
          messages: {
            role: "system",
            content: response.response,
            visualizations,
            timestamp: new Date(),
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    res.json(response);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
};

/**
 * Generate JSX code for a specific chart type
 * @param {string} chartType - Type of chart (bar, line, pie, scatter)
 * @param {Array} data - Chart data
 * @param {string} xAxis - X-axis label
 * @param {string} yAxis - Y-axis label
 * @returns {string} JSX code for the chart
 */
function generateJSXForChartType(chartType, data, xAxis, yAxis) {
  switch (chartType.toLowerCase()) {
    case "bar":
      return `
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={${JSON.stringify(data)}}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="value" fill="#3b82f6" name="${yAxis || "Значение"}" />
  </BarChart>
</ResponsiveContainer>`;

    case "line":
      return `
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={${JSON.stringify(data)}}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="value" stroke="#3b82f6" name="${
      yAxis || "Значение"
    }" />
  </LineChart>
</ResponsiveContainer>`;

    case "pie":
      return `
<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie
      data={${JSON.stringify(data)}}
      cx="50%"
      cy="50%"
      labelLine={true}
      outerRadius={80}
      fill="#8884d8"
      dataKey="value"
      nameKey="name"
      label={({ name, percent }) => \`\${name}: \${(percent * 100).toFixed(0)}%\`}
    >
      {
        ${JSON.stringify(data)}.map((entry, index) => (
          <Cell key={\`cell-\${index}\`} fill={["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"][index % 6]} />
        ))
      }
    </Pie>
    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>`;

    case "scatter":
      return `
<ResponsiveContainer width="100%" height={300}>
  <ScatterChart>
    <CartesianGrid />
    <XAxis type="number" dataKey="x" name="${xAxis || "X"}" />
    <YAxis type="number" dataKey="y" name="${yAxis || "Y"}" />
    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
    <Legend />
    <Scatter name="${xAxis || "X"} vs ${yAxis || "Y"}" data={${JSON.stringify(
        data
      )}} fill="#3b82f6" />
  </ScatterChart>
</ResponsiveContainer>`;

    default:
      return `
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={${JSON.stringify(data)}}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="value" fill="#3b82f6" />
  </BarChart>
</ResponsiveContainer>`;
  }
}
