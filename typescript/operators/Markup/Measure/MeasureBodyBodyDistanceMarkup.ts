/// <reference path="MeasureMarkup.ts"/>

namespace Communicator.Markup.Measure {
    /** @hidden */
    export class MeasureBodyBodyDistanceMarkup extends MeasureMarkup {
        private _firstNode: NodeId | null = null;
        private _firstPointShape = new Shape.Circle();
        private _secondPointShape = new Shape.Circle();
        private _arrowsInvert = false;

        private _measurePoint1: Point3 | null = null;
        private _measurePoint2: Point3 | null = null;
        private _leaderPoint1: Point3 | null = null;
        private _leaderPoint2: Point3 | null = null;
        private _textPoint: Point3 | null = null;

        private initCircle(circle: Shape.Circle) {
            circle.setRadius(2.5);
            circle.setFillColor(this._viewer.measureManager.getMeasurementColor());
        }

        public constructor(viewer: WebViewer) {
            super(viewer);

            this._name = "MeasureBodyBodyDistance";
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

        public setFirstNode(node: NodeId): void {
            this._stage = 1;
            this._firstNode = node;
        }

        public getFirstNode(): NodeId | null {
            return this._firstNode;
        }

        public async setSecondNode(node: NodeId): Promise<void> {
            if (this._firstNode === null) {
                return;
            }

            this._stage = 2;

            const distanceInfo = await this._viewer.model.computeMinimumBodyBodyDistance(
                this._firstNode,
                node,
            );
            this._measurePoint1 = distanceInfo.pos1.copy();
            this._measurePoint2 = distanceInfo.pos2.copy();
            this._textPoint = distanceInfo.pos2.copy();

            this._setMeasurementValue(distanceInfo.distance);
        }

        public _getStage(): number {
            return this._stage;
        }

        public finalize(): void {
            this._stage++;
        }

        // adjusts the position of the measurement just before it's finalized
        public adjust(position: Point2): void {
            super.adjust(position);

            if (this._stage < 2) {
                return;
            }

            const viewRay = this._viewer.view.raycastFromPoint(position);
            if (
                viewRay === null ||
                this._measurePoint1 === null ||
                this._measurePoint2 === null ||
                this._textPoint == null
            ) {
                return;
            }

            let positionDiff = new Point3(1, 0, 0);
            if (!this._measurePoint2.equals(this._measurePoint1))
                positionDiff = Point3.subtract(this._measurePoint2, this._measurePoint1);

            const camera = this._viewer.view.getCamera();
            const cameraUp = camera.getUp();

            const viewRayLeft = Point3.cross(viewRay.direction, cameraUp).normalize();

            const center = new Point3(
                (this._measurePoint1.x + this._measurePoint2.x) / 2,
                (this._measurePoint1.y + this._measurePoint2.y) / 2,
                (this._measurePoint1.z + this._measurePoint2.z) / 2,
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

            this._textPoint.assign(planeIntersectionPoint);

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
                this._measurePoint1.x + axisPoint2.x,
                this._measurePoint1.y + axisPoint2.y,
                this._measurePoint1.z + axisPoint2.z,
            );
            axisPoint3.set(
                this._measurePoint1.x + axisPoint3.x,
                this._measurePoint1.y + axisPoint3.y,
                this._measurePoint1.z + axisPoint3.z,
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
                this._measurePoint1,
                axisPoint2,
                axisPoint3,
                planeIntersectionPoint,
            );
            const validIntersection =
                !isNaN(planeIntersectionPoint.x) &&
                !isNaN(planeIntersectionPoint.y) &&
                !isNaN(planeIntersectionPoint.z);
            if (!doesIntersect || !validIntersection) {
                planeIntersectionPoint = this._measurePoint2.copy();
            }

            const delta = Point3.subtract(planeIntersectionPoint, this._measurePoint1);

            this._leaderPoint1 = new Point3(
                this._measurePoint1.x + delta.x,
                this._measurePoint1.y + delta.y,
                this._measurePoint1.z + delta.z,
            );
            this._leaderPoint2 = new Point3(
                this._measurePoint2.x + delta.x,
                this._measurePoint2.y + delta.y,
                this._measurePoint2.z + delta.z,
            );

            this._updateArrowsInverted();

            this._viewer.markupManager.refreshMarkup();
        }

        private _updateArrowsInverted(): void {
            if (
                this._leaderPoint1 === null ||
                this._leaderPoint2 === null ||
                this._textPoint === null
            ) {
                return;
            }

            const d1 = new Point3(
                (this._leaderPoint1.x + this._leaderPoint2.x) / 2.0,
                (this._leaderPoint1.y + this._leaderPoint2.y) / 2.0,
                (this._leaderPoint1.z + this._leaderPoint2.z) / 2.0,
            );

            const d2 = Point3.subtract(this._leaderPoint2, this._leaderPoint1);

            const d3 = Point3.subtract(this._textPoint, d1);

            if (d3.length() * 2.0 > d2.length()) this._arrowsInvert = true;
            else this._arrowsInvert = false;
        }

        // Called as part of drawing the markup. Sets line positions and determines if the markup is in view
        public update(): void {
            super.update();

            if (this._stage <= 1) {
                return;
            }

            const view = this._viewer.view;
            this._behindView = false;

            const projectPoint = (point: Point3 | null): Point2 => {
                if (point === null) {
                    return Point2.zero();
                }

                const projectedPoint = view.projectPoint(point);
                if (projectedPoint.z <= 0.0) {
                    this._behindView = true;
                }

                return Point2.fromPoint3(projectedPoint);
            };

            const projectedMeasurePoint1 = projectPoint(this._measurePoint1);
            const projectedMeasurePoint2 = projectPoint(this._measurePoint2);
            const projectedTextPoint = projectPoint(this._textPoint);
            const projectedLeaderPoint1 = projectPoint(this._leaderPoint1);
            const projectedLeaderPoint2 = projectPoint(this._leaderPoint2);

            this._firstPointShape.setCenter(projectedMeasurePoint1);

            if (this._textShape) this._textShape.setPosition(projectedTextPoint);

            this._secondPointShape.setCenter(projectedMeasurePoint2);
            this._lineShapes[0].set(projectedMeasurePoint1, projectedMeasurePoint2);
            this._lineShapes[1].set(projectedLeaderPoint1, projectedLeaderPoint2);
            this._lineShapes[2].set(projectedMeasurePoint1, projectedLeaderPoint1);
            this._lineShapes[3].set(projectedMeasurePoint2, projectedLeaderPoint2);
            this._lineShapes[4].set(projectedLeaderPoint1, projectedTextPoint);
            this._lineShapes[5].set(projectedLeaderPoint1, projectedLeaderPoint2);
            this._lineShapes[5].setEndcapType(Shape.EndcapType.Arrowhead);
            this._lineShapes[5].setStartEndcapType(Shape.EndcapType.Arrowhead);
            this._lineShapes[5].setEndcapsInverted(this._arrowsInvert);
        }

        public draw(): void {
            // do not draw if the markup is hidden or the model is exploded
            if (!this._visibility || this._viewer.explodeManager.getMagnitude() !== 0) {
                return;
            }
            this.update();

            if (this._behindView) {
                return;
            }

            const renderer = this._viewer.markupManager.getRenderer();

            if (this._stage === 2 || this._stage === 3) {
                renderer.drawCircle(this._firstPointShape);
                renderer.drawCircle(this._secondPointShape);
                for (const shape of this._lineShapes) renderer.drawLine(shape);
                renderer.drawTextBox(this._textShape);
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
                measurePoint1: this._measurePoint1,
                measurePoint2: this._measurePoint2,
                leaderPoint1: this._leaderPoint1,
                leaderPoint2: this._leaderPoint2,
                textPoint: this._textPoint,
                text: this._textShape.getTextString(),
                measurementValue: this._measurementValue,
                unitMultiplier: this._unitMultiplier,
                className: this.getClassName(),
            };
        }

        /**
         * Creates a new [[MeasureBodyBodyDistanceMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): MeasureBodyBodyDistanceMarkup {
            const obj = objData as ReturnType<MeasureBodyBodyDistanceMarkup["_toJson"]>;

            const measurement = new MeasureBodyBodyDistanceMarkup(viewer);

            measurement._name = obj.name;

            measurement._measurePoint1 = Point3.fromJson(obj.measurePoint1);
            measurement._measurePoint2 = Point3.fromJson(obj.measurePoint2);
            measurement._textPoint = Point3.fromJson(obj.textPoint);
            measurement._textShape.setTextString(obj.text);
            measurement._leaderPoint1 = Point3.fromJson(obj.leaderPoint1);
            measurement._leaderPoint2 = Point3.fromJson(obj.leaderPoint2);

            measurement._measurementValue = obj.measurementValue;
            measurement._unitMultiplier = obj.unitMultiplier || 1;

            measurement._updateArrowsInverted();
            measurement._stage = 2;
            return measurement;
        }

        public getClassName(): string {
            return "Communicator.Markup.Measure.MeasureBodyBodyDistanceMarkup";
        }
    }
}
