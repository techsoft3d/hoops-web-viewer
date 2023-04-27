namespace Communicator.Markup.Measure {
    /**
     * Base class for Measure Markup. It should not be used directly.
     */
    export class MeasureMarkup extends MarkupItem {
        /** @hidden */
        protected _viewer: WebViewer;
        /** @hidden */
        protected _stage: number = 0;
        /** @hidden */
        protected _finalized = false;
        /** @hidden */
        protected _uniqueId: Uuid = ""; // TODO: Refactor this to prevent this dummy sentinel use.
        /** @hidden */
        protected _positions: Point3[] = [];
        /** @hidden */
        protected _lineShapes: Shape.Line[];
        /** @hidden */
        protected _name: string = "";
        /** @hidden */
        protected _measurementValue: number = 0.0;
        /** @hidden */
        protected _unitMultiplier: number = 1;
        /** @hidden */
        protected _textShape: Shape.TextBox = new Shape.TextBox();
        /** @hidden */
        protected _visibility: boolean = true;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super();
            this._positions = [];
            this._lineShapes = [];
            this._viewer = viewer;
        }

        /**
         * Gets the name of this measurement.
         * @returns the measurement name
         */
        public getName(): string {
            return this._name;
        }

        /**
         * Sets the name of this measurement
         * @param name the name to set
         */
        public setName(name: string): void {
            this._name = name;
        }

        /** @hidden */
        public _getStage(): number {
            return this._stage;
        }

        /** @hidden */
        public _nextStage(): void {
            this._stage++;
        }

        /** @hidden */
        public _setId(id: Uuid): void {
            this._uniqueId = id;
        }

        /** @hidden */
        public _getId(): Uuid {
            return this._uniqueId;
        }

        /** @hidden */
        public adjust(position: Point2): void {
            position as Unreferenced;
        }

        /** @hidden */
        public _isFinalized(): boolean {
            return this._finalized;
        }

        /** @hidden */
        public update(): void {}

        /** @hidden */
        public draw(): void {
            this.update();
        }

        public setVisibility(visibility: boolean): void {
            this._visibility = visibility;
            this.draw();

            if (visibility) {
                this._viewer.trigger("measurementShown", this);
            } else {
                this._viewer.trigger("measurementHidden", this);
            }
        }

        public getVisibility(): boolean {
            return this._visibility;
        }

        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        public toJson(): Object {
            return {};
        }

        /** @deprecated Use [[toJson]] instead. */
        public forJson(): Object {
            return this.toJson();
        }

        /**
         * Returns the unit agnostic value for this measurement.
         * In the case where this value represents distance, use [[getUnitMultiplier]] to determine the measurement units.
         * In other cases, this value will be the angle measurement in degrees.
         * @returns the measurement value
         */
        public getMeasurementValue(): number {
            return this._measurementValue;
        }

        /**
         * Returns the unit multiplier incorporated into the measurement value.
         * This number is a multiplier of millimeters (for example inches will be `25.4`).
         * The default value is `1.0`.
         */
        public getUnitMultiplier(): number {
            return this._unitMultiplier;
        }

        /**
         * Sets the measurement text that is rendered with this measurement.
         * @param measurementText the text to render with this measurement
         */
        public setMeasurementText(measurementText: string): void {
            this._textShape.setTextString(measurementText);
        }

        /**
         * Gets the text for this measurement. By default this will contain the measurement value and units for the model in the cases where the measurement is a distance.
         * In other cases it will contain the angle in degrees.
         */
        public getMeasurementText(): string {
            return this._textShape.getTextString();
        }

        /**
         * Returns whether the measurement markup is valid. Override in subclasses when needed.
         */
        public isMarkupValid(): Boolean {
            return true;
        }

        /** @hidden */
        protected _setMeasurementValue(millimeters: number) {
            this._measurementValue = millimeters / this._unitMultiplier;
            this.setMeasurementText(
                Util.formatWithUnit(this._measurementValue, this._unitMultiplier),
            );
            this._viewer.trigger("measurementValueSet", this);
        }

        /** @hidden */
        protected static _serializePointArray(points: Point3[]): Object[] {
            const json: Object[] = [];

            for (const point of points) {
                json.push(point.toJson());
            }

            return json;
        }

        /** @hidden */
        protected static _constructPointArray(pointObjs: Object[]): Point3[] {
            const points: Point3[] = [];

            for (const pointObj of pointObjs) {
                const point = Point3.fromJson(pointObj);
                points.push(point);
            }

            return points;
        }
    }
}
