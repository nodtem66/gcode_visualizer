//import { io } from "socket.io-client";
import { GcodeRenderer } from "./gcode_renderer.js";
import { ProgressBar } from './progress_bar.js';
import { fileOpen } from "browser-fs-access";
import { GCodeLineStream } from "./gcode_stream.js";
import { gcodeToJson } from "./gcode_to_json.js";
import { JsonGeometryParser } from "./json_geometry_parser.js";
import { GuiOptionParser } from "./gui_option_parser.js";
import { GuiOptions } from "./gui_options.js";

//const code_viewer = new CodeViewer(document, window);
//code_viewer.displayLineNumbers();

const gcode_renderer = new GcodeRenderer();
//gcode_renderer.test_geometry();
gcode_renderer.animate(true);

const progress_bar = new ProgressBar();
const parser = new JsonGeometryParser();

const gui = new GuiOptions();
const gui_option_parser = new GuiOptionParser(gui);
let open_file = null;

const processFile = async (file, isInitialLoad = true) => {
  gcode_renderer.reset();
  parser.reset();
  document.getElementById('token').value = file ? file.name : '';

  if (!file) return;
  open_file = file;

  const gcode_stream = new GCodeLineStream(gcodeToJson);
  const reader = file.stream().pipeThrough(gcode_stream).getReader();
  gui.disable();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        progress_bar.reset();
        gcode_renderer.drawPoints(parser.cursorPosition);
        gui.update();
        gui.enable();
        break;
      }
      const { readBytes, results } = value;
      progress_bar.update(readBytes / file.size * 100);
      if (results.length > 0) {
        if (isInitialLoad) {
          gui_option_parser.process(value.results);
        }
        parser.process(value.results);
        gcode_renderer.draw(parser.geometry);
      }
    }
  } catch (error) {
    console.error('Error reading file:', error);
    gui.enable();
  }
};

document.getElementById('open_button').addEventListener('click', () => {
  const blob = fileOpen({ extensions: ['.gcode', '.txt', '.g'], multiple: false });
  blob.then(processFile);
});

gui.on('hide points', (value) => {
  if (gcode_renderer.pointGeometry) {
    gcode_renderer.pointGeometry.visible = !value;
  }
});
gui.on('point size', (value) => {
  gcode_renderer.currentPointSize = value;
  if (gcode_renderer.pointGeometry) {
    gcode_renderer.pointGeometry.material.size = value;
    gcode_renderer.pointGeometry.material.needsUpdate = true;
  }
  // Update highlighted point sphere size if it exists
  if (gcode_renderer.highlightedPointIndex !== -1) {
    gcode_renderer.updateHighlightedPointSphere(gcode_renderer.highlightedPointIndex);
  }
});

// Helper to create handlers that set a value and reprocess the file
const setAndReprocess = (setter) => (value, toggle_reprocess = true) => {
  setter(value);
  if (toggle_reprocess) {
    processFile(open_file, false);
  }
};

gui.on('layer height', setAndReprocess((value) => parser.layerHeight = value));
gui.on('hide grid', (value) => { gcode_renderer.gridVisible = !value; gcode_renderer.helper.visible = !value;});
gui.on('hide layers', setAndReprocess((value) => parser.enableLayerView = !value));
gui.on('x axis', setAndReprocess((value) => parser.x_axis = value));
gui.on('y axis', setAndReprocess((value) => parser.y_axis = value));
gui.on('z axis', setAndReprocess((value) => parser.z_axis = value));
gui.on('cylindrical diameter', setAndReprocess((value) => gcode_renderer.diameter = value));
gui.on('cylindrical main axis', setAndReprocess((value) => gcode_renderer.cylindricalMainAxis = value));
gui.on('enable cylindrical', setAndReprocess((value) => gcode_renderer.enableCylindricalTransform = value));
gui.on('curve step', setAndReprocess((value) => gcode_renderer.curveStep = value));
gui.on('cylindrical height', setAndReprocess((value) => gcode_renderer.initialCylindricalHeight = value));