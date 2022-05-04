namespace Communicator.Markup.Measure {
    /** @hidden */
    export class MeasureFaceFaceDistanceMarkup extends MeasureMarkup {
        private _faceSelection: (Selection.FaceSelectionItem | undefined)[] = [];

        private _line1PreviewShape1 = new Shape.Line();
        private _line1PreviewShape2 = new Shape.Line();
        private _line2PreviewShape1 = new Shape.Line();
        private _line2PreviewShape2 = new Shape.Line();

        private _matrix1: Matrix = new Matrix();
        private _matrix2: Matrix = new Matrix();

        private _lineGeometryShape = new Shape.Polyline();
        private _parallelFaces = false;
        private _triangulatedDistance = true;
        private _pointsOnSameRay = false;

        private _arrowsInvert = false;

        private _faceData: (SubentityProperties.Base | undefined)[] = [];

        private _distance: number = 0;
        private _surfaceCenter: Point3[] = [Point3.zero(), Point3.zero()];
        private _surfaceAxis1: Point3[] = [Point3.zero(), Point3.zero()];
        private _surfaceAxis2: Point3[] = [Point3.zero(), Point3.zero()];
        private _cylinderAxisInfinite1: Point3[] = [Point3.zero(), Point3.zero()];
        private _cylinderAxisInfinite2: Point3[] = [Point3.zero(), Point3.zero()];

        private _secondPointInitial = Point3.zero();
        private _firstPointHelper = Point3.zero();
        private _secondPointHelper = Point3.zero();
        private _secondPoint = Point3.zero();
        private _firstPoint = Point3.zero();
        private _textPos = Point3.zero();

        public constructor(viewer: WebViewer) {
            super(viewer);

            this._name = "MeasureFaceFaceDistance";

            this._lineGeometryShape.setStrokeWidth(2);
            this._lineGeometryShape.setStrokeColor(
                this._viewer.measureManager.getMeasurementColor(),
            );

            this._textShape = new Shape.TextBox();

            this._textShape.getBoxPortion().setFillOpacity(1);
            this._textShape.getBoxPortion().setFillColor(new Color(255, 255, 255));

            const measureManager = this._viewer.measureManager;
            const measurementColor = measureManager.getMeasurementColor();

            for (let i = 0; i < 5; i++) {
                this._lineShapes.push(new Shape.Line());
                this._lineShapes[i].setStrokeColor(measurementColor);
                this._lineShapes[i].setEndEndcapColor(measurementColor);
                this._lineShapes[i].setStartEndcapColor(measurementColor);
            }
        }

        public setUnitMultiplier(value: number) {
            this._unitMultiplier = value;
        }

        public setFirstFace(
            sr: Selection.FaceSelectionItem,
            faceProperties: SubentityProperties.Base,
            matrix: Matrix,
            bbox: Box,
        ): void {
            const nodeId = sr.getNodeId();
            const faceEntity = sr.getFaceEntity();
            const position = sr.getPosition();

            this._matrix1 = matrix.copy();

            this._viewer.model.setNodeFaceColor(
                nodeId,
                faceEntity.getCadFaceIndex(),
                new Color(255, 0, 0),
            );
            this._faceSelection[0] = sr;

            this._firstPoint = position.copy();

            this._faceData[0] = faceProperties;

            if (this._faceData[0] instanceof SubentityProperties.PlaneElement) {
                const fp1 = this._faceData[0] as SubentityProperties.PlaneElement;
                const apoint = new Point3(
                    fp1.origin.x + fp1.normal.x,
                    fp1.origin.y + fp1.normal.y,
                    fp1.origin.z + fp1.normal.z,
                );
                this._matrix1.transform(apoint, this._surfaceAxis1[0]);
                this._matrix1.transform(fp1.origin, this._surfaceCenter[0]);
            } else if (this._faceData[0] instanceof SubentityProperties.CylinderElement) {
                this.createCylinderData(
                    this._faceData[0] as SubentityProperties.CylinderElement,
                    matrix,
                    bbox,
                );
            }

            this._stage++;
        }

        public getFirstSelection(): Selection.FaceSelectionItem | null {
            return this._faceSelection[0] || null;
        }

        public getFirstFaceData(): SubentityProperties.Base | null {
            return this._faceData[0] || null;
        }

        public cleanup(): void {
            const model = this._viewer.model;

            if (this._stage >= 2)
                model.unsetNodeFaceColor(
                    this._faceSelection[1]!.getNodeId(),
                    this._faceSelection[1]!.getFaceEntity().getCadFaceIndex(),
                );

            if (this._stage >= 1)
                model.unsetNodeFaceColor(
                    this._faceSelection[0]!.getNodeId(),
                    this._faceSelection[0]!.getFaceEntity().getCadFaceIndex(),
                );
        }

        private createCylinderData(
            faceData: SubentityProperties.CylinderElement,
            matrix: Matrix,
            bbox: Box,
        ): void {
            const bdelta = Point3.subtract(bbox.max, bbox.min);
            const diagonal_length = bdelta.length() / 4;

            const temp1 = new Point3(
                faceData.origin.x + faceData.normal.x * 10000.0,
                faceData.origin.y + faceData.normal.y * 10000.0,
                faceData.origin.z + faceData.normal.z * 10000.0,
            );

            const temp2 = new Point3(
                faceData.origin.x - faceData.normal.x * 10000.0,
                faceData.origin.y - faceData.normal.y * 10000.0,
                faceData.origin.z - faceData.normal.z * 10000.0,
            );

            const new_origin = new Point3(0, 0, 0);
            Util.computePointToLineDistance(faceData.origin, temp1, temp2, new_origin);
            this._surfaceCenter[this._stage] = new Point3(0, 0, 0);
            matrix.transform(new_origin, this._surfaceCenter[this._stage]);

            const apoint = new Point3(
                new_origin.x + faceData.normal.x,
                new_origin.y + faceData.normal.y,
                new_origin.z + faceData.normal.z,
            );
            this._surfaceAxis1[this._stage] = new Point3(0, 0, 0);
            matrix.transform(apoint, this._surfaceAxis1[this._stage]);
            apoint.set(
                new_origin.x - faceData.normal.x,
                new_origin.y - faceData.normal.y,
                new_origin.z - faceData.normal.z,
            );
            this._surfaceAxis2[this._stage] = new Point3(0, 0, 0);
            matrix.transform(apoint, this._surfaceAxis2[this._stage]);

            let delta = new Point3(0, 0, 0);
            delta = this._surfaceAxis1[this._stage].copy();
            delta = Point3.subtract(delta, this._surfaceCenter[this._stage]);
            delta.normalize();

            this._surfaceAxis1[this._stage].set(
                this._surfaceCenter[this._stage].x + delta.x * diagonal_length,
                this._surfaceCenter[this._stage].y + delta.y * diagonal_length,
                this._surfaceCenter[this._stage].z + delta.z * diagonal_length,
            );

            this._surfaceAxis2[this._stage].set(
                this._surfaceCenter[this._stage].x - delta.x * diagonal_length,
                this._surfaceCenter[this._stage].y - delta.y * diagonal_length,
                this._surfaceCenter[this._stage].z - delta.z * diagonal_length,
            );

            this._cylinderAxisInfinite1[this._stage] = new Point3(
                this._surfaceCenter[this._stage].x + delta.x * diagonal_length * 1000.0,
                this._surfaceCenter[this._stage].y + delta.y * diagonal_length * 1000.0,
                this._surfaceCenter[this._stage].z + delta.z * diagonal_length * 1000.0,
            );

            this._cylinderAxisInfinite2[this._stage] = new Point3(
                this._surfaceCenter[this._stage].x - delta.x * diagonal_length * 1000.0,
                this._surfaceCenter[this._stage].y - delta.y * diagonal_length * 1000.0,
                this._surfaceCenter[this._stage].z - delta.z * diagonal_length * 1000.0,
            );
        }

        public async setSecondFace(
            point: Point2,
            sr: Selection.FaceSelectionItem,
            faceProperties: SubentityProperties.Base,
            matrix: Matrix,
            bbox: Box,
        ): Promise<void> {
            const firstFaceSelection = this._faceSelection[0];
            const firstFaceData = this._faceData[0];
            if (firstFaceSelection === undefined || firstFaceData === undefined) {
                throw new CommunicatorError("setSecondFace() called before setFirstFace()");
            }

            if (faceProperties instanceof SubentityProperties.PlaneElement) {
                const fp1 = firstFaceData as SubentityProperties.PlaneElement;
                const apoint = new Point3(
                    fp1.origin.x + fp1.normal.x,
                    fp1.origin.y + fp1.normal.y,
                    fp1.origin.z + fp1.normal.z,
                );
                this._matrix1.transform(apoint, this._surfaceAxis1[0]);
                this._matrix1.transform(fp1.origin, this._surfaceCenter[0]);
            } else if (faceProperties instanceof SubentityProperties.CylinderElement) {
                this.createCylinderData(faceProperties, matrix, bbox);
            } else {
                return;
            }

            const distanceObject = await this._viewer.model.computeMinimumFaceFaceDistance(
                firstFaceSelection.getNodeId(),
                firstFaceSelection.getFaceEntity().getCadFaceIndex(),
                sr.getNodeId(),
                sr.getFaceEntity().getCadFaceIndex(),
            );

            if (distanceObject.distance === 0) {
                return;
            }

            this._matrix2 = matrix.copy();
            this._secondPoint = sr.getPosition().copy();

            this._secondPointInitial = new Point3(
                this._firstPoint.x,
                this._firstPoint.y,
                this._firstPoint.z,
            );

            if (
                firstFaceData instanceof SubentityProperties.PlaneElement &&
                faceProperties instanceof SubentityProperties.PlaneElement
            ) {
                //var fp1 = firstFaceData as SubentityProperties.PlaneElement;
                const fp2 = faceProperties;

                const apoint = new Point3(
                    fp2.origin.x + fp2.normal.x,
                    fp2.origin.y + fp2.normal.y,
                    fp2.origin.z + fp2.normal.z,
                );
                this._matrix2.transform(apoint, this._surfaceAxis1[1]);
                this._matrix2.transform(fp2.origin, this._surfaceCenter[1]);

                const delta1 = new Point3(
                    this._surfaceAxis1[0].x - this._surfaceCenter[0].x,
                    this._surfaceAxis1[0].y - this._surfaceCenter[0].y,
                    this._surfaceAxis1[0].z - this._surfaceCenter[0].z,
                );

                const delta2 = new Point3(
                    this._surfaceAxis1[1].x - this._surfaceCenter[1].x,
                    this._surfaceAxis1[1].y - this._surfaceCenter[1].y,
                    this._surfaceAxis1[1].z - this._surfaceCenter[1].z,
                );

                delta1.normalize();
                delta2.normalize();

                const temp = new Point3(-delta1.x, -delta1.y, -delta1.z);
                if (
                    delta1.equalsWithTolerance(delta2, 0.00001) ||
                    temp.equalsWithTolerance(delta2, 0.00001)
                ) {
                    this._secondPointHelper = new Point3(
                        this._secondPoint.x,
                        this._secondPoint.y,
                        this._secondPoint.z,
                    );
                    this._firstPointHelper = new Point3(
                        this._firstPoint.x,
                        this._firstPoint.y,
                        this._firstPoint.z,
                    );

                    const plane1 = new Plane();
                    plane1.setFromPointAndNormal(this._surfaceCenter[0], delta1);
                    const plane2 = new Plane();
                    plane2.setFromPointAndNormal(this._surfaceCenter[1], delta2);

                    const sr2 = new Point3(
                        this._firstPoint.x + delta1.x,
                        this._firstPoint.y + delta1.y,
                        this._firstPoint.z + delta1.z,
                    );

                    Util.intersectionPlaneLine2(
                        firstFaceSelection.getPosition(),
                        sr2,
                        plane2,
                        this._secondPoint,
                    );

                    if (temp.equalsWithTolerance(delta2, 0.00001)) {
                        const deltax = new Point3(-delta1.x, -delta1.y, -delta1.z);
                        plane1.setFromPointAndNormal(this._surfaceCenter[0], deltax);
                    }

                    const d = Math.abs(plane2.d - plane1.d) / plane1.normal.length();
                    this._distance = d;
                    this._setMeasurementValue(this._distance);

                    // this.secondPoint.set(this.firstPoint.x - delta1.x*d, this.firstPoint.y - delta1.y*d,this.firstPoint.z - delta1.z*d);
                    this._parallelFaces = true;

                    this._triangulatedDistance = false;
                    const nullVector = new Point3(0, 1, 0);

                    const v1 = Point3.subtract(this._secondPoint, this._firstPoint);
                    let v2 = new Point3(0, 0, 0);
                    v2 = Point3.subtract(this._secondPointHelper, this._firstPoint);

                    const a1 = Util.computeAngleBetweenVector(nullVector, v1);
                    const a2 = Util.computeAngleBetweenVector(nullVector, v2);
                    this._textPos.assign(this._secondPoint);
                    //                    if (this.secondPoint.equalsWithTolerance(this.secondPointHelper, 0.4))
                    if (a1 - a2 < 0.1 && a1 - a2 > -0.1) {
                        this._pointsOnSameRay = true;
                    }
                } else {
                    this._firstPoint.assign(distanceObject.pos1);
                    this._secondPoint.assign(distanceObject.pos2);
                    this._textPos.assign(distanceObject.pos2);
                    this._distance = distanceObject.distance;
                    this._setMeasurementValue(this._distance);
                }
            } else if (
                firstFaceData instanceof SubentityProperties.CylinderElement &&
                faceProperties instanceof SubentityProperties.CylinderElement
            ) {
                const delta1 = new Point3(
                    this._surfaceAxis1[0].x - this._surfaceCenter[0].x,
                    this._surfaceAxis1[0].y - this._surfaceCenter[0].y,
                    this._surfaceAxis1[0].z - this._surfaceCenter[0].z,
                );
                const delta2 = new Point3(
                    this._surfaceAxis1[1].x - this._surfaceCenter[1].x,
                    this._surfaceAxis1[1].y - this._surfaceCenter[1].y,
                    this._surfaceAxis1[1].z - this._surfaceCenter[1].z,
                );
                delta1.normalize();
                delta2.normalize();

                const temp = new Point3(-delta1.x, -delta1.y, -delta1.z);
                if (
                    delta1.equalsWithTolerance(delta2, 0.00001) ||
                    temp.equalsWithTolerance(delta2, 0.00001)
                ) {
                    const res = new Point3(0, 0, 0);
                    Util.computePointToLineDistance(
                        this._firstPoint,
                        this._cylinderAxisInfinite1[0],
                        this._cylinderAxisInfinite2[0],
                        res,
                    );

                    this._firstPoint = res.copy();
                    let delta = new Point3(
                        this._firstPoint.x,
                        this._firstPoint.y,
                        this._firstPoint.z,
                    );
                    delta = Point3.subtract(delta, this._surfaceCenter[0]);

                    delta.set(0, 0, 0);

                    Util.computePointToLineDistance(
                        this._firstPoint,
                        this._cylinderAxisInfinite1[1],
                        this._cylinderAxisInfinite2[1],
                        res,
                    );

                    this._secondPoint = res.copy();

                    const d = Point3.subtract(this._secondPoint, this._firstPoint).length();
                    if (d < 0.0000001) return;

                    this._triangulatedDistance = false;
                    this._textPos.assign(this._secondPoint);
                    this._setMeasurementValue(d);
                } else {
                    // this._firstPoint.assign(distanceObject.pos1);
                    //this._secondPoint.assign(distanceObject.pos2);
                    this._distance = Util.distanceLineLine(
                        this._cylinderAxisInfinite1[0],
                        this._cylinderAxisInfinite2[0],
                        this._cylinderAxisInfinite1[1],
                        this._cylinderAxisInfinite2[1],
                        this._firstPoint,
                        this._secondPoint,
                    );

                    if (this._distance < 0.0000001) return;

                    this._textPos.assign(this._firstPoint);
                    //      this._distance = distanceObject.distance;
                    this._setMeasurementValue(this._distance);
                }
            } else if (
                firstFaceData instanceof SubentityProperties.CylinderElement &&
                faceProperties instanceof SubentityProperties.PlaneElement
            ) {
                const delta1 = new Point3(
                    this._surfaceAxis1[0].x - this._surfaceCenter[0].x,
                    this._surfaceAxis1[0].y - this._surfaceCenter[0].y,
                    this._surfaceAxis1[0].z - this._surfaceCenter[0].z,
                ).normalize();

                const distanceObject2 = await this._viewer.model.computeMinimumFaceLineDistance(
                    sr.getNodeId(),
                    sr.getFaceEntity().getCadFaceIndex(),
                    new Ray(this._surfaceCenter[0], delta1),
                );

                this._distance = distanceObject2.distance;
                if (this._distance < 0.0000001) return;

                this._firstPoint.assign(distanceObject2.pos1);
                this._secondPoint.assign(distanceObject2.pos2);
                this._textPos.assign(distanceObject2.pos2);

                this._secondPointHelper = new Point3(
                    this._secondPoint.x,
                    this._secondPoint.y,
                    this._secondPoint.z,
                );
                this._firstPointHelper = new Point3(
                    this._firstPoint.x,
                    this._firstPoint.y,
                    this._firstPoint.z,
                );

                this._viewer.model.setNodeFaceColor(
                    sr.getNodeId(),
                    sr.getFaceEntity().getCadFaceIndex(),
                    new Color(255, 0, 0),
                );

                this._faceData[1] = faceProperties;
                this._faceSelection[1] = sr;

                this._stage++;
                this.adjust(point);

                this._setMeasurementValue(this._distance);
            } else if (
                firstFaceData instanceof SubentityProperties.PlaneElement &&
                faceProperties instanceof SubentityProperties.CylinderElement
            ) {
                const delta1 = new Point3(
                    this._surfaceAxis1[1].x - this._surfaceCenter[1].x,
                    this._surfaceAxis1[1].y - this._surfaceCenter[1].y,
                    this._surfaceAxis1[1].z - this._surfaceCenter[1].z,
                ).normalize();

                const distanceObject2 = await this._viewer.model.computeMinimumFaceLineDistance(
                    firstFaceSelection.getNodeId(),
                    firstFaceSelection.getFaceEntity().getCadFaceIndex(),
                    new Ray(this._surfaceCenter[1], delta1),
                );

                this._distance = distanceObject2.distance;
                if (this._distance < 0.0000001) return;

                this._firstPoint.assign(distanceObject2.pos1);
                this._secondPoint.assign(distanceObject2.pos2);
                this._textPos.assign(distanceObject2.pos2);

                this._secondPointHelper = new Point3(
                    this._secondPoint.x,
                    this._secondPoint.y,
                    this._secondPoint.z,
                );
                this._firstPointHelper = new Point3(
                    this._firstPoint.x,
                    this._firstPoint.y,
                    this._firstPoint.z,
                );

                this._viewer.model.setNodeFaceColor(
                    sr.getNodeId(),
                    sr.getFaceEntity().getCadFaceIndex(),
                    new Color(255, 0, 0),
                );

                this._faceData[1] = faceProperties;
                this._faceSelection[1] = sr;

                this._stage++;
                this.adjust(point);

                this._setMeasurementValue(this._distance);
            } else {
                this._firstPoint.assign(distanceObject.pos1);
                this._secondPoint.assign(distanceObject.pos2);
                this._textPos.assign(distanceObject.pos2);
                this._distance = distanceObject.distance;
                if (this._distance < 0.0000001) {
                    return;
                }

                this._setMeasurementValue(this._distance);
            }

            this._viewer.model.setNodeFaceColor(
                sr.getNodeId(),
                sr.getFaceEntity().getCadFaceIndex(),
                new Color(255, 0, 0),
            );

            this._faceData[1] = faceProperties;
            this._faceSelection[1] = sr;

            this._stage++;
            this.adjust(point);
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

            const phelp = Util.oneVectorCross(viewRay.direction);
            let perp1 = new Point3(0, 0, 0);

            perp1 = Point3.cross(viewRay.direction, phelp);
            perp1.normalize();

            let center = new Point3(
                (this._firstPoint.x + this._secondPoint.x) / 2,
                (this._firstPoint.y + this._secondPoint.y) / 2,
                (this._firstPoint.z + this._secondPoint.z) / 2,
            );

            center = this._textPos.copy();
            phelp.set(center.x + phelp.x, center.y + phelp.y, center.z + phelp.z);
            perp1.set(center.x + perp1.x, center.y + perp1.y, center.z + perp1.z);

            const res = new Point3(0, 0, 0);

            Util.intersectionPlaneLine(viewRay.origin, sr2, center, phelp, perp1, res);

            if (this._stage === 2) {
                Util.computePointToLineDistance(
                    res,
                    this._firstPoint,
                    this._secondPoint,
                    this._textPos,
                );
            } else {
                if (this._parallelFaces || this._triangulatedDistance) {
                    const temp = new Point3(0, 0, 0);

                    const hasCylinderFace =
                        this._faceData[0] instanceof SubentityProperties.CylinderElement ||
                        this._faceData[1] instanceof SubentityProperties.CylinderElement;
                    const hasPlaneFace =
                        this._faceData[0] instanceof SubentityProperties.PlaneElement ||
                        this._faceData[1] instanceof SubentityProperties.PlaneElement;

                    if (!this._pointsOnSameRay) {
                        if (hasCylinderFace && hasPlaneFace) {
                            Util.computePointToLineDistance(
                                res,
                                this._secondPoint,
                                this._secondPointInitial,
                                temp,
                            );
                        } else {
                            Util.computePointToLineDistance(
                                res,
                                this._secondPoint,
                                this._secondPointHelper,
                                temp,
                            );
                        }
                        let delta = new Point3(0, 0, 0);
                        delta = Point3.subtract(temp, this._secondPoint);
                        this._secondPoint = temp.copy();
                        this._firstPoint.set(
                            this._firstPoint.x + delta.x,
                            this._firstPoint.y + delta.y,
                            this._firstPoint.z + delta.z,
                        );
                        this._textPos.set(
                            this._textPos.x + delta.x,
                            this._textPos.y + delta.y,
                            this._textPos.z + delta.z,
                        );
                    }
                } else {
                    const temp = new Point3(0, 0, 0);
                    Util.computePointToLineDistance(
                        res,
                        this._cylinderAxisInfinite1[1],
                        this._cylinderAxisInfinite2[1],
                        temp,
                    );
                    const delta = Point3.subtract(temp, this._secondPoint);
                    this._secondPoint = temp.copy();
                    this._firstPoint.set(
                        this._firstPoint.x + delta.x,
                        this._firstPoint.y + delta.y,
                        this._firstPoint.z + delta.z,
                    );
                    this._textPos.set(
                        this._textPos.x + delta.x,
                        this._textPos.y + delta.y,
                        this._textPos.z + delta.z,
                    );
                }
            }

            this._updateArrowsInverted();
            this._viewer.markupManager.refreshMarkup();
        }

        private _updateArrowsInverted(): void {
            const d1 = new Point3(
                (this._firstPoint.x + this._secondPoint.x) / 2.0,
                (this._firstPoint.y + this._secondPoint.y) / 2.0,
                (this._firstPoint.z + this._secondPoint.z) / 2.0,
            );

            const d2 = Point3.subtract(this._secondPoint, this._firstPoint);

            const d3 = Point3.subtract(this._textPos, d1);

            if (d3.length() * 2.0 > d2.length()) this._arrowsInvert = true;
            else this._arrowsInvert = false;
        }

        public _nextStage(): void {
            this._stage++;
            if (this._stage > 3 || (this._stage > 2 && this._triangulatedDistance)) {
                this._finalized = true;
                this.cleanup();
            }
        }

        /** @hidden */
        public update(): void {
            super.update();

            const view = this._viewer.view;
            this._behindView = false;

            if (this._stage === 0) return;

            const projectedPosition = new Array<Point2>(10);
            const projectedPosition3: Point3[] = [];

            for (let i = 0; i < 10; i++) {
                projectedPosition3.push(new Point3(0.0, 0.0, 0.0));
            }

            if (this._faceData[0] instanceof SubentityProperties.CylinderElement) {
                projectedPosition3[0] = view.projectPoint(this._surfaceCenter[0]);
                projectedPosition3[1] = view.projectPoint(this._surfaceAxis1[0]);
                projectedPosition3[2] = view.projectPoint(this._surfaceAxis2[0]);

                projectedPosition[0] = Point2.fromPoint3(projectedPosition3[0]);
                projectedPosition[1] = Point2.fromPoint3(projectedPosition3[1]);
                projectedPosition[2] = Point2.fromPoint3(projectedPosition3[2]);
                this._line1PreviewShape1.set(projectedPosition[0], projectedPosition[1]);
                this._line1PreviewShape2.set(projectedPosition[0], projectedPosition[2]);
            }

            if (
                this._stage > 1 &&
                this._faceData[1] instanceof SubentityProperties.CylinderElement
            ) {
                projectedPosition3[0] = view.projectPoint(this._surfaceCenter[1]);
                projectedPosition3[1] = view.projectPoint(this._surfaceAxis1[1]);
                projectedPosition3[2] = view.projectPoint(this._surfaceAxis2[1]);

                projectedPosition[0] = Point2.fromPoint3(projectedPosition3[0]);
                projectedPosition[1] = Point2.fromPoint3(projectedPosition3[1]);
                projectedPosition[2] = Point2.fromPoint3(projectedPosition3[2]);
                this._line2PreviewShape1.set(projectedPosition[0], projectedPosition[1]);
                this._line2PreviewShape2.set(projectedPosition[0], projectedPosition[2]);
            }

            if (this._stage > 1) {
                projectedPosition3[0] = view.projectPoint(this._textPos);
                projectedPosition3[1] = view.projectPoint(this._firstPoint);
                projectedPosition3[2] = view.projectPoint(this._secondPoint);

                projectedPosition[0] = Point2.fromPoint3(projectedPosition3[0]);
                projectedPosition[1] = Point2.fromPoint3(projectedPosition3[1]);
                projectedPosition[2] = Point2.fromPoint3(projectedPosition3[2]);

                if (this._textShape) this._textShape.setPosition(projectedPosition[0]);
                this._lineShapes[0].setEndcapType(Shape.EndcapType.Arrowhead);
                this._lineShapes[0].setStartEndcapType(Shape.EndcapType.Arrowhead);
                this._lineShapes[0].setEndcapsInverted(this._arrowsInvert);

                this._lineShapes[0].set(projectedPosition[1], projectedPosition[2]);

                projectedPosition3[3] = view.projectPoint(this._firstPointHelper);
                projectedPosition3[4] = view.projectPoint(this._secondPointHelper);

                projectedPosition[3] = Point2.fromPoint3(projectedPosition3[3]);
                projectedPosition[4] = Point2.fromPoint3(projectedPosition3[4]);

                this._lineShapes[1].set(projectedPosition[2], projectedPosition[4]);
                this._lineShapes[2].set(projectedPosition[1], projectedPosition[3]);
                this._lineShapes[3].set(projectedPosition[1], projectedPosition[0]);
            }

            // check for any points behind the viewer
            for (let i = 0; i < 6; i++) {
                if (projectedPosition3[i].z < 0.0) {
                    this._behindView = true;
                }
            }
        }

        public draw(): void {
            // do not draw if the markup is hidden or the model is exploded
            if (this._visibility && this._viewer.explodeManager.getMagnitude() === 0) {
                this.update();

                // only draw if not behind view
                if (!this._behindView) {
                    const hasCylinderFace =
                        this._faceData[0] instanceof SubentityProperties.CylinderElement ||
                        this._faceData[1] instanceof SubentityProperties.CylinderElement;
                    const hasPlaneFace =
                        this._faceData[0] instanceof SubentityProperties.PlaneElement ||
                        this._faceData[1] instanceof SubentityProperties.PlaneElement;

                    const renderer = this._viewer.markupManager.getRenderer();
                    switch (this._stage) {
                        case 1:
                            if (this._faceData[0] instanceof SubentityProperties.CylinderElement) {
                                renderer.drawLine(this._line1PreviewShape1);
                                renderer.drawLine(this._line1PreviewShape2);
                            }
                            break;
                        case 2:
                        case 3:
                        case 4:
                            if (this._faceData[0] instanceof SubentityProperties.CylinderElement) {
                                renderer.drawLine(this._line1PreviewShape1);
                                renderer.drawLine(this._line1PreviewShape2);
                            }
                            if (this._faceData[1] instanceof SubentityProperties.CylinderElement) {
                                renderer.drawLine(this._line2PreviewShape1);
                                renderer.drawLine(this._line2PreviewShape2);
                            }
                            if (hasCylinderFace && hasPlaneFace) {
                                renderer.drawLine(this._lineShapes[0]);
                                renderer.drawLine(this._lineShapes[1]);
                                renderer.drawLine(this._lineShapes[2]);
                                renderer.drawLine(this._lineShapes[3]);
                                renderer.drawTextBox(this._textShape);
                            } else {
                                renderer.drawLine(this._lineShapes[0]);
                                if (this._parallelFaces) {
                                    renderer.drawLine(this._lineShapes[1]);
                                    renderer.drawLine(this._lineShapes[2]);
                                }
                                renderer.drawLine(this._lineShapes[3]);
                                renderer.drawTextBox(this._textShape);
                            }
                            break;
                    }
                }
            }
        }

        //serialization methods

        private static _serializeFaceProp(prop: SubentityProperties.Base): any {
            if (prop instanceof SubentityProperties.CylinderElement) {
                return {
                    type: "CylinderElement",
                    origin: prop.origin.toJson(),
                    normal: prop.normal.toJson(),
                    radius: prop.radius,
                };
            } else if (prop instanceof SubentityProperties.PlaneElement) {
                return {
                    type: "PlaneElement",
                    origin: prop.origin.toJson(),
                    normal: prop.normal.toJson(),
                };
            } else {
                return null;
            }
        }

        private static _constructFaceProp(obj: any): SubentityProperties.Base | null {
            if (obj.type === "CylinderElement") {
                const origin = Point3.fromJson(obj.origin);
                const normal = Point3.fromJson(obj.normal);
                const radius = obj.radius;
                return new SubentityProperties.CylinderElement(radius, origin, normal);
            } else if (obj.type === "PlaneElement") {
                const origin = Point3.fromJson(obj.origin);
                const normal = Point3.fromJson(obj.normal);
                return new SubentityProperties.PlaneElement(origin, normal);
            } else {
                return null;
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
            const faceData: any[] = [];
            for (const data of this._faceData)
                faceData.push(MeasureFaceFaceDistanceMarkup._serializeFaceProp(data!));

            const surfaceCenter: any[] = [];
            for (const center of this._surfaceCenter) surfaceCenter.push(center.toJson());

            const surfaceAxis1: any[] = [];
            for (const axis of this._surfaceAxis1) surfaceAxis1.push(axis.toJson());

            const surfaceAxis2: any[] = [];
            for (const axis of this._surfaceAxis2) surfaceAxis2.push(axis.toJson());

            return {
                text: this._textShape.getTextString(),
                textPos: this._textPos.toJson(),
                firstPoint: this._firstPoint.toJson(),
                secondPoint: this._secondPoint.toJson(),
                firstPointHelper: this._firstPointHelper.toJson(),
                secondPointHelper: this._secondPointHelper.toJson(),
                secondPointInitial: this._secondPointInitial.toJson(),

                measurementValue: this._measurementValue,
                unitMultiplier: this._unitMultiplier,

                parallelFaces: this._parallelFaces,

                faceData: faceData,
                surfaceCenter: surfaceCenter,
                surfaceAxis1: surfaceAxis1,
                surfaceAxis2: surfaceAxis2,

                name: this.getName(),
                className: this.getClassName(),
            };
        }

        /** @deprecated Use [[toJson]] instead. */
        public forJson(): Object {
            return this.toJson();
        }

        /**
         * Creates a new [[MeasureFaceFaceDistanceMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): MeasureFaceFaceDistanceMarkup {
            const obj = objData as ReturnType<MeasureFaceFaceDistanceMarkup["_toJson"]>;

            const measurement = new MeasureFaceFaceDistanceMarkup(viewer);
            measurement.setName(obj.name);

            measurement._textShape.setTextString(obj.text);
            measurement._textPos.assign(Point3.fromJson(obj.textPos));

            measurement._firstPoint.assign(Point3.fromJson(obj.firstPoint));
            measurement._firstPointHelper.assign(Point3.fromJson(obj.firstPointHelper));

            measurement._secondPoint.assign(Point3.fromJson(obj.secondPoint));
            measurement._secondPointHelper.assign(Point3.fromJson(obj.secondPointHelper));

            // This field was added in 2022 SP1. Older markup JSONs may not have it.
            if (obj.secondPointInitial !== undefined) {
                measurement._secondPointInitial.assign(Point3.fromJson(obj.secondPointInitial));
            }

            console.assert(Array.isArray(obj.faceData));
            for (const dataItem of obj.faceData) {
                const prop = MeasureFaceFaceDistanceMarkup._constructFaceProp(dataItem);
                console.assert(prop !== null);
                measurement._faceData.push(prop!);
            }

            measurement._surfaceCenter[0].assign(obj.surfaceCenter[0]);
            measurement._surfaceCenter[1].assign(obj.surfaceCenter[1]);

            measurement._surfaceAxis1[0].assign(obj.surfaceAxis1[0]);
            measurement._surfaceAxis1[1].assign(obj.surfaceAxis1[1]);

            measurement._surfaceAxis2[0].assign(obj.surfaceAxis2[0]);
            measurement._surfaceAxis2[1].assign(obj.surfaceAxis2[1]);

            measurement._stage = 4;
            measurement._parallelFaces = obj.parallelFaces;
            measurement._measurementValue = obj.measurementValue;
            measurement._unitMultiplier = obj.unitMultiplier || 1;

            return measurement;
        }

        /** @deprecated Use [[fromJson]] instead. */
        public static construct(obj: any, viewer: WebViewer): MeasureFaceFaceDistanceMarkup {
            return MeasureFaceFaceDistanceMarkup.fromJson(obj, viewer);
        }

        public getClassName(): string {
            return "Communicator.Markup.Measure.MeasureFaceFaceDistanceMarkup";
        }
    }
}
