/// <reference path="../../../Markup/Redline/RedlineItem.ts"/>

namespace Communicator.Markup.Redline {
    /** @hidden */
    export class RedlineRectangle extends RedlineItem {
        private _uniqueId: Uuid = UUID.create();

        private _point1: Point3 = Point3.zero();
        private _point2: Point3 = Point3.zero();

        private _rectangleShape: Shape.Rectangle = new Shape.Rectangle();

        private static _validSizeTolerance: Point2 = new Point2(5, 5);

        private _previousDragPlanePosition: Point3 = Point3.zero();

        public constructor(viewer: WebViewer) {
            super(viewer);

            this._rectangleShape.setFillOpacity(0);
            this._rectangleShape.setStrokeColor(Color.red());
            this._rectangleShape.setStrokeWidth(2.0);
        }

        public setPoint1(point1: Point3): void {
            this._point1.assign(point1);
        }

        public getPoint1(): Point3 {
            return this._point1.copy();
        }

        public setPoint2(point2: Point3): void {
            this._point2.assign(point2);
        }

        public getPoint2(): Point3 {
            return this._point2.copy();
        }

        public getUniqueId(): Uuid {
            return this._uniqueId;
        }

        private _update(): void {
            const view = this._viewer.view;

            const screenPoint1 = view.projectPoint(this._point1);
            const screenPoint2 = view.projectPoint(this._point2);

            const min = new Point2(
                Math.min(screenPoint1.x, screenPoint2.x),
                Math.min(screenPoint1.y, screenPoint2.y),
            );
            const max = new Point2(
                Math.max(screenPoint1.x, screenPoint2.x),
                Math.max(screenPoint1.y, screenPoint2.y),
            );

            const size = Point2.subtract(max, min);

            this._rectangleShape.setPosition(min);
            this._rectangleShape.setSize(size);
        }

        public draw(): void {
            this._update();

            this._viewer.markupManager.getRenderer().drawRectangle(this._rectangleShape);
        }

        public hit(point: Point2): boolean {
            return this.hitWithTolerance(point, 0);
        }

        public hitWithTolerance(point: Point2, pickTolerance: number): boolean {
            this._update();

            const tolerance = this._rectangleShape.getStrokeWidth() + pickTolerance;

            const position = this._rectangleShape.getPosition();
            const size = this._rectangleShape.getSize();

            const topLeft = position;
            const topRight = new Point2(position.x + size.x, topLeft.y);
            const bottomLeft = new Point2(position.x, position.y + size.y);
            const bottomRight = new Point2(position.x + size.x, position.y + size.y);

            if (Util.isPointOnLineSegment2d(point, topLeft, topRight, tolerance)) return true;
            else if (Util.isPointOnLineSegment2d(point, topRight, bottomRight, tolerance))
                return true;
            else if (Util.isPointOnLineSegment2d(point, bottomRight, bottomLeft, tolerance))
                return true;
            else if (Util.isPointOnLineSegment2d(point, bottomLeft, topLeft, tolerance))
                return true;

            return false;
        }

        public onSelect(): void {
            this._rectangleShape.setStrokeWidth(4.0);
        }

        public onDeselect(): void {
            this._rectangleShape.setStrokeWidth(2.0);
        }

        public isValid(): boolean {
            const size = this._rectangleShape.getSize();

            return (
                size.x > RedlineRectangle._validSizeTolerance.x &&
                size.y > RedlineRectangle._validSizeTolerance.y
            );
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

                this._point1.add(delta);
                this._point2.add(delta);

                this._previousDragPlanePosition.assign(cameraPoint);
            }
            return true;
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
                uniqueId: this._uniqueId,
                className: this.getClassName(),
                point1: this._point1.toJson(),
                point2: this._point2.toJson(),
            };
        }

        /** @deprecated Use [[toJson]] instead. */
        public forJson(): Object {
            return this.toJson();
        }

        /**
         * Creates a new [[RedlineRectangle]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): RedlineRectangle {
            const obj = objData as ReturnType<RedlineRectangle["_toJson"]>;

            const redlineRectangle = new RedlineRectangle(viewer);

            redlineRectangle._uniqueId = obj.uniqueId;
            redlineRectangle.setPoint1(Point3.fromJson(obj.point1));
            redlineRectangle.setPoint2(Point3.fromJson(obj.point2));

            return redlineRectangle;
        }

        /** @deprecated Use [[fromJson]] instead. */
        public static construct(obj: any, viewer: WebViewer): RedlineRectangle {
            return RedlineRectangle.fromJson(obj, viewer);
        }

        public getClassName(): string {
            return "Communicator.Markup.Redline.RedlineRectangle";
        }
    }
}
