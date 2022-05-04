/// <reference path="MeasureLengthMarkup.ts"/>

namespace Communicator.Markup.Measure {
    /** @hidden */
    export class MeasureCircleEdgeLengthMarkup extends MeasureLengthMarkup {
        private _lineProperties: SubentityProperties.CircleElement;
        private _circlePoints: Point3[] = [];
        private _matrix: Matrix;
        private _radius: number = 0;
        private _surfaceCenter = Point3.zero();
        private _circlePlane = new Plane();
        private _arrowsInvert = false;

        public constructor(
            viewer: WebViewer,
            lineProperties: SubentityProperties.CircleElement,
            matrix: Matrix,
            unitMultiplier: number,
        ) {
            super(viewer);

            this._name = "MeasureCircleEdgeLength";
            this._lineProperties = lineProperties;
            this._matrix = matrix.copy();
            this._unitMultiplier = unitMultiplier;

            this._textShape.getBoxPortion().setFillOpacity(1);
            this._textShape.getBoxPortion().setFillColor(new Color(255, 255, 255));

            const measureManager = viewer.measureManager;
            const measurementColor = measureManager.getMeasurementColor();

            for (let i = 0; i < 5; i++) {
                this._lineShapes.push(new Shape.Line());
                this._lineShapes[i].setStrokeColor(measurementColor);
                this._lineShapes[i].setEndEndcapColor(measurementColor);
                this._lineShapes[i].setStartEndcapColor(measurementColor);
            }
        }

        private createCircleData(): void {
            Util.generatePointsOnCircle(
                this._circlePoints,
                this._lineProperties.origin,
                this._lineProperties.radius,
                32,
                this._lineProperties.normal,
            );
            this._matrix.transformArray(this._circlePoints, this._circlePoints);

            this._positions[0] = this._circlePoints[0].copy();
            this._positions[1] = this._circlePoints[16].copy();

            const r = new Point3(this._lineProperties.radius, 0, 0);
            const r2 = new Point3(0, 0, 0);

            this._matrix.transform(r, r);
            this._matrix.transform(r2, r2);
            let delta = Point3.subtract(r2, r);

            this._radius = delta.length();
            delta = Point3.subtract(this._positions[1], this._positions[0]);

            //this.text = (this.value * myModel.modelUnits).toFixed(this.precision) + this.units;
            this._positions[4] = this._positions[1].copy();

            this._surfaceCenter = this._matrix.transform(this._lineProperties.origin);

            // Create a plane through the circle as well
            const cp1 = new Point3(
                this._circlePoints[0].x,
                this._circlePoints[0].y,
                this._circlePoints[0].z,
            );
            const cp2 = new Point3(
                this._circlePoints[1].x,
                this._circlePoints[1].y,
                this._circlePoints[1].z,
            );
            this._circlePlane = Plane.createFromPoints(cp1, cp2, this._surfaceCenter);
        }

        public setLineGeometry(linePoints: Point3[]): void {
            super.setLineGeometry(linePoints);

            this._positions[0] = this._linePositions[0];
            if (this._positions[0].equals(this._positions[this._positions.length - 1])) {
                const gal2 = Math.floor(this._positions.length / 2);
                this._positions[1] = this._positions[gal2];
            } else {
                this._positions[1] = this._linePositions[this._linePositions.length - 1];
            }
            this._positions[1] = this._linePositions[this._linePositions.length - 1];
            this._positions[2] = this._linePositions[1].copy();

            this.createCircleData();

            this._setMeasurementValue(this._radius);
        }

        public adjust(position: Point2): void {
            super.adjust(position);

            // The approach here to positioning is to create a coincident plane through the circle,
            // then intersect the view-ray through that plane. The intersection point will indicate where
            // we place our markers. BUT... if the view happens to be exactly coincident with the circle-plane,
            // then we have to use an alternate approach. That is detailed below.
            const viewRay = this._viewer.view.raycastFromPoint(position);
            if (viewRay === null) {
                return;
            }

            // Find the view-ray intersection through the circle's plane
            const origin = this._surfaceCenter;
            const circlePlane = this._circlePlane;
            let intersectPoint = circlePlane.rayIntersection(viewRay);
            if (intersectPoint === null) {
                // We get a null intersection if the circle-plane is perpendicular to the view-plane. ie., the
                // view-ray is coincident with the circle-plane. To handle this, we'll create a perpendicular
                // plane on the view side of the circle that is positioned at 2*radius from the circle origin
                // and intersect against that plane.  Note the plane position is somewhat arbitrary - since the
                // view-ray is coincident with the circle plane, there's no way to set the z-value with respect
                // to the screen from the users perspective.

                // Find a point towards the view from the origin to make the perpendicular-plane from
                const perpOrigin = Point3.add(
                    origin,
                    viewRay.direction.copy().scale(-2.0 * this._radius),
                );
                const perpPlane = Plane.createFromPointAndNormal(perpOrigin, viewRay.direction);

                // Find the view ray interesection on the perpendicular plane. This should never be null
                const perpIntersect = perpPlane.rayIntersection(viewRay);
                console.assert(perpIntersect !== null);

                // Now reinteresect a ray from perpendicular-intersection point to the original circle
                // plane and that will be our final intersection point. Since ray's are directional, we
                // need to handle it either side of the circle plane and use whichever one works
                const perpToCircleRay = new Ray(perpIntersect!, circlePlane.normal);
                intersectPoint = circlePlane.rayIntersection(perpToCircleRay);
                if (intersectPoint === null) {
                    intersectPoint = circlePlane.rayIntersection(perpToCircleRay.negate());
                }
            }

            // Intersect point should never be null. Punt if it happens
            if (intersectPoint === null) {
                console.assert(false);
                intersectPoint = origin.copy();
            }

            // Find where the measure line intersects the circle
            const circleIntersectVec = Point3.subtract(intersectPoint, origin)
                .normalize()
                .scale(this._radius);
            const circleIntersect = Point3.add(origin, circleIntersectVec);
            const circleIntersectOpposite = Point3.subtract(origin, circleIntersectVec);

            // TODO: SCW: Only positions index 2,4,5 appear to be used? Keeping 'circleIntersectOpposite'
            //  value per- old code, but looks like it could be elimated
            this._positions[0] = circleIntersect;
            this._positions[1] = circleIntersectOpposite;
            this._positions[2] = circleIntersect.copy();
            this._positions[3] = circleIntersectOpposite.copy();
            this._positions[4] = intersectPoint.copy();
            this._positions[5] = this._surfaceCenter.copy();

            this._updateArrowsInverted();
            this._viewer.markupManager.refreshMarkup();
        }

        private _updateArrowsInverted(): void {
            const d1 = new Point3(
                (this._positions[4].x + this._positions[5].x) / 2.0,
                (this._positions[4].y + this._positions[5].y) / 2.0,
                (this._positions[4].z + this._positions[5].z) / 2.0,
            );

            const d2 = Point3.subtract(this._positions[5], this._positions[4]);
            const d3 = Point3.subtract(this._positions[2], d1);
            this._arrowsInvert = d3.length() * 2.0 > d2.length();
        }

        public update(): void {
            super.update();
            const view = this._viewer.view;

            if (this._stage > 0) {
                this._lineEdgeShape.clearPoints();

                for (const pos of this._linePositions) {
                    const projectedPos = Point2.fromPoint3(view.projectPoint(pos));
                    this._lineEdgeShape.pushPoint(projectedPos);
                }
            }

            if (this._stage > 1) {
                const projectedPosition = new Array<Point2>(6);

                for (let i = 0; i < this._positions.length; i++) {
                    projectedPosition[i] = Point2.fromPoint3(view.projectPoint(this._positions[i]));
                }

                if (this._textShape) this._textShape.setPosition(projectedPosition[4]);

                this._lineShapes[0].set(projectedPosition[5], projectedPosition[2]);
                this._lineShapes[1].set(projectedPosition[5], projectedPosition[4]);

                this._lineShapes[0].setEndcapType(Shape.EndcapType.Arrowhead);
                this._lineShapes[0].setStartEndcapType(Shape.EndcapType.None);
                this._lineShapes[0].setEndcapsInverted(this._arrowsInvert);
            }
        }

        public draw(): void {
            // do not draw if the markup is hidden or the model is exploded
            if (this._visibility && this._viewer.explodeManager.getMagnitude() === 0) {
                this.update();
                const markupManager = this._viewer.markupManager;
                const renderer = markupManager.getRenderer();
                switch (this._stage) {
                    case 1:
                        renderer.drawPolyline(this._lineEdgeShape);
                        break;
                    case 2:
                    case 3:
                        for (let i = 0; i < 2; i++) renderer.drawLine(this._lineShapes[i]);
                        renderer.drawTextBox(this._textShape);
                        renderer.drawPolyline(this._lineEdgeShape);
                        break;
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
            const linePositions = MeasureMarkup._serializePointArray(this._linePositions);
            const positions = MeasureMarkup._serializePointArray(this._positions);

            return {
                matrix: this._matrix.toJson(),
                lineOrigin: this._lineProperties.origin,
                lineRadius: this._lineProperties.radius,
                lineNormal: this._lineProperties.normal,
                linePositions: linePositions,
                positions: positions,
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
         * Creates a new [[MeasureCircleEdgeLengthMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): MeasureCircleEdgeLengthMarkup {
            const obj = objData as ReturnType<MeasureCircleEdgeLengthMarkup["_toJson"]>;

            const matrix = Matrix.fromJson(obj.matrix);

            const radius: number = obj.lineRadius;
            const origin = Point3.fromJson(obj.lineOrigin);
            const normal = Point3.fromJson(obj.lineNormal);
            const lineProperties = new SubentityProperties.CircleElement(radius, origin, normal);
            const unitMultiplier = obj.unitMultiplier || 1;

            const measurement = new MeasureCircleEdgeLengthMarkup(
                viewer,
                lineProperties,
                matrix,
                unitMultiplier,
            );

            const linePositions = MeasureMarkup._constructPointArray(obj.linePositions);
            const positions = MeasureMarkup._constructPointArray(obj.positions);

            measurement.setLineGeometry(linePositions);
            measurement._positions = positions;
            measurement._textShape.setTextString(obj.text);
            measurement._stage = 3;

            measurement._measurementValue = obj.measurementValue;

            return measurement;
        }

        /** @deprecated Use [[fromJson]] instead. */
        public static construct(obj: any, viewer: WebViewer): MeasureCircleEdgeLengthMarkup {
            return MeasureCircleEdgeLengthMarkup.fromJson(obj, viewer);
        }

        public getClassName(): string {
            return "Communicator.Markup.Measure.MeasureCircleEdgeLengthMarkup";
        }
    }
}
