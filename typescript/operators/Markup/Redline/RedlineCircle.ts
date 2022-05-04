/// <reference path="../../../Markup/Redline/RedlineItem.ts"/>
/// <reference path="../../../Markup/Shapes/Circle.ts"/>

namespace Communicator.Markup.Redline {
    /** @hidden */
    export class RedlineCircle extends RedlineItem {
        private _uniqueId: Uuid = UUID.create();
        private _centerPt: Point3 = Point3.zero();
        private _radiusPt: Point3 = Point3.zero();

        private _circleShape: Shape.Circle = new Shape.Circle();

        private static _validRadiusTolerance = 1.0;

        private _previousDragPlanePosition: Point3 = Point3.zero();

        public constructor(viewer: WebViewer) {
            super(viewer);

            this._circleShape.setFillOpacity(0.0);
            this._circleShape.setStrokeColor(Color.red());
            this._circleShape.setStrokeWidth(2.0);
        }

        public setCenter(center: Point3): void {
            this._centerPt.assign(center);
        }

        public getCenter(): Point3 {
            return this._centerPt.copy();
        }

        public setRadiusPoint(radiusPoint: Point3): void {
            this._radiusPt.assign(radiusPoint);
        }

        public getRadiusPoint(): Point3 {
            return this._radiusPt.copy();
        }

        public getUniqueId(): Uuid {
            return this._uniqueId;
        }

        private _update(): void {
            const view = this._viewer.view;

            const screenCenterPt = Point2.fromPoint3(view.projectPoint(this._centerPt));
            const screenRadiusPt = Point2.fromPoint3(view.projectPoint(this._radiusPt));

            const screenRadius = Point2.distance(screenCenterPt, screenRadiusPt);

            this._circleShape.set(screenCenterPt, screenRadius);
        }

        public draw(): void {
            this._update();

            this._viewer.markupManager.getRenderer().drawCircle(this._circleShape);
        }

        public hit(point: Point2): boolean {
            return this.hitWithTolerance(point, 0);
        }

        public hitWithTolerance(point: Point2, pickTolerance: number): boolean {
            this._update();

            const tolerance = this._circleShape.getStrokeWidth() + pickTolerance;
            const distance =
                Point2.distance(this._circleShape.getCenter(), point) -
                this._circleShape.getRadius();

            return Math.abs(distance) <= tolerance;
        }

        public onSelect(): void {
            this._circleShape.setStrokeWidth(4.0);
        }

        public onDeselect(): void {
            this._circleShape.setStrokeWidth(2.0);
        }

        public isValid(): boolean {
            return this._circleShape.getRadius() > RedlineCircle._validRadiusTolerance;
        }

        // dragging methods
        public onDragStart(position: Point2): boolean {
            const view = this._viewer.view;
            const cameraPoint = view.getCamera().getCameraPlaneIntersectionPoint(position, view);
            if (cameraPoint !== null) {
                this._previousDragPlanePosition.assign(cameraPoint);
            }
            return false;
        }

        public onDragMove(position: Point2): boolean {
            const view = this._viewer.view;
            const cameraPoint = view.getCamera().getCameraPlaneIntersectionPoint(position, view);
            if (cameraPoint !== null) {
                const delta = Point3.subtract(cameraPoint, this._previousDragPlanePosition);

                this._centerPt.add(delta);
                this._radiusPt.add(delta);

                this._previousDragPlanePosition.assign(cameraPoint);
            }
            return true;
        }

        // Serialization methods

        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        public toJson(): Object {
            return this._toJson();
        }

        private _toJson() {
            return {
                uniqueId: this._uniqueId,
                centerPoint: this._centerPt.toJson(),
                radiusPoint: this._radiusPt.toJson(),
                className: this.getClassName(),
            };
        }

        /** @deprecated Use [[toJson]] instead. */
        public forJson(): Object {
            return this.toJson();
        }

        /**
         * Creates a new [[RedlineCircle]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): RedlineCircle {
            const obj = objData as ReturnType<RedlineCircle["_toJson"]>;

            const redlineCircle = new RedlineCircle(viewer);

            redlineCircle._uniqueId = obj.uniqueId;
            redlineCircle.setCenter(Point3.fromJson(obj.centerPoint));
            redlineCircle.setRadiusPoint(Point3.fromJson(obj.radiusPoint));

            return redlineCircle;
        }

        /** @deprecated Use [[fromJson]] instead. */
        public static construct(obj: any, viewer: WebViewer): RedlineCircle {
            return RedlineCircle.fromJson(obj, viewer);
        }

        public getClassName(): string {
            return "Communicator.Markup.Redline.RedlineCircle";
        }
    }
}
