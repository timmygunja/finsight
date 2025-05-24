/**
 * Process text files and extract content
 * @param {Buffer} buffer - File buffer
 * @returns {Object} Processed data
 */
async function processTextFile(buffer) {
  try {
    // Convert buffer to string
    const text = buffer.toString("utf8");

    // Basic text analysis
    const lines = text.split("\n");
    const words = text.split(/\s+/).filter((word) => word.length > 0);

    return {
      content: text,
      analysis: {
        characterCount: text.length,
        lineCount: lines.length,
        wordCount: words.length,
        // You could add more sophisticated analysis here
      },
    };
  } catch (error) {
    console.error("Error processing text file:", error);
    throw new Error("Failed to process text file");
  }
}

module.exports = { processTextFile };
