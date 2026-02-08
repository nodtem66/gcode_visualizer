import { GcodeRenderer } from "./gcode_renderer.js";
import { ProgressBar } from './progress_bar.js';
import { fileOpen } from "browser-fs-access";
import { GCodeLineStream } from "./gcode_stream.js";
import { gcodeToJson } from "./gcode_to_json.js";
import { JsonGeometryParser } from "./json_geometry_parser.js";
import { GuiOptionParser } from "./gui_option_parser.js";
import { GuiOptions } from "./gui_options.js";

let gcode_renderer = new GcodeRenderer();
gcode_renderer.animate(true);

let progress_bar = new ProgressBar();
let parser = new JsonGeometryParser();
let open_file = null;

const gui = new GuiOptions();
const gui_option_parser = new GuiOptionParser(gui);

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
    document.getElementById('dialog_message').textContent = `Error processing file: ${error.message}`;
    dialog.showModal();
    gui.enable();
  }
};

// DOM Events
document.getElementById('open_button').addEventListener('click', () => {
  reset();
  const blob = fileOpen({ extensions: ['.gcode', '.txt', '.g'], multiple: false });
  blob.then(processFile, (error) => {
    if (error.name !== 'AbortError') {
      document.getElementById('dialog_message').textContent = `Error opening file: ${error.message}`;
      dialog.showModal();
    }
  });
});
const dialog = document.querySelector("dialog");
const dialogCloseButton = document.querySelector("dialog button");
dialogCloseButton.addEventListener("click", () => {
  dialog.close();
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
gui.on('point color', (value) => {
  gcode_renderer.updatePointColor(value);
});
gui.on('line color', (value) => {
  gcode_renderer.updateLineStyle(value);
});
gui.on('background color', (value) => {
  gcode_renderer.updateBackgroundColor(value);
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
gui.on('cylindrical height', setAndReprocess((value) => gcode_renderer.initialCylindricalHeight = value));

// Reset function to reset GUI options and reprocess the file with default settings
function reset() {
  gui.reset();
  parser.x_axis = gui.settings['x axis'];
  parser.y_axis = gui.settings['y axis'];
  parser.z_axis = gui.settings['z axis'];
  parser.enableLayerView = !gui.settings['hide layers'];
  parser.layerHeight = gui.settings['layer height'];
  gcode_renderer.enableCylindricalTransform = gui.settings['enable cylindrical'];
  gcode_renderer.diameter = gui.settings['cylindrical diameter'];
  gcode_renderer.initialCylindricalHeight = gui.settings['cylindrical height'];
  gcode_renderer.cylindricalMainAxis = gui.settings['cylindrical main axis'];
  gcode_renderer.updatePointColor(gui.settings['point color']);
  gcode_renderer.updateLineStyle(gui.settings['line color']);
  gcode_renderer.updateBackgroundColor(gui.settings['background color']);
}