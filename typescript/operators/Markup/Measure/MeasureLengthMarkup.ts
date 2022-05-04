/// <reference path="../../../Markup/MarkupItem.ts"/>
/// <reference path="MeasureMarkup.ts"/>

namespace Communicator.Markup.Measure {
    /** @hidden */
    export class MeasureLengthMarkup extends MeasureMarkup {
        protected _lineEdgeShape = new Shape.Polyline();
        protected _linePositions: Point3[] = [];

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);

            this._name = "MeasureLength";

            this._positions = [];
            this._lineShapes = [];

            this._lineEdgeShape.setStrokeWidth(4);
            this._lineEdgeShape.setStrokeColor(viewer.measureManager.getMeasurementEdgeColor());
        }

        public setLineGeometry(linePoints: Point3[]): void {
            this._linePositions = linePoints;
            this._stage = 1;
        }

        public setMeasurementEdgeColor(color: Color): void {
            this._lineEdgeShape.setStrokeColor(color);
        }

        public reset(): void {
            this._stage = 0;
        }

        public adjust(position: Point2): void {
            super.adjust(position);
        }

        public draw(): void {
            return;
        }

        public getLineEdgeShape(): Shape.Polyline {
            return this._lineEdgeShape;
        }

        //serialization methods
        public getClassName(): string {
            return "Communicator.Markup.Measure.MeasureLengthMarkup";
        }
    }
}
