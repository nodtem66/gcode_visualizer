const containsLineEnd = (() => {
  const re = new RegExp(/.*(?:\r\n|\r|\n)/g);
  return (s => !!s.match(re));
})();

// @param {string} str The G-code text string
// @param {options} options The options object
const _LocalFn = {
  start(controller) {
    this.state = {
      lineCount: 0,
      chunkCount: 0,
      lastChunkEndedWithCR: false
    };

    this.lineBuffer = '';
    this.re = new RegExp(/.*(?:\r\n|\r|\n)|.+$/g);
  },
  transform(chunk, controller) {
    chunk = this.textDecoder.decode(chunk, { stream: true });
    this.state.chunkCount += chunk.length;
    this.lineBuffer += chunk;

    if (containsLineEnd(chunk)) {
      const lines = this.lineBuffer.match(this.re);
      if (lines && lines.length > 0) {
        // Do not split CRLF which spans chunks
        if (this.state.lastChunkEndedWithCR && lines[0] === '\n') {
          lines.shift();
        }
        this.state.lastChunkEndedWithCR = (this.lineBuffer[this.lineBuffer.length - 1] === '\r');

        if ((this.lineBuffer[this.lineBuffer.length - 1] === '\r') ||
          (this.lineBuffer[this.lineBuffer.length - 1] === '\n')) {
          this.lineBuffer = '';
        } else {
          const line = lines.pop() || '';
          this.lineBuffer = line;
        }
        const results = lines.map((line) => this.parseLine(line));
        this.state.lineCount += results.length;
        controller.enqueue({readBytes: this.state.chunkCount, results: results});
      }
    }
  },
  flush(controller) {
    if (this.lineBuffer) {
      this.state.chunkCount += this.lineBuffer.length;
      const line = this.lineBuffer.trim();
      if (line.length > 0) {
        this.state.lineCount += 1;
        controller.enqueue({readBytes: this.state.chunkCount, results: [this.parseLine(line)]});
      }

      this.lineBuffer = '';
      this.state.lastChunkEndedWithCR = false;
    }
    controller.terminate();
  }
};

class GCodeLineStream extends TransformStream {

  // @param {object} [options] The options object
  // @param {number} [options.batchSize] The batch size.
  // @param {boolean} [options.flatten] True to flatten the array, false otherwise.
  // @param {boolean} [options.noParseLine] True to not parse line, false otherwise.
  constructor(parseFn, options = {}) {
    super({
      start: _LocalFn.start,
      transform: _LocalFn.transform,
      flush: _LocalFn.flush,
      textDecoder: new TextDecoder(),
      parseLine: parseFn,
    });
  }
}

export { GCodeLineStream };