
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

class GuiOptions {
  settings = {
    'hide points': false,
    'hide grid': false,
    //'flat layer': false,
    'point size': 3,
  }

  fn = {};
  
  constructor() {
    const gui = new GUI({ container: document.getElementById('panel'), title: 'Options'});
    gui.add(this.settings, 'hide points').name('Hide Points').onChange(this.emit.bind(this, 'hide points'));
    gui.add(this.settings, 'hide grid').name('Hide Grid').onChange(this.emit.bind(this, 'hide grid'));
    //gui.add(this.settings, 'flat layer').name('Flat Layer').onChange(this.emit.bind(this, 'flat layer'));
    gui.add(this.settings, 'point size', 1, 100).name('Point Size').onChange(this.emit.bind(this, 'point size'));
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
}

export { GuiOptions }