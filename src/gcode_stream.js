// Adaptive from original code: https://github.com/MachineCollaborationUtility/gcode-json-converter/
// Revised by removing Regexp and using string methods instead, and adding support for comments and tags

const containsLineEnd = (s) => s.includes("\n") || s.includes("\r");

/*
 * Use _LocalFn for keeping state across the start, transform, and flush functions
 * of the TransformStream. These functions handle the chunking and buffering of
 * the input stream, and the parsing of gcode lines. The state object keeps track of
 * the number of bytes read and whether the last chunk ended with a carriage return,
 * which is important for correctly handling line breaks across chunk boundaries.
 * The lineBuffer is used to accumulate partial lines of gcode until a full line
 * is received, at which point it is parsed and enqueued for output.
 */
const _LocalFn = {
  start(_) {
    this.chunkCount = 0;
    this.lineBuffer = "";
  },
  /*
   * The transform function takes a chunk of input, decodes it to a string,
   * and appends it to the lineBuffer.
   * @param {Uint8Array} input - The chunk of input data to process
   * @param {TransformStreamDefaultController} controller - The controller to enqueue output data
   * @returns {void}
   */
  transform(input, controller) {
    const chunk = this.textDecoder.decode(input, { stream: true });
    this.chunkCount += chunk.length;
    this.lineBuffer += chunk;

    if (containsLineEnd(chunk)) {
      const lines = this.lineBuffer.split(/\r\n|\r|\n/);
      this.lineBuffer = lines.pop() || "";
      if (lines && lines.length > 0) {
        const results = lines
          .map((line) => this.parseLine(line))
          .filter((r) => r !== null);
        controller.enqueue({
          readBytes: this.chunkCount,
          results: results,
        });
      }
    }
  },
  flush(controller) {
    if (this.lineBuffer) {
      this.chunkCount += this.lineBuffer.length;
      const line = this.lineBuffer.trim();
      if (line.length > 0) {
        const parsedLine = this.parseLine(line);
        if (parsedLine) {
          controller.enqueue({
            readBytes: this.chunkCount,
            results: [parsedLine],
          });
        }
      }
      this.lineBuffer = "";
    }
    controller.terminate();
  },
};

/*
 * Default object for parsed gcode, with cmd and args properties
 * @returns {object} - An object with cmd and args properties
 */
const create_gcode_object = () => ({
  cmd: undefined,
  args: {}
});

/*
 * Parses a comment string for tags in the format `key: value` and returns an object with those key-value pairs
 * Expects a comment string in the format `key1: value1, key2: value2`
 * @param {string} comment - The comment string to parse
 * @returns {object} - An object with the key-value pairs from the comment, where values are parsed to numbers if possible
 */
function parseCommentTag(comment) {
  if (comment.length > 0) {
    const splitComment = comment.split(",");
    const arrayObj = splitComment.map((c) => {
      const commentTagArgs = c.toLowerCase();
      if (commentTagArgs.includes(":")) {
        const commentTagKeyValue = commentTagArgs.split(":");
        const key = commentTagKeyValue[0].trim();

        // Parse to number, if it's a number
        const rawValue = commentTagKeyValue[1].trim();
        const value = Number.isNaN(Number(rawValue))
          ? rawValue
          : Number(rawValue);

        return { [key]: value };
      }
      return {};
    });
    return Object.assign(...arrayObj);
  }
  return {};
}

/*
 * Parses a line of GCode and returns an object
 * Expects a single line of gcode
 * @param {string} gcode - The GCode line to parse
 * @returns {object|null} - An object with a command and a list of arguments, or null if the line is empty
 */
function gcodeToJson(gcode) {
  // Valdate input to be of type "string"
  if (typeof gcode !== "string") {
    throw new Error(
      `gcode argument must be of type "string". ${gcode} is type "${typeof gcode}"`,
    );
  }

  // Constructing a blank gcode object, with functions
  const gcodeObject = create_gcode_object();

  // Split the gcode by the first semicolon it sees
  const commentSplits = gcode.split(";");
  const gcodeWithoutComment = commentSplits[0];
  if (commentSplits.length > 1 && this.settingParser && this.settingParser.processComment) {
    const comment = commentSplits.slice(1).join(";").trim();
    const tag = parseCommentTag(comment);
    this.settingParser.processComment(tag);
  }
  const gcodeParts = gcodeWithoutComment.trim().split(" ");
  gcodeObject.cmd = gcodeParts[0].toUpperCase();
  // If the cmd doesn't start with G or M, it's not a valid gcode command, so we return null to filter it out
  if (!gcodeObject.cmd.startsWith("G") && !gcodeObject.cmd.startsWith("M")) {
    return null;
  }

  gcodeObject.args = gcodeParts.slice(1).reduce((args, part) => {
    if (part.length >= 2) {
      const key = part[0].toLowerCase();
      const value = Number(part.slice(1));
      args[key] = value;
    }
    return args;
  }, {});
  return gcodeObject;
}

class GCodeLineStream extends TransformStream {
  /**
   * Creates a new GCodeLineStream instance, which is a TransformStream that processes chunks of gcode text and outputs parsed gcode objects.
   * @param {GuiOptionParser} settingParser - An instance of GuiOptionParser to handle any settings that may be included in the gcode comments
   */
  constructor(settingParser) {
    super({
      start: _LocalFn.start,
      transform: _LocalFn.transform,
      flush: _LocalFn.flush,
      parseLine: gcodeToJson,
      textDecoder: new TextDecoder(),
      settingParser: settingParser,
    });
  }
}

export { GCodeLineStream };
