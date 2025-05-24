/**
 * Extract visualization data directly from text response
 * @param {string} text - Text response from AI
 * @returns {Array} Array of visualization data objects
 */
function extractVisualizationDataFromText(text) {
  try {
    console.log("Extracting visualization data from text");

    // Array to store extracted visualization data
    const visualizations = [];

    // First, try to extract visualization blocks
    const visualizationBlocks = extractVisualizationBlocks(text);
    if (visualizationBlocks.length > 0) {
      console.log(`Found ${visualizationBlocks.length} visualization blocks`);
      visualizationBlocks.forEach((block, index) => {
        const vizData = parseVisualizationBlock(block.content);
        if (vizData) {
          visualizations.push({
            ...vizData,
            position: block.position,
            length: block.length,
            blockIndex: index,
          });
        }
      });
    }

    // If no visualization blocks found, fall back to the old extraction method
    if (visualizations.length === 0) {
      // Regular expressions to match visualization patterns
      const lineChartPattern =
        /(?:Линейный график|линейный график|график|График).*?(?:с осью|показывающий|отображающий)/gi;
      const barChartPattern =
        /(?:Столбчатая диаграмма|столбчатая диаграмма|гистограмма|Гистограмма)/gi;
      const pieChartPattern =
        /(?:Круговая диаграмма|круговая диаграмма|Круговой график|круговой график)/gi;

      // Extract sections that mention visualizations
      const sections = text.split(/\n\s*\n|\n---\n/);

      for (const section of sections) {
        // Skip empty sections
        if (!section.trim()) continue;

        // Try to extract title and data from the section
        const title = extractTitle(section);
        const description = extractDescription(section);

        // Check for line chart
        if (lineChartPattern.test(section)) {
          const data = extractDataForLineChart(section);
          if (data.length > 0) {
            visualizations.push({
              type: "line",
              title: title || "Линейный график",
              description:
                description || "График изменения показателя во времени",
              data: data,
              xAxis: "Период",
              yAxis: "Значение",
            });
          }
        }

        // Check for bar chart
        if (barChartPattern.test(section)) {
          const data = extractDataForBarChart(section);
          if (data.length > 0) {
            visualizations.push({
              type: "bar",
              title: title || "Столбчатая диаграмма",
              description: description || "Сравнение значений по категориям",
              data: data,
              xAxis: "Категория",
              yAxis: "Значение",
            });
          }
        }

        // Check for pie chart
        if (pieChartPattern.test(section)) {
          const data = extractDataForPieChart(section);
          if (data.length > 0) {
            visualizations.push({
              type: "pie",
              title: title || "Круговая диаграмма",
              description:
                description || "Распределение значений по категориям",
              data: data,
            });
          }
        }
      }

      // If we didn't find visualizations by patterns, try to find numeric data
      if (visualizations.length === 0) {
        // Look for sections with numeric data and keywords for visualization types
        for (const section of sections) {
          if (!section.trim() || !containsNumericData(section)) continue;

          const title = extractTitle(section);
          const description = extractDescription(section);

          // Check for keywords that suggest visualization types
          if (
            section.toLowerCase().includes("изменени") ||
            section.toLowerCase().includes("динамик") ||
            section.toLowerCase().includes("тренд")
          ) {
            // This looks like a line chart
            const data = extractGenericData(section);
            if (data.length > 0) {
              visualizations.push({
                type: "line",
                title: title || "Динамика показателей",
                description:
                  description || "График изменения показателей во времени",
                data: data,
                xAxis: "Период",
                yAxis: "Значение",
              });
            }
          } else if (
            section.toLowerCase().includes("распределени") ||
            section.toLowerCase().includes("долей") ||
            section.toLowerCase().includes("процент")
          ) {
            // This looks like a pie chart
            const data = extractGenericData(section);
            if (data.length > 0) {
              visualizations.push({
                type: "pie",
                title: title || "Распределение показателей",
                description: description || "Диаграмма распределения долей",
                data: data,
              });
            }
          } else {
            // Default to bar chart
            const data = extractGenericData(section);
            if (data.length > 0) {
              visualizations.push({
                type: "bar",
                title: title || "Анализ показателей",
                description: description || "Сравнение значений показателей",
                data: data,
                xAxis: "Показатель",
                yAxis: "Значение",
              });
            }
          }
        }
      }
    }

    // Also try to extract visualization opportunities from bullet points
    const bulletPointVisualizations = extractVisualizationOpportunities(text);
    if (bulletPointVisualizations.length > 0) {
      visualizations.push(...bulletPointVisualizations);
    }

    console.log(`Extracted ${visualizations.length} visualizations from text`);
    return visualizations;
  } catch (error) {
    console.error("Error extracting visualization data from text:", error);
    return [];
  }
}

/**
 * Extract visualization blocks from text
 * @param {string} text - Text response from AI
 * @returns {Array} Array of visualization block objects with position and content
 */
function extractVisualizationBlocks(text) {
  const blocks = [];
  const blockStartPattern = /---VISUALIZATION---/g;
  const blockEndPattern = /---ENDVISUALIZATION---/g;

  let startMatch;
  let endMatch;
  let lastEndIndex = 0;

  // Reset regex indices
  blockStartPattern.lastIndex = 0;
  blockEndPattern.lastIndex = 0;

  // Find all start markers
  while ((startMatch = blockStartPattern.exec(text)) !== null) {
    // Find the next end marker
    blockEndPattern.lastIndex = startMatch.index;
    endMatch = blockEndPattern.exec(text);

    if (endMatch) {
      const blockStart = startMatch.index + "---VISUALIZATION---".length;
      const blockEnd = endMatch.index;

      if (blockEnd > blockStart) {
        blocks.push({
          position: startMatch.index,
          length:
            endMatch.index + "---ENDVISUALIZATION---".length - startMatch.index,
          content: text.substring(blockStart, blockEnd).trim(),
        });
      }

      lastEndIndex = endMatch.index + "---ENDVISUALIZATION---".length;
    }
  }

  return blocks;
}

// Modify the parseVisualizationBlock function to better extract real data values
function parseVisualizationBlock(blockContent) {
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

    // Find the data section
    const dataStartIndex = lines.findIndex((line) =>
      line.startsWith("Данные:")
    );

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

    // Extract data points - improved to handle real data values
    const data = [];
    if (dataStartIndex !== -1) {
      // Get all lines after "Данные:" that start with a dash
      const dataLines = lines
        .slice(dataStartIndex + 1)
        .filter((line) => line.startsWith("-"));

      dataLines.forEach((line) => {
        // Remove the leading dash and trim
        const dataLine = line.substring(1).trim();

        // Try to extract name and value
        // Pattern: NAME: 123,456.78 (XX%)
        const match = dataLine.match(
          /([^:]+):\s*([-\d\s.,]+)(?:\s*$$([^)]+)$$)?/
        );

        if (match) {
          const name = match[1].trim();
          // Clean up the value - remove spaces, replace commas with dots
          const valueStr = match[2].replace(/\s+/g, "").replace(/,/g, ".");
          let value = Number.parseFloat(valueStr);

          // If there's a percentage, we can use that for pie charts
          const percentMatch = match[3] ? match[3].match(/([-\d.,]+)%/) : null;
          const percent = percentMatch
            ? Number.parseFloat(percentMatch[1].replace(",", "."))
            : null;

          // For pie charts, if we have a percentage and it's negative, adjust accordingly
          if (type === "pie" && percent !== null) {
            // If it's a loss percentage, make it positive but mark it
            if (match[3] && match[3].includes("убытка")) {
              value = Math.abs(value);
              data.push({ name: `${name} (убыток)`, value: percent });
            } else {
              data.push({ name, value: percent });
            }
          } else {
            // For other chart types, use the actual value
            if (!isNaN(value)) {
              data.push({ name, value });
            }
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
      originalBlock: blockContent,
    };
  } catch (error) {
    console.error("Error parsing visualization block:", error);
    return null;
  }
}

/**
 * Extract visualization opportunities from bullet points in text
 * @param {string} text - Text response from AI
 * @returns {Array} Array of visualization data objects
 */
function extractVisualizationOpportunities(text) {
  const visualizations = [];

  try {
    // Look for patterns like:
    // • Тип визуализации: Столбчатая диаграмма
    // • Оси X и Y: Ось X — месяцы, ось Y — сумма расходов
    // • Данные: Отрицательные значения по месяцам (январь: -496 630, март: -845 940, май: -522 511.4)

    // Split text into paragraphs
    const paragraphs = text.split(/\n\s*\n/);

    for (const paragraph of paragraphs) {
      // Check if paragraph contains visualization keywords
      if (
        paragraph.includes("Тип визуализации:") ||
        paragraph.includes("визуализация:") ||
        (paragraph.includes("диаграмма") && paragraph.includes("Оси"))
      ) {
        // Extract visualization type
        let type = "bar"; // default
        if (
          paragraph.includes("линейный график") ||
          paragraph.includes("Линейный график")
        ) {
          type = "line";
        } else if (
          paragraph.includes("круговая диаграмма") ||
          paragraph.includes("Круговая диаграмма")
        ) {
          type = "pie";
        }

        // Extract title
        const titleMatch = paragraph.match(/^([^•\n]+)/);
        const title = titleMatch ? titleMatch[1].trim() : "Визуализация данных";

        // Extract axes
        let xAxis = "Категория";
        let yAxis = "Значение";
        const axesMatch =
          paragraph.match(/Оси X и Y:([^•\n]+)/) ||
          paragraph.match(/Ось X[^,]+,\s*ось Y[^•\n]+/);
        if (axesMatch) {
          const axesText = axesMatch[1];
          const xAxisMatch = axesText.match(/X\s*[-—]\s*([^,]+)/);
          const yAxisMatch = axesText.match(/Y\s*[-—]\s*([^,\n]+)/);
          if (xAxisMatch) xAxis = xAxisMatch[1].trim();
          if (yAxisMatch) yAxis = yAxisMatch[1].trim();
        }

        // Extract data
        const data = [];
        const dataMatch = paragraph.match(/Данные:([^•\n]+)/);
        if (dataMatch) {
          const dataText = dataMatch[1];

          // Extract key-value pairs
          const pairs = dataText.match(/([^:,()]+):\s*([-\d.,]+)/g);
          if (pairs && pairs.length > 0) {
            pairs.forEach((pair) => {
              const parts = pair.split(":");
              if (parts.length === 2) {
                const name = parts[0].trim();
                const valueStr = parts[1].trim();
                const value = Number.parseFloat(valueStr.replace(/,/g, "."));
                if (!isNaN(value)) {
                  data.push({ name, value });
                }
              }
            });
          }
        }

        // If we have data, create a visualization
        if (data.length > 0) {
          // Extract description
          const descriptionMatch =
            paragraph.match(/Аномалия:([^•\n]+)/) ||
            paragraph.match(/Вывод:([^•\n]+)/);
          const description = descriptionMatch
            ? descriptionMatch[1].trim()
            : "";

          visualizations.push({
            type,
            title,
            description,
            data,
            xAxis,
            yAxis,
          });
        }
      }
    }
  } catch (error) {
    console.error("Error extracting visualization opportunities:", error);
  }

  return visualizations;
}

/**
 * Extract title from a section
 * @param {string} section - Text section
 * @returns {string|null} Extracted title or null
 */
function extractTitle(section) {
  // Try to find a title in the section (usually the first line or a line with numbers)
  const lines = section.split("\n");

  // First line is often a title
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine && firstLine.length < 100) {
      return firstLine.replace(/^\d+\.\s*/, ""); // Remove leading numbers
    }
  }

  // Look for lines that might be titles (short, possibly with numbers)
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (
      trimmedLine &&
      trimmedLine.length < 100 &&
      (trimmedLine.startsWith("**") || /^\d+\./.test(trimmedLine))
    ) {
      return trimmedLine.replace(/^\d+\.\s*/, "").replace(/\*\*/g, "");
    }
  }

  return null;
}

/**
 * Check if a section contains numeric data
 * @param {string} section - Text section
 * @returns {boolean} True if section contains numeric data
 */
function containsNumericData(section) {
  // Check if the section contains numbers (possibly with % or currency symbols)
  return /\b\d+[.,]?\d*\s*(%|руб|₽|$|€)?\b/.test(section);
}

/**
 * Extract data for a line chart from text
 * @param {string} text - Text containing data
 * @returns {Array} Array of data objects for line chart
 */
function extractDataForLineChart(text) {
  const data = [];

  // Try to extract time series data (month/period and values)
  const monthPattern =
    /(?:январ[ья]|феврал[ья]|март[а]?|апрел[ья]|ма[йя]|июн[ья]|июл[ья]|август[а]?|сентябр[ья]|октябр[ья]|ноябр[ья]|декабр[ья])/gi;
  const monthMatches = text.match(monthPattern);

  // If we found months, try to extract values for each month
  if (monthMatches && monthMatches.length > 0) {
    const months = [
      "январь",
      "февраль",
      "март",
      "апрель",
      "май",
      "июнь",
      "июль",
      "август",
      "сентябрь",
      "октябрь",
      "ноябрь",
      "декабрь",
    ];

    // For each month mentioned in the text
    for (const monthMatch of monthMatches) {
      // Find the standardized month name
      const monthIndex = months.findIndex((m) =>
        monthMatch.toLowerCase().startsWith(m.substring(0, 3))
      );

      if (monthIndex >= 0) {
        const month = months[monthIndex];

        // Look for a value near this month mention
        const monthPosition = text
          .toLowerCase()
          .indexOf(monthMatch.toLowerCase());
        const nearbyText = text.substring(
          Math.max(0, monthPosition - 30),
          Math.min(text.length, monthPosition + 50)
        );

        // Extract numeric values
        const valueMatch = nearbyText.match(
          /([-+]?\d+[.,]?\d*)\s*(?:тыс\.?|млн\.?|млрд\.?)?/
        );
        if (valueMatch) {
          let value = Number.parseFloat(valueMatch[1].replace(",", "."));

          // Adjust for thousands, millions, billions
          if (nearbyText.includes("тыс")) value *= 1000;
          if (nearbyText.includes("млн")) value *= 1000000;
          if (nearbyText.includes("млрд")) value *= 1000000000;

          data.push({
            name: month,
            value: value,
          });
        }
      }
    }

    // Sort data by month order
    data.sort((a, b) => {
      return months.indexOf(a.name) - months.indexOf(b.name);
    });
  }

  // If we couldn't extract month data, look for any numeric sequences
  if (data.length === 0) {
    // Extract any sequences of numbers that might represent a time series
    const numberPattern = /(-?\d+[.,]?\d*)/g;
    const numbers = [];
    let match;

    while ((match = numberPattern.exec(text)) !== null) {
      numbers.push(Number.parseFloat(match[1].replace(",", ".")));
    }

    // If we have at least 3 numbers, create a simple time series
    if (numbers.length >= 3) {
      for (let i = 0; i < numbers.length; i++) {
        data.push({
          name: `Период ${i + 1}`,
          value: numbers[i],
        });
      }
    }
  }

  // If we still don't have data, create sample data based on text analysis
  if (data.length === 0) {
    // Example: "Снижение на 538 000 в феврале, затем постепенное падение до -1,1 млн в декабре"
    const startValueMatch = text.match(
      /(?:начальн[а-я]+|начина[а-я]+|старт[а-я]+|перв[а-я]+)[^0-9]*?(-?\d+[.,]?\d*)/i
    );
    const endValueMatch = text.match(
      /(?:конечн[а-я]+|заканчива[а-я]+|финальн[а-я]+|последн[а-я]+)[^0-9]*?(-?\d+[.,]?\d*)/i
    );

    if (startValueMatch && endValueMatch) {
      const startValue = Number.parseFloat(
        startValueMatch[1].replace(",", ".")
      );
      const endValue = Number.parseFloat(endValueMatch[1].replace(",", "."));

      // Create a simple trend line with start and end values
      data.push({ name: "Начало", value: startValue });
      data.push({ name: "Середина", value: (startValue + endValue) / 2 });
      data.push({ name: "Конец", value: endValue });
    }
  }

  return data;
}

/**
 * Extract data for a bar chart from text
 * @param {string} text - Text containing data
 * @returns {Array} Array of data objects for bar chart
 */
function extractDataForBarChart(text) {
  const data = [];

  // Look for category-value pairs in the text
  const lines = text.split("\n");

  for (const line of lines) {
    // Look for lines with categories and values
    // Example: "- Категория: 1234" or "- Категория (1234)"
    const categoryValueMatch = line.match(
      /[-•]\s*([^:()]+)(?::|[\s(]+).*?(\d+[.,]?\d*)/i
    );

    if (categoryValueMatch) {
      const category = categoryValueMatch[1].trim();
      const value = Number.parseFloat(categoryValueMatch[2].replace(",", "."));

      data.push({
        name: category,
        value: value,
      });
    }
  }

  // If we couldn't extract category-value pairs, look for any numeric values
  if (data.length === 0) {
    // Extract any numbers that might represent values
    const valueMatches = text.match(
      /(\d+[.,]?\d*)\s*(?:тыс\.?|млн\.?|млрд\.?)?/g
    );

    if (valueMatches && valueMatches.length > 0) {
      // Create generic categories for each value
      for (let i = 0; i < valueMatches.length; i++) {
        let value = Number.parseFloat(
          valueMatches[i].replace(/[^\d.,]/g, "").replace(",", ".")
        );

        // Adjust for thousands, millions, billions
        if (valueMatches[i].includes("тыс")) value *= 1000;
        if (valueMatches[i].includes("млн")) value *= 1000000;
        if (valueMatches[i].includes("млрд")) value *= 1000000000;

        data.push({
          name: `Категория ${i + 1}`,
          value: value,
        });
      }
    }
  }

  // If we still don't have data, extract from the example
  if (data.length === 0) {
    // Example: "Высокие значения в мае (23 260) и августе (-165 107)"
    const monthValueMatches = text.match(
      /(?:январ[ья]|феврал[ья]|март[а]?|апрел[ья]|ма[йя]|июн[ья]|июл[ья]|август[а]?|сентябр[ья]|октябр[ья]|ноябр[ья]|декабр[ья])[^0-9]*?(\d+[.,]?\d*)/gi
    );

    if (monthValueMatches && monthValueMatches.length > 0) {
      for (const match of monthValueMatches) {
        const monthMatch = match.match(
          /(?:январ[ья]|феврал[ья]|март[а]?|апрел[ья]|ма[йя]|июн[ья]|июл[ья]|август[а]?|сентябр[ья]|октябр[ья]|ноябр[ья]|декабр[ья])/i
        );
        const valueMatch = match.match(/(\d+[.,]?\d*)/);

        if (monthMatch && valueMatch) {
          const month = monthMatch[0];
          const value = Number.parseFloat(valueMatch[1].replace(",", "."));

          data.push({
            name: month,
            value: value,
          });
        }
      }
    }
  }

  return data;
}

/**
 * Extract data for a pie chart from text
 * @param {string} text - Text containing data
 * @returns {Array} Array of data objects for pie chart
 */
function extractDataForPieChart(text) {
  const data = [];

  // Look for percentage distributions in the text
  const percentageMatches = text.match(/([^:]+):\s*(\d+[.,]?\d*)\s*%/g);

  if (percentageMatches && percentageMatches.length > 0) {
    for (const match of percentageMatches) {
      const parts = match.split(":");
      if (parts.length >= 2) {
        const category = parts[0].trim();
        const percentageMatch = parts[1].match(/(\d+[.,]?\d*)\s*%/);

        if (percentageMatch) {
          const percentage = Number.parseFloat(
            percentageMatch[1].replace(",", ".")
          );

          data.push({
            name: category,
            value: percentage,
          });
        }
      }
    }
  }

  // If we couldn't extract percentage distributions, look for category-value pairs
  if (data.length === 0) {
    // Similar to bar chart extraction, but we'll interpret values as portions of a whole
    const lines = text.split("\n");

    for (const line of lines) {
      const categoryValueMatch = line.match(
        /[-•]\s*([^:()]+)(?::|[\s(]+).*?(\d+[.,]?\d*)/i
      );

      if (categoryValueMatch) {
        const category = categoryValueMatch[1].trim();
        const value = Number.parseFloat(
          categoryValueMatch[2].replace(",", ".")
        );

        data.push({
          name: category,
          value: value,
        });
      }
    }
  }

  return data;
}

/**
 * Extract generic data from text
 * @param {string} text - Text containing data
 * @returns {Array} Array of data objects
 */
function extractGenericData(text) {
  const data = [];

  // Look for any numeric values in the text
  const valueMatches = text.match(
    /(-?\d+[.,]?\d*)\s*(?:тыс\.?|млн\.?|млрд\.?)?/g
  );

  if (valueMatches && valueMatches.length > 0) {
    // Create generic categories for each value
    for (let i = 0; i < Math.min(valueMatches.length, 10); i++) {
      let value = Number.parseFloat(
        valueMatches[i].replace(/[^\d.,-]/g, "").replace(",", ".")
      );

      // Adjust for thousands, millions, billions
      if (valueMatches[i].includes("тыс")) value *= 1000;
      if (valueMatches[i].includes("млн")) value *= 1000000;
      if (valueMatches[i].includes("млрд")) value *= 1000000000;

      data.push({
        name: `Значение ${i + 1}`,
        value: value,
      });
    }
  }

  return data;
}

/**
 * Extract description from a section
 * @param {string} section - Text section
 * @returns {string|null} Extracted description or null
 */
function extractDescription(section) {
  // Look for sentences that might be descriptions
  const lines = section.split("\n");

  // Look for lines that look like descriptions
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (
      trimmedLine &&
      trimmedLine.length > 20 &&
      trimmedLine.length < 200 &&
      !trimmedLine.startsWith("-") &&
      !trimmedLine.match(/^\d+\./)
    ) {
      // Check if the line contains description keywords
      if (
        trimmedLine.toLowerCase().includes("показыва") ||
        trimmedLine.toLowerCase().includes("отобража") ||
        trimmedLine.toLowerCase().includes("представля") ||
        trimmedLine.toLowerCase().includes("демонстрир") ||
        trimmedLine.toLowerCase().includes("видно") ||
        trimmedLine.toLowerCase().includes("можно увидеть")
      ) {
        return trimmedLine;
      }
    }
  }

  return null;
}

module.exports = {
  extractVisualizationDataFromText,
  extractTitle,
  extractDescription,
  extractDataForLineChart,
  extractDataForBarChart,
  extractDataForPieChart,
  extractGenericData,
  containsNumericData,
};
