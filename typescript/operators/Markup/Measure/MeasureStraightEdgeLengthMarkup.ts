/// <reference path="MeasureLengthMarkup.ts"/>

namespace Communicator.Markup.Measure {
    /** @hidden */
    export class MeasureStraightEdgeLengthMarkup extends MeasureLengthMarkup {
        private _lineProperties:
            | SubentityProperties.LineElement
            | SubentityProperties.OtherEdgeElement
            | null = null;
        private _matrix: Matrix;
        private _worldSpaceLength: number = 0;
        private _arrowsInvert = false;

        /** @hidden */
        public constructor(
            viewer: WebViewer,
            lineProperties:
                | SubentityProperties.LineElement
                | SubentityProperties.OtherEdgeElement
                | null,
            matrix: Matrix,
            unitMultiplier: number,
        ) {
            super(viewer);

            this._name = "MeasureStraightEdgeLength";
            this._lineProperties = lineProperties;
            this._matrix = matrix.copy();
            this._matrix.setTranslationComponent(0, 0, 0);
            this._unitMultiplier = unitMultiplier;

            const measureManager = this._viewer.measureManager;
            const measurementColor = measureManager.getMeasurementColor();

            for (let i = 0; i < 5; i++) {
                const shape = new Shape.Line();
                shape.setStrokeColor(measurementColor);
                shape.setEndEndcapColor(measurementColor);
                shape.setStartEndcapColor(measurementColor);
                this._lineShapes.push(shape);
            }

            const boxPortion = this._textShape.getBoxPortion();
            boxPortion.setFillOpacity(1);
            boxPortion.setFillColor(new Color(255, 255, 255));
        }

        /** @hidden */
        public setLineGeometry(linePoints: Point3[]): void {
            super.setLineGeometry(linePoints);

            this._positions[0] = this._linePositions[0];
            this._positions[2] = this._linePositions[0].copy();
            this._positions[1] = this._linePositions[this._linePositions.length - 1];

            let measurementValue: number;

            // Compute length in world space
            if (this._lineProperties !== null && this._lineProperties.length !== -1) {
                // A length of -1 will be imported from HC 2015 HWF importer. It's because of HC 2015 straight edges were measured using edge tess points
                const lengthInWorldSpace = new Point3(this._lineProperties.length, 0, 0);
                this._matrix.transform(lengthInWorldSpace, lengthInWorldSpace);
                this._worldSpaceLength = lengthInWorldSpace.length();

                measurementValue = this._worldSpaceLength;
            } else {
                measurementValue = Point3.subtract(this._positions[1], this._positions[0]).length();
            }

            this._setMeasurementValue(measurementValue);
        }

        /** @hidden */
        public adjust(position: Point2): void {
            super.adjust(position);

            const view = this._viewer.view;
            const viewRay = view.raycastFromPoint(position);
            if (viewRay === null) {
                return;
            }

            const kp1 = this._positions[0];
            const kp3 = this._positions[1];

            let kpd = new Point3(1, 0, 0);
            if (!kp3.equals(kp1)) kpd = Point3.subtract(kp3, kp1);

            const camera = view.getCamera();
            const phelp = camera.getUp();

            const perp1 = Point3.cross(viewRay.direction, phelp).normalize();

            const center = Point3.add(kp1, kp3).scale(0.5);

            const g2 = Point3.add(center, phelp);
            const g3 = Point3.add(center, perp1);

            const sr2 = Point3.add(Point3.scale(viewRay.direction, 1000000), viewRay.origin);

            const kp4 = new Point3(0, 0, 0);

            Util.intersectionPlaneLine(viewRay.origin, sr2, center, g2, g3, kp4);

            this._positions[2].assign(kp4);

            let m1 = new Point3(0, 0, 0);
            if (Math.abs(kpd.x) <= Math.abs(kpd.y) && Math.abs(kpd.x) <= Math.abs(kpd.z))
                m1 = new Point3(1, 0, 0);
            else if (Math.abs(kpd.y) <= Math.abs(kpd.x) && Math.abs(kpd.y) <= Math.abs(kpd.z))
                m1 = new Point3(0, 1, 0);
            else m1 = new Point3(0, 0, 1);

            const m2 = Point3.cross(m1, kpd);
            const m3 = Point3.cross(m2, kpd);
            m2.add(kp1);
            m3.add(kp1);

            const kp44 = Point3.add(Point3.scale(kpd, 10000), kp4);

            const kp444 = Point3.add(Point3.scale(kpd, -10000), kp4);

            Util.intersectionPlaneLine(kp44, kp444, kp1, m2, m3, kp4);

            const delta = Point3.subtract(kp4, kp1);

            this._positions[3] = Point3.add(kp1, delta);
            this._positions[4] = Point3.add(kp3, delta);

            this._updateArrowsInverted();

            this._viewer.markupManager.refreshMarkup();
        }

        private _updateArrowsInverted(): void {
            const d1 = Point3.add(this._positions[3], this._positions[4]).scale(0.5);
            const d2 = Point3.subtract(this._positions[4], this._positions[3]);
            const d3 = Point3.subtract(this._positions[2], d1);

            this._arrowsInvert = 2.0 * d3.squaredLength() > d2.squaredLength();
        }

        /** @hidden */
        public update(): void {
            super.update();
            const view = this._viewer.view;
            this._behindView = false;

            if (this._stage > 0) {
                this._lineEdgeShape.clearPoints();

                const projectedPosition3 = Array<Point3>(this._linePositions.length);
                for (let i = 0; i < this._linePositions.length; i++) {
                    projectedPosition3[i] = view.projectPoint(this._linePositions[i]);

                    // check behind the view
                    if (projectedPosition3[i].z <= 0.0) {
                        this._behindView = true;
                    }

                    this._lineEdgeShape.pushPoint(Point2.fromPoint3(projectedPosition3[i]));
                }
            }

            if (this._stage > 1) {
                const projectedPosition = new Array<Point2>(6);
                const projectedPosition3 = Array<Point3>(6);

                for (let i = 0; i < this._positions.length; i++) {
                    projectedPosition3[i] = view.projectPoint(this._positions[i]);
                    if (projectedPosition3[i].z <= 0.0) {
                        this._behindView = true;
                    }

                    projectedPosition[i] = Point2.fromPoint3(projectedPosition3[i]);
                }

                if (this._textShape) this._textShape.setPosition(projectedPosition[2]);

                this._lineShapes[0].set(projectedPosition[3], projectedPosition[4]);
                this._lineShapes[1].set(projectedPosition[0], projectedPosition[3]);
                this._lineShapes[2].set(projectedPosition[1], projectedPosition[4]);
                this._lineShapes[3].set(projectedPosition[3], projectedPosition[2]);

                this._lineShapes[4].set(projectedPosition[3], projectedPosition[4]);
                this._lineShapes[4].setEndcapType(Shape.EndcapType.Arrowhead);
                this._lineShapes[4].setStartEndcapType(Shape.EndcapType.Arrowhead);
                this._lineShapes[4].setEndcapsInverted(this._arrowsInvert);
            }
        }

        /** @hidden */
        public draw(): void {
            // do not draw if the markup is hidden or the model is exploded
            if (this._visibility && this._viewer.explodeManager.getMagnitude() === 0) {
                this.update();

                // only draw if not behind view
                if (!this._behindView) {
                    const renderer = this._viewer.markupManager.getRenderer();
                    switch (this._stage) {
                        case 1:
                            renderer.drawPolyline(this._lineEdgeShape);
                            break;
                        case 2:
                        case 3:
                            for (const shape of this._lineShapes) renderer.drawLine(shape);
                            renderer.drawTextBox(this._textShape);
                            renderer.drawPolyline(this._lineEdgeShape);
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
                matrix: this._matrix.toJson(),
            };
        }

        /** @deprecated Use [[toJson]] instead. */
        public forJson(): Object {
            return this.toJson();
        }

        /**
         * Creates a new [[MeasureStraightEdgeLengthMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): MeasureStraightEdgeLengthMarkup {
            const obj = objData as ReturnType<MeasureStraightEdgeLengthMarkup["_toJson"]>;

            const matrix = Matrix.fromJson(obj.matrix);
            const unitMultiplier = obj.unitMultiplier || 1;
            const measurement = new MeasureStraightEdgeLengthMarkup(
                viewer,
                null,
                matrix,
                unitMultiplier,
            );

            measurement._name = obj.name;

            measurement._positions[0] = Point3.fromJson(obj.measurePoint1);
            measurement._positions[1] = Point3.fromJson(obj.measurePoint2);
            measurement._positions[2] = Point3.fromJson(obj.textPoint);
            measurement._textShape.setTextString(obj.text);
            measurement._positions[3] = Point3.fromJson(obj.leaderPoint1);
            measurement._positions[4] = Point3.fromJson(obj.leaderPoint2);

            measurement._measurementValue = obj.measurementValue;

            measurement._updateArrowsInverted();
            measurement._stage = 2;
            return measurement;
        }

        /** @deprecated Use [[fromJson]] instead. */
        public static construct(obj: any, viewer: WebViewer): MeasureStraightEdgeLengthMarkup {
            return MeasureStraightEdgeLengthMarkup.fromJson(obj, viewer);
        }

        public getClassName(): string {
            return "Communicator.Markup.Measure.MeasureStraightEdgeLengthMarkup";
        }
    }
}
