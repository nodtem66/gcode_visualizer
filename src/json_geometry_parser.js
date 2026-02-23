const RELATIVE_POSITION = 0;
const ABSOLUTE_POSITION = 1;

class JsonGeometryParser {
  position = { x: 0, y: 0, z: 0 };
  positionSystem = ABSOLUTE_POSITION;
  feedrate = 100;
  geometry = [];
  cursorPosition = [];
  x_axis = "x";
  y_axis = "y";
  z_axis = "z";

  reset() {
    this.position = { x: 0, y: 0, z: 0 };
    this.geometry = [];
    this.cursorPosition = [];
    this.positionSystem = ABSOLUTE_POSITION;
    this.feedrate = 100;
  }

  process(gcodeArray) {
    // assume position of 3 axes
    gcodeArray.forEach((x) => {
      this.lineCount++;
      if (x.cmd && this[x.cmd]) {
        this[x.cmd](x.args);
      }
      if (x.tag) {
        this.processComment(x.tag);
      }
    });
  }

  isRelativePosition() {
    return this.positionSystem === RELATIVE_POSITION;
  }

  isAbsolutePosition() {
    return this.positionSystem === ABSOLUTE_POSITION;
  }

  processComment(tag) {
    for (const key in tag) {
      const val = tag[key];
      if (key === "CTS") {
        this.feedrate = val;
      }
    }
  }

  getAxisValue(args, axis) {
    if (this[axis + "_axis"] !== undefined) {
      return args[this[axis + "_axis"]];
    }
    if (args[axis] !== undefined) {
      return args[axis];
    }
    return;
  }

  /*
   * Gets the values for all axes (x, y, z) based on the current axis remapping and position system
   * If no axis values are provided, returns null to indicate no movement
   * If in absolute mode, uses the provided axis values or defaults to current position if not provided
   * If in relative mode, adds the provided axis values to the current position (or defaults to 0 if not provided)
   * @param {object} args - The arguments object from the gcode command, which may contain axis values based on remapping
   * @returns {object|null} - An object with x, y, z values for the new position, or null if no axis values are provided
   */
  getAllAxesValues(args) {
    const vals = { x: 0, y: 0, z: 0 };
    const val_x = this.getAxisValue(args, "x");
    const val_y = this.getAxisValue(args, "y");
    const val_z = this.getAxisValue(args, "z");
    if (val_x === undefined && val_y === undefined && val_z === undefined) {
      return null;
    }
    if (this.isAbsolutePosition()) {
      vals.x = val_x ?? this.position.x;
      vals.y = val_y ?? this.position.y;
      vals.z = val_z ?? this.position.z;
    } else if (this.isRelativePosition()) {
      vals.x = this.position.x + (val_x || 0);
      vals.y = this.position.y + (val_y || 0);
      vals.z = this.position.z + (val_z || 0);
    }
    return vals;
  }

  G0(args) {
    const vals = this.getAllAxesValues(args);
    if (vals === null) {
      return;
    }
    const prevPosition = Object.assign({}, this.position);
    this.position.x = vals.x;
    this.position.y = vals.y;
    this.position.z = vals.z;
    
    if (args.f) {
      this.feedrate = args.f;
    }

    this.geometry.push({
      type: "line",
      start: [prevPosition.x, prevPosition.y, prevPosition.z],
      end: [this.position.x, this.position.y, this.position.z],
      feedrate: this.feedrate,
    });
    this.cursorPosition.push([
      this.position.x,
      this.position.y,
      this.position.z,
    ]);
  }

  G1(args) {
    this.G0(args);
  }

  G2(args, dir = "cw") {
    const vals = this.getAllAxesValues(args);
    if (vals === null) {
      return;
    }
    const prevPosition = Object.assign({}, this.position);
    this.position.x = vals.x;
    this.position.y = vals.y;
    this.position.z = vals.z;

    if (args.f) {
      this.feedrate = args.f;
    }

    let centerX = args.i || 0;
    let centerY = args.j || 0;
    if (this.isRelativePosition()) {
      centerX += prevPosition.x;
      centerY += prevPosition.y;
    }

    this.geometry.push({
      type: "arc",
      dir: dir,
      start: [prevPosition.x, prevPosition.y, prevPosition.z],
      end: [this.position.x, this.position.y, this.position.z],
      center: [centerX, centerY],
      feedrate: this.feedrate,
    });
    this.cursorPosition.push([
      this.position.x,
      this.position.y,
      this.position.z,
    ]);
  }

  G3(args) {
    this.G2(args, "ccw");
  }

  G90() {
    this.positionSystem = ABSOLUTE_POSITION;
  }

  G91() {
    this.positionSystem = RELATIVE_POSITION;
  }
}

export { JsonGeometryParser };
