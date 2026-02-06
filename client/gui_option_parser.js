class GuiOptionParser {
  gui = null; // GuiOptions instance
  
  constructor(gui) {
    this.gui = gui;
  }
  
  process(gcodeArray) {
    
    if (this.gui == null || this.gui.settings == null || this.gui.update == null) return;

    gcodeArray.forEach(x => {
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
      if (key === 'hide_point') {
        this.update_setting('hide points', val === 'true' || val === true);
      } else if (key === 'hide_grid') {
        this.update_setting('hide grid', val === 'true' || val === true);
      } else if (key === 'hide_layers') {
        this.update_setting('hide layers', val === 'true' || val === true);
      } else if (key === 'layer_height') {
        this.update_setting('layer height', parseFloat(val));
      } else if (key === 'point_size') {
        this.update_setting('point size', parseFloat(val));
      } else if (key === 'x_axis') {
        this.update_setting('x axis', val);
      } else if (key === 'y_axis') {
        this.update_setting('y axis', val);
      } else if (key === 'z_axis') {
        this.update_setting('z axis', val);
      } else if (key === 'enable_cylindrical') {
        this.update_setting('enable cylindrical', val === 'true' || val === true);
      } else if (key === 'cylindrical_main_axis') {
        this.update_setting('cylindrical main axis', val);
      } else if (key === 'cylindrical_diameter') {
        this.update_setting('cylindrical diameter', parseFloat(val));
      } else if (key === 'cylindrical_height') {
        this.update_setting('cylindrical height', parseFloat(val));
      } else if (key === 'curve_step') {
        this.update_setting('curve step', parseFloat(val));
      }
    }
  }

  
}

export { GuiOptionParser }