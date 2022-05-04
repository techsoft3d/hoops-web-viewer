namespace Communicator.Markup.Note {
    export class NoteTextElement {
        private _container!: HTMLDivElement;
        private _textArea!: HTMLTextAreaElement;
        private _positionOffset: Point2 = Point2.zero();
        private _position: Point2 = Point2.zero();
        private _activeNoteText: NoteText | null = null;

        public constructor() {
            this._createTextBox();
        }

        private _createTextBox(): void {
            this._container = document.createElement("div");
            this._container.className = "noteTextElement";

            this._textArea = document.createElement("textarea");
            this._textArea.oninput = () => {
                if (this._activeNoteText !== null) {
                    this._activeNoteText.saveTextValue();
                }
            };
            this._container.appendChild(this._textArea);

            const colors = ["blue", "red", "green", "white", "black"];
            let top = 7;
            colors.forEach((c) => {
                const colorButton = document.createElement("button");
                colorButton.className = `noteButton color ${c}`;
                colorButton.style.top = `${top}px`;
                top += 25;
                colorButton.id = `${c}_button`; // TODO: This ID is not very unique. It is quite conceivable that this can clash with an existing ID.

                let color: Color;
                switch (c) {
                    case "blue":
                        color = Color.blue();
                        break;
                    case "red":
                        color = Color.red();
                        break;
                    case "green":
                        color = Color.green();
                        break;
                    case "white":
                        color = Color.white();
                        break;
                    case "black":
                        color = Color.black();
                        break;
                    default:
                        color = Color.white();
                        break;
                }

                colorButton.onmousedown = () => {
                    if (this._activeNoteText !== null) {
                        this._activeNoteText.setColor(color);
                    }
                };

                this._container.appendChild(colorButton);
            });

            const trashButton = document.createElement("button");
            trashButton.className = "noteButton trash";
            trashButton.style.top = `${top}px`;
            trashButton.onmousedown = async () => {
                if (this._activeNoteText !== null) {
                    await this._activeNoteText.remove();
                }
            };
            this._container.appendChild(trashButton);
        }

        /**
         * Sets the corner offset position of the HTML container.
         * @param positionOffset
         */
        public setPositionOffset(positionOffset: Point2): void {
            this._positionOffset = positionOffset;
        }

        /**
         * @returns the current HTML container offset position.
         */
        public getPositionOffset(): Point2 {
            return this._positionOffset.copy();
        }

        /**
         * Sets the position of the HTML container, taking into account the position offset.
         * @param position
         */
        public setPosition(position: Point2): void {
            this._position = Point2.add(position, this._positionOffset);
            this._container.style.left = `${this._position.x}px`;
            this._container.style.top = `${this._position.y}px`;
        }

        /**
         * @returns the position of the HTML container, taking into account the position offset.
         */
        public getPosition(): Point2 {
            return this._position.copy();
        }

        /**
         * Sets the text in the HTML container text area.
         * @param text
         */
        public setText(text: string): void {
            const textArea = this._container.querySelector("textarea");
            if (textArea !== null) {
                textArea.value = text;
            }
        }

        /**
         * @returns the current text in the HTML container text area.
         */
        public getText(): string {
            const textArea = this._container.querySelector("textarea");
            return textArea !== null ? textArea.value : "";
        }

        /**
         * Sets the size of the HTML container.
         * @param size
         */
        public setSize(size: Point2): void {
            this._container.style.width = `${size.x}px`;
            this._container.style.height = `${size.y}px`;
        }

        /**
         * @returns the size of the HTML container.
         */
        public getSize(): Point2 {
            const boundingBox = this._container.getBoundingClientRect();
            return new Point2(boundingBox.width, boundingBox.height);
        }

        /**
         * Puts the cursor focus in the HTML container text area.
         */
        public focus(): void {
            this._textArea.focus();
            this._textArea.style.pointerEvents = "auto";
        }

        /**
         * Removes the cursor focus from the HTML container text area.
         */
        public blur(): void {
            this._container.blur();
        }

        /**
         * Hides the HTML container.
         */
        public hide(): void {
            this._container.style.visibility = "hidden";
            this._activeNoteText = null;
        }

        /**
         * Sets the active NoteText and shows the HTML container.
         * @param noteText
         */
        public show(noteText: NoteText): void {
            this._container.style.visibility = "visible";
            this._activeNoteText = noteText;
        }

        /**
         * @returns the HTML container element.
         */
        public getHtmlContainer(): HTMLDivElement {
            return this._container;
        }

        /**
         * Sets the HTML container element.
         * @param container
         */
        public setHtmlContainer(container: HTMLDivElement): void {
            this._container = container;
        }
    }
}
