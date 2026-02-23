import { describe, it, expect } from "vitest";
import { JsonGeometryParser } from "@/json_geometry_parser";
import { GCodeLineStream } from "@/gcode_stream";

describe("Test non-uniform mandrel gcode", () => {
  it("should parse and render non-uniform mandrel gcode without errors", async () => {
    
    const gcodeLines = [
      "; hide_grid: true\n",
      "; y_axis: u\n",
      "; point_size: 5\n",
      "; enable_cylindrical: true\n",
      "; cylindrical_long_axis_diameter: 3\n",
      "; cylindrical_long_axis: x\n",
      "G90\n",
      "G1 X0 F400\n",
      "G1 U9.42477796077\n",
      "G1 X1 F400\n",
      "G1 U0\n",
      "G1 X2 Z0.1 F400\n",
      "G1 U9.42477796077\n",
      "G1 X3 Z0.5 F400\n",
      "G1 U0\n",
      "G1 X4 Z1 F400\n",
      "G1 U9.42477796077\n",
    ];

    const gcodeStream = new GCodeLineStream();
    const reader = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(gcodeLines.join("")));
        controller.close();
      },
    });
    const gcodeObjects = [];

    await reader
      .pipeThrough(gcodeStream)
      .getReader()
      .read()
      .then(({ value }) => {
        const { results } = value;
        gcodeObjects.push(...results);
      });
    expect(gcodeObjects.length).toBe(11);
    expect(gcodeObjects).toEqual([
      { cmd: "G90", args: {}, tag: {} },
      { cmd: "G1", args: { x: 0, f: 400 }, tag: {} },
      { cmd: "G1", args: { u: 9.42477796077 }, tag: {} },
      { cmd: "G1", args: { x: 1, f: 400 }, tag: {} },
      { cmd: "G1", args: { u: 0 }, tag: {} },
      { cmd: "G1", args: { x: 2, z: 0.1, f: 400 }, tag: {} },
      { cmd: "G1", args: { u: 9.42477796077 }, tag: {} },
      { cmd: "G1", args: { x: 3, z: 0.5, f: 400 }, tag: {} },
      { cmd: "G1", args: { u: 0 }, tag: {} },
      { cmd: "G1", args: { x: 4, z: 1, f: 400 }, tag: {} },
      { cmd: "G1", args: { u: 9.42477796077 }, tag: {} },
    ]);

    
    const parser = new JsonGeometryParser();
    parser.process(gcodeObjects);
    expect(parser.positionSystem).toBe(1);
  });
});
