
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const AXIS_NAMES = ['x', 'y', 'z', 'u', 'v', 'w', 'a', 'b', 'c', 'i', 'j', 'k'];
const MAIN_AXIS_NAMES = ['x', 'y', 'z'];

const DEFAULT_SETTINGS = {
  'hide points': false,
  'hide grid': false,
  'hide layers': true,
  'layer height': 0.1,
  'point size': 5,
  'point color': '#000000',
  'line color': '#0000ff',
  'background color': '#ffffff',
  'x axis': 'x',
  'y axis': 'y',
  'z axis': 'z',
  'cylindrical diameter': 3,
  'cylindrical height': 1.5,
  'enable cylindrical': false,
  'cylindrical main axis': 'x',
};

class GuiOptions {

  settings = Object.assign({}, DEFAULT_SETTINGS);

  fn = {};
  
  constructor() {
    const gui = new GUI({ container: document.getElementById('panel'), title: 'Options'});
    gui.add(this.settings, 'hide points').name('Hide Points').onFinishChange(this.emit.bind(this, 'hide points'));
    gui.add(this.settings, 'hide grid').name('Hide Grid').onFinishChange(this.emit.bind(this, 'hide grid'));
    gui.add(this.settings, 'hide layers').name('Hide Layers').onFinishChange(this.emit.bind(this, 'hide layers'));
    gui.add(this.settings, 'layer height', 0.01, 10).name('Layer Height').onFinishChange(this.emit.bind(this, 'layer height'));
    gui.add(this.settings, 'point size', 1, 20).name('Point Size').onFinishChange(this.emit.bind(this, 'point size'));
    gui.addColor(this.settings, 'point color').name('Point Color').onFinishChange(this.emit.bind(this, 'point color'));
    gui.addColor(this.settings, 'line color').name('Line Color').onFinishChange(this.emit.bind(this, 'line color'));
    gui.addColor(this.settings, 'background color').name('Background Color').onFinishChange(this.emit.bind(this, 'background color'));
    
    const axisOptions = gui.addFolder('Axis Options');
    axisOptions.add(this.settings, 'x axis', AXIS_NAMES).name('X Axis').onFinishChange(this.emit.bind(this, 'x axis'));
    axisOptions.add(this.settings, 'y axis', AXIS_NAMES).name('Y Axis').onFinishChange(this.emit.bind(this, 'y axis'));
    axisOptions.add(this.settings, 'z axis', AXIS_NAMES).name('Z Axis').onFinishChange(this.emit.bind(this, 'z axis'));

    const cylindricalOptions = gui.addFolder('Cylindrical Transform');
    cylindricalOptions.add(this.settings, 'enable cylindrical').name('Enable').onFinishChange(this.emit.bind(this, 'enable cylindrical'));
    cylindricalOptions.add(this.settings, 'cylindrical main axis', MAIN_AXIS_NAMES).name('Main Axis').onFinishChange(this.emit.bind(this, 'cylindrical main axis'));
    cylindricalOptions.add(this.settings, 'cylindrical diameter', 1, 100).name('Diameter').onFinishChange(this.emit.bind(this, 'cylindrical diameter'));
    cylindricalOptions.add(this.settings, 'cylindrical height', 0, 100).name('Initial Height').onFinishChange(this.emit.bind(this, 'cylindrical height'));
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

export { GuiOptions }