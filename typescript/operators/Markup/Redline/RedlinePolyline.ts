/// <reference path="../../../Markup/Shapes/Polyline.ts"/>
/// <reference path="../../../Markup/Redline/RedlineItem.ts"/>

namespace Communicator.Markup.Redline {
    /** @hidden */
    export class RedlinePolyline extends RedlineItem {
        private _uniqueId: Uuid = UUID.create();
        private _points: Point3[] = [];

        private _polylineShape: Shape.Polyline = new Shape.Polyline();

        private _previousDragPlanePosition: Point3 = Point3.zero();

        public constructor(viewer: WebViewer) {
            super(viewer);

            this._polylineShape.setStrokeWidth(2);
            this._polylineShape.setStrokeColor(Color.red());
        }

        public addPoint(point: Point3): void {
            this._points.push(point.copy());
        }

        public getPoints(): Point3[] {
            const points: Point3[] = [];
            this._points.forEach((point) => {
                points.push(point.copy());
            });
            return points;
        }

        private _update(): void {
            const view = this._viewer.view;
            this._polylineShape.clearPoints();

            for (const point of this._points) {
                const point2d = Point2.fromPoint3(view.projectPoint(point));
                this._polylineShape.pushPoint(point2d);
            }
        }

        public draw(): void {
            this._update();

            if (this.isValid())
                this._viewer.markupManager.getRenderer().drawPolyline(this._polylineShape);
        }

        public hit(point: Point2): boolean {
            return this.hitWithTolerance(point, 0);
        }

        public hitWithTolerance(point: Point2, pickTolerance: number): boolean {
            this._update();

            const tolerance = this._polylineShape.getStrokeWidth() + pickTolerance;

            const points = this._polylineShape.getPoints();

            if (points.length > 1) {
                for (let i = 1; i < points.length; i++) {
                    if (Util.isPointOnLineSegment2d(point, points[i - 1], points[i], tolerance))
                        return true;
                }
            }

            return false;
        }

        public onSelect(): void {
            this._polylineShape.setStrokeWidth(4.0);
        }

        public onDeselect(): void {
            this._polylineShape.setStrokeWidth(2.0);
        }

        public getClassName(): string {
            return "Communicator.Markup.Redline.RedlinePolyline";
        }

        public isValid(): boolean {
            return this._points.length > 1;
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

                for (const point of this._points) point.add(delta);

                this._polylineShape.clearPoints();

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
            const points: Object[] = [];

            for (const point of this._points) points.push(point.toJson());

            return {
                uniqueId: this._uniqueId,
                points: points,
            };
        }

        /** @deprecated Use [[toJson]] instead. */
        public forJson(): Object {
            return this.toJson();
        }

        /**
         * Creates a new [[RedlinePolyline]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): RedlinePolyline {
            const obj = objData as ReturnType<RedlinePolyline["_toJson"]>;

            const redlinePolyLine = new RedlinePolyline(viewer);

            redlinePolyLine._uniqueId = obj.uniqueId;

            for (const point of obj.points) {
                redlinePolyLine.addPoint(Point3.fromJson(point));
            }

            return redlinePolyLine;
        }

        /** @deprecated Use [[fromJson]] instead. */
        public static construct(obj: any, viewer: WebViewer): RedlinePolyline {
            return RedlinePolyline.fromJson(obj, viewer);
        }
    }
}
