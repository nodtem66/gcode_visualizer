/**
 * Web Worker Manager - Handles communication with the file-reader.worker.js
 * Provides a clean interface for offloading file operations to a web worker
 */

export class FileReaderWorker {
  constructor() {
    this.worker = null;
    this.isSupported = typeof Worker !== "undefined";
    this.messageHandlers = {};
    this.errorHandler = null;
    this.initWorker();
  }

  /**
   * Initialize the web worker
   */
  initWorker() {
    if (!this.isSupported) {
      console.warn(
        "Web Workers are not supported. File operations will run on main thread."
      );
      return;
    }

    try {
      this.worker = new Worker(new URL("./file_reader.worker.js", import.meta.url), {
        type: "module",
      });
      this.worker.onmessage = (event) => this.handleMessage(event);
      this.worker.onerror = (error) => this.handleError(error);
    } catch (error) {
      console.error("Failed to initialize web worker:", error);
      this.isSupported = false;
    }
  }

  /**
   * Handle messages from the worker
   * @param {MessageEvent} event - The message event
   */
  handleMessage(event) {
    const { type, payload } = event.data;

    // Call registered handler if exists
    if (this.messageHandlers[type]) {
      this.messageHandlers[type](payload);
    }

    // Always log messages for debugging
    // console.log(`Worker message: ${type}`, payload);
  }

  /**
   * Handle errors from the worker
   * @param {ErrorEvent} error - The error event
   */
  handleError(error) {
    console.error("Worker error:", error.message);
    if (this.errorHandler) {
      this.errorHandler(error);
    }
  }

  /**
   * Register a handler for a specific message type
   * @param {string} type - Message type to listen for
   * @param {Function} callback - Callback function to execute
   */
  onMessage(type, callback) {
    this.messageHandlers[type] = callback;
  }

  /**
   * Register error handler
   * @param {Function} callback - Callback function to execute on error
   */
  onError(callback) {
    this.errorHandler = callback;
  }

  /**
   * Send a file to the worker for reading
   * @param {File} file - The file to read
   */
  readFile(file) {
    if (!this.isSupported || !this.worker) {
      console.warn("Worker not available, cannot read file");
      return;
    }

    this.worker.postMessage({
      type: "READ_FILE",
      payload: { file: file },
    });
  }

  /**
   * Send data to the worker for processing
   * @param {*} data - Data to process
   */
  processData(data) {
    if (!this.isSupported || !this.worker) {
      console.warn("Worker not available, cannot process data");
      return;
    }

    this.worker.postMessage({
      type: "PROCESS_DATA",
      payload: { data: data },
    });
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
