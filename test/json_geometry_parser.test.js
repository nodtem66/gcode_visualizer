import { describe, it, expect, beforeEach } from "vitest";
import { JsonGeometryParser } from "@/json_geometry_parser";

describe("JsonGeometryParser", () => {
  let parser;

  beforeEach(() => {
    parser = new JsonGeometryParser();
    parser.reset();
  });

  it("resets to default state", () => {
    expect(parser.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(parser.geometry).toEqual([]);
    expect(parser.cursorPosition).toEqual([]);
    expect(parser.isAbsolutePosition()).toBe(true);
    expect(parser.feedrate).toBe(100);
  });

  it("records absolute G0 moves as line geometry", () => {
    parser.G0({ x: 1, y: 2, z: 3, f: 200 });

    expect(parser.geometry).toHaveLength(1);
    expect(parser.geometry[0]).toEqual({
      type: "line",
      start: [0, 0, 0],
      end: [1, 2, 3],
      feedrate: 200,
    });
    expect(parser.cursorPosition).toEqual([[1, 2, 3]]);
  });

  it("handles relative positioning updates", () => {
    parser.G91();
    parser.G0({ x: 1, y: 2 });
    parser.G0({ x: 1 });

    expect(parser.geometry).toHaveLength(2);
    expect(parser.geometry[0].end).toEqual([1, 2, 0]);
    expect(parser.geometry[1]).toEqual({
      type: "line",
      start: [1, 2, 0],
      end: [2, 2, 0],
      feedrate: 100,
    });
  });

  it("records arc geometry with correct centers", () => {
    parser.G2({ x: 10, y: 0, i: 5, j: 0, f: 150 });
    parser.G91();
    parser.G2({ x: 0, y: 10, i: 0, j: 5 });

    expect(parser.geometry[0]).toEqual({
      type: "arc",
      dir: "cw",
      start: [0, 0, 0],
      end: [10, 0, 0],
      center: [5, 0],
      feedrate: 150,
    });
    expect(parser.geometry[1]).toEqual({
      type: "arc",
      dir: "cw",
      start: [10, 0, 0],
      end: [10, 10, 0],
      center: [10, 5],
      feedrate: 150,
    });
  });

  it("records counter-clockwise arcs", () => {
    parser.G3({ x: 5, y: 5, i: 2, j: 0 });

    expect(parser.geometry[0].dir).toBe("ccw");
    expect(parser.geometry[0].type).toBe("arc");
  });

  it("uses CTS tag to update feedrate", () => {
    parser.process([{ tag: { CTS: 321 } }, { cmd: "G0", args: { x: 1 } }]);

    expect(parser.geometry).toHaveLength(1);
    expect(parser.geometry[0].feedrate).toBe(321);
  });

  it("supports axis remapping via axis names", () => {
    parser.x_axis = "a";
    parser.y_axis = "b";
    parser.z_axis = "c";

    parser.G0({ a: 2, c: 3 });

    expect(parser.geometry).toHaveLength(1);
    expect(parser.geometry[0].end).toEqual([2, 0, 3]);
  });

  it("ignores moves with no axis values", () => {
    parser.G0({ f: 200 });
    expect(parser.feedrate).toBe(100);
    expect(parser.geometry).toHaveLength(0);

    parser.G1({});
    expect(parser.geometry).toHaveLength(0);

    parser.G2({});
    expect(parser.geometry).toHaveLength(0);

    parser.G3({ i: 1, j: 1 });
    expect(parser.geometry).toHaveLength(0);
    expect(parser.cursorPosition).toEqual([]);
  });

  it("processes G-code objects from a stream", () => {
    const gcodeObjects = [
      { cmd: "G90", args: {}, tag: {} },
      { cmd: "G1", args: { x: 0, f: 400 }, tag: {} },
      { cmd: "G1", args: { u: 9.42477796077 }, tag: {} },
    ];
    parser.process(gcodeObjects);
    expect(parser.positionSystem).toBe(1);
    expect(parser.geometry).toHaveLength(1);
    expect(parser.geometry[0]).toEqual({
      type: "line",
      start: [0, 0, 0],
      end: [0, 0, 0],
      feedrate: 400,
    });

    parser.y_axis = "u";
    parser.process([{ cmd: "G1", args: { u: 9.42477796077 }, tag: {} }]);
    expect(parser.geometry).toHaveLength(2);
    expect(parser.geometry[1]).toEqual({
      type: "line",
      start: [0, 0, 0],
      end: [0, 9.42477796077, 0],
      feedrate: 400,
    });

    parser.process([
      { cmd: "G1", args: { x: 1, f: 400 }, tag: {} },
      { cmd: "G1", args: { u: 0 }, tag: {} },
      { cmd: "G1", args: { x: 2, z: 0.1, f: 400 }, tag: {} },
      { cmd: "G1", args: { u: 9.42477796077 }, tag: {} },
      { cmd: "G1", args: { x: 3, z: 0.5, f: 400 }, tag: {} },
      { cmd: "G1", args: { u: 0 }, tag: {} },
      { cmd: "G1", args: { x: 4, z: 1, f: 400 }, tag: {} },
      { cmd: "G1", args: { u: 9.42477796077 }, tag: {} },
    ]);
    expect(parser.geometry).toHaveLength(10);
  });
});
