/// <reference path="MeasureMarkup.ts"/>

namespace Communicator.Markup.Measure {
    /** @hidden */
    export class MeasureLineLineAngleMarkup extends MeasureMarkup {
        private _anchorLinePoint: Point3 | null = null;
        private _firstLinePoint: Point3 | null = null;
        private _secondLinePoint: Point3 | null = null;

        private _selectionPosition: Point3 | null = null;
        private _lineGeometryShape = new Shape.Polyline();

        public constructor(viewer: WebViewer) {
            super(viewer);
            this._viewer = viewer;

            this._name = "MeasureLineLineAngle";

            this._lineGeometryShape.setStrokeWidth(2);
            this._lineGeometryShape.setStrokeColor(
                this._viewer.measureManager.getMeasurementColor(),
            );
            this._lineGeometryShape.setEndcapType(Shape.EndcapType.Arrowhead);
            this._lineGeometryShape.setStartEndcapType(Shape.EndcapType.Arrowhead);
            this._lineGeometryShape.setEndEndcapSize(5);
            this._lineGeometryShape.setStartEndcapSize(5);
            this._lineGeometryShape.setEndEndcapColor(
                this._viewer.measureManager.getMeasurementColor(),
            );
            this._lineGeometryShape.setStartEndcapColor(
                this._viewer.measureManager.getMeasurementColor(),
            );

            this._textShape.getBoxPortion().setFillOpacity(1);
            this._textShape.getBoxPortion().setFillColor(Color.white());
        }

        public addPoint(position: Point3): boolean {
            if (this._finalized) return false;

            if (this._anchorLinePoint === null) {
                this._anchorLinePoint = position.copy();
                this._stage = 1;
            } else if (this._firstLinePoint === null) {
                if (position.equals(this._anchorLinePoint)) {
                    return false;
                }
                this._firstLinePoint = position.copy();
                this._stage = 2;
            } else {
                if (
                    position.equals(this._anchorLinePoint) ||
                    position.equals(this._firstLinePoint)
                ) {
                    return false;
                }
                const line1 = Point3.subtract(this._firstLinePoint, this._anchorLinePoint);
                const line2 = Point3.subtract(position, this._anchorLinePoint);
                const angle = Util.computeAngleBetweenVector(line1, line2);
                if (angle === 0 || angle === 180) return false;

                this._secondLinePoint = position.copy();
                this.setMeasurementText(`${angle.toFixed(2)}\u00B0`);
                this._measurementValue = angle;
                this._finalized = true;
                this._stage = 3;
            }

            this.draw();
            return true;
        }

        public setSelectionPosition(selectionPosition: Point3 | null): void {
            this._selectionPosition = selectionPosition;
        }

        public getLineGeometryShape() : Shape.Polyline {
            return this._lineGeometryShape;
        }

        private _drawPreviewLine(anchorPoint: Point3, firstPoint: Point3): void {
            const renderer = this._viewer.markupManager.getRenderer();
            const view = this._viewer.view;

            const projectedAnchorPoint = Point2.fromPoint3(view.projectPoint(anchorPoint));
            const projectedFirstPoint = Point2.fromPoint3(view.projectPoint(firstPoint));

            const firstLine = new Shape.Line(projectedAnchorPoint, projectedFirstPoint);
            renderer.drawLine(firstLine);
        }

        private _drawAngleMarkup(
            anchorPoint: Point3,
            firstPoint: Point3,
            secondPoint: Point3,
        ): void {
            const renderer = this._viewer.markupManager.getRenderer();
            const view = this._viewer.view;

            const line1 = Point3.subtract(firstPoint, anchorPoint);
            const line2 = Point3.subtract(secondPoint, anchorPoint);
            const axis = Point3.cross(line1, line2).normalize();
            const angle = Util.computeAngleBetweenVector(line1, line2);
            if (angle !== 0 && angle !== 180 && !isNaN(angle)) {
                const arcPoints = Util.generateArcPoints(axis, -angle, anchorPoint, line2, 30);
                this._lineGeometryShape.clearPoints();
                for (const point of arcPoints) {
                    this._lineGeometryShape.pushPoint(Point2.fromPoint3(view.projectPoint(point)));
                }
                renderer.drawPolyline(this._lineGeometryShape);
            }

            const secondLineLength = line2.length();
            const firstLinePoint = Point3.add(
                anchorPoint,
                line1.copy().normalize().scale(secondLineLength),
            );

            const projectedAnchorPoint = Point2.fromPoint3(view.projectPoint(anchorPoint));
            const projectedFirstPoint = Point2.fromPoint3(view.projectPoint(firstLinePoint));
            const projectedSecondPoint = Point2.fromPoint3(view.projectPoint(secondPoint));

            const firstLine = new Shape.Line(projectedAnchorPoint, projectedFirstPoint);
            renderer.drawLine(firstLine);

            const secondLine = new Shape.Line(projectedAnchorPoint, projectedSecondPoint);
            renderer.drawLine(secondLine);

            this._textShape.setPosition(projectedFirstPoint);
            if (this._finalized) {
                this._textShape.setTextString(this.getMeasurementText());
            } else if (isNaN(angle)) {
                this._textShape.setTextString("0\u00B0");
            } else {
                this._textShape.setTextString(`${angle.toFixed(2)}\u00B0`);
            }
            renderer.drawTextBox(this._textShape);
        }

        public draw(): void {
            if (!this._visibility) return;

            if (this._anchorLinePoint === null) return;

            // check if behind view
            const projectedAnchorPoint = this._viewer.view.projectPoint(this._anchorLinePoint);
            if (projectedAnchorPoint.z <= 0.0) {
                return;
            }

            if (this._stage === 1) {
                // first point placed
                if (this._selectionPosition === null) return;
                this._drawPreviewLine(this._anchorLinePoint, this._selectionPosition);
            } else if (this._stage === 2) {
                // second point placed
                if (this._firstLinePoint === null || this._selectionPosition === null) return;
                this._drawAngleMarkup(
                    this._anchorLinePoint,
                    this._firstLinePoint,
                    this._selectionPosition,
                );
            } else if (this._stage === 3) {
                // third point placed, markup final
                if (this._firstLinePoint == null || this._secondLinePoint == null) return;
                this._drawAngleMarkup(
                    this._anchorLinePoint,
                    this._firstLinePoint,
                    this._secondLinePoint,
                );
            }
        }

        // serialization methods

        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        public toJson(): Object {
            return this._toJson();
        }

        private _toJson() {
            return {
                name: this._name,
                anchorPoint: this._anchorLinePoint!.copy(),
                firstPoint: this._firstLinePoint!.copy(),
                secondPoint: this._secondLinePoint!.copy(),
                measurementValue: this._measurementValue,
                measurementText: this.getMeasurementText(),
                className: this.getClassName(),
            };
        }

        /**
         * Creates a new [[MeasurePointPointDistanceMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): MeasureLineLineAngleMarkup {
            const obj = objData as ReturnType<MeasureLineLineAngleMarkup["_toJson"]>;

            const measurement = new MeasureLineLineAngleMarkup(viewer);

            measurement._name = obj.name;
            measurement._anchorLinePoint = Point3.fromJson(obj.anchorPoint);
            measurement._firstLinePoint = Point3.fromJson(obj.firstPoint);
            measurement._secondLinePoint = Point3.fromJson(obj.secondPoint);
            measurement._measurementValue = obj.measurementValue;
            measurement.setMeasurementText(obj.measurementText);

            measurement._finalized = true;
            measurement._stage = 3;
            return measurement;
        }

        public getClassName(): string {
            return "Communicator.Markup.Measure.MeasureLineLineAngleMarkup";
        }
    }
}
