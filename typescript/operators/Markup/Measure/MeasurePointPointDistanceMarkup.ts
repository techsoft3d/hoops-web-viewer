/// <reference path="MeasureMarkup.ts"/>

namespace Communicator.Markup.Measure {
    /** @hidden */
    export class MeasurePointPointDistanceMarkup extends MeasureMarkup {
        private _firstPointShape = new Shape.Circle();
        private _secondPointShape = new Shape.Circle();
        private _arrowsInvert = false;

        private initCircle(circle: Shape.Circle) {
            circle.setRadius(2.5);
            circle.setFillColor(this._viewer.measureManager.getMeasurementColor());
        }

        public constructor(viewer: WebViewer) {
            super(viewer);

            this._name = "MeasurePointPointDistance";
            this._lineShapes = [];
            for (let i = 0; i < 6; i++) {
                this._lineShapes.push(new Shape.Line());
                this._lineShapes[i].setStrokeColor(
                    this._viewer.measureManager.getMeasurementColor(),
                );
                this._lineShapes[i].setEndEndcapColor(
                    this._viewer.measureManager.getMeasurementColor(),
                );
                this._lineShapes[i].setStartEndcapColor(
                    this._viewer.measureManager.getMeasurementColor(),
                );
            }
            this._viewer = viewer;

            this.initCircle(this._firstPointShape);
            this.initCircle(this._secondPointShape);

            this._textShape = new Shape.TextBox();
            this._textShape.getBoxPortion().setFillOpacity(1);
            this._textShape.getBoxPortion().setFillColor(new Color(255, 255, 255));
        }

        public setUnitMultiplier(value: number): void {
            this._unitMultiplier = value;
        }

        public setFirstPointPosition(position: Point3): void {
            this._stage = 1;
            this._positions[0] = position.copy();
        }

        public setSecondPointPosition(position: Point3): void {
            this._stage = 2;
            this._positions[1] = position.copy();
            this._positions[2] = position.copy();

            this._setMeasurementValue(
                Point3.subtract(this._positions[1], this._positions[0]).length(),
            );
        }

        public _getStage(): number {
            return this._stage;
        }

        public finalize(): void {
            this._stage++;
        }

        public getFirstPointPosition(): Point3 {
            return this._positions[0];
        }

        public getSecondPointPosition(): Point3 {
            return this._positions[1];
        }

        public adjust(position: Point2): void {
            super.adjust(position);

            const viewRay = this._viewer.view.raycastFromPoint(position);
            if (viewRay === null) {
                return;
            }

            const position1 = this._positions[0];
            const position2 = this._positions[1];

            let positionDiff = new Point3(1, 0, 0);
            if (!position2.equals(position1)) positionDiff = Point3.subtract(position2, position1);

            const camera = this._viewer.view.getCamera();
            const cameraUp = camera.getUp();

            const viewRayLeft = Point3.cross(viewRay.direction, cameraUp).normalize();

            const center = new Point3(
                (position1.x + position2.x) / 2,
                (position1.y + position2.y) / 2,
                (position1.z + position2.z) / 2,
            );

            const upPoint = new Point3(
                center.x + cameraUp.x,
                center.y + cameraUp.y,
                center.z + cameraUp.z,
            );
            const leftPoint = new Point3(
                center.x + viewRayLeft.x,
                center.y + viewRayLeft.y,
                center.z + viewRayLeft.z,
            );

            const distantViewRayPoint = new Point3(
                viewRay.origin.x + viewRay.direction.x * 1000000,
                viewRay.origin.y + viewRay.direction.y * 1000000,
                viewRay.origin.z + viewRay.direction.z * 1000000,
            );

            let planeIntersectionPoint = new Point3(0, 0, 0);

            Util.intersectionPlaneLine(
                viewRay.origin,
                distantViewRayPoint,
                center,
                upPoint,
                leftPoint,
                planeIntersectionPoint,
            );

            this._positions[2].assign(planeIntersectionPoint);

            let axisPoint1 = new Point3(0, 0, 0);
            if (
                Math.abs(positionDiff.x) <= Math.abs(positionDiff.y) &&
                Math.abs(positionDiff.x) <= Math.abs(positionDiff.z)
            )
                axisPoint1 = new Point3(1, 0, 0);
            else if (
                Math.abs(positionDiff.y) <= Math.abs(positionDiff.x) &&
                Math.abs(positionDiff.y) <= Math.abs(positionDiff.z)
            )
                axisPoint1 = new Point3(0, 1, 0);
            else axisPoint1 = new Point3(0, 0, 1);

            const axisPoint2 = Point3.cross(axisPoint1, positionDiff);
            const axisPoint3 = Point3.cross(axisPoint2, positionDiff);

            axisPoint2.set(
                position1.x + axisPoint2.x,
                position1.y + axisPoint2.y,
                position1.z + axisPoint2.z,
            );
            axisPoint3.set(
                position1.x + axisPoint3.x,
                position1.y + axisPoint3.y,
                position1.z + axisPoint3.z,
            );

            const lineBegin = new Point3(
                planeIntersectionPoint.x + positionDiff.x * 10000,
                planeIntersectionPoint.y + positionDiff.y * 10000,
                planeIntersectionPoint.z + positionDiff.z * 10000,
            );

            const lineEnd = new Point3(
                planeIntersectionPoint.x - positionDiff.x * 10000,
                planeIntersectionPoint.y - positionDiff.y * 10000,
                planeIntersectionPoint.z - positionDiff.z * 10000,
            );

            const doesIntersect = Util.intersectionPlaneLine(
                lineBegin,
                lineEnd,
                position1,
                axisPoint2,
                axisPoint3,
                planeIntersectionPoint,
            );
            const validIntersection =
                !isNaN(planeIntersectionPoint.x) &&
                !isNaN(planeIntersectionPoint.y) &&
                !isNaN(planeIntersectionPoint.z);
            if (!doesIntersect || !validIntersection) {
                planeIntersectionPoint = position2.copy();
            }

            const delta = Point3.subtract(planeIntersectionPoint, position1);

            this._positions[3] = new Point3(
                position1.x + delta.x,
                position1.y + delta.y,
                position1.z + delta.z,
            );
            this._positions[4] = new Point3(
                position2.x + delta.x,
                position2.y + delta.y,
                position2.z + delta.z,
            );

            this._updateArrowsInverted();

            this._viewer.markupManager.refreshMarkup();
        }

        private _updateArrowsInverted(): void {
            const d1 = new Point3(
                (this._positions[3].x + this._positions[4].x) / 2.0,
                (this._positions[3].y + this._positions[4].y) / 2.0,
                (this._positions[3].z + this._positions[4].z) / 2.0,
            );

            const d2 = Point3.subtract(this._positions[4], this._positions[3]);

            const d3 = Point3.subtract(this._positions[2], d1);

            if (d3.length() * 2.0 > d2.length()) this._arrowsInvert = true;
            else this._arrowsInvert = false;
        }

        public update(): void {
            super.update();

            const view = this._viewer.view;
            const projectedPosition = new Array<Point2>(6);

            if (this._stage > 0) {
                this._behindView = false;
                for (let i = 0; i < this._positions.length; i++) {
                    const pt3: Point3 = view.projectPoint(this._positions[i]);
                    if (pt3.z <= 0.0) {
                        this._behindView = true;
                    }
                    projectedPosition[i] = Point2.fromPoint3(view.projectPoint(this._positions[i]));
                }

                this._firstPointShape.setCenter(projectedPosition[0]);
            }

            if (this._stage > 1) {
                if (this._textShape) this._textShape.setPosition(projectedPosition[2]);

                this._secondPointShape.setCenter(projectedPosition[1]);
                this._lineShapes[0].set(projectedPosition[0], projectedPosition[1]);
                this._lineShapes[1].set(projectedPosition[3], projectedPosition[4]);
                this._lineShapes[2].set(projectedPosition[0], projectedPosition[3]);
                this._lineShapes[3].set(projectedPosition[1], projectedPosition[4]);
                this._lineShapes[4].set(projectedPosition[3], projectedPosition[2]);
                this._lineShapes[5].set(projectedPosition[3], projectedPosition[4]);
                this._lineShapes[5].setEndcapType(Shape.EndcapType.Arrowhead);
                this._lineShapes[5].setStartEndcapType(Shape.EndcapType.Arrowhead);
                this._lineShapes[5].setEndcapsInverted(this._arrowsInvert);
            }
        }

        public draw(): void {
            // do not draw if the markup is hidden or the model is exploded
            if (this._visibility && this._viewer.explodeManager.getMagnitude() === 0) {
                this.update();

                // only draw when in view
                if (!this._behindView) {
                    const renderer = this._viewer.markupManager.getRenderer();

                    switch (this._stage) {
                        case 1:
                            renderer.drawCircle(this._firstPointShape);
                            break;
                        case 2:
                        case 3:
                            renderer.drawCircle(this._firstPointShape);
                            renderer.drawCircle(this._secondPointShape);
                            for (const shape of this._lineShapes) renderer.drawLine(shape);
                            renderer.drawTextBox(this._textShape);
                            break;
                    }
                }
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
                measurePoint1: this._positions[0].copy(),
                measurePoint2: this._positions[1].copy(),
                leaderPoint1: this._positions[3].copy(),
                leaderPoint2: this._positions[4].copy(),
                textPoint: this._positions[2].copy(),
                text: this._textShape.getTextString(),
                measurementValue: this._measurementValue,
                unitMultiplier: this._unitMultiplier,
                className: this.getClassName(),
            };
        }

        /** @deprecated Use [[toJson]] instead. */
        public forJson(): Object {
            return this.toJson();
        }

        /**
         * Creates a new [[MeasurePointPointDistanceMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): MeasurePointPointDistanceMarkup {
            const obj = objData as ReturnType<MeasurePointPointDistanceMarkup["_toJson"]>;

            const measurement = new MeasurePointPointDistanceMarkup(viewer);

            measurement._name = obj.name;

            measurement._positions[0] = Point3.fromJson(obj.measurePoint1);
            measurement._positions[1] = Point3.fromJson(obj.measurePoint2);
            measurement._positions[2] = Point3.fromJson(obj.textPoint);
            measurement._textShape.setTextString(obj.text);
            measurement._positions[3] = Point3.fromJson(obj.leaderPoint1);
            measurement._positions[4] = Point3.fromJson(obj.leaderPoint2);

            measurement._measurementValue = obj.measurementValue;
            measurement._unitMultiplier = obj.unitMultiplier || 1;

            measurement._updateArrowsInverted();
            measurement._stage = 2;
            return measurement;
        }

        /** @deprecated Use [[fromJson]] instead. */
        public static construct(obj: any, viewer: WebViewer): MeasurePointPointDistanceMarkup {
            return MeasurePointPointDistanceMarkup.fromJson(obj, viewer);
        }

        public getClassName(): string {
            return "Communicator.Markup.Measure.MeasurePointPointDistanceMarkup";
        }

        /**
         * Returns whether the measurement markup is valid.
         */
        public isMarkupValid(): Boolean {
            return this._positions.length >= 5;
        }
    }
}
