// Origin: https://github.com/MachineCollaborationUtility/gcode-json-converter/

const create_gcode_object = () => ({
  cmd: undefined, args: {},
  comment: undefined, tag: {},
});

const default_case_transform_fn = (key) => key;

/*
 * Type of command is held within <<< >>>
 * Afterwards args are passed
 * The arguments are either a value, or a key value pair
 * If the args are a single value, then a key value pair is made where the command is the key
 */
function parseCommentTag(comment, caseTransformFn = default_case_transform_fn) {
  if (comment.length > 0) {
    const splitComment = comment.split(',');
    const arrayObj = splitComment.map((c) => {
      const commentTagArgs = c.toLowerCase();
      if (commentTagArgs.includes(':')) {
        const commentTagKeyValue = commentTagArgs.split(':');
        const key = caseTransformFn(commentTagKeyValue[0].trim());

        // Parse to number, if it's a number
        const rawValue = commentTagKeyValue[1].trim();
        const value = Number.isNaN(Number(rawValue)) ? rawValue : Number(rawValue);

        return {[key]: value};
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
 * Returns an object with a command and a list of arguments
 */
function gcodeToJson(gcode) {
  // Valdate input to be of type "string"
  if (typeof gcode !== 'string') {
    throw new Error(`gcode argument must be of type "string". ${gcode} is type "${typeof gcode}"`);
  }

  // Constructing a blank gcode object, with functions
  const gcodeObject = create_gcode_object();

  // Split the gcode by the first semicolon it sees
  const commentSplits = gcode.split(';');
  const gcodeWithoutComment = commentSplits[0];
  if (commentSplits.length > 1) {
    const comment = commentSplits.slice(1).join(';').trim();
    gcodeObject.comment = comment;
    gcodeObject.tag = parseCommentTag(comment);
  }

  // If we can find a command, assign it, otherwise keep the "command" value set to undefined
  const commandRegex = /[GM]\d+/;
  const commandResult = gcodeWithoutComment.toUpperCase().match(commandRegex);
  gcodeObject.cmd = (commandResult !== undefined || commandResult !== null) &&
  Array.isArray(commandResult) && commandResult.length > 0 ?
  commandResult[0] : undefined;

  // Set the gcode to lower case and remove any G<number> or M<number> commands
  const gcodeArgString = gcodeWithoutComment.toLowerCase().replace(/[gm]\d+/, '');

  // Parse each axis for a trailing floating number
  // If no float, treat the axis as a boolean flag
  const axes = 'abcdefghijklmnopqrstuvwxyz'.split('');
  axes.forEach((axis) => {
    // In most cases we are looking for an axis followed by a number
    const axisAndFloatRegex = new RegExp(`${axis}\\s*([+-]?([0-9]*[.])?[0-9]+)`);
    const result = gcodeArgString.match(axisAndFloatRegex);
    if (result) {
      gcodeObject.args[axis] = Number(result[1]);
    // If there is an axis, but no trailing number, pass the axis as a boolean flag
    } else if (gcodeArgString.includes(axis)) {
      gcodeObject.args[axis] = true;
    }
  });

  return gcodeObject;
}

export { gcodeToJson }