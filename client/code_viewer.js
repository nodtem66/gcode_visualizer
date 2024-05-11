// Helper functions
const accumulate = (arr) => arr.map((sum => i => sum += i)(0));
const arrayRange = (start, stop, step) =>
    Array.from(
    { length: (stop - start) / step + 1 },
    (value, index) => start + index * step
    );
const searchLineNumber = function (v, lineCumulatedCounters) {
  if (lineCumulatedCounters.length <= 1)
    return 0;
  let start = 0, end = lineCumulatedCounters.length - 1;
  while (start <= end) {
    let mid = Math.floor((start + end) / 2);
    if (lineCumulatedCounters[mid] === v) return mid+1;
    else if (lineCumulatedCounters[mid] < v)
      start = mid + 1;
    else
      end = mid - 1;
  }
  return start;
}
// Code editor ///////////////////////////////////////////////////////////
class CodeViewer {
  lineCumulatedCounters = [];
  current_line = [];
  constructor(document, window) {
    this.document = document;
    this.window = window;

    this.textarea = this.document.getElementById('textarea');
    this.lineNumbersEle = this.document.getElementById('line-numbers');
    this.textareaStyles = window.getComputedStyle(this.textarea);
    [
        'fontFamily',
        'fontSize',
        'fontWeight',
        'letterSpacing',
        'lineHeight',
        'padding',
    ].forEach((property) => {
        this.lineNumbersEle.style[property] = this.textareaStyles[property];
    });
    // Events
    this.textarea.addEventListener('scroll', () => {
      this.lineNumbersEle.scrollTop = this.textarea.scrollTop;
    });
    
    this.textarea.addEventListener('keyup', this.updateCursorPosition.bind(this));
    this.textarea.addEventListener('click', this.updateCursorPosition.bind(this));
    const allow_keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    this.textarea.addEventListener('keydown', (e) => {
      if (allow_keys.includes(e.key))
        return true;
      e.stopPropagation(true);
      e.preventDefault(true);
      return false;
    });
  }

  calculateNumLines(str) {
    const parseValue = (v) => v.endsWith('px') ? parseInt(v.slice(0, -2), 10) : 0;
    const textareaStyles = this.window.getComputedStyle(this.textarea);
    const font = `${textareaStyles.fontSize} ${textareaStyles.fontFamily}`;
    const paddingLeft = parseValue(textareaStyles.paddingLeft);
    const paddingRight = parseValue(textareaStyles.paddingRight);
    const textareaWidth = this.textarea.getBoundingClientRect().width - paddingLeft - paddingRight;
  
    const canvas = this.document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = font;
  
    const words = str.split(' ');
    let lineCount = 0;
    let currentLine = '';
  
    for (let i = 0; i < words.length; i++) {
        const wordWidth = context.measureText(words[i] + ' ').width;
        const lineWidth = context.measureText(currentLine).width;
  
        if (lineWidth + wordWidth > textareaWidth) {
            lineCount++;
            currentLine = words[i] + ' ';
        } else {
            currentLine += words[i] + ' ';
        }
    }
  
    if (currentLine.trim() !== '') {
      lineCount++;
    }
    return lineCount;
  }

  calculateLineNumbers() {
    let lines = this.textarea.value.split('\n');
    if (lines[lines.length-1] == '') {
      lines.pop();
    }
    const numLines = lines.map((line) => this.calculateNumLines(line));
    const letterCounts = lines.map((line) => line.length);
    
    let lineNumbers = [];
    let lineCounters = [];
    let i = 1;
    while (numLines.length > 0) {
        const numLinesOfSentence = numLines.shift();
        const letterCount = letterCounts.shift();
        lineNumbers.push(i);
        lineCounters.push((numLinesOfSentence > 0 ? letterCount / numLinesOfSentence : 0)+1);
        if (numLinesOfSentence > 1) {
            Array(numLinesOfSentence - 1)
                .fill('')
                .forEach((_) => lineNumbers.push(''));
            Array(numLinesOfSentence - 1)
                .fill('')
                .forEach((_) => lineCounters.push(letterCount+1));
        }
        i++;
    }

    return {numbers: lineNumbers, counters: lineCounters};
  }

  displayLineNumbers() {
    const lineInfo = this.calculateLineNumbers();
    //console.log(lineInfo.counters);
    this.lineCumulatedCounters = accumulate(lineInfo.counters);
    //console.log(this.lineCumulatedCounters);
    this.lineNumbersEle.innerHTML = Array.from({
        length: lineInfo.numbers.length
    }, (_, i) => `<div>${lineInfo.numbers[i] || '&nbsp;'}</div>`).join('');
  }

  updateCursorPosition(e) {
    let new_current_line = [searchLineNumber(e.target.selectionStart, this.lineCumulatedCounters)];
    new_current_line.push(new_current_line[0])
    if (e.target.selectionStart != e.target.selectionEnd) {
      new_current_line[1] = searchLineNumber(e.target.selectionEnd, this.lineCumulatedCounters);
    }
    if (this.current_line.length == 2) {
      const start = this.current_line[0];
      const end = this.current_line[1];
      arrayRange(start, end, 1).forEach(i => {
        if (i < this.lineNumbersEle.children.length)
          this.lineNumbersEle.children[i].classList.remove('highlight');
      });
    }
    if (new_current_line.length == 2) {
      const start = new_current_line[0];
      const end = new_current_line[1];
      arrayRange(start, end, 1).forEach(i => {
        if (i < this.lineNumbersEle.children.length)
          this.lineNumbersEle.children[i].classList.add('highlight');
      });
    }
    this.current_line = new_current_line;
  }
}

export { CodeViewer }