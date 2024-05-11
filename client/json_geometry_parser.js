const RELATIVE_POSITION = 0;
const ABSOLUTE_POSITION = 1;

class JsonGeometryParser {
  position = {};
  positionSystem = ABSOLUTE_POSITION;
  feedrate = 100;
  layerHeight = 0.1;
  enableLayerView = true;
  totalLayers = 0;
  geometry = [];
  cursorPosition = [];
  lineCount = 0;

  reset() {
    this.position = {x:0, y:0, z:0};
    this.geometry = [];
    this.cursorPosition = [];
    this.positionSystem = ABSOLUTE_POSITION;
    this.feedrate = 100;
    this.lineCount = 0;
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
      } else if (key === 'diameter') {
        this.diameter = val;
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
      } else if (key === 'enable_layer_view') {
        this.enableLayerView = val;
      }
    }
  }

  G0(args) {
    const feedrate = args.f || this.feedrate;
    const prevPosition = Object.assign({}, this.position);
    if (this.isAbsolutePosition()) {
      this.position.x = args.x || this.position.x;
      this.position.y = args.y || this.position.y;
      this.position.z = args.z || this.position.z;
    }
    else if (this.isRelativePosition()) {
      this.position.x += args.x || 0;
      this.position.y += args.y || 0;
      this.position.z += args.z || 0;
    }
    
    this.geometry.push({
      type: 'line',
      start: [prevPosition.x, prevPosition.y, prevPosition.z],
      end: [this.position.x, this.position.y, this.position.z],
      line: this.lineCount,
      feedrate: feedrate
    });
  }

  G1(args) {
    this.G0(args);
  }

  G2(args, dir='cw') {
    const feedrate = args.f || this.feedrate;
    const prevPosition = Object.assign({}, this.position);
    if (this.isAbsolutePosition()) {
      this.position.x = args.x || this.position.x;
      this.position.y = args.y || this.position.y;
      this.position.z = args.z || this.position.z;
    }
    else if (this.isRelativePosition()) {
      this.position.x += args.x || 0;
      this.position.y += args.y || 0;
      this.position.z += args.z || 0;
    }

    const centerX = prevPosition.x + (args.i || 0);
    const centerY = prevPosition.y + (args.j || 0);

    this.geometry.push({
      type: 'arc',
      dir: dir,
      start: [prevPosition.x, prevPosition.y, prevPosition.z],
      end: [this.position.x, this.position.y, this.position.z],
      center: [centerX, centerY],
      line: this.lineCount,
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