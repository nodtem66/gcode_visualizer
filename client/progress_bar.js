class ProgressBar {
  constructor() {
    this.progress_bar = document.getElementById("progress_bar__percent");
    this.progress_bar.style.width = "0";
  }

  update(progress) {
    this.progress_bar.style.width = progress + "%";
  }

  reset() {
    this.progress_bar.style.width = "0";
  }
}

export { ProgressBar };