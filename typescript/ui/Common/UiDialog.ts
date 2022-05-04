namespace Communicator.Ui {
    export class UiDialog {
        private readonly _containerId: HtmlId;
        private readonly _textDiv: HTMLDivElement;
        private readonly _windowElement: HTMLDivElement;
        private readonly _headerDiv: HTMLElement;

        constructor(containerId: HtmlId) {
            this._containerId = containerId;

            this._textDiv = UiDialog._createTextDiv();
            this._windowElement = UiDialog._createWindowElement();
            this._headerDiv = UiDialog._createHeaderDiv();

            this._initElements();
        }

        private static _createWindowElement(): HTMLDivElement {
            const windowElement = document.createElement("div");
            windowElement.classList.add("ui-timeout-window");
            windowElement.classList.add("desktop-ui-window");
            return windowElement;
        }

        private static _createHeaderDiv(): HTMLElement {
            const headerDiv = document.createElement("div");
            headerDiv.classList.add("desktop-ui-window-header");
            return headerDiv;
        }

        private static _createTextDiv(): HTMLDivElement {
            const textDiv = document.createElement("div");
            return textDiv;
        }

        private _initElements(): void {
            const contentDiv = document.createElement("div");
            contentDiv.classList.add("desktop-ui-window-content");
            contentDiv.appendChild(this._textDiv);

            const br = document.createElement("div");
            br.classList.add("desktop-ui-window-divider");
            contentDiv.appendChild(br);

            const button = document.createElement("button");
            button.innerHTML = "Ok";
            $(button)
                .button()
                .on("click", () => {
                    this._onOkButtonClick();
                });

            contentDiv.appendChild(button);

            this._windowElement.appendChild(this._headerDiv);
            this._windowElement.appendChild(contentDiv);

            const container = document.getElementById(this._containerId);
            if (container !== null) {
                container.appendChild(this._windowElement);
            }
        }

        protected _onOkButtonClick(): void {
            this.hide();
        }

        public show(): void {
            $(this._windowElement).show();
        }

        public hide(): void {
            $(this._windowElement).hide();
        }

        public setText(text: string): void {
            $(this._textDiv).empty();
            this._textDiv.appendChild(document.createTextNode(text));
        }

        public setTitle(title: string): void {
            $(this._headerDiv).empty();
            this._headerDiv.appendChild(document.createTextNode(title));
        }
    }
}
