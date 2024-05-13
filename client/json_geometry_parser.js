const RELATIVE_POSITION = 0;
const ABSOLUTE_POSITION = 1;

class JsonGeometryParser {
  position = {};
  positionSystem = ABSOLUTE_POSITION;
  feedrate = 100;
  layerHeight = 0.1;
  enableLayerView = false;
  totalLayers = 0;
  geometry = [];
  cursorPosition = [];
  x_axis = 'x';
  y_axis = 'y';
  z_axis = 'z';

  reset() {
    this.position = {x:0, y:0, z:0};
    this.geometry = [];
    this.cursorPosition = [];
    this.positionSystem = ABSOLUTE_POSITION;
    this.feedrate = 100;
  }

  process(gcodeArray) {
    // assume position of 3 axes
    gcodeArray.forEach(x => {
      this.lineCount++;
      if (x.cmd && this[x.cmd]) {
        this[x.cmd](x.args);
      }
      if (x.tag) {
        this.processComment(x.tag);
      }
      this.cursorPosition.push([this.position.x, this.position.y, this.position.z]);
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
      if (key === 'CTS') {
        this.feedrate = val;
      } else if (key === 'layer_height') {
        this.layerHeight = val;
      } else if (key === 'total_layers' || key === 'total_layer' || key === 'totalLayers' || key === 'totalLayer') {
        this.totalLayers = val;
      } else if (key === 'layer') {
        if (this.enableLayerView) {
          const z = parseInt(val) * this.layerHeight;
          if (!Number.isNaN(z)) {
            this.position.z = z;
          }
        }
      }
    }
  }

  getAxisValue(args, axis) {
    if (this[axis+'_axis'] !== undefined) {
      return args[this[axis+'_axis']];
    }
    if (args[axis] !== undefined) {
      return args[axis];
    }
    return null;
  }
  
  getAllAxesValues(args) {
    const vals = {x:0, y:0, z:0};
    if (this.isAbsolutePosition()) {
      vals.x = this.getAxisValue(args, 'x') || this.position.x;
      vals.y = this.getAxisValue(args, 'y') || this.position.y;
      vals.z = this.getAxisValue(args, 'z') || this.position.z;
    }
    else if (this.isRelativePosition()) {
      vals.x = this.position.x + (this.getAxisValue(args, 'x') || 0);
      vals.y = this.position.y + (this.getAxisValue(args, 'y') || 0);
      vals.z = this.position.z + (this.getAxisValue(args, 'z') || 0);
    }
    return vals;
  }

  G0(args) {
    const prevPosition = Object.assign({}, this.position);
    const vals = this.getAllAxesValues(args);
    this.position.x = vals.x;
    this.position.y = vals.y;
    this.position.z = vals.z;
    
    this.geometry.push({
      type: 'line',
      start: [prevPosition.x, prevPosition.y, prevPosition.z],
      end: [this.position.x, this.position.y, this.position.z],
      feedrate: args.f || this.feedrate
    });
  }

  G1(args) {
    this.G0(args);
  }

  G2(args, dir='cw') {
    const prevPosition = Object.assign({}, this.position);
    const vals = this.getAllAxesValues(args);
    this.position.x = vals.x;
    this.position.y = vals.y;
    this.position.z = vals.z;

    const centerX = prevPosition.x + (args.i || 0);
    const centerY = prevPosition.y + (args.j || 0);

    this.geometry.push({
      type: 'arc',
      dir: dir,
      start: [prevPosition.x, prevPosition.y, prevPosition.z],
      end: [this.position.x, this.position.y, this.position.z],
      center: [centerX, centerY],
      feedrate: args.f || this.feedrate
    });
  }

  G3(args) {
    this.G2(args, 'ccw');
  }

  G90() {
    this.positionSystem = ABSOLUTE_POSITION;
  }

  G91() {
    this.positionSystem = RELATIVE_POSITION;
  }
}

export { JsonGeometryParser }