/**
 * Web Worker for reading and processing large files
 * Offloads file I/O operations to avoid blocking the main UI thread
 */
import { GCodeLineStream } from "./gcode_stream.js";
import { JsonGeometryParser } from "./json_geometry_parser.js";

/**
 * Handle messages from the main thread
 */
self.onmessage = async (event) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case "READ_FILE":
        await readFile(payload.file);
        break;
      case "PROCESS_DATA":
        processData(payload.data);
        break;
      default:
        sendError(`Unknown message type: ${type}`);
    }
  } catch (error) {
    sendError(error.message);
  }
};

/**
 * Read a large file in chunks
 * @param {File} file - The file to read
 */
async function readFile(file) {
  const chunkSize = 1024 * 1024; // 1MB chunks
  let bytesRead = 0;
  const chunks = [];

  try {
    const gcode_stream = new GCodeLineStream();
    const reader = file.stream().pipeThrough(gcode_stream).getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Send completion message
        sendMessage("READ_COMPLETE", {
          fileName: file.name,
          fileSize: file.size,
          chunksProcessed: chunks.length,
          chunks: chunks,
        });
        break;
      }

      bytesRead += value.byteLength;
      chunks.push({
        data: value,
        bytesRead: bytesRead,
        progress: (bytesRead / file.size) * 100,
      });

      // Send progress update
      sendMessage("READ_PROGRESS", {
        bytesRead: bytesRead,
        totalSize: file.size,
        progress: (bytesRead / file.size) * 100,
        chunksProcessed: chunks.length,
      });
    }
  } catch (error) {
    sendError(`Failed to read file: ${error.message}`);
  }
}

/**
 * Process data (placeholder for custom processing logic)
 * @param {*} data - The data to process
 */
function processData(data) {
  try {
    // Add custom data processing logic here
    //const processed = JSON.stringify(data);
    const jsonParser = new JsonGeometryParser();
    jsonParser.process(data);
    
    sendMessage("PROCESS_COMPLETE", {
      processedSize: 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendError(`Failed to process data: ${error.message}`);
  }
}

/**
 * Send a message back to the main thread
 * @param {string} type - Message type
 * @param {*} payload - Message payload
 */
function sendMessage(type, payload) {
  self.postMessage({
    type: type,
    payload: payload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send an error message to the main thread
 * @param {string} errorMessage - Error message
 */
function sendError(errorMessage) {
  self.postMessage({
    type: "ERROR",
    payload: {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    },
  });
}
