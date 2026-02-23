class ErrorModal {
  // Constructor to initialize the error modal
  constructor() {
    const dialog = document.querySelector("dialog");
    const dialogCloseButton = document.querySelector("dialog button");
    dialogCloseButton.addEventListener("click", () => {
      dialog.close();
    });
    this.element = document.getElementById("dialog_message");
    this.dialog = dialog;
  }

  show(message) {
    this.element.textContent = `Error processing file: ${message}`;
    this.dialog.showModal();
  }

  hide() {
    this.dialog.close();
  }
}

export { ErrorModal };
