/* Attach GUI handlers to GcodeRenderer and parser settings
 * When GUI settings change, we update the corresponding properties in the renderer/parser and reprocess the file if necessary
 * These handlers could be moved to a separate function or class for better organization
 * @param {object} gui - The GUI instance to attach handlers to
 * @param {object} gcode_renderer - The GcodeRenderer instance to update based on GUI changes
 * @param {object} parser - The parser instance to update based on GUI changes
 * @param {function} reprocess_callback - The function to call to reprocess the file when settings change
 * @param {function} redraw_callback - The function to call to redraw the scene when settings change (optional, can be called within reprocess_callback)
 */
export function setupGUIHandlers(
  gui,
  gcode_renderer,
  parser,
  reprocess_callback,
  redraw_callback,
) {
  /* Higher function to create handlers that set a value and reprocess the file
   * @param {function} setter_callback - The function that sets the new value in the renderer/parser
   * @returns {function} - A handler function that takes the new value and an optional toggle for reprocessing
   */
  const setAndReprocess =
    (setter_callback) =>
    (value, toggle=true) => {
      setter_callback(value);
      if (reprocess_callback && toggle) {
        reprocess_callback();
      }
    };
  /* Higher function to create handlers that set a value and redraw the scene
   * @param {function} setter_callback - The function that sets the new value in the renderer/parser
   * @returns {function} - A handler function that takes the new value and an optional toggle for redrawing
   */
  const setAndRedraw =
    (setter_callback) =>
    (value, toggle=true) => {
      setter_callback(value);
      if (redraw_callback && toggle) {
        redraw_callback();
      }
    };
  gui.on("hide_points", (value) => {
    if (gcode_renderer.pointGeometry) {
      gcode_renderer.pointGeometry.visible = !value;
    }
  });
  gui.on("point_size", (value) => {
    gcode_renderer.currentPointSize = value;
    if (gcode_renderer.pointGeometry) {
      gcode_renderer.pointGeometry.material.size = value;
      gcode_renderer.pointGeometry.material.needsUpdate = true;
    }
    // Update highlighted point sphere size if it exists
    if (gcode_renderer.highlightedPointIndex !== -1) {
      gcode_renderer.updateHighlightedPointSphere(
        gcode_renderer.highlightedPointIndex,
      );
    }
  });
  gui.on("point_color", (value) => {
    gcode_renderer.updatePointColor(value);
  });
  gui.on("line_color", (value) => {
    gcode_renderer.updateLineStyle(value);
  });
  gui.on("background_color", (value) => {
    gcode_renderer.updateBackgroundColor(value);
  });

  gui.on("hide_grid", (value) => {
    gcode_renderer.gridVisible = !value;
    gcode_renderer.helper.visible = !value;
  });
  gui.on(
    "x_axis",
    setAndReprocess((value) => (parser.x_axis = value)),
  );
  gui.on(
    "y_axis",
    setAndReprocess((value) => (parser.y_axis = value)),
  );
  gui.on(
    "z_axis",
    setAndReprocess((value) => (parser.z_axis = value)),
  );
  gui.on(
    "curve_resolution",
    setAndRedraw((value) => (gcode_renderer.curve_segment_length = value)),
  );
  gui.on(
    "cylindrical_long_axis_diameter",
    setAndRedraw((value) => (gcode_renderer.diameter = value)),
  );
  gui.on(
    "cylindrical_long_axis",
    setAndRedraw((value) => (gcode_renderer.cylindricalMainAxis = value)),
  );
  gui.on(
    "enable_cylindrical",
    setAndRedraw(
      (value) => (gcode_renderer.enableCylindricalTransform = value),
    ),
  );
  gui.on(
    "cylindrical_rendering_diameter",
    setAndRedraw(
      (value) => (gcode_renderer.initialCylindricalHeight = value),
    ),
  );
}
