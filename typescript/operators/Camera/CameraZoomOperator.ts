/// <reference path="../OperatorBase.ts"/>

namespace Communicator.Operator {
    export class CameraZoomOperator extends OperatorBase {
        private _mouseMoveZoomDelta = 3;
        private _mouseWheelZoomDelta = 0.25;
        private _pinchZoomModifier = 2.5;
        private _zoomToMousePosition = true;
        private _dollyZoomEnabled = false;
        private _adjustCameraTarget = false;
        private _preserveViewAngle = true;

        private _mouseMoveZoomFactor: 1 | -1 = 1; // TODO: Create and use [[const enum ZoomFactor { Inverted = -1, Normal = 1; }]]
        private _mouseWheelZoomFactor: 1 | -1 = -1; // TODO: see above

        private _secondaryTouchId: number | null = null;
        private _lastTouch1 = Point2.zero();
        private _lastTouch2 = Point2.zero();
        private _prevLen = 0.0;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);
        }

        /**
         * When true, scrolling up will zoom towards the model.
         * @param inverted
         */
        public setMouseWheelZoomInverted(inverted: boolean): void {
            if (inverted) {
                this._mouseWheelZoomFactor = -1;
            } else {
                this._mouseWheelZoomFactor = 1;
            }
        }

        public getMouseWheelZoomInverted(): boolean {
            return this._mouseWheelZoomFactor === -1;
        }

        /**
         * When true, moving the mouse up will zoom towards the model.
         * @param inverted
         */
        public setMouseMoveZoomInverted(inverted: boolean): void {
            if (inverted) {
                this._mouseMoveZoomFactor = -1;
            } else {
                this._mouseMoveZoomFactor = 1;
            }
        }

        public getMouseMoveZoomInverted(): boolean {
            return this._mouseMoveZoomFactor === -1;
        }

        /**
         * Sets the delta to zoom when moving the mouse
         * @param delta
         */
        public setMouseMoveZoomDelta(delta: number): void {
            this._mouseMoveZoomDelta = delta;
        }

        /**
         * Gets the mouse move zoom delta
         * @returns number
         */
        public getMouseMoveZoomDelta(): number {
            return this._mouseMoveZoomDelta;
        }

        /**
         * Sets the delta to zoom when scrolling
         * @param delta
         */
        public setMouseWheelZoomDelta(delta: number): void {
            this._mouseWheelZoomDelta = delta;
        }

        /**
         * Gets the scrollwheel zoom delta
         * @returns number
         */
        public getMouseWheelZoomDelta(): number {
            return this._mouseWheelZoomDelta;
        }

        /**
         * When set, the zoom will be towards the mouse position. When not set, the zoom will be from the center of the screen.
         * @param zoom
         */
        public setZoomToMousePosition(zoom: boolean): void {
            this._zoomToMousePosition = zoom;
        }

        /**
         * @returns boolean When true, the zoom will be towards the mouse position. When false, the zoom will be towards the center of the screen.
         */
        public getZoomToMousePosition(): boolean {
            return this._zoomToMousePosition;
        }

        /**
         * When dolly zoom is enabled, the camera position will move towards the camera target when zooming.
         * @moveCameraPositon
         */
        public setDollyZoomEnabled(dollyZoomEnabled: boolean): void {
            this._dollyZoomEnabled = dollyZoomEnabled;
        }

        /**
         * Returns true if dolly zoom is enabled.
         */
        public getDollyZoomEnabled(): boolean {
            return this._dollyZoomEnabled;
        }

        /**
         * When enabled, the camera target will be updated to the selection position while zooming.
         * This can provide a better zoom behavior in perspective projection mode,
         * but comes at the cost of performing a selection on the model during each mouse scroll,
         * which may not be ideal for performance on large models.
         *
         * This setting is disabled by default.
         */
        public setMouseWheelAdjustCameraTarget(value: boolean): void {
            this._adjustCameraTarget = value;
        }

        /**
         * Returns whether the camera target will be updated to the selection
         * position while zooming. See [[setMouseWheelAdjustCameraTarget]].
         */
        public getMouseWheelAdjustCameraTarget(): boolean {
            return this._adjustCameraTarget;
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
         * If mouse wheel zoom is being using in conjunction with window zoom
         * this setting should be the same in both.
         *
         * This setting is enabled by default.
         */
        public setPreserveViewAngle(value: boolean): void {
            this._preserveViewAngle = value;
        }

        /**
         * Gets whether to maintain a constant view angle while zooming. See
         * [[setPreserveViewAngle]].
         */
        public getPreserveViewAngle(): boolean {
            return this._preserveViewAngle;
        }

        /** @hidden */
        public async onMouseMove(event: Event.MouseInputEvent): Promise<void> {
            super.onMouseMove(event);

            if (this.isDragging() && this.isActive()) {
                const view = this._viewer.view;

                const currentWindowPosition = view.pointToWindowPosition(this._ptCurrent);
                const prevWindowPosition = view.pointToWindowPosition(this._ptPrevious);

                const deltaY = currentWindowPosition.y - prevWindowPosition.y;
                const deltaX = currentWindowPosition.x - prevWindowPosition.x;
                const delta =
                    this._mouseMoveZoomDelta * this._mouseMoveZoomFactor * (deltaY - deltaX);

                if (this._dollyZoomEnabled) {
                    await this._dollyZoom(delta, undefined, undefined, true);
                } else {
                    await this._doZoom(delta);
                }
            }
        }

        /** @hidden */
        public async onMousewheel(event: Event.MouseWheelInputEvent): Promise<void> {
            const delta =
                this._mouseWheelZoomDelta * this._mouseWheelZoomFactor * event.getWheelDelta();
            if (this._dollyZoomEnabled) {
                await this._dollyZoom(-delta, undefined, event.getPosition());
            } else {
                await this._doZoom(delta, undefined, event.getPosition());
            }
        }

        /** @hidden */
        public onTouchStart(event: Event.TouchInputEvent): void {
            const view = this._viewer.view;

            if (this._primaryTouchId === null) {
                this._primaryTouchId = event.getId();
                this._lastTouch1.assign(view.pointToWindowPosition(event.getPosition()));
            } else if (this._secondaryTouchId === null) {
                this._secondaryTouchId = event.getId();
                this._lastTouch2.assign(view.pointToWindowPosition(event.getPosition()));
            }

            //set up variables for starting the touch zoom process
            if (this._primaryTouchId !== null && this._secondaryTouchId !== null) {
                this._prevLen = Point2.subtract(this._lastTouch2, this._lastTouch1).length();
                this._dragging = true;
            }
        }

        /** @hidden */
        public onTouchMove(event: Event.TouchInputEvent): Promise<void> {
            const view = this._viewer.view;
            const id = event.getId();
            const position = event.getPosition();

            if (id === this._primaryTouchId)
                this._lastTouch1.assign(view.pointToWindowPosition(position));
            else if (id === this._secondaryTouchId)
                this._lastTouch2.assign(view.pointToWindowPosition(position));

            if (this._dragging && (id === this._primaryTouchId || id === this._secondaryTouchId)) {
                const l1 = Point2.subtract(this._lastTouch2, this._lastTouch1).length();
                const zoomFactor = (this._prevLen - l1) * this._pinchZoomModifier;

                const zoom = 1.0 / (1.0 - zoomFactor);
                this._zoomHelper(zoom, this._viewer.view.getCamera());

                this._prevLen = l1;
            }
            return Promise.resolve();
        }

        /** @hidden */
        public onTouchEnd(event: Event.TouchInputEvent): void {
            const id = event.getId();

            if (this._primaryTouchId === id) this._primaryTouchId = null;
            else if (this._secondaryTouchId === id) this._secondaryTouchId = null;

            this._dragging = false;
        }

        /** @hidden */
        public onDeactivate(): void {
            this._primaryTouchId = null;
            this._secondaryTouchId = null;
        }

        private _updateCameraViewAngle(camera: Camera): Camera {
            const radians = Util.degreesToRadians(90);
            const tan = Math.tan(radians / 2);
            const length = Point3.subtract(camera.getTarget(), camera.getPosition()).length();
            const width = length * tan;
            camera.setWidth(width);
            camera.setHeight(width);
            return camera;
        }

        private async _dollyZoom(
            delta: number,
            camera: Camera = this._viewer.view.getCamera(),
            mousePosition?: Point2,
            dollyTarget: boolean = false,
        ): Promise<void> {
            const view = this._viewer.view;
            camera.setProjection(Projection.Perspective);

            const cameraPosition = camera.getPosition();
            const cameraTarget = camera.getTarget();

            if (mousePosition) {
                const modelBounding = await this._viewer.model.getModelBounding(
                    false,
                    false,
                    false,
                );
                const extentsLength = modelBounding.extents().length();
                const minTargetDistance = extentsLength / 100;

                const selection = await this._viewer.view.pickFromPoint(
                    mousePosition,
                    new PickConfig(),
                );
                const selectionPosition = selection.getPosition();

                // Adjust camera target based on selection position
                if (selectionPosition !== null) {
                    const a = Point3.subtract(cameraTarget, cameraPosition);
                    const b = Point3.subtract(selectionPosition, cameraPosition);
                    const newTarget = Point3.add(
                        cameraPosition,
                        a.scale(Point3.dot(a, b) / Point3.dot(a, a)),
                    );
                    camera.setTarget(newTarget);
                }

                let eyeVector = Point3.subtract(camera.getTarget(), cameraPosition);

                // Dolly target forward if the position is too close
                if (delta > 0 && eyeVector.length() < minTargetDistance) {
                    camera.setTarget(
                        Point3.add(
                            cameraTarget,
                            eyeVector
                                .copy()
                                .normalize()
                                .scale(minTargetDistance * 2),
                        ),
                    );
                }

                eyeVector = Point3.subtract(camera.getTarget(), cameraPosition);
                camera.setPosition(Point3.add(cameraPosition, eyeVector.copy().scale(delta / 10)));
            } else {
                const eyeVector = Point3.subtract(cameraTarget, cameraPosition).scale(delta / 10);
                camera.setPosition(Point3.add(cameraPosition, eyeVector));

                if (dollyTarget) {
                    camera.setTarget(Point3.add(cameraTarget, eyeVector));
                }
            }

            camera = this._updateCameraViewAngle(camera);

            this._viewer.pauseRendering(() => {
                if (mousePosition) {
                    const intersectionPoint = camera.getCameraPlaneIntersectionPoint(
                        mousePosition,
                        this._viewer.view,
                    );

                    view.setCamera(camera);

                    const intersectionPoint2 = camera.getCameraPlaneIntersectionPoint(
                        mousePosition,
                        this._viewer.view,
                    );
                    if (intersectionPoint !== null && intersectionPoint2 !== null) {
                        camera.dolly(Point3.subtract(intersectionPoint2, intersectionPoint));
                    }
                }

                view.setCamera(camera);
            });
        }

        private async _doZoom(
            delta: number,
            camera: Camera = this._viewer.view.getCamera(),
            mousePosition?: Point2,
        ): Promise<void> {
            const view = this._viewer.view;
            const zoom = Math.max(1.0 / (1.0 - delta), 0.001);

            if (mousePosition && this._zoomToMousePosition) {
                if (this._adjustCameraTarget) {
                    const selection = await this._viewer.view.pickFromPoint(
                        mousePosition,
                        new PickConfig(),
                    );
                    if (selection !== undefined && selection.isEntitySelection()) {
                        const reverseEyeVector = camera.getPosition().subtract(camera.getTarget());

                        const a = Point3.subtract(camera.getTarget(), camera.getPosition());
                        const b = Point3.subtract(selection.getPosition(), camera.getPosition());
                        const newTarget = camera
                            .getPosition()
                            .add(a.scale(Point3.dot(a, b) / Point3.dot(a, a)));

                        camera.setTarget(newTarget);
                        camera.setPosition(Point3.add(newTarget, reverseEyeVector));
                    }
                }

                this._viewer.pauseRendering(() => {
                    const intersectionPoint = camera.getCameraPlaneIntersectionPoint(
                        mousePosition,
                        this._viewer.view,
                    );
                    this._zoomHelper(zoom, camera);

                    // pan
                    const intersectionPoint2 = camera.getCameraPlaneIntersectionPoint(
                        mousePosition,
                        this._viewer.view,
                    );
                    if (intersectionPoint !== null && intersectionPoint2 !== null) {
                        camera.dolly(Point3.subtract(intersectionPoint2, intersectionPoint));
                    }
                    view.setCamera(camera);
                });
            } else {
                this._zoomHelper(zoom, camera);
            }
        }

        private _zoomHelper(zoom: number, camera: Camera): void {
            const view = this._viewer.view;

            camera.setWidth(camera.getWidth() * zoom);
            camera.setHeight(camera.getHeight() * zoom);

            if (this._preserveViewAngle && !this._viewer.sheetManager.isDrawingSheetActive()) {
                const position = camera.getPosition();
                const target = camera.getTarget();

                const newDelta = Point3.subtract(target, position).scale(zoom);
                const newPosition = Point3.subtract(target, newDelta);
                camera.setPosition(newPosition);
            }

            view.setCamera(camera);
        }
    }
}
