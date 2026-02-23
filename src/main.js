import { GcodeRenderer } from "@/gcode_renderer";
import { ProgressBar } from "@/progress_bar";
import { GCodeLineStream } from "@/gcode_stream";
import { JsonGeometryParser } from "@/json_geometry_parser";
import { GuiOptionParser } from "@/gui_option_parser";
import { GuiOptions } from "@/gui_options";
import { setupGUIHandlers } from "@/gui_option_handlers";
import { ErrorModal } from "@/error_modal";

// If everything is ready, we can remove the landing screen
window.addEventListener("load", () => {
  const loadingScreen = document.getElementById("loading_screen");
  if (loadingScreen) {
    loadingScreen.style.display = "none";
  }
});

const errorModal = new ErrorModal();

const gcodeRenderer = new GcodeRenderer();
gcodeRenderer.animate(true);
gcodeRenderer.onError = (message) => errorModal.show(message);

const progressBar = new ProgressBar();
const jsonParser = new JsonGeometryParser();

const gui = new GuiOptions();
const settingParser = new GuiOptionParser(gui);


/* Input file selection handler
 * Reads the selected file as a stream and processes it line by line using GCodeLineStream and JsonGeometryParser.
 * Updates the progress bar based on the number of bytes read.
 * Handles errors gracefully by showing a dialog with the error message.
 * @param {File} file - The selected file to process.
 * @param {boolean} enable_setting_parser - Whether to enable the setting parser from comment tag.
 */
const processFile = async (file, enable_setting_parser = true) => {
  gcodeRenderer.reset();
  jsonParser.reset();

  if (!file) return;

  const gcode_stream = new GCodeLineStream(enable_setting_parser ? settingParser : null);
  const reader = file.stream().pipeThrough(gcode_stream).getReader();
  gui.disable();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      const { readBytes, results } = value;
      progressBar.update((readBytes / file.size) * 100);
      if (results.length > 0) {
        jsonParser.process(results);
      }
    }

    progressBar.reset();
    gcodeRenderer.draw(jsonParser.geometry);
    gcodeRenderer.drawPoints(jsonParser.cursorPosition);
    console.log(
      "Rendered",
      gcodeRenderer.lineSegments.geometry.attributes.position.count - 1,
      "lines and",
      jsonParser.cursorPosition.length,
      "points.",
    );
    gui.update();
    gui.enable();
  } catch (error) {
    errorModal.show(`Error processing file: ${error.message}`);
    gui.enable();
  }
};
document.getElementById("file_input").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    processFile(file);
  }
});

const redraw = () => {
  gcodeRenderer.reset();
  gcodeRenderer.draw(jsonParser.geometry);
  gcodeRenderer.drawPoints(jsonParser.cursorPosition);
};
const reprocess = () => {
  const fileInput = document.getElementById("file_input");
  if (fileInput.files.length > 0) {
    processFile(fileInput.files[0], false);
  }
};
setupGUIHandlers(gui, gcodeRenderer, jsonParser, reprocess, redraw);

// Reset function to reset GUI options for reprocessing the file with default settings
function reset() {
  gui.reset();
  jsonParser.x_axis = gui.settings["x_axis"];
  jsonParser.y_axis = gui.settings["y_axis"];
  jsonParser.z_axis = gui.settings["z_axis"];
  gcodeRenderer.enableCylindricalTransform = gui.settings["enable_cylindrical"];
  gcodeRenderer.diameter = gui.settings["cylindrical_long_axis_diameter"];
  gcodeRenderer.initialCylindricalHeight =
    gui.settings["cylindrical_rendering_diameter"];
  gcodeRenderer.cylindricalMainAxis = gui.settings["cylindrical_long_axis"];
  gcodeRenderer.updatePointColor(gui.settings["point_color"]);
  gcodeRenderer.updateLineStyle(gui.settings["line_color"]);
  gcodeRenderer.updateBackgroundColor(gui.settings["background_color"]);
}
