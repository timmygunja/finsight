// Import styles directly
import "./MessageList.css";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import JsxParser from "react-jsx-parser";

// Define colors for charts
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

function MessageList({ messages }) {
  const getFileIcon = (fileType) => {
    if (fileType.includes("image")) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      );
    } else if (fileType.includes("pdf")) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    } else if (
      fileType.includes("excel") ||
      fileType.includes("sheet") ||
      fileType.includes("csv")
    ) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    } else {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
      );
    }
  };

  // Форматирование времени без секунд
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Изменим функцию formatText, чтобы она распознавала маркеры для вставки визуализаций
  // и добавим функцию для встраивания визуализаций в текст

  // Обновляем функцию formatText для распознавания мест для вставки визуализаций
  const formatText = (text, visualizations) => {
    if (!text) return [];

    // Create array for formatted parts
    const formattedParts = [];

    // Check if we have visualization placeholders in the text
    const hasPlaceholders = text.includes("---VISUALIZATION_PLACEHOLDER_");

    if (hasPlaceholders && visualizations && visualizations.length > 0) {
      // Split text by visualization placeholders
      const parts = text.split(/---VISUALIZATION_PLACEHOLDER_\d+---/);

      // Find all placeholders
      const placeholders = [];
      const placeholderRegex = /---VISUALIZATION_PLACEHOLDER_(\d+)---/g;
      let match;

      while ((match = placeholderRegex.exec(text)) !== null) {
        placeholders.push({
          placeholder: match[0],
          index: Number.parseInt(match[1], 10),
          position: match.index,
        });
      }

      // Sort placeholders by their position in the text
      placeholders.sort((a, b) => a.position - b.position);

      // Add text parts and visualizations in the correct order
      for (let i = 0; i < parts.length; i++) {
        // Add the text part
        if (parts[i]) {
          formattedParts.push({
            type: "text",
            content: formatTextContent(parts[i]),
          });
        }

        // Add the visualization if available
        if (i < placeholders.length) {
          const vizIndex = placeholders[i].index;
          if (vizIndex < visualizations.length) {
            formattedParts.push({
              type: "visualization",
              visualization: visualizations[vizIndex],
            });
          }
        }
      }
    } else {
      // Check for visualization blocks that weren't properly replaced
      const vizBlockRegex =
        /---VISUALIZATION---([\s\S]*?)---ENDVISUALIZATION---/g;
      let vizMatch;
      let lastIndex = 0;
      let foundBlocks = false;

      while ((vizMatch = vizBlockRegex.exec(text)) !== null) {
        foundBlocks = true;
        // Add text before the visualization block
        if (vizMatch.index > lastIndex) {
          const beforeText = text.substring(lastIndex, vizMatch.index);
          formattedParts.push({
            type: "text",
            content: formatTextContent(beforeText),
          });
        }

        // Extract the block content
        const blockContent = vizMatch[1];

        // Try to find a matching visualization for this block
        const matchingViz = visualizations?.find(
          (viz) =>
            viz.originalBlock &&
            viz.originalBlock.includes(blockContent.substring(0, 50))
        );

        if (matchingViz) {
          // Add the visualization if we have a matching one
          formattedParts.push({
            type: "visualization",
            visualization: matchingViz,
          });
        } else {
          // If no matching visualization found, create one from the block content
          const parsedViz = parseVisualizationBlockInline(blockContent);
          if (parsedViz) {
            formattedParts.push({
              type: "visualization",
              visualization: parsedViz,
            });
          } else {
            // If parsing fails, just add the text
            formattedParts.push({
              type: "text",
              content: formatTextContent(vizMatch[0]),
            });
          }
        }

        lastIndex = vizMatch.index + vizMatch[0].length;
      }

      // Add any remaining text
      if (lastIndex < text.length) {
        formattedParts.push({
          type: "text",
          content: formatTextContent(text.substring(lastIndex)),
        });
      }

      // If no visualization blocks found, fallback to the original formatting logic
      if (!foundBlocks) {
        // Original fallback logic (keep this part unchanged)
        // Разбиваем текст на секции (разделы анализа)
        const sections = text.split(/---/g);

        sections.forEach((section, sectionIndex) => {
          // Форматируем текст секции
          const formattedSection = formatTextContent(section);

          // Добавляем отформатированную секцию
          formattedParts.push({ type: "text", content: formattedSection });

          // Ищем подходящие визуализации для этой секции
          if (visualizations && visualizations.length > 0) {
            // Проверяем каждый тип визуализации
            const vizTypes = [
              {
                type: "line",
                keywords: [
                  "линейный график",
                  "линейного графика",
                  "график изменения",
                ],
              },
              {
                type: "bar",
                keywords: [
                  "столбчатая диаграмма",
                  "гистограмма",
                  "столбчатой диаграммы",
                ],
              },
              {
                type: "pie",
                keywords: [
                  "круговая диаграмма",
                  "круговой график",
                  "круговой диаграммы",
                ],
              },
              {
                type: "scatter",
                keywords: [
                  "диаграмма рассеяния",
                  "точечная диаграмма",
                  "scatter plot",
                ],
              },
            ];

            vizTypes.forEach((vizType) => {
              // Проверяем, упоминается ли этот тип визуализации в секции
              const hasVizType = vizType.keywords.some((keyword) =>
                section.toLowerCase().includes(keyword)
              );

              if (hasVizType) {
                // Ищем подходящую визуализацию этого типа
                const matchingViz = visualizations.find(
                  (viz) => viz.type.toLowerCase() === vizType.type && !viz.used
                );

                if (matchingViz) {
                  // Помечаем визуализацию как использованную
                  matchingViz.used = true;
                  // Добавляем визуализацию после текста секции
                  formattedParts.push({
                    type: "visualization",
                    visualization: matchingViz,
                  });
                }
              }
            });
          }

          // Добавляем разделитель между секциями, кроме последней
          if (sectionIndex < sections.length - 1) {
            formattedParts.push({ type: "divider" });
          }
        });

        // Добавляем оставшиеся неиспользованные визуализации в конец
        if (visualizations && visualizations.length > 0) {
          const unusedViz = visualizations.filter((viz) => !viz.used);
          if (unusedViz.length > 0) {
            formattedParts.push({
              type: "text",
              content:
                "<h3 class='message-title'>Дополнительные визуализации</h3>",
            });
            unusedViz.forEach((viz) => {
              formattedParts.push({
                type: "visualization",
                visualization: viz,
              });
            });
          }
        }
      }
    }

    return formattedParts;
  };

  // Helper function to format text content
  const formatTextContent = (text) => {
    let formattedText = text;

    // Заменяем заголовки (строки, начинающиеся с цифры и точки)
    formattedText = formattedText.replace(
      /^(\d+)\.\s+(.+)$/gm,
      '<h3 class="message-title">$1. <strong>$2</strong></h3>'
    );

    // Заменяем ��ирный текст (между двумя звездочками)
    formattedText = formattedText.replace(
      /\*\*([^*]+)\*\*/g,
      "<strong>$1</strong>"
    );

    // Заменяем маркированные списки (строки, начинающиеся с дефиса)
    formattedText = formattedText.replace(
      /^(\s*)-\s+(.+)$/gm,
      '$1<span class="list-item">• $2</span>'
    );

    return formattedText;
  };

  // Helper function to parse visualization blocks directly in the component
  const parseVisualizationBlockInline = (blockContent) => {
    try {
      const lines = blockContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

      // Extract visualization properties
      const typeMatch = lines
        .find((line) => line.startsWith("Тип:"))
        ?.match(/Тип:\s*(.+)/);
      const titleMatch = lines
        .find((line) => line.startsWith("Заголовок:"))
        ?.match(/Заголовок:\s*(.+)/);
      const descriptionMatch = lines
        .find((line) => line.startsWith("Описание:"))
        ?.match(/Описание:\s*(.+)/);
      const xAxisMatch = lines
        .find((line) => line.startsWith("Ось X:"))
        ?.match(/Ось X:\s*(.+)/);
      const yAxisMatch = lines
        .find((line) => line.startsWith("Ось Y:"))
        ?.match(/Ось Y:\s*(.+)/);

      if (!typeMatch) return null;

      // Determine visualization type
      let type = "bar"; // default
      const typeText = typeMatch[1].toLowerCase();
      if (typeText.includes("линейный") || typeText.includes("график")) {
        type = "line";
      } else if (typeText.includes("круговая") || typeText.includes("пирог")) {
        type = "pie";
      } else if (
        typeText.includes("столбчатая") ||
        typeText.includes("гистограмма")
      ) {
        type = "bar";
      }

      // Extract data points
      const data = [];
      const dataStartIndex = lines.findIndex((line) =>
        line.startsWith("Данные:")
      );

      if (dataStartIndex !== -1) {
        // Get all lines after "Данные:" that start with a dash
        const dataLines = lines
          .slice(dataStartIndex + 1)
          .filter((line) => line.startsWith("-"));

        dataLines.forEach((line) => {
          // Remove the leading dash and trim
          const dataLine = line.substring(1).trim();

          // Try to extract name and value
          const match = dataLine.match(/([^:]+):\s*([-\d\s.,]+)/);

          if (match) {
            const name = match[1].trim();
            // Clean up the value - remove spaces, replace commas with dots
            const valueStr = match[2].replace(/\s+/g, "").replace(/,/g, ".");
            let value = Number.parseFloat(valueStr);

            if (!isNaN(value)) {
              // Round to 2 decimal places if it's a decimal number
              if (value % 1 !== 0) {
                value = Math.round(value * 100) / 100;
              }
              data.push({ name, value });
            }
          }
        });
      }

      // If no data was extracted, return null
      if (data.length === 0) return null;

      return {
        type,
        title: titleMatch ? titleMatch[1] : "Визуализация данных",
        description: descriptionMatch ? descriptionMatch[1] : "",
        data,
        xAxis: xAxisMatch ? xAxisMatch[1] : "Категория",
        yAxis: yAxisMatch ? yAxisMatch[1] : "Значение",
      };
    } catch (error) {
      console.error("Error parsing visualization block inline:", error);
      return null;
    }
  };

  // Обновляем функцию renderVisualization для включения описания под графиком
  const renderVisualization = (visualization) => {
    console.log("Rendering visualization:", visualization);

    if (!visualization) {
      return null;
    }

    const { type, title, description, data } = visualization;

    // Если визуализация - JSX код от OpenRouter
    if (type === "jsx") {
      return (
        <div className="visualization-item">
          <h4 className="visualization-title">{title}</h4>
          <div className="visualization-chart">
            <JsxParser
              components={{
                BarChart,
                Bar,
                LineChart,
                Line,
                PieChart,
                Pie,
                ScatterChart,
                Scatter,
                XAxis,
                YAxis,
                CartesianGrid,
                Tooltip,
                Legend,
                ResponsiveContainer,
                Cell,
              }}
              jsx={data}
              renderInWrapper={false}
              bindings={{ COLORS }}
              blacklistedAttrs={[]}
            />
          </div>
          <div className="visualization-footer">
            {description && (
              <p className="visualization-description">{description}</p>
            )}
          </div>
        </div>
      );
    }

    // Если визуализация - HTML-контент
    if (type === "chart" && typeof data === "string") {
      return (
        <div className="visualization-item">
          <h4 className="visualization-title">{title}</h4>
          <div dangerouslySetInnerHTML={{ __html: data }} />
          {description && (
            <p className="visualization-description">{description}</p>
          )}
        </div>
      );
    }

    // Если визуализация - изображение
    if (type === "image") {
      return (
        <div className="visualization-item">
          <h4 className="visualization-title">{title}</h4>
          <img
            src={data || "/placeholder.svg"}
            alt={title}
            className="visualization-image"
          />
          {description && (
            <p className="visualization-description">{description}</p>
          )}
        </div>
      );
    }

    // Если визуализация - данные
    if (type === "data") {
      return (
        <div className="visualization-item">
          <h4 className="visualization-title">{title}</h4>
          <pre className="visualization-data">{data}</pre>
          {description && (
            <p className="visualization-description">{description}</p>
          )}
        </div>
      );
    }

    // Если нет данных или некорректные данные
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log("Invalid data for visualization:", data);
      return (
        <div className="visualization-item">
          <h4 className="visualization-title">{title}</h4>
          <div
            className="visualization-error"
            style={{
              backgroundColor: "#ffeeee",
              color: "#882222",
              padding: "20px",
              borderRadius: "4px",
              textAlign: "center",
            }}
          >
            Не удалось сгенерировать данные для визуализации
          </div>
          {description && (
            <p className="visualization-description">{description}</p>
          )}
        </div>
      );
    }

    // Рендеринг графиков в зависимости от типа
    return (
      <div className="visualization-item">
        <h4 className="visualization-title">{title}</h4>
        <div className="visualization-chart">
          {renderChart(type, data, visualization.xAxis, visualization.yAxis)}
        </div>
        {description && (
          <p className="visualization-description">{description}</p>
        )}
        {!description && (
          <p className="visualization-description">
            График показывает{" "}
            {type === "bar"
              ? "распределение значений"
              : type === "line"
              ? "изменение показателя во времени"
              : type === "pie"
              ? "долю каждой категории"
              : "взаимосвязь между показателями"}
            .
          </p>
        )}
      </div>
    );
  };

  // Рендеринг различных типов графиков
  const renderChart = (type, data, xAxis, yAxis) => {
    console.log(`Rendering ${type} chart with data:`, data);

    switch (type.toLowerCase()) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" name={yAxis || "Значение"} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                name={yAxis || "Значение"}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
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
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis type="number" dataKey="x" name={xAxis || "X"} />
              <YAxis type="number" dataKey="y" name={yAxis || "Y"} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Legend />
              <Scatter
                name={`${xAxis} vs ${yAxis}`}
                data={data}
                fill="#3b82f6"
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="visualization-error">
            Неподдерживаемый тип графика: {type}
          </div>
        );
    }
  };

  // Обновляем основной компонент MessageList для использования новой логики форматирования
  if (messages.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-content">
          <h2>Начните новый разговор</h2>
          <p>Загрузите данные или задайте вопрос для анализа</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => {
        const visualizationsCopy = message.visualizations
          ? JSON.parse(JSON.stringify(message.visualizations))
          : [];

        return (
          <div
            key={message.id}
            className={`message ${message.role} ${
              message.error ? "error" : ""
            }`}
          >
            <div className="message-header">
              <span>{message.role === "user" ? "Вы" : "Finsight"}</span>
              <span>{formatTime(message.timestamp)}</span>
            </div>

            {message.isLoading ? (
              <div className="message-loading">
                <div className="loading-spinner"></div>
                <span>{message.content}</span>
              </div>
            ) : (
              <>
                {/* For user messages - ensure content is displayed only once */}
                {message.role === "user" && message.content && (
                  <div className="message-content">{message.content}</div>
                )}

                {/* Show files for both user and assistant messages */}
                {message.files && message.files.length > 0 && (
                  <>
                    <div className="message-files">
                      <h4>Прикрепленные файлы:</h4>
                      <div className="files-container">
                        {message.files.map((file, index) => (
                          <div key={index} className="file-item">
                            {getFileIcon(file.type)}
                            <span>{file.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Main content display for all messages */}
                <div className="message-content-with-viz">
                  {formatText(
                    message.role === "user" ? "" : message.content,
                    visualizationsCopy
                  ).map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <div
                          key={`text-${index}`}
                          className="message-content"
                          dangerouslySetInnerHTML={{ __html: part.content }}
                        />
                      );
                    } else if (part.type === "visualization") {
                      return (
                        <div
                          key={`viz-${index}`}
                          className="visualization-wrapper"
                        >
                          {renderVisualization(part.visualization)}
                        </div>
                      );
                    } else if (part.type === "divider") {
                      return (
                        <hr
                          key={`divider-${index}`}
                          className="message-divider"
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default MessageList;
