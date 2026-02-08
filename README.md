# Gcode viewer for Melt electrowriting Printer

[Online app (Cloudflare)](https://gcode-visualizer.pages.dev/) | [Youtube Showcase](https://www.youtube.com/watch?v=q8Z0wkuDmsM) | License: MIT


![Thumbnail](https://gcode-visualizer.pages.dev/thumbnail.png)

An alternative G-code viewer that allows to visualize flat or tube structure. Many people use [Ncviewer](https://ncviewer.com/) for visualizing a G-code file, which is maintained by one developer. I, for one, cannot ensure that this great tool will last forever. So, I decided to create this program from scatch and keep the functionality as small as possible. Please feel free to fork and modify it. By this way, the project will be sustainable for the community.



## Features

**Visual options**
* Adjust point size
* Show/hide 1mm x 1mm square (grid)
* Show/hide points

**Axis options**
* Customize symbol/name for X, Y, and Z axis
* Current available symbols are `x, y, z, i, j, k, a, b, c, u, v, w`

**Cylindrical Transformation**

It is for visualizing a tube with special axis like `G0 X1 U1`.

  > Note that unit of `U` is `mm`. For example, `G0 U6.283185` will move a rod with a diameter of 1 mm one round (360°).

* Steps:
  1. Define the longitudinal axis (main axis)
  2. The rotational axis (circumferential axis) must be the defined `y` axis
  3. Set diameter. This number convert the distance in circumferential axis to angle.
  4. (Optional) Set an initial height. Tube with original diameter can be visualized with different radius.

## Visualization settings
| Setting | Description | Default |
|---------|-------------|---------|
| Hide points | Disable rendering points | `false` |
| Hide grid | Disable rendering 1mm×1mm grids | `false` |
| Point size | Adjust the size of rendered points | `2` |
| Point color | Set the color of rendered points in hex format | `#000000` |
| Line color | Set the color of rendered lines in hex format | `#0000ff` |
| Background color | Set the background color in hex format | `#ffffff` |
| X axis | Customize symbol/name for X axis | `x` |
| Y axis | Customize symbol/name for Y axis | `y` |
| Z axis | Customize symbol/name for Z axis | `z` |
| Available symbols | Symbols: `x, y, z, i, j, k, a, b, c, u, v, w` | — |
| Enable cylindrical | Enable cylindrical transformation for tube visualization | `false` |
| Cylindrical long axis | Define the longitudinal (main) axis | `x` |
| Cylindrical long axis diameter | Set the diameter in mm for circumferential axis conversion | `1` |
| Cylindrical rendering diameter | Set the rendering diameter for tube visualization | `1.5` |

The settings can be set through Gcode comments:
```
; hide_points: false
; hide_grid: true
; point_size: 2
; point_color: #000000
; line_color: #0000ff
; background_color: #ffffff
; x_axis: x
; y_axis: u
; z_axis: z
; enable_cylindrical: true
; cylindrical_long_axis: x
; cylindrical_long_axis_diameter: 3
; cylindrical_rendering_diameter: 1.5
```
## Questions

**1. How to measure a pore size or a distance between two points?**<br>
Click the first point. The program will show it 3D position above the options. Then, click the second one, do a calculation based on positions of two points.

**2. How to save an image of the rendered geometry?**<br>
The simple answer is taking a screenshot.

**3. How to add/remove options?**<br>
Check `gui_options.js` and [lil-gui](https://github.com/georgealways/lil-gui)

**4. I would like to extend the software for my special G-code**<br>
The program parses Gcode commands into an intermediate JSON object (`gcode_to_json.js`) like:
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
Afterwards, `JSONGeometryParser` (in `json_geometry_parser.js`) convert this intermediate JSON into geometry object:
```json
[
  {"type": "line", "start": [0,0,0], "end": [1,0,0], "feedrate": 200},
  {"type": "arc", "dir": "cw", "start": [1,0,0], "end": [2,0,0], "center": [1.5, 1, 0], "feedrate": 200},
  ...
]
```
Finally, `GcodeRenderer` (in `gcode_renderer.js`) renders this geometry object using [Three.js](https://threejs.org/). If you would like to extend the software, I suggest to check these three scripts.

