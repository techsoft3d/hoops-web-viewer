/// <reference path="MeasureMarkup.ts"/>

namespace Communicator.Markup.Measure {
    const ArcSegmentCount = 30;

    /** @hidden */
    export class MeasureFaceFaceAngleMarkup extends MeasureMarkup {
        private _faceSelection: Selection.FaceSelectionItem[] = [];

        private _arcArray: Point3[] = [];
        private _lineGeometryShape = new Shape.Polyline();
        private planeIntersectionLine: Point3[] = [];
        private _pointOnLine = Point3.zero();
        private _clickpointOriginal2 = Point3.zero();
        private _clickpointOriginal1 = Point3.zero();

        private _plane1 = new Plane();
        private _plane2 = new Plane();

        private _secondPoint = Point3.zero();
        private _firstPoint = Point3.zero();
        private _textPos = Point3.zero();
        private _intermediatePoint = Point3.zero();
        private _textAnchorPoint = Point3.zero();
        private _angle = 0;

        private _useAuthoredNormals: boolean = true;

        public constructor(viewer: WebViewer) {
            super(viewer);

            this._name = "MeasureFaceFaceAngle";

            const measureManager = this._viewer.measureManager;
            const measurementColor = measureManager.getMeasurementColor();

            this._lineGeometryShape.setStrokeWidth(2);
            this._lineGeometryShape.setStrokeColor(measurementColor);
            this._lineGeometryShape.setEndEndcapColor(measurementColor);
            this._lineGeometryShape.setStartEndcapColor(measurementColor);

            this._textShape = new Shape.TextBox();

            this._textShape.getBoxPortion().setFillOpacity(1);
            this._textShape.getBoxPortion().setFillColor(new Color(255, 255, 255));

            for (let i = 0; i < 5; i++) {
                this._lineShapes.push(new Shape.Line());
                this._lineShapes[i].setStrokeColor(measurementColor);
                this._lineShapes[i].setEndEndcapColor(measurementColor);
                this._lineShapes[i].setStartEndcapColor(measurementColor);
            }
        }

        private async _getNormalAndPositionFromSelection(
            sr: Selection.FaceSelectionItem,
            normal: Point3,
            position: Point3,
        ): Promise<void> {
            const nodeId = sr.getNodeId();
            const faceIndex = sr.getFaceEntity().getCadFaceIndex();

            // Note that we get the normal from the authored data but we simply use the selection
            // point for the position. We don't need the authored position to make sure the measurements
            // are accurate.
            position.assign(sr.getPosition().copy());
            normal.assign(sr.getFaceEntity().getNormal());
            const authoredFaceData = await this._viewer.model.getFaceProperty(nodeId, faceIndex);
            if (
                this._useAuthoredNormals &&
                authoredFaceData !== null &&
                authoredFaceData instanceof SubentityProperties.PlaneElement
            ) {
                const netM = this._viewer.model.getNodeNetMatrix(nodeId);
                const normalNetM = netM.normalMatrix();
                if (normalNetM !== null) {
                    normalNetM.transform(authoredFaceData.normal, normal);
                }
            }
        }

        public getFirstSelection(): Selection.FaceSelectionItem {
            return this._faceSelection[0];
        }

        public async setFirstFace(sr: Selection.FaceSelectionItem): Promise<void> {
            const nodeId = sr.getNodeId();
            const faceIndex = sr.getFaceEntity().getCadFaceIndex();
            this._viewer.model.setNodeFaceColor(nodeId, faceIndex, new Color(255, 0, 0));
            this._faceSelection.push(sr);

            const normal = Point3.zero();
            const position = Point3.zero();
            await this._getNormalAndPositionFromSelection(sr, normal, position);

            this._firstPoint = position.copy();
            this._plane1.setFromPointAndNormal(this._firstPoint, normal);
            this._clickpointOriginal1 = sr.getPosition().copy();

            this._stage++;
        }

        public async setSecondFace(sr: Selection.FaceSelectionItem): Promise<boolean> {
            const nodeId = sr.getNodeId();
            const faceIndex = sr.getFaceEntity().getCadFaceIndex();
            this._faceSelection[1] = sr;

            this._viewer.model.setNodeFaceColor(nodeId, faceIndex, new Color(255, 0, 0));

            const position = Point3.zero();
            const normal = Point3.zero();
            await this._getNormalAndPositionFromSelection(sr, normal, position);

            this._secondPoint = position.copy();
            this._plane2.setFromPointAndNormal(this._secondPoint, normal);

            this.planeIntersectionLine[0] = new Point3(0, 0, 0);
            this.planeIntersectionLine[1] = new Point3(0, 0, 0);

            const res = Util.intersect3d2Planes(
                this._plane1,
                this._firstPoint,
                this._plane2,
                this._secondPoint,
                this.planeIntersectionLine[0],
                this.planeIntersectionLine[1],
            );

            if (res !== 2) return false;

            const delta = Point3.subtract(
                this.planeIntersectionLine[1],
                this.planeIntersectionLine[0],
            );
            delta.normalize();

            this.planeIntersectionLine[0].set(
                this.planeIntersectionLine[0].x - delta.x * 100,
                this.planeIntersectionLine[0].y - delta.y * 100,
                this.planeIntersectionLine[0].z - delta.z * 100,
            );

            this.planeIntersectionLine[1].set(
                this.planeIntersectionLine[1].x + delta.x * 100,
                this.planeIntersectionLine[1].y + delta.y * 100,
                this.planeIntersectionLine[1].z + delta.z * 100,
            );

            Util.computePointToLineDistance(
                this._secondPoint,
                this.planeIntersectionLine[0],
                this.planeIntersectionLine[1],
                this._pointOnLine,
            );

            const templine = new Point3(0, 0, 0);
            const newpoint = new Point3(0, 0, 0);
            templine.set(
                this._firstPoint.x + delta.x,
                this._firstPoint.y + delta.y,
                this._firstPoint.z + delta.z,
            );
            Util.computePointToLineDistance(
                this._pointOnLine,
                this._firstPoint,
                templine,
                newpoint,
            );

            this._firstPoint = newpoint.copy();

            this._clickpointOriginal2 = sr.getPosition().copy();

            // computeOffaxisRotation (delta,ang,m)
            const m = new Matrix();

            const delta2 = Point3.subtract(this._secondPoint, this._pointOnLine);
            const rlength = delta2.length();

            const dx = Point3.subtract(this._firstPoint, this._pointOnLine);
            dx.normalize();
            this._intermediatePoint.set(
                this._pointOnLine.x + dx.x * rlength,
                this._pointOnLine.y + dx.y * rlength,
                this._pointOnLine.z + dx.z * rlength,
            );

            this._angle = Util.computeAngleBetweenVector(delta2, dx);
            if (this._angle === 0) return false;

            this._measurementValue = this._angle;
            this._textShape.setTextString(`${this._measurementValue.toFixed(2)}\u00B0`);
            this._viewer.trigger("measurementValueSet", this);

            //this.setMeasurementText();
            this._textPos = this._pointOnLine.copy();

            let neg = false;
            let temp = new Point3(0, 0, 0);
            const np = new Point3(0, 0, 0);

            Util.computeOffaxisRotation(delta, 1, m);
            m.transform(delta2, np);
            temp.set(
                np.x + this._pointOnLine.x,
                np.y + this._pointOnLine.y,
                np.z + this._pointOnLine.z,
            );
            temp = Point3.subtract(temp, this._firstPoint);
            const l1 = temp.length();

            Util.computeOffaxisRotation(delta, -1, m);
            m.transform(delta2, np);
            temp.set(
                np.x + this._pointOnLine.x,
                np.y + this._pointOnLine.y,
                np.z + this._pointOnLine.z,
            );
            Point3.subtract(temp, this._firstPoint);
            const l2 = temp.length();
            if (l2 < l1) neg = true;

            this._arcArray = Util.generateArcPoints(
                delta,
                neg ? -this._angle : this._angle,
                this._pointOnLine,
                delta2,
                ArcSegmentCount,
            );

            this._stage++;
            return true;
        }

        public adjust(position: Point2): void {
            super.adjust(position);

            if (this._stage <= 1) return;

            const viewRay = this._viewer.view.raycastFromPoint(position);
            if (viewRay === null) {
                return;
            }

            const sr2 = new Point3(
                viewRay.origin.x + viewRay.direction.x * 1000000,
                viewRay.origin.y + viewRay.direction.y * 1000000,
                viewRay.origin.z + viewRay.direction.z * 1000000,
            );

            const res = new Point3(0, 0, 0);

            Util.intersectionPlaneLine(
                viewRay.origin,
                sr2,
                this._pointOnLine,
                this._firstPoint,
                this._secondPoint,
                res,
            );

            this._textPos = res.copy();

            let delta = new Point3(0, 0, 0);
            delta = Point3.subtract(res, this._pointOnLine);

            const l = delta.length();

            delta = Point3.subtract(this._secondPoint, this._pointOnLine);
            delta.normalize();

            this._secondPoint.set(
                this._pointOnLine.x + delta.x * l,
                this._pointOnLine.y + delta.y * l,
                this._pointOnLine.z + delta.z * l,
            );

            const iv = Point3.subtract(
                this.planeIntersectionLine[1],
                this.planeIntersectionLine[0],
            );
            iv.normalize();

            const m = new Matrix();

            //   var ang = ComputeAngleBetweenVector(this.plane1.n, this.plane2.n);
            const delta2 = Point3.subtract(this._secondPoint, this._pointOnLine);

            const rlength = delta2.length();

            const dx = Point3.subtract(this._firstPoint, this._pointOnLine);
            dx.normalize();
            this._intermediatePoint.set(
                this._pointOnLine.x + dx.x * rlength,
                this._pointOnLine.y + dx.y * rlength,
                this._pointOnLine.z + dx.z * rlength,
            );

            let neg = false;
            let temp = new Point3(0, 0, 0);
            const np = new Point3(0, 0, 0);

            Util.computeOffaxisRotation(iv, 1, m);
            m.transform(delta2, np);
            temp.set(
                np.x + this._pointOnLine.x,
                np.y + this._pointOnLine.y,
                np.z + this._pointOnLine.z,
            );
            temp = Point3.subtract(temp, this._firstPoint);
            const l1 = temp.length();

            Util.computeOffaxisRotation(iv, -1, m);
            m.transform(delta2, np);
            temp.set(
                np.x + this._pointOnLine.x,
                np.y + this._pointOnLine.y,
                np.z + this._pointOnLine.z,
            );
            temp = Point3.subtract(temp, this._firstPoint);
            const l2 = temp.length();
            if (l2 < l1) neg = true;

            this._arcArray = Util.generateArcPoints(
                iv,
                neg ? -this._angle : this._angle,
                this._pointOnLine,
                delta2,
                ArcSegmentCount,
            );

            // record the smallest distance from any of the arc points to see if the text box is on it
            let smallestScreenPosDiff: number | undefined;
            const textScreenPt: Point3 = this._viewer.view.projectPoint(this._textPos);

            for (const pt of this._arcArray) {
                const screenPos = this._viewer.view.projectPoint(pt);
                const diff = new Point3(
                    textScreenPt.x - screenPos.x,
                    textScreenPt.y - screenPos.y,
                    textScreenPt.z - screenPos.z,
                );
                const length: number = diff.length();
                if (smallestScreenPosDiff === undefined || smallestScreenPosDiff > length)
                    smallestScreenPosDiff = length;
            }

            // set text anchor
            if (smallestScreenPosDiff === undefined || smallestScreenPosDiff <= 20.0) {
                // on the arc, don't draw line
                this._textAnchorPoint = this._textPos;
            } else {
                // pick the closest projected screen space point to the text box for the line
                const screenPt0 = this._viewer.view.projectPoint(this._intermediatePoint);
                const screenPt1 = this._viewer.view.projectPoint(this._secondPoint);
                const diff0 = new Point3(
                    screenPt0.x - textScreenPt.x,
                    screenPt0.y - textScreenPt.y,
                    screenPt0.z - textScreenPt.z,
                );
                const diff1 = new Point3(
                    screenPt1.x - textScreenPt.x,
                    screenPt1.y - textScreenPt.y,
                    screenPt1.z - textScreenPt.z,
                );

                const length0: number = diff0.length();
                const length1: number = diff1.length();

                if (length0 < length1) {
                    this._textAnchorPoint = this._intermediatePoint;
                } else {
                    this._textAnchorPoint = this._secondPoint;
                }
            }
        }

        public _nextStage(): void {
            this._stage++;
            if (this._stage > 2) {
                this._finalized = true;
                this.cleanup();
            }
        }

        public cleanup(): void {
            const cleanupFace = (index: number) => {
                const face = this._faceSelection[index];
                this._viewer.model.unsetNodeFaceColor(
                    face.getNodeId(),
                    face.getFaceEntity().getCadFaceIndex(),
                );
            };

            if (this._stage >= 2) cleanupFace(1);

            if (this._stage >= 1) cleanupFace(0);
        }

        public update(): void {
            super.update();

            const view = this._viewer.view;

            if (this._stage > 1) {
                this._lineGeometryShape.clearPoints();

                for (const point of this._arcArray) {
                    this._lineGeometryShape.pushPoint(Point2.fromPoint3(view.projectPoint(point)));
                }

                this._lineGeometryShape.setEndcapType(Shape.EndcapType.Arrowhead);
                this._lineGeometryShape.setStartEndcapType(Shape.EndcapType.Arrowhead);
                this._lineGeometryShape.setEndEndcapSize(5);
                this._lineGeometryShape.setStartEndcapSize(5);

                const projectedPosition3 = new Array<Point3>(10);
                projectedPosition3[0] = view.projectPoint(this._textPos);
                projectedPosition3[1] = view.projectPoint(this._firstPoint);
                projectedPosition3[2] = view.projectPoint(this._clickpointOriginal1);
                projectedPosition3[3] = view.projectPoint(this._secondPoint);
                projectedPosition3[4] = view.projectPoint(this._clickpointOriginal2);
                projectedPosition3[5] = view.projectPoint(this._intermediatePoint);
                projectedPosition3[6] = view.projectPoint(this._textAnchorPoint);

                this._behindView = false;
                const projectedPosition = new Array<Point2>(10);
                for (let i = 0; i <= 6; i++) {
                    if (projectedPosition3[i].z <= 0.0) {
                        this._behindView = true;
                    }
                    projectedPosition[i] = Point2.fromPoint3(projectedPosition3[i]);
                }

                if (this._textShape) this._textShape.setPosition(projectedPosition[0]);

                this._lineShapes[0].set(projectedPosition[1], projectedPosition[2]);
                this._lineShapes[1].set(projectedPosition[1], projectedPosition[5]);
                this._lineShapes[2].set(projectedPosition[3], projectedPosition[4]);
                this._lineShapes[3].set(projectedPosition[6], projectedPosition[0]);
            }
        }

        public draw(): void {
            const exploded = this._viewer.explodeManager.getMagnitude() !== 0;

            // do not draw if the markup is hidden, the markup is behind the view point, or the model is exploded
            if (!this._visibility || exploded) {
                return;
            } else {
                this.update();

                if (this._behindView) {
                    return;
                }
            }

            // only render for stage 2,3,4
            if (this._stage >= 2 && this._stage <= 4) {
                const renderer = this._viewer.markupManager.getRenderer();
                for (let i = 0; i < 4; i++) {
                    renderer.drawLine(this._lineShapes[i]);
                }
                renderer.drawTextBox(this._textShape);
                renderer.drawPolyline(this._lineGeometryShape);
            }
        }

        /**
         * Sets whether created markup will use authored normals or use selection results to calculate angles
         * @param use
         */
        public setUseAuthoredNormals(use: boolean): void {
            this._useAuthoredNormals = use;
        }

        /**
         * Gets whether created markup will use authored normals or use selection results to calculate angles
         */
        public getUseAuthoredNormals(): boolean {
            return this._useAuthoredNormals;
        }

        // selection methods

        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        public toJson(): Object {
            return this._toJson();
        }

        private _toJson() {
            const arcArray: Object[] = [];

            for (const point of this._arcArray) {
                const arc = point.toJson();
                arcArray.push(arc);
            }

            return {
                text: this._textShape.getTextString(),
                textPos: this._textPos.toJson(),
                arcArray: arcArray,
                firstPoint: this._firstPoint.toJson(),
                clickpointOriginal1: this._clickpointOriginal1.toJson(),
                secondPoint: this._secondPoint.toJson(),
                clickpointOriginal2: this._clickpointOriginal2.toJson(),
                intermediatePoint: this._intermediatePoint.toJson(),
                textAnchorPoint: this._textAnchorPoint.toJson(),
                measurementValue: this._measurementValue,
                className: this.getClassName(),
            };
        }

        /** @deprecated Use [[toJson]] instead. */
        public forJson(): Object {
            return this.toJson();
        }

        /**
         * Creates a new [[MeasureFaceFaceAngleMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): MeasureFaceFaceAngleMarkup {
            const obj = objData as ReturnType<MeasureFaceFaceAngleMarkup["_toJson"]>;

            const measurement = new MeasureFaceFaceAngleMarkup(viewer);

            for (const arc of obj.arcArray) {
                const point = Point3.fromJson(arc);
                measurement._arcArray.push(point);
            }

            measurement._textShape.setTextString(obj.text);
            measurement._textPos.assign(Point3.fromJson(obj.textPos));
            measurement._firstPoint.assign(Point3.fromJson(obj.firstPoint));
            measurement._clickpointOriginal1 = Point3.fromJson(obj.clickpointOriginal1);
            measurement._secondPoint.assign(Point3.fromJson(obj.secondPoint));
            measurement._clickpointOriginal2 = Point3.fromJson(obj.clickpointOriginal2);
            measurement._intermediatePoint.assign(Point3.fromJson(obj.intermediatePoint));
            measurement._textAnchorPoint.assign(Point3.fromJson(obj.textAnchorPoint));
            measurement._measurementValue = obj.measurementValue;

            measurement._stage = 3;

            return measurement;
        }

        /** @deprecated Use [[fromJson]] instead. */
        public static construct(obj: any, viewer: WebViewer): MeasureFaceFaceAngleMarkup {
            return MeasureFaceFaceAngleMarkup.fromJson(obj, viewer);
        }

        // serialization methods
        public getClassName(): string {
            return "Communicator.Markup.Measure.MeasureFaceFaceAngleMarkup";
        }
    }
}
