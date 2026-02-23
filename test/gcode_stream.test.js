import { describe, it, expect, beforeEach } from "vitest";
import { GCodeLineStream } from "@/gcode_stream";

// Helper to create a readable stream from string
function createReadableStream(data) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data));
      controller.close();
    },
  });
}

describe("GCodeLineStream", () => {
  let stream;

  beforeEach(() => {
    stream = new GCodeLineStream();
  });

  describe("Constructor", () => {
    it("should create a GCodeLineStream instance", () => {
      expect(stream).toBeInstanceOf(GCodeLineStream);
    });

    it("should be a TransformStream", () => {
      expect(stream).toHaveProperty("readable");
      expect(stream).toHaveProperty("writable");
    });
  });

  describe("Stream Processing", () => {
    it("should process a single gcode line", async () => {
      const input = "G28\n";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty("results");
      expect(chunks[0]).toHaveProperty("readBytes");
    });

    it("should handle multiple lines separated by newlines", async () => {
      const input = "G28\nG0 X10 Y20\nG1 Z5\n";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      let totalLines = 0;
      chunks.forEach((chunk) => {
        if (chunk.results) {
          totalLines += chunk.results.length;
        }
      });

      expect(totalLines).toBeGreaterThan(0);
    });

    it("should handle CRLF line endings", async () => {
      const input = "G28\r\nG0 X10\r\n";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should handle CR line endings", async () => {
      const input = "G28\rG0 X10\r";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should handle lines without trailing newline", async () => {
      const input = "G28";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].results).toHaveLength(1);
    });

    it("should handle empty lines", async () => {
      const input = "G28\n\nG0 X10\n";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].results).toHaveLength(2);
      expect(chunks[0].results[0].cmd).toBe("G28");
      expect(chunks[0].results[1].cmd).toBe("G0");
      expect(chunks[0].results[1].args).toHaveProperty("x");
      expect(chunks[0].results[1].args.x).toBe(10);
    });
  });

  describe("Parsed Line Results", () => {
    it("should parse G-code commands", async () => {
      const input = "G28\n";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      const result = chunks[0].results[0];
      expect(result).toHaveProperty("cmd");
      expect(result).toHaveProperty("args");
      expect(result).toHaveProperty("tag");
      expect(result.cmd).toBe("G28");
      expect(result.args).toEqual({});
      expect(result.tag).toEqual({});
    });

    it("should parse commands with arguments", async () => {
      const input = "G0 X10 Y20 Z5\n";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      const result = chunks[0].results[0];
      expect(result.cmd).toBe("G0");
      expect(result.args).toHaveProperty("x");
      expect(result.args).toHaveProperty("y");
      expect(result.args).toHaveProperty("z");
      expect(result.args.x).toBe(10);
      expect(result.args.y).toBe(20);
      expect(result.args.z).toBe(5);
    });

    it("should parse comments", async () => {
      const input = "G28 ; Home all axes\n";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      const result = chunks[0].results[0];
      expect(result.cmd).toBeDefined();
      expect(result.cmd).toBe("G28");
      expect(result.tag).toBeDefined();
      expect(result.tag).toEqual({});
    });

    it("should track readBytes correctly", async () => {
      const input = "G28\n";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      expect(chunks[0].readBytes).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty input", async () => {
      const input = "";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      // Should complete without error
      expect(chunks).toBeDefined();
      expect(chunks).toHaveLength(0);
    });

    it("should handle lines with only whitespace", async () => {
      const input = "   \n\t\n\nA12 X23\n";
      const inputStream = createReadableStream(input);
      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          expect(value).toBeDefined();
          expect(value.results).toBeDefined();
          expect(value.results).toHaveLength(0);
          expect(value.readBytes).toBeGreaterThan(0);
        }
        done = streamDone;
      }
    });

    it("should handle very long lines", async () => {
      const input = "G0 " + "X10 Y20 ".repeat(100) + "\n";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].results).toHaveLength(1);
      expect(chunks[0].results[0].cmd).toBe("G0");
      expect(chunks[0].results[0].args).toEqual({
        x: 10,
        y: 20,
      });
    });

    it("should handle mixed line endings in same input", async () => {
      const input = "G28\nG0 X10\r\nG1 Z5\r";
      const inputStream = createReadableStream(input);
      const chunks = [];

      const reader = inputStream.pipeThrough(stream).getReader();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
          chunks.push(value);
        }
        done = streamDone;
      }

      let totalLines = 0;
      chunks.forEach((chunk) => {
        if (chunk.results) {
          totalLines += chunk.results.length;
        }
      });

      expect(totalLines).toBe(3);
    });
  });
});
