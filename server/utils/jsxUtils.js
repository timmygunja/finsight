/**
 * JSX Utility Functions
 */

/**
 * Parse JSX to validate it
 * @param {string} jsx - JSX code to validate
 * @returns {Object} Validation result
 */
function parseJSX(jsx) {
  try {
    // Basic validation checks
    if (!jsx) {
      return { isValid: false, error: "JSX is empty" };
    }

    // Check for balanced tags
    const openTags = [];
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)/g;
    let match;

    // Check opening and closing tags
    while ((match = tagPattern.exec(jsx)) !== null) {
      const fullTag = match[0];
      const tagName = match[1];
      const tagPosition = match.index;

      // Check if this is a self-closing tag by looking ahead
      const tagEnd = jsx.indexOf(">", tagPosition);
      const isSelfClosing = tagEnd > 0 && jsx.charAt(tagEnd - 1) === "/";

      if (fullTag.startsWith("</")) {
        // Closing tag
        if (openTags.length === 0) {
          return {
            isValid: false,
            error: `Unexpected closing tag: ${tagName}`,
          };
        }

        const lastOpenTag = openTags.pop();
        if (lastOpenTag !== tagName) {
          return {
            isValid: false,
            error: `Mismatched tag: expected </${lastOpenTag}>, found </${tagName}>`,
          };
        }
      } else if (!isSelfClosing) {
        // Opening tag (not self-closing)
        openTags.push(tagName);
      }
    }

    if (openTags.length > 0) {
      return { isValid: false, error: `Unclosed tags: ${openTags.join(", ")}` };
    }

    // Check for required Recharts components
    const requiredComponents = ["ResponsiveContainer"];
    const chartComponents = [
      "BarChart",
      "LineChart",
      "PieChart",
      "ScatterChart",
      "AreaChart",
      "RadarChart",
    ];

    const hasRequiredComponent = requiredComponents.every((comp) =>
      jsx.includes(comp)
    );
    const hasChartComponent = chartComponents.some((comp) =>
      jsx.includes(comp)
    );

    if (!hasRequiredComponent) {
      return {
        isValid: false,
        error: `Missing required component: ResponsiveContainer`,
      };
    }

    if (!hasChartComponent) {
      return {
        isValid: false,
        error: `Missing chart component (BarChart, LineChart, etc.)`,
      };
    }

    // Check for data array
    if (
      !jsx.includes("data={[") &&
      !jsx.includes("data={`[") &&
      !jsx.includes("data={data")
    ) {
      return { isValid: false, error: "Missing data array in JSX" };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

/**
 * Fix JSX balancing issues
 * @param {string} jsx - JSX code to fix
 * @returns {string} Fixed JSX code
 */
function fixJsxBalancing(jsx) {
  // Common fixes for unbalanced tags
  let fixedJsx = jsx;

  // First, try to fix any obvious syntax errors
  fixedJsx = fixedJsx.replace(/=>/g, "=&gt;"); // Replace => with &gt; to avoid XML parsing issues

  // Fix missing closing tags
  const openTags = [];
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*?>/g;
  let match;

  // Find all opening and closing tags
  let lastIndex = 0;
  while ((match = tagPattern.exec(jsx)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    const tagIndex = match.index;

    // Check if this is a self-closing tag
    const isSelfClosing = fullTag.endsWith("/>") || fullTag.includes(" />");

    if (fullTag.startsWith("</")) {
      // Closing tag - remove from stack
      if (
        openTags.length > 0 &&
        openTags[openTags.length - 1].name === tagName
      ) {
        openTags.pop();
      }
    } else if (!isSelfClosing) {
      // Opening tag - add to stack with its position
      openTags.push({ name: tagName, position: tagIndex + fullTag.length });
    }

    lastIndex = tagIndex + fullTag.length;
  }

  // Add missing closing tags in reverse order
  if (openTags.length > 0) {
    // Sort open tags by position in reverse order (close innermost tags first)
    openTags.sort((a, b) => b.position - a.position);

    for (const tag of openTags) {
      const insertPosition = tag.position;
      const closingTag = `</${tag.name}>`;

      // Insert the closing tag at the appropriate position
      fixedJsx =
        fixedJsx.slice(0, insertPosition) +
        closingTag +
        fixedJsx.slice(insertPosition);
    }
  }

  // Fix specific common issues with Recharts components
  fixedJsx = fixedJsx.replace(
    /<Tooltip[^>]*?>(?!<\/Tooltip>)/,
    "<Tooltip formatter={(value) => value.toLocaleString()} />"
  );

  // Ensure all components are properly closed
  const components = [
    "Bar",
    "Line",
    "Pie",
    "XAxis",
    "YAxis",
    "CartesianGrid",
    "Legend",
    "Tooltip",
  ];
  components.forEach((component) => {
    const openTagRegex = new RegExp(
      `<${component}[^>]*?>[^<]*?(?!<\\/${component}>)`,
      "g"
    );
    fixedJsx = fixedJsx.replace(openTagRegex, (match) => {
      if (match.endsWith("/>")) return match;
      return match.replace(/>$/, " />");
    });
  });

  return fixedJsx;
}

module.exports = {
  parseJSX,
  fixJsxBalancing,
};
