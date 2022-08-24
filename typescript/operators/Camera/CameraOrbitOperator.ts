/// <reference path="CameraOrbitBaseOperator.ts"/>
/// <reference path="../../Math/Matrix.ts"/>

namespace Communicator.Operator {
    /** @hidden */
    export class OrbitMarkup extends Markup.MarkupItem {
        private _viewer: WebViewer;
        private _circle = new Markup.Shape.Circle();
        private _position: Point3;

        public constructor(viewer: WebViewer, position: Point3, radius: number) {
            super();
            this._viewer = viewer;
            this._position = position;
            this._circle.setRadius(radius);
        }

        public draw(): void {
            if (this._circle) {
                const center = this._viewer.view.projectPoint(this._position);
                this._circle.setCenter(Point2.fromPoint3(center));
                this._viewer.markupManager.getRenderer().drawCircle(this._circle);
            }
        }
    }

    export class CameraOrbitOperator extends CameraOrbitBaseOperator {
        private _orbitTarget: Point3 = Point3.zero();
        private _orbitFallbackMode: OrbitFallbackMode = OrbitFallbackMode.ModelCenter;

        private _modelCenter: Point3 | null = null;

        private _circleMarkupHandler: string | null = null;
        private _circleRadius: number = 3;

        private readonly _updateCameraCenterAction = new Util.CurrentAction(false);
        private readonly _updateCameraCenterTimer = new Util.Timer();

        private _primaryButton: Button = Button.Middle;

        private _pickPosition: Point3 | null = null;
        private _bimOrbitEnabled: boolean = false;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer, (turnTilt: number[]) => {
                //don't orbit on drawings
                if (!this._viewer.sheetManager.isDrawingSheetActive()) {
                    if (this._pickPosition !== null) {
                        // if the middle mouse button is used, rotate around the selection point
                        if (this._circleMarkupHandler === null) {
                            const circleMarkup = new OrbitMarkup(
                                this._viewer,
                                this._pickPosition,
                                this._circleRadius,
                            );
                            this._circleMarkupHandler = this._viewer.markupManager.registerMarkup(
                                circleMarkup,
                            );
                        }
                        this._orbitByTurnTiltWithTarget(turnTilt, this._pickPosition);
                    } else {
                        // otherwise default to the fallback mode
                        const camera = this._viewer.view.getCamera();
                        switch (this._orbitFallbackMode) {
                            default:
                            case OrbitFallbackMode.CameraTarget:
                                this._orbitByTurnTiltWithTarget(turnTilt, camera.getTarget());
                                break;
                            case OrbitFallbackMode.ModelCenter:
                                if (this._modelCenter)
                                    this._orbitByTurnTiltWithTarget(turnTilt, this._modelCenter);
                                break;
                            case OrbitFallbackMode.OrbitTarget:
                                this._orbitByTurnTiltWithTarget(turnTilt, this._orbitTarget);
                                break;
                        }
                    }
                }
            });

            this._viewer.setCallbacks({
                sceneReady: () => {
                    this._updateModelCenter();
                },
                modelSwitched: () => {
                    this._updateModelCenter();
                },

                visibilityChanged: () => {
                    this._updateModelCenter();
                },
                _updateTransform: (isFullyOutOfHierarchy: boolean) => {
                    if (!isFullyOutOfHierarchy) {
                        this._updateModelCenter();
                    }
                },
                _geometryCreated: () => {
                    this._updateModelCenter();
                },
                hwfParseComplete: () => {
                    this._updateModelCenter();
                },
            });
        }

        private _updateModelCenter(maxRetries = 50): void {
            this._updateCameraCenterTimer.clear();

            this._updateCameraCenterAction.set(async () => {
                const modelBounding = await this._viewer.model.getModelBounding(true, false);

                if (modelBounding.isDegenerate() && maxRetries > 0) {
                    this._updateCameraCenterTimer.set(500, () => {
                        this._updateModelCenter(maxRetries - 1);
                    });
                    return;
                }

                this._modelCenter = modelBounding.center();
            });
        }

        /** @hidden */
        public async onMouseDown(event: Event.MouseInputEvent): Promise<void> {
            super.onMouseDown(event);

            if (this.isActive()) {
                if (event.getButton() === this._primaryButton) {
                    const selection = await this._viewer.view.pickFromPoint(
                        event.getPosition(),
                        new PickConfig(SelectionMask.Face),
                    );
                    if (selection !== null && selection.overlayIndex() === 0) {
                        this._pickPosition = selection.getPosition();
                        event.setHandled(true);
                    } else {
                        this._pickPosition = null;
                    }
                }
            }
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            super.onMouseUp(event);

            if (event.getButton() === this._primaryButton) {
                this._pickPosition = null;
            }
            this._removeMarkup();
        }

        /** @hidden */
        public onDeactivate(): void | Promise<void> {
            const p = super.onDeactivate();
            this._updateCameraCenterTimer.clear();
            return p;
        }

        /**
         * BIM orbit is intended to make orbiting building models easier.
         * It slows the rotation speed, clamps vertical rotation to 180 degrees, and restricts horizontal rotation to rotate around the vertical axis.
         * @param bimOrbitEnabled
         */
        public setBimOrbitEnabled(bimOrbitEnabled: boolean): void {
            this._bimOrbitEnabled = bimOrbitEnabled;
        }

        /**
         * Returns true if BIM orbit is enabled.
         */
        public getBimOrbitEnabled(): boolean {
            return this._bimOrbitEnabled;
        }

        /** @hidden */
        public _removeMarkup(): void {
            if (this._circleMarkupHandler !== null) {
                this._viewer.markupManager.unregisterMarkup(this._circleMarkupHandler);
                this._circleMarkupHandler = null;
            }
        }

        private _getClampedRotationMatrix(
            axis: Point3,
            degrees: number,
            up: Point3,
            viewAxesUp: Point3,
        ): Matrix {
            const matrixTilt = Matrix.createFromOffAxisRotation(axis, degrees);

            const newUp = Point3.zero();
            matrixTilt.transform(up, newUp);

            const degreesUp = Util.radiansToDegrees(Math.asin(Point3.dot(viewAxesUp, newUp)));

            if (degreesUp <= 0) {
                return new Matrix();
            } else {
                return matrixTilt;
            }
        }

        private _orbitByTurnTiltWithTarget(turnTilt: number[], delta: Point3): void {
            const view = this._viewer.view;
            const camera = view.getCamera();

            let position = camera.getPosition().subtract(delta);
            let target = camera.getTarget().subtract(delta);
            let up = camera.getUp().normalize();

            const forward = Point3.subtract(target, position).normalize();
            const left = Point3.cross(up, forward).normalize();

            const turn = turnTilt[0];
            const tilt = turnTilt[1];

            //pitch
            let matrixTilt = new Matrix();
            //yaw
            let matrixTurn = new Matrix();

            if (this._bimOrbitEnabled) {
                const viewAxes = this._viewer.model.getViewAxes();
                const viewAxesUp = viewAxes.upVector.copy();

                // Rotate around camera left axis using y translation
                matrixTilt = this._getClampedRotationMatrix(left, tilt, up, viewAxesUp);
                // Rotate around the view axes up axis using x translation
                matrixTurn = Matrix.createFromOffAxisRotation(viewAxesUp, turn / 4);

                const newPosition = matrixTurn.transform(matrixTilt.transform(position));
                const newTarget = matrixTurn.transform(matrixTilt.transform(target));
                const newUp = matrixTurn.transform(matrixTilt.transform(Point3.add(position, up)));

                newUp.subtract(newPosition);

                position = newPosition;
                target = newTarget;
                up = newUp;
            } else {
                // Tilt around left axis using y translation
                matrixTilt = Matrix.createFromOffAxisRotation(left, tilt);

                // Turn around up axis using x translation
                matrixTurn = Matrix.createFromOffAxisRotation(up, turn);

                // Concatenate tilt/turn
                const matrixTiltTurn = Matrix.multiply(matrixTurn, matrixTilt);

                const newPosition = matrixTiltTurn.transform(position);
                const newTarget = matrixTiltTurn.transform(target);
                const newUp = matrixTiltTurn.transform(Point3.add(position, up));

                newUp.subtract(newPosition);

                position = newPosition;
                target = newTarget;
                up = newUp;
            }

            position.add(delta);
            target.add(delta);

            camera.setPosition(position);
            camera.setTarget(target);
            camera.setUp(up);

            view.setCamera(camera);
        }

        /**
         * Sets the fallback mode. This is used to specify whether to orbit
         * around a set target, the model center, or camera target.
         */
        public setOrbitFallbackMode(fallbackMode: OrbitFallbackMode): void {
            this._orbitFallbackMode = fallbackMode;
        }

        /**
         * Gets the orbit fallback mode.
         * @returns orbit fallback mode
         */
        public getOrbitFallbackMode(): OrbitFallbackMode {
            return this._orbitFallbackMode;
        }

        /**
         * Sets the orbit target for the orbit fallback mode OrbitTarget.
         * @param orbitTarget
         */
        public setOrbitTarget(orbitTarget: Point3): void {
            this._orbitTarget = orbitTarget;
        }

        /**
         * Gets the orbit target point.
         * @returns orbit target
         */
        public getOrbitTarget(): Point3 {
            return this._orbitTarget;
        }

        /**
         * Sets the primary mouse button. When this button is pressed, we will orbit around the selected point on the model.
         * If there is no selected point, the orbit fallback mode will be used for orbit.
         * @param button
         */
        public setPrimaryButton(button: Button): void {
            this._primaryButton = button;
        }

        /**
         * @returns the primary orbit button
         */
        public getPrimaryButton(): Button {
            return this._primaryButton;
        }
    }
}
