# Development notes

## Benchmark between main thread reader vs WebWorker reader

I realized that the app was freezed when handling a large file. So, I tried to move the file process to WebWorker.
This is the benchmark between running in MainThread that will freeze the UI update and in WebWorker before changing.

| Function                          | MainThread | WebWorker |
| --------------------------------- | ---------- | --------- |
| ReadFile (1Mb)                    | 6ms        | 8ms       |
| ReadFile (4Mb)                    | 8.9ms      | 13.7ms    |
| +Old GCodeLineStream(gcodeToJson) | 1261ms     | 1546ms    |
| +JsonParser.process               | 1241ms     | 1464ms    |
| +GcodeRenderer                    | 4738ms     | n/a       |

The bottomneck is `GcodeRender` and `GcodeLineStream`.
Idea to improve:

- Idea 1: `GcodeLineStream` Change regexp to normal string operation. But we need the test suite before that.

| Function             | MainThread | WebWorker |
| -------------------- | ---------- | --------- |
| ReadFile (1Mb)       | 6ms        | 8ms       |
| ReadFile (4Mb)       | 8.9ms      | 13.7ms    |
| +New GCodeLineStream | 161ms      | n/a       |
| +JsonParser.process  | 257ms      | n/a       |
| +GcodeRenderer       | 2329ms     | n/a       |

- Idea 2: Optimize `GcodeRenderer`? How?
