namespace Communicator.Markup.Measure {
    /** @hidden */
    export class MeasurePolygonAreaMarkup extends MeasureMarkup {
        private readonly _initialPoint = new Shape.Circle();
        private readonly _leaderLine = new Shape.Line();
        private readonly _endpoints = new Shape.CircleCollection();
        private readonly _textboxCorners: Point2[] = [
            Point2.zero(),
            Point2.zero(),
            Point2.zero(),
            Point2.zero(),
        ];
        private readonly _polygon = new Shape.Polygon();
        private _plane: Plane | null = null;
        public textPosition = Point3.zero();
        public leaderPosition = Point3.zero();

        public pointRadius = 2.5;

        public constructor(viewer: WebViewer) {
            super(viewer);
            this._viewer = viewer;

            const measurementColor = this._viewer.measureManager.getMeasurementColor();
            this._initialPoint.setFillColor(measurementColor);
            this._initialPoint.setStrokeColor(measurementColor);
            this._leaderLine.setStrokeColor(measurementColor);
            this._endpoints.setFillColor(measurementColor);
            this._endpoints.setStrokeColor(measurementColor);
            this._endpoints.setFillOpacity(1.0);
            this._textShape.getBoxPortion().setFillOpacity(1.0);
            this._textShape.getBoxPortion().setFillColor(Color.white());
            this._polygon.setFillColor(measurementColor);
            this._polygon.setFillOpacity(0.4);
        }

        private _calculateArea(): number {
            const nPositions = this._positions.length;
            if (nPositions < 3) {
                return 0;
            }

            // model.triangulatePolygon wants points in a [XYZXYZXYZ...] format
            const untriangulatedPoints = new Float32Array(nPositions * 3);
            for (let i = 0; i < nPositions; i++) {
                const position = this._positions[i];
                untriangulatedPoints[3 * i] = position.x;
                untriangulatedPoints[3 * i + 1] = position.y;
                untriangulatedPoints[3 * i + 2] = position.z;
            }

            // calculate normal (points should be co-planer)
            const vector1 = Point3.subtract(this._positions[1], this._positions[0]);
            const vector2 = Point3.subtract(this._positions[2], this._positions[0]);
            const normal = Point3.cross(vector1, vector2);

            // triangulatedPoints are also in a [XYZXYZXYZ...] format
            const triangulatedPoints = this._viewer.model.triangulatePolygon(
                untriangulatedPoints,
                normal,
            );

            let totalArea = 0;
            const nTris = triangulatedPoints.length / 3 / 3; // each tri is 3 points composed of 3 floats
            for (let triIndex = 0; triIndex < nTris; triIndex++) {
                const triOffset = triIndex * 3 * 3; // points to first float of first point of triangle
                const triPoints: Point3[] = [];
                for (let pointIndex = 0; pointIndex < 3; pointIndex++) {
                    const x = triangulatedPoints[triOffset + pointIndex * 3];
                    const y = triangulatedPoints[triOffset + pointIndex * 3 + 1];
                    const z = triangulatedPoints[triOffset + pointIndex * 3 + 2];
                    triPoints[pointIndex] = new Point3(x, y, z);
                }

                // compute area of the triangle we created with Heron's formula
                const sideALength = Point3.subtract(triPoints[1], triPoints[0]).length();
                const sideBLength = Point3.subtract(triPoints[2], triPoints[0]).length();
                const sideCLength = Point3.subtract(triPoints[2], triPoints[1]).length();
                const triArea =
                    0.25 *
                    Math.sqrt(
                        (sideALength + sideBLength + sideCLength) *
                            (-sideALength + sideBLength + sideCLength) *
                            (sideALength - sideBLength + sideCLength) *
                            (sideALength + sideBLength - sideCLength),
                    );

                totalArea += triArea;
            }

            return totalArea;
        }

        /**
         * Adds a point to the point list and updates the calculated polygon area.
         * Only points that are coplanar will be added.
         * Returns a bool representing if the point was accepted or not
         */
        public addPoint(point: Point3): boolean {
            // if there are at least 3 points we have to check that the point we're
            // adding is co-planer
            if (this._positions.length >= 3) {
                if (this._plane === null) {
                    this._plane = Plane.createFromPoints(
                        this._positions[0],
                        this._positions[1],
                        this._positions[2],
                    );
                }

                if (Math.abs(this._plane.distanceToPoint(point)) > 0.0001) {
                    return false;
                }
            }

            if (this._positions.length === 2) {
                // we now have enough points to determine the plane we're using
                this._plane = Plane.createFromPoints(this._positions[0], this._positions[1], point);
            }

            this._positions.push(point.copy());

            const area = this._calculateArea();
            const areaUnit = this.getUnitMultiplier();
            const areaText = `${Util.formatWithUnit(area, areaUnit)}\u00B2`;
            this._setMeasurementValue(area);
            this.setMeasurementText(areaText);

            return true;
        }

        public getPoints() {
            return this._positions;
        }

        public getLast() {
            if (this._positions.length === 0) return null;

            return this._positions[this._positions.length - 1].copy();
        }

        // finalizes the measurement
        public finalize() {
            if (this._positions.length > 2) {
                const area = this._calculateArea();
                const areaUnit = this.getUnitMultiplier();
                const areaText = `${Util.formatWithUnit(area, areaUnit)}\u00B2`;
                this._setMeasurementValue(area);
                this.setMeasurementText(areaText);
            }

            this._finalized = true;
        }

        public setUnitMultiplier(value: number): void {
            this._unitMultiplier = value;
        }

        public isValid() {
            return this._positions.length > 2;
        }

        public getMeasurementText() {
            return this._textShape.getTextString();
        }

        /** Calculates the screen position for each point in the polygon */
        private _updateProjectedPoints() {
            const screenPoints: Point2[] = [];

            this._behindView = false;
            for (const worldPoint of this._positions) {
                const projectedPoint = this._viewer.view.projectPoint(worldPoint);
                if (projectedPoint.z <= 0.0) {
                    this._behindView = true;
                }

                screenPoints.push(Point2.fromPoint3(projectedPoint));
            }

            return screenPoints;
        }

        private _updateTextBoxCorners() {
            const textSize = this._viewer.markupManager
                .getRenderer()
                .measureTextBox(this._textShape);
            const textPosition = this._textShape.getPosition();

            this._textboxCorners[0].assign(textPosition);
            this._textboxCorners[1].set(textPosition.x + textSize.x, textPosition.y);
            this._textboxCorners[2].set(textPosition.x + textSize.x, textPosition.y + textSize.y);
            this._textboxCorners[3].set(textPosition.x, textPosition.y + textSize.y);
        }

        /** Finds and returns the closest corner of the text box.  Used as the endpoint of the leader line. */
        private _calculateLeaderEndpoint(leaderPosition: Point2) {
            this._updateTextBoxCorners();

            const closestCorner = Point2.zero();
            let closestDistance = Number.MAX_VALUE;

            for (const corner of this._textboxCorners) {
                const distance = Point2.distance(leaderPosition, corner);

                if (distance < closestDistance) {
                    closestCorner.assign(corner);
                    closestDistance = distance;
                }
            }

            return closestCorner;
        }

        public draw() {
            if (!this._visibility) return;

            const screenPoints = this._updateProjectedPoints();
            if (this._behindView || screenPoints.length === 0) return;

            const renderer = this._viewer.markupManager.getRenderer();

            if (screenPoints.length === 1) {
                this._initialPoint.set(screenPoints[0], this.pointRadius);
                renderer.drawCircle(this._initialPoint);
            } else {
                this._polygon.clearPoints();
                for (const screenPoint of screenPoints) {
                    this._polygon.pushPoint(screenPoint);
                }

                if (this._finalized)
                    // && this.isLoop)
                    this._polygon.pushPoint(screenPoints[0]);

                const textPosition = Point2.fromPoint3(
                    this._viewer.view.projectPoint(this.textPosition),
                );
                this._textShape.setPosition(textPosition);

                renderer.drawPolygon(this._polygon);

                const leaderPosition = Point2.fromPoint3(
                    this._viewer.view.projectPoint(this.leaderPosition),
                );
                const leaderEndpoint = this._calculateLeaderEndpoint(leaderPosition);
                this._leaderLine.setP1(leaderPosition);
                this._leaderLine.setP2(leaderEndpoint);
                renderer.drawLine(this._leaderLine);

                renderer.drawTextBox(this._textShape);

                this._endpoints.clear();

                this._endpoints.addCircle(screenPoints[0], this.pointRadius);
                this._endpoints.addCircle(screenPoints[screenPoints.length - 1], this.pointRadius);
                renderer.drawCircles(this._endpoints);
            }
        }

        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        public toJson(): Object {
            return this._toJson();
        }

        private _toJson() {
            const jsonPoints: Object[] = [];

            for (const position of this._positions) jsonPoints.push(position.toJson());

            return {
                name: this._name,
                points: jsonPoints,
                textPoint: this.textPosition.toJson(),
                leaderPoint: this.leaderPosition.toJson(),
                measurementValue: this._measurementValue,
                unitMultiplier: this._unitMultiplier,
                text: this._textShape.getTextString(),
                className: this.getClassName(),
            };
        }

        /**
         * Creates a new [[MeasurePolygonAreaMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): MeasurePolygonAreaMarkup {
            const obj = objData as ReturnType<MeasurePolygonAreaMarkup["_toJson"]>;

            const measurement = new MeasurePolygonAreaMarkup(viewer);

            measurement._name = obj.name;
            measurement._positions = MeasureMarkup._constructPointArray(obj.points);
            measurement.textPosition = Point3.fromJson(obj.textPoint);
            measurement.leaderPosition = Point3.fromJson(obj.leaderPoint);
            measurement._measurementValue = obj.measurementValue;
            measurement._unitMultiplier = obj.unitMultiplier || 1;
            measurement._textShape.setTextString(obj.text);

            measurement._finalized = true;
            return measurement;
        }

        /** This measurement only allows clicking on the text box portion of the markup. */
        public hit(point: Point2): boolean {
            const measurement = this._viewer.markupManager
                .getRenderer()
                .measureTextBox(this._textShape);

            const position = this._textShape.getPosition();

            if (point.x < position.x) return false;
            if (point.x > position.x + measurement.x) return false;
            if (point.y < position.y) return false;
            if (point.y > position.y + measurement.y) return false;

            return true;
        }

        public getClassName(): string {
            return "Communicator.Markup.Measure.MeasurePolygonAreaMarkup";
        }
    }
}
