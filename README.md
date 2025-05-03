# Gcode viewer for Melt electrowriting Printer

[Online GCODE viewer](https://gcode-visualizer.pages.dev/) hosted by Cloudflare Pages.


An alternative G-code visualizer that allows to visualize Gcode for printing a tube. Many people use [Ncviewer](https://ncviewer.com/) for visualizing a G-code file, which is maintained by one developer. I, for one, cannot ensure that this great tool will last forever. So, I decided to create this program from scatch and keep the functionality as small as possible. Please feel free to fork and modify it. By this way, the project will be sustainable for the community.


![Thumbnail](https://gcode-visualizer.pages.dev/thumbnail.png)


## Features

**Visual options**
* Adjust point size
* Show/hide 1mm x 1mm square (grid)
* Show/hide points

**Axis options**
* Customize symbol/name for X, Y, and Z axis
* Current available symbols are `x, y, z, i, j, k, a, b, c, u, v, w`

**Cylindrical Transformation**
* It is for visualizing a tube with special axis like `G0 X1 U1`.

  > Note that unit of `U` is `mm`. For example, `G0 U6.283185` will move a rod with a diameter of 1 mm one round (360°).

* Steps:
  1. Define the longitudinal axis (main axis)
  2. The rotational axis (circumferential axis) must be visualized as `y` axis
  3. Set diameter. This number convert the distance in circumferential axis to angle.
  4. (Optional) Set an initial height. Tube with original diameter can be visualized with different radius.
  5. Set curve resolution. Increase this number to enhance curve smoothness. It will increase time to render.

## Questions

**1. How to measure pore size or distance between two points?**<br>
Click the first point. The program will show it 3D position above the options. Then, click the second one, do a calculation based on positions of two points.

**2. How to save the image of rendered geometries?**<br>
The simple answer is taking a screenshot.

**3. How to add/remove options**<br>
Check `gui_options.js` and [lil-gui](https://github.com/georgealways/lil-gui)

**4. I would like to extend the software for my special G-code**<br>
The program parses Gcode cpmmands into an intermedian JSON object (`gcode_to_json.js`) like:
```json
[
  {
    "cmd": "G0",
    "args": {"X": 1, "F": 200},
    "commend": "test",
    "tag": {}
  }, ...
]
```
Afterwards, `JSONGeometryParser` (in `json_geometry_parser.js`) convert this intermedian JSON into geometry object:
```json
[
  {"type": "line", "start": [0,0,0], "end": [1,0,0], "feedrate": 200},
  {"type": "arc", "dir": "cw", "start": [1,0,0], "end": [2,0,0], "center": [1.5, 1, 0], "feedrate": 200},
  ...
]
```
Finally, `GcodeRenderer` (in `gcode_renderer.js`) renders this geometry object using [Three.js](https://threejs.org/). If you would like to extend the software, I suggest to check these three scripts.


## Youtube Showcase
[![Youtube video](https://img.youtube.com/vi/q8Z0wkuDmsM/0.jpg)](https://www.youtube.com/watch?v=q8Z0wkuDmsM)

License: MIT
