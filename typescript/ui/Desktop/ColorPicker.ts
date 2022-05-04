/// <reference path="../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui {
    export class ColorPicker {
        private readonly _viewer: WebViewer;

        private readonly _colorPickerId = `colorPicker`;
        private readonly _colorPickerHeaderId = `colorPickerHeader`;
        private readonly _colorPickerFooterId = `colorPickerFooter`;
        private readonly _colorPickerOkId = `colorPickerOk`;
        private readonly _colorPickerCancelId = `colorPickerCancel`;
        private readonly _colorPickerApplyId = `colorPickerApply`;
        private readonly _colorPickerInputId = `colorPickerInput`;
        private readonly _colorPickerActiveColorId = `colorPickerActiveColor`;
        private readonly _colorPickerActiveColorLabelId = `colorPickerActiveColorLabel`;
        private readonly _colorPickerActiveColorSwatchId = `colorPickerActiveColorSwatch`;

        private readonly _colorPicker: JQuery<HTMLElement>;

        private _color = Color.black();

        constructor(viewer: WebViewer, containerId: HtmlId) {
            this._viewer = viewer;
            this._colorPicker = this._createColorPickerWindow(containerId);
            this._initElements();
        }

        private _createColorPickerWindow(containerId: HtmlId): JQuery<HTMLElement> {
            const colorPicker = document.createElement(`div`);
            colorPicker.id = this._colorPickerId;
            colorPicker.classList.add(`desktop-ui-window`);

            const colorPickerHeader = document.createElement(`div`);
            colorPickerHeader.id = this._colorPickerHeaderId;
            colorPickerHeader.classList.add(`desktop-ui-window-header`);
            colorPickerHeader.innerHTML = `Color Picker`;

            const colorPickerContent = document.createElement(`div`);
            colorPickerContent.classList.add(`desktop-ui-window-content`);

            const colorPickerActiveColor = document.createElement("div");
            colorPickerActiveColor.id = this._colorPickerActiveColorId;
            colorPickerContent.appendChild(colorPickerActiveColor);

            const colorPickerActiveColorLabel = document.createElement("span");
            colorPickerActiveColorLabel.id = this._colorPickerActiveColorLabelId;
            colorPickerActiveColorLabel.innerHTML = `Active Color:`;
            colorPickerActiveColor.appendChild(colorPickerActiveColorLabel);

            const colorPickerActiveColorSwatch = document.createElement("span");
            colorPickerActiveColorSwatch.id = this._colorPickerActiveColorSwatchId;
            colorPickerActiveColorSwatch.style.backgroundColor = cssHexStringFromColor(this._color);
            colorPickerActiveColor.appendChild(colorPickerActiveColorSwatch);

            const colorPickerInput = document.createElement(`input`);
            colorPickerInput.id = this._colorPickerInputId;
            colorPickerInput.type = `text`;
            colorPickerInput.classList.add(`color-picker`);
            colorPickerContent.appendChild(colorPickerInput);

            const colorPickerFooter = document.createElement(`div`);
            colorPickerFooter.id = this._colorPickerFooterId;
            colorPickerFooter.classList.add(`desktop-ui-window-footer`);

            const colorPickerOkButton = document.createElement(`button`);
            colorPickerOkButton.id = this._colorPickerOkId;
            colorPickerOkButton.innerHTML = `Ok`;
            colorPickerFooter.appendChild(colorPickerOkButton);

            const colorPickerCancelButton = document.createElement(`button`);
            colorPickerCancelButton.id = this._colorPickerCancelId;
            colorPickerCancelButton.innerHTML = `Cancel`;
            colorPickerFooter.appendChild(colorPickerCancelButton);

            const colorPickerApplyButton = document.createElement(`button`);
            colorPickerApplyButton.id = this._colorPickerApplyId;
            colorPickerApplyButton.innerHTML = `Apply`;
            colorPickerFooter.appendChild(colorPickerApplyButton);

            colorPicker.appendChild(colorPickerHeader);
            colorPicker.appendChild(colorPickerContent);
            colorPicker.appendChild(colorPickerFooter);

            $(`#${containerId}`).append(colorPicker);

            $(colorPickerInput).minicolors({
                position: `bottom left`,
                format: `rgb`,
                control: `hue`,
                defaultValue: rgbStringFromColor(this._color),
                inline: true,
            });

            return $(colorPicker);
        }

        private _initElements(): void {
            this._colorPicker.draggable({
                handle: `#${this._colorPickerHeaderId}`,
            });

            $(`#${this._colorPickerOkId}`).on("click", () => {
                this._updateColor();
                this.hide();
            });

            $(`#${this._colorPickerCancelId}`).on("click", () => {
                this.hide();
            });

            $(`#${this._colorPickerApplyId}`).on("click", () => {
                this._updateColor();
            });
        }

        private _updateColor() {
            this._color.assign(
                colorFromRgbString(getValueAsString(`#${this._colorPickerInputId}`)),
            );
            $(`#${this._colorPickerActiveColorSwatchId}`).css(
                "background",
                cssHexStringFromColor(this._color),
            );
        }

        public show(): void {
            centerWindow(this._colorPickerId, this._viewer.view.getCanvasSize());
            this._colorPicker.show();
        }

        public hide(): void {
            this._colorPicker.hide();
        }

        public getColor(): Color {
            return this._color.copy();
        }
    }
}
