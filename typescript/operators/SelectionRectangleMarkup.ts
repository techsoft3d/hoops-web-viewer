/// <reference path="Markup/Measure/MeasureMarkup.ts" />

namespace Communicator.Operator {
    /** @hidden */
    export class SelectionRectangleMarkup extends Markup.Measure.MeasureMarkup {
        private _rectangle = new Markup.Shape.Rectangle();
        private _markupHandle: string | null = null;
        private _dim = new Point2(0, 0);
        private _constantStrokeColor: boolean;

        public initialPosition = new Point2(0, 0);
        public currentPosition = new Point2(0, 0);
        public min = new Point2(0, 0);
        public max = new Point2(0, 0);

        public constructor(viewer: WebViewer, constantStrokeColor: boolean) {
            super(viewer);
            this._name = "_RectangleMarkup";
            this._rectangle.setFillOpacity(0);
            this._rectangle.setStrokeColor(Color.red());
            this._constantStrokeColor = constantStrokeColor;
        }

        public draw(): void {
            const markupManager = this._viewer.markupManager;
            const renderer = markupManager.getRenderer();
            renderer.drawRectangle(this._rectangle);
        }

        public updateCurrentPosition(currentPosition: Point2): void {
            this.currentPosition.assign(currentPosition);
            if (!this._constantStrokeColor) {
                this._rectangle.setStrokeColor(
                    this.initialPosition.x < this.currentPosition.x ? Color.red() : Color.blue(),
                );
            }

            this.min.assign(this.initialPosition);
            this.max.assign(this.currentPosition);

            if (this.max.x < this.min.x) {
                const x = this.max.x;
                this.max.x = this.min.x;
                this.min.x = x;
            }

            if (this.max.y < this.min.y) {
                const y = this.max.y;
                this.max.y = this.min.y;
                this.min.y = y;
            }

            this._dim.assign(this.max);
            this._dim.subtract(this.min);

            this._updateRectangleVertices();
        }

        private _updateRectangleVertices(): void {
            this._rectangle.setPosition(this.min);
            this._rectangle.setSize(this._dim);
        }

        public activate(initialPosition: Point2): void {
            this.initialPosition.assign(initialPosition);
            this.currentPosition.assign(initialPosition);
            this.min.assign(initialPosition);
            this.max.assign(initialPosition);
            this._dim.set(0, 0);

            this._rectangle.setStrokeWidth(1);
            this._updateRectangleVertices();

            const markupManager = this._viewer.markupManager;
            this._markupHandle = markupManager.registerMarkup(this);
        }

        public deactivate(): void {
            this.initialPosition.set(0, 0);
            this.currentPosition.set(0, 0);
            this.min.set(0, 0);
            this.max.set(0, 0);
            this._dim.set(0, 0);

            this._rectangle.setStrokeWidth(0);
            this._updateRectangleVertices();

            const markupManager = this._viewer.markupManager;
            if (this._markupHandle !== null) {
                markupManager.unregisterMarkup(this._markupHandle);
                this._markupHandle = null;
            }
            markupManager.refreshMarkup();
        }

        public isActive(): boolean {
            return this._markupHandle !== null;
        }
    }
}
