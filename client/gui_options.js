
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const AXIS_NAMES = ['x', 'y', 'z', 'u', 'v', 'w', 'a', 'b', 'c', 'i', 'j', 'k'];
const MAIN_AXIS_NAMES = ['x', 'y', 'z'];

class GuiOptions {
  settings = {
    'hide points': false,
    'hide grid': false,
    'hide layers': true,
    'layer height': 0.1,
    'point size': 3,
    'x axis': 'x',
    'y axis': 'y',
    'z axis': 'z',
    'cylindical diameter': 3,
    'cylindical height': 1.5,
    'enable cylindical': false,
    'cylindical main axis': 'x',
    'curve resolution': 20,
  }

  fn = {};
  
  constructor() {
    const gui = new GUI({ container: document.getElementById('panel'), title: 'Options'});
    gui.add(this.settings, 'hide points').name('Hide Points').onFinishChange(this.emit.bind(this, 'hide points'));
    gui.add(this.settings, 'hide grid').name('Hide Grid').onFinishChange(this.emit.bind(this, 'hide grid'));
    gui.add(this.settings, 'hide layers').name('Hide Layers').onFinishChange(this.emit.bind(this, 'hide layers'));
    gui.add(this.settings, 'layer height', 0.01, 10).name('Layer Height').onFinishChange(this.emit.bind(this, 'layer height'));
    gui.add(this.settings, 'point size', 1, 100).name('Point Size').onFinishChange(this.emit.bind(this, 'point size'));
    
    const axisOptions = gui.addFolder('Axis Options');
    axisOptions.add(this.settings, 'x axis', AXIS_NAMES).name('X Axis').onFinishChange(this.emit.bind(this, 'x axis'));
    axisOptions.add(this.settings, 'y axis', AXIS_NAMES).name('Y Axis').onFinishChange(this.emit.bind(this, 'y axis'));
    axisOptions.add(this.settings, 'z axis', AXIS_NAMES).name('Z Axis').onFinishChange(this.emit.bind(this, 'z axis'));

    const cylindicalOptions = gui.addFolder('Cylindical Transform');
    cylindicalOptions.add(this.settings, 'enable cylindical').name('Enable').onFinishChange(this.emit.bind(this, 'enable cylindical'));
    cylindicalOptions.add(this.settings, 'cylindical main axis', MAIN_AXIS_NAMES).name('Main Axis').onFinishChange(this.emit.bind(this, 'cylindical main axis'));
    cylindicalOptions.add(this.settings, 'cylindical diameter', 1, 100).name('Diameter').onFinishChange(this.emit.bind(this, 'cylindical diameter'));
    cylindicalOptions.add(this.settings, 'cylindical height', 0, 100).name('Initial Height').onFinishChange(this.emit.bind(this, 'cylindical height'));
    cylindicalOptions.add(this.settings, 'curve resolution', 1, 1000, 1).name('Curve Resolution').onFinishChange(this.emit.bind(this, 'curve resolution'));
    this.gui = gui;
  }

  on(event, callback) {
    this.fn[event] = callback;
  }

  off(event) {
    delete this.fn[event];
  }

  emit(event, value) {
    if (this.fn[event]) {
      this.fn[event](value);
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
}

export { GuiOptions }