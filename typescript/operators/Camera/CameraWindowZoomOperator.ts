/// <reference path="../OperatorBase.ts"/>

namespace Communicator.Operator {
    export class CameraWindowZoomOperator extends OperatorBase {
        private _rectangleMarkup: SelectionRectangleMarkup;
        private _view: View;
        private _computeTarget: boolean;
        private _preserveViewAngle: boolean;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);

            this._rectangleMarkup = new SelectionRectangleMarkup(viewer, true);
            this._view = viewer.view;
            this._computeTarget = false;
            this._preserveViewAngle = true;
        }

        /**
         * When enabled, the camera target will be computed using selection while zooming.
         * This can provide a better zoom behavior in perspective projection mode,
         * but comes at the cost of performing a selection on the model during each zoom operation,
         * which may not be ideal for performance on large models.
         *
         * This setting is disabled by default.
         */
        public setComputeTarget(compute: boolean) {
            this._computeTarget = compute;
        }

        /**
         * Returns whether a new camera target will be computed using selection.
         * See [[setComputeTarget]]
         */
        public getComputeTarget(): boolean {
            return this._computeTarget;
        }

        /**
         * Sets whether to maintain a constant view angle while zooming. If
         * enabled, when zooming causes the camera's field of view to shrink or
         * grow, the camera's position will also be moved toward or away from
         * the target, respectively.
         *
         * This may prevent confusing camera behavior when perspective
         * projection is used or might be used. When using only orthographic
         * projection, it is better to disable this.
         *
         * If window zoom is being using in conjunction with mouse wheel zoom
         * this setting should be the same in both.
         *
         * This setting is enabled by default.
         */
        public setPreserveViewAngle(preserve: boolean) {
            this._preserveViewAngle = preserve;
        }

        /**
         * Gets whether to maintain a constant view angle while zooming. See
         * [[setPreserveViewAngle]].
         */
        public getPreserveViewAngle(): boolean {
            return this._preserveViewAngle;
        }

        private adjustPositionToPlane(pointInPlane: Point3, inPoint: Point3): Point3 | null {
            // Convert points to camera space
            const camera = this._view.getCamera();
            const cameraMatrix = camera.getViewMatrix(this._viewer);
            const npos = cameraMatrix.transform(inPoint);
            const npip = cameraMatrix.transform(pointInPlane);

            npos.z = npip.z;

            const inverseCameraMatrix = Matrix.inverse(cameraMatrix);
            if (inverseCameraMatrix === null) {
                return null;
            }
            return inverseCameraMatrix.transform(npos);
        }

        private computeNewField(
            min: Point2,
            max: Point2,
            newTarget: Point3,
        ): [number, number] | null {
            const center = Point2.add(min, Point2.scale(Point2.subtract(max, min), 0.5));
            const xmaxCanvas = new Point2(max.x, center.y);
            const ymaxCanvas = new Point2(center.x, max.y);
            const xminCanvas = new Point2(min.x, center.y);
            const yminCanvas = new Point2(center.x, min.y);

            const camera = this._view.getCamera();
            const xmaxWorld = camera.getCameraPlaneIntersectionPoint(xmaxCanvas, this._view);
            const ymaxWorld = camera.getCameraPlaneIntersectionPoint(ymaxCanvas, this._view);
            const xminWorld = camera.getCameraPlaneIntersectionPoint(xminCanvas, this._view);
            const yminWorld = camera.getCameraPlaneIntersectionPoint(yminCanvas, this._view);
            if (
                xmaxWorld === null ||
                ymaxWorld === null ||
                xminWorld === null ||
                yminWorld === null
            ) {
                return null;
            }

            const xmaxAdjusted = this.adjustPositionToPlane(newTarget, xmaxWorld);
            const ymaxAdjusted = this.adjustPositionToPlane(newTarget, ymaxWorld);
            const xminAdjusted = this.adjustPositionToPlane(newTarget, xminWorld);
            const yminAdjusted = this.adjustPositionToPlane(newTarget, yminWorld);
            if (
                xmaxAdjusted === null ||
                ymaxAdjusted === null ||
                xminAdjusted === null ||
                yminAdjusted === null
            ) {
                return null;
            }

            const x = Point3.subtract(xmaxAdjusted, xminAdjusted);
            const y = Point3.subtract(ymaxAdjusted, yminAdjusted);

            return [x.length(), y.length()];
        }

        private async computeReasonableTarget(min: Point2, max: Point2): Promise<Point3 | null> {
            const center = Point2.add(min, Point2.scale(Point2.subtract(max, min), 0.5));
            const pickResult = await this._view.pickFromPoint(center, new PickConfig());
            if (pickResult.getNodeId() !== null) {
                return pickResult.getPosition();
            } else {
                let count = 0;
                const found = Point3.zero();

                const selectionId = await this._view.beginScreenSelectByArea(
                    min,
                    max,
                    new IncrementalPickConfig(),
                );
                while (true) {
                    const selectionSet = await this._view.advanceIncrementalSelection(selectionId);
                    if (selectionSet === null) {
                        break;
                    }
                    for (const selectionItem of selectionSet) {
                        const position = selectionItem.getPosition();
                        if (position === null) {
                            continue;
                        }
                        found.add(position);
                        count++;
                    }
                }

                const camera = this._view.getCamera();
                let newTarget = camera.getCameraPlaneIntersectionPoint(center, this._view);
                if (newTarget === null) {
                    return null;
                }
                if (count !== 0) {
                    const average = Point3.scale(found, 1 / count);
                    newTarget = this.adjustPositionToPlane(average, newTarget);
                }
                return newTarget;
            }
        }

        private async getCameraTarget(min: Point2, max: Point2): Promise<Point3 | null> {
            if (this._computeTarget) {
                return this.computeReasonableTarget(min, max);
            }
            const camera = this._view.getCamera();
            const center = Point2.add(min, Point2.scale(Point2.subtract(max, min), 0.5));
            const newTarget = camera.getCameraPlaneIntersectionPoint(center, this._view);
            return newTarget;
        }

        public async doZoom(rectMin: Point2, rectMax: Point2) {
            const oldCamera = this._view.getCamera();
            const newCamera = oldCamera.copy();
            const oldTarget = oldCamera.getTarget();

            const newTarget = await this.getCameraTarget(rectMin, rectMax);
            if (newTarget === null) {
                return;
            }

            const dimensions = this.computeNewField(rectMin, rectMax, newTarget);
            if (dimensions === null) {
                return;
            }
            const [newWidth, newHeight] = dimensions;

            const canvasLowerRight = this._view.getCanvasSize();
            const canvasUpperLeft = new Point2(0, 0);
            const oldDiagonal = Point3.distance(
                oldCamera.getCameraPlaneIntersectionPoint(canvasLowerRight, this._view)!,
                oldCamera.getCameraPlaneIntersectionPoint(canvasUpperLeft, this._view)!,
            );

            newCamera.setWidth(newWidth);
            newCamera.setHeight(newHeight);
            newCamera.setTarget(newTarget);

            this._viewer.pauseRendering(() => {
                this._view.setCamera(newCamera);
                const oldViewVec = Point3.subtract(oldTarget, oldCamera.getPosition());

                let newPosition;
                if (this._preserveViewAngle) {
                    const newDiagonal = Point3.distance(
                        newCamera.getCameraPlaneIntersectionPoint(canvasLowerRight, this._view)!,
                        newCamera.getCameraPlaneIntersectionPoint(canvasUpperLeft, this._view)!,
                    );

                    const fovRatio = oldViewVec.length() / oldDiagonal;
                    newPosition = Point3.add(
                        newTarget,
                        Point3.scale(oldViewVec.negate().normalize(), fovRatio * newDiagonal),
                    );
                } else {
                    newPosition = Point3.subtract(newTarget, oldViewVec);
                }
                newCamera.setPosition(newPosition);
                this._view.setCamera(newCamera);
            });
        }

        /** @hidden */
        public onMouseDown(e: Event.MouseInputEvent): void {
            super.onMouseDown(e);
            if (this.isActive()) {
                e.setHandled(true);
                if (this._rectangleMarkup.isActive()) {
                    this._rectangleMarkup.deactivate();
                }
                this._rectangleMarkup.activate(e.getPosition());
            }
        }

        /** @hidden */
        public onMouseMove(e: Event.MouseInputEvent): void {
            super.onMouseMove(e);
            if (this.isActive() && this._rectangleMarkup.isActive()) {
                e.setHandled(true);
                this._rectangleMarkup.updateCurrentPosition(e.getPosition());
                const markupManager = this._viewer.markupManager;
                markupManager.refreshMarkup();
            }
        }

        /** @hidden */
        public async onMouseUp(e: Event.MouseInputEvent): Promise<void> {
            if (this.isActive() && this._rectangleMarkup.isActive()) {
                const markup = this._rectangleMarkup;
                markup.updateCurrentPosition(e.getPosition());

                if (Point2.subtract(markup.max, markup.min).length() <= 3) {
                    // Don't bother for miniscule rectangles
                    markup.deactivate();
                    return;
                }

                e.setHandled(true);
                await this.doZoom(markup.min, markup.max);
            }
            if (this._rectangleMarkup.isActive()) {
                this._rectangleMarkup.deactivate();
            }
            super.onMouseUp(e);
        }
    }
}
