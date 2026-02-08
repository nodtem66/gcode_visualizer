import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const AXIS_NAMES = ["x", "y", "z", "u", "v", "w", "a", "b", "c", "i", "j", "k"];
const MAIN_AXIS_NAMES = ["x", "y", "z"];

const DEFAULT_SETTINGS = {
  "hide_points": false,
  "hide_grid": false,
  "point_size": 5,
  "point_color": "#000000",
  "line_color": "#0000ff",
  "background_color": "#ffffff",
  "x_axis": "x",
  "y_axis": "y",
  "z_axis": "z",
  "enable_cylindrical": false,
  "cylindrical_long_axis": "x",
  "cylindrical_long_axis_diameter": 3,
  "cylindrical_rendering_diameter": 1.5,
};

class GuiOptions {
  settings = Object.assign({}, DEFAULT_SETTINGS);

  fn = {};

  constructor() {
    const gui = new GUI({
      container: document.getElementById("panel"),
      title: "Options",
    });
    gui
      .add(this.settings, "hide_points")
      .name("Hide Points")
      .onFinishChange(this.emit.bind(this, "hide_points"));
    gui
      .add(this.settings, "hide_grid")
      .name("Hide Grid")
      .onFinishChange(this.emit.bind(this, "hide_grid"));
    gui
      .add(this.settings, "point_size", 1, 20)
      .name("Point Size")
      .onFinishChange(this.emit.bind(this, "point_size"));
    gui
      .addColor(this.settings, "point_color")
      .name("Point Color")
      .onFinishChange(this.emit.bind(this, "point_color"));
    gui
      .addColor(this.settings, "line_color")
      .name("Line Color")
      .onFinishChange(this.emit.bind(this, "line_color"));
    gui
      .addColor(this.settings, "background_color")
      .name("Background Color")
      .onFinishChange(this.emit.bind(this, "background_color"));

    const axisOptions = gui.addFolder("Axis Options");
    axisOptions
      .add(this.settings, "x_axis", AXIS_NAMES)
      .name("X Axis")
      .onFinishChange(this.emit.bind(this, "x_axis"));
    axisOptions
      .add(this.settings, "y_axis", AXIS_NAMES)
      .name("Y Axis")
      .onFinishChange(this.emit.bind(this, "y_axis"));
    axisOptions
      .add(this.settings, "z_axis", AXIS_NAMES)
      .name("Z Axis")
      .onFinishChange(this.emit.bind(this, "z_axis"));

    const cylindricalOptions = gui.addFolder("Cylindrical Transform");
    cylindricalOptions
      .add(this.settings, "enable_cylindrical")
      .name("Enable")
      .onFinishChange(this.emit.bind(this, "enable_cylindrical"));
    cylindricalOptions
      .add(this.settings, "cylindrical_long_axis", MAIN_AXIS_NAMES)
      .name("Main Axis")
      .onFinishChange(this.emit.bind(this, "cylindrical_long_axis"));
    cylindricalOptions
      .add(this.settings, "cylindrical_long_axis_diameter", 1, 100)
      .name("Diameter")
      .onFinishChange(this.emit.bind(this, "cylindrical_long_axis_diameter"));
    cylindricalOptions
      .add(this.settings, "cylindrical_rendering_diameter", 0, 100)
      .name("Initial Height")
      .onFinishChange(this.emit.bind(this, "cylindrical_rendering_diameter"));
    this.gui = gui;
  }

  on(event, callback) {
    this.fn[event] = callback;
  }

  off(event) {
    delete this.fn[event];
  }

  emit(event) {
    if (this.fn[event]) {
      this.settings[event] = arguments[1]; // Update the setting value
      this.fn[event](...Array.from(arguments).slice(1));
    }
  }

  disable() {
    if (!this.gui) return;
    this.gui.controllers.forEach((controller) => {
      controller.disable();
    });
  }

  enable() {
    if (!this.gui) return;
    this.gui.controllers.forEach((controller) => {
      controller.enable();
    });
  }

  update() {
    if (!this.gui) return;
    this.gui.controllersRecursive().forEach((controller) => {
      controller.updateDisplay();
    });
  }

  reset() {
    if (!this.gui) return;
    for (const key in DEFAULT_SETTINGS) {
      this.settings[key] = DEFAULT_SETTINGS[key];
    }
    this.update();
  }
}

export { GuiOptions };
