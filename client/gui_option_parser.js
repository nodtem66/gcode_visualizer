class GuiOptionParser {
  gui = null; // GuiOptions instance

  constructor(gui) {
    this.gui = gui;
  }

  process(gcodeArray) {
    if (
      this.gui == null ||
      this.gui.settings == null ||
      this.gui.update == null
    )
      return;

    gcodeArray.forEach((x) => {
      if (x.tag) {
        this.processComment(x.tag);
      }
    });
  }

  update_setting(key, value) {
    if (this.gui.settings[key] !== undefined) {
      this.gui.emit(key, value, false); // Emit event without reprocessing file
    }
  }

  processComment(tag) {
    for (const key in tag) {
      const val = tag[key];
      if (key === "hide_point") {
        this.update_setting("hide_points", val === "true" || val === true);
      } else if (key === "hide_grid") {
        this.update_setting("hide_grid", val === "true" || val === true);
      } else if (key === "hide_layers") {
        this.update_setting("hide_layers", val === "true" || val === true);
      } else if (key === "point_size") {
        this.update_setting("point_size", parseFloat(val));
      } else if (key === "point_color") {
        this.update_setting("point_color", val);
      } else if (key === "line_color") {
        this.update_setting("line_color", val);
      } else if (key === "background_color") {
        this.update_setting("background_color", val);
      } else if (key === "x_axis") {
        this.update_setting("x_axis", val);
      } else if (key === "y_axis") {
        this.update_setting("y_axis", val);
      } else if (key === "z_axis") {
        this.update_setting("z_axis", val);
      } else if (key === "enable_cylindrical") {
        this.update_setting(
          "enable_cylindrical",
          val === "true" || val === true,
        );
      } else if (key === "cylindrical_long_axis") {
        this.update_setting("cylindrical_long_axis", val);
      } else if (key === "cylindrical_long_axis_diameter") {
        this.update_setting("cylindrical_long_axis_diameter", parseFloat(val));
      } else if (key === "cylindrical_rendering_diameter") {
        this.update_setting("cylindrical_rendering_diameter", parseFloat(val));
      }
    }
  }
}

export { GuiOptionParser };
