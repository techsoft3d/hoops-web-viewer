namespace Communicator.Markup.Measure {
    /** @hidden */
    export class MeasurePolylineDistanceMarkup extends MeasureMarkup {
        private readonly _polyline = new Shape.Polyline();
        private readonly _initialPoint = new Shape.Circle();
        private readonly _leaderLine = new Shape.Line();
        private readonly _endpoints = new Shape.CircleCollection();
        private readonly _textboxCorners: Point2[] = [
            Point2.zero(),
            Point2.zero(),
            Point2.zero(),
            Point2.zero(),
        ];
        public textPosition = Point3.zero();
        public leaderPosition = Point3.zero();
        public isLoop = false;

        public pointRadius = 2.5;

        public constructor(viewer: WebViewer) {
            super(viewer);
            this._viewer = viewer;

            const measurementColor = this._viewer.measureManager.getMeasurementColor();
            this._initialPoint.setFillColor(measurementColor);
            this._initialPoint.setStrokeColor(measurementColor);
            this._polyline.setStrokeColor(measurementColor);
            this._polyline.setStrokeWidth(2.0);
            this._leaderLine.setStrokeColor(measurementColor);
            this._endpoints.setFillColor(measurementColor);
            this._endpoints.setStrokeColor(measurementColor);
            this._endpoints.setFillOpacity(1.0);
            this._textShape.getBoxPortion().setFillOpacity(1.0);
            this._textShape.getBoxPortion().setFillColor(Color.white());
        }

        /** Adds a point to the pointlist and updates the calculated polyline distance */
        public addPoint(point: Point3) {
            this._positions.push(point.copy());

            if (this._positions.length > 1) {
                const dist = Point3.subtract(
                    this._positions[this._positions.length - 1],
                    this._positions[this._positions.length - 2],
                ).length();
                this._setMeasurementValue(this._measurementValue + dist);
            }
        }

        public getPoints() {
            return this._positions;
        }

        public getlast() {
            if (this._positions.length === 0) return null;

            return this._positions[this._positions.length - 1].copy();
        }

        // finalizes the measurement and sets the final distance if the polyline is a loop
        public finalize() {
            if (this.isLoop && this._positions.length > 2) {
                const dist = Point3.subtract(
                    this._positions[this._positions.length - 1],
                    this._positions[0],
                ).length();
                this._setMeasurementValue(this._measurementValue + dist);
            }

            this._finalized = true;
        }

        public setUnitMultiplier(value: number): void {
            this._unitMultiplier = value;
        }

        public isValid() {
            return this._positions.length > 1;
        }

        public getMeasurementText() {
            return this._textShape.getTextString();
        }

        /** Calculates the screen position for each point in the polyline */
        private _updateProjectedPoints() {
            const screenPoints: Point2[] = [];
            this._behindView = false;

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
                this._polyline.clearPoints();
                for (const screenPoint of screenPoints) {
                    this._polyline.pushPoint(screenPoint);
                }

                if (this._finalized && this.isLoop) this._polyline.pushPoint(screenPoints[0]);

                const textPosition = Point2.fromPoint3(
                    this._viewer.view.projectPoint(this.textPosition),
                );
                this._textShape.setPosition(textPosition);

                renderer.drawPolyline(this._polyline);

                const leaderPosition = Point2.fromPoint3(
                    this._viewer.view.projectPoint(this.leaderPosition),
                );
                const leaderEndpoint = this._calculateLeaderEndpoint(leaderPosition);
                this._leaderLine.setP1(leaderPosition);
                this._leaderLine.setP2(leaderEndpoint);
                renderer.drawLine(this._leaderLine);

                renderer.drawTextBox(this._textShape);

                this._endpoints.clear();
                if (!this.isLoop) {
                    this._endpoints.addCircle(screenPoints[0], this.pointRadius);
                    this._endpoints.addCircle(
                        screenPoints[screenPoints.length - 1],
                        this.pointRadius,
                    );
                    renderer.drawCircles(this._endpoints);
                }
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
                isLoop: this.isLoop,
                text: this._textShape.getTextString(),
                className: this.getClassName(),
            };
        }

        /**
         * Creates a new [[MeasurePolylineDistanceMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): MeasurePolylineDistanceMarkup {
            const obj = objData as ReturnType<MeasurePolylineDistanceMarkup["_toJson"]>;

            const measurement = new MeasurePolylineDistanceMarkup(viewer);

            measurement._name = obj.name;
            measurement._positions = MeasureMarkup._constructPointArray(obj.points);
            measurement.textPosition = Point3.fromJson(obj.textPoint);
            measurement.leaderPosition = Point3.fromJson(obj.leaderPoint);
            measurement.isLoop = obj.isLoop;
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
            return "Communicator.Markup.Measure.MeasurePolylineDistanceMarkup";
        }
    }
}
