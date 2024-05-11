//import { io } from "socket.io-client";
import { GcodeRenderer } from "./gcode_renderer.js";
import { ProgressBar} from './progress_bar.js';
import { fileOpen } from "browser-fs-access";
import { GCodeLineStream } from "./gcode_stream.js";
import { gcodeToJson } from "./gcode_to_json.js";
import { JsonGeometryParser } from "./json_geometry_parser.js";
import { GuiOptions } from "./gui_options.js";

//const code_viewer = new CodeViewer(document, window);
//code_viewer.displayLineNumbers();

const gcode_renderer = new GcodeRenderer();
//gcode_renderer.test_geometry();
gcode_renderer.animate(true);

const progress_bar = new ProgressBar();
const parser = new JsonGeometryParser();
parser.enableLayerView = true;

const gui = new GuiOptions();

document.getElementById('open_button').addEventListener('click', () => {
  const blob = fileOpen({extensions: ['.gcode', '.txt'], multiple: false});
  blob.then((file) => {
    gcode_renderer.reset();
    parser.reset();
    document.getElementById('token').value = file.name;
    const gcode_stream = new GCodeLineStream(gcodeToJson);
    const reader = file.stream().pipeThrough(gcode_stream).getReader();
    reader.read().then(function processText({value, done}) {
      if (done) {
        progress_bar.reset();
        gcode_renderer.drawPoints(parser.cursorPosition);
        return;
      }
      const {readBytes, results} = value;
      progress_bar.update(readBytes/file.size*100);
      if (results.length > 0) {
        parser.process(value.results);
        gcode_renderer.draw(parser.geometry);
      }
      reader.read().then(processText);
    });
  });
});

gui.on('hide points', (value) => {
  if (gcode_renderer.pointGeometry) {
    gcode_renderer.pointGeometry.visible = !value;
  }
});
gui.on('point size', (value) => {
  if (gcode_renderer.pointGeometry) {
    gcode_renderer.pointGeometry.material.size = value;
    gcode_renderer.pointGeometry.material.needsUpdate = true;
  }
});
gui.on('hide grid', (value) => {gcode_renderer.helper.visible = !value;});
gui.on('flat layer', (value) => {console.log(value);});

// Socket.io ///////////////////////////////////////////////////////////
// TODO: Support rendering from socketio
// const socket = io('localhost:8000', {transports: ['websocket', 'polling']});
// socket.on('connect', () => {
//   console.log('Connected to server');
//   document.getElementById('token').value = socket.id;
//   socket.emit('register', '');
//   textarea.value = '';
// });

// socket.on('gcode', (data) => {
//   textarea.value += data;
// });
// socket.on('gcode_finished', () => {
//   displayLineNumbers();
// });
// socket.on('gcode_pos', (data) => {
//   console.log('gcode_pos');
//   console.log(data);
// });
// socket.on('gcode_fline', (data) => {
//   console.log('gcode_fline');
//   console.log(data);
// });
////////////////////////////////////////////////////////////////////////