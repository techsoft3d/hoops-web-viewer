namespace Communicator.Markup.Redline {
    /** @hidden */
    export class RedlineTextElement {
        private static _defaultSize = new Point2(100, 100);

        private _textArea!: HTMLTextAreaElement;
        private _currentSize!: Point2;
        private _sizeChanged = false;

        private _sizeUpdateCallback: (size: Point2) => void;
        private _textUpdateCallback: (text: string) => void;

        public constructor(
            sizeUpdateCallback: (size: Point2) => void,
            textUpdateCallback: (text: string) => void,
        ) {
            this._sizeUpdateCallback = sizeUpdateCallback;
            this._textUpdateCallback = textUpdateCallback;
            this._createTextBox();
        }

        private _createTextBox(): void {
            this._currentSize = RedlineTextElement._defaultSize.copy();

            this._textArea = document.createElement("textarea");
            this._textArea.style.position = "absolute";
            this._textArea.style.width = `${RedlineTextElement._defaultSize.x}px`;
            this._textArea.style.height = `${RedlineTextElement._defaultSize.y}px`;
            this._textArea.style.zIndex = "1";
            this._textArea.style.pointerEvents = "none";
            this._textArea.style.resize = "none";

            // Workaround to have html2canvas to break words
            this._textArea.style.letterSpacing = "1px";

            this.setBorderWidth(2);

            this._textArea.onmousemove = (event: Event) => {
                event.stopPropagation();
                const size = new Point2(
                    parseInt(this._textArea.style.width!, 10),
                    parseInt(this._textArea.style.height!, 10),
                );
                this.setSize(size);
            };

            this._textArea.onmouseup = (event: Event) => {
                event.stopPropagation();
                if (this._sizeChanged) {
                    this._sizeChanged = false;
                    this._sizeUpdateCallback(this._currentSize);
                }
            };

            const textFunc = () => {
                this._textUpdateCallback(this._textArea.value);
            };

            this._textArea.oninput = textFunc;
        }

        public setPosition(pos: Point2): void {
            this._textArea.style.left = `${pos.x}px`;
            this._textArea.style.top = `${pos.y}px`;
        }

        public setBorderWidth(borderWidth: number): void {
            this._textArea.style.outline = `${borderWidth}px solid red`;
        }

        public setText(text: string): void {
            this._textArea.textContent = text;
        }

        public setSize(size: Point2): void {
            if (!this._currentSize.equals(size)) {
                this._sizeChanged = true;
                this._currentSize.assign(size);
                this._textArea.style.width = `${size.x}px`;
                this._textArea.style.height = `${size.y}px`;
            }
        }

        public focus(): void {
            this._textArea.focus();
            this._textArea.style.pointerEvents = "auto";
            this._textArea.style.resize = "both";
        }

        public blur(): void {
            this._textArea.blur();
            this._textArea.style.pointerEvents = "none";
            this._textArea.style.resize = "none";
        }

        public getTextArea(): HTMLTextAreaElement {
            return this._textArea;
        }
    }
}
