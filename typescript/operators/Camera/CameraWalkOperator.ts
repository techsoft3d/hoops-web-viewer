/// <reference path="./CameraWalkBaseOperator.ts"/>

namespace Communicator.Operator {
    export class CameraWalkOperator extends CameraWalkBaseOperator {
        private _timerId: number | null = null;
        private _walkButton = Button.None;
        private _previousTimestamp: number = 0;
        private _activeTouchCount = 0;

        private _maxDistance: number = 200;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);
        }

        /** @hidden */
        public async onActivate(): Promise<void> {
            await super.onActivate();
            this._viewer.trigger("walkOperatorActivated");
        }

        /** @hidden */
        public onKeyDown(event: Event.KeyInputEvent): void {
            const keyCode = event.getKeyCode();
            const walkSpeed = this.getWalkSpeed();
            if (keyCode === KeyCode.PgUp) {
                this.setWalkSpeed(walkSpeed * 1.2);
            }
            if (keyCode === KeyCode.PgDown) {
                this.setWalkSpeed(walkSpeed * 0.8);
            }
            if (keyCode === KeyCode.v) {
                this.toggleBimMode() as Internal.UnusedPromise;
            }
        }

        /** @hidden */
        public async onDeactivate(): Promise<void> {
            const p = this._resetCameraTarget();
            this.stopWalking();
            await super.onDeactivate();
            this._viewer.trigger("walkOperatorDeactivated");
            return p;
        }

        // This can resolve issues that arise if the user activates a CAD view while walking that may change the projection mode.
        private _checkProjection() {
            const view = this._viewer.view;

            if (!(view.getProjectionMode() === Projection.Perspective)) {
                view.setProjectionMode(Projection.Perspective);
                this._calculateInitialPosition();
            }
        }

        /** @hidden */
        public onMouseDown(event: Event.MouseInputEvent): void {
            super.onMouseDown(event);

            this._checkProjection();

            if (this.isActive()) {
                this.stopWalking();
                this.setWalkActive(true);
                this._walkButton = event.getButton();
            }
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);

            if (this.getWalkActive() && this._timerId === null && this.isActive()) {
                this._previousTimestamp = Date.now();
                this._onTick();
            }
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            if (this.isActive()) {
                this.stopWalking();
            }

            super.onMouseUp(event);
        }

        /** @hidden */
        public onTouchStart(event: Event.TouchInputEvent): void {
            super.onTouchStart(event);

            ++this._activeTouchCount;

            if (this._activeTouchCount === 1) {
                this._walkButton = Button.Left;
            } else if (this._activeTouchCount === 2) {
                this._walkButton = Button.Right;
            } else if (this._activeTouchCount === 3) {
                this._walkButton = Button.None;
            }
        }

        /** @hidden */
        public async onTouchMove(event: Event.TouchInputEvent): Promise<void> {
            if (this._activeTouchCount === 3 && this._primaryTouchId === event.getId()) {
                this._ptCurrent.assign(event.getPosition());

                const delta = Point2.subtract(this._ptCurrent, this._ptPrevious);
                this._adjustTilt((delta.y / 100) * 1.5);
            } else if (this._activeTouchCount < 3) {
                await super.onTouchMove(event);
            }
            return Promise.resolve();
        }

        /** @hidden */
        public onTouchEnd(event: Event.TouchInputEvent): void {
            super.onTouchEnd(event);

            if (this._activeTouchCount > 0) {
                --this._activeTouchCount;
            }
        }

        /** @hidden */
        public onMousewheel(event: Event.MouseWheelInputEvent): void {
            this._checkProjection();

            if (event.getWheelDelta() > 0) this._adjustTilt(3.0);
            else this._adjustTilt(-3.0);
        }

        /** @hidden */
        public stopWalking(): void {
            if (this._timerId !== null) {
                cancelAnimationFrame(this._timerId);
                this._timerId = null;
            }
            this.setWalkActive(false);
        }

        /** @hidden */
        public async _testWalk(
            walkSpeed: number,
            walkDuration: number,
            button: Button,
        ): Promise<void> {
            const mouseDownEvent = new Event.MouseInputEvent(
                0,
                0,
                button,
                Buttons.None,
                KeyModifiers.None,
                MouseInputType.Down,
            );
            const mouseMoveEvent = new Event.MouseInputEvent(
                0,
                walkSpeed,
                button,
                Buttons.None,
                KeyModifiers.None,
                MouseInputType.Move,
            );
            const mouseUpEvent = new Event.MouseInputEvent(
                0,
                walkSpeed,
                button,
                Buttons.None,
                KeyModifiers.None,
                MouseInputType.Up,
            );

            this.onMouseDown(mouseDownEvent);
            this.onMouseMove(mouseMoveEvent);

            await Util.sleep(walkDuration);
            this.onMouseUp(mouseUpEvent);
        }

        /** @hidden */
        protected _onTick(): void {
            const timestamp = Date.now();
            const timeDelta = (timestamp - this._previousTimestamp) / 1000;
            this._previousTimestamp = timestamp;

            const view = this._viewer.view;

            const posDelta = Point2.subtract(this._ptCurrent, this._ptFirst);
            const operatorScale = new Point2(
                Math.abs(posDelta.x) / this._maxDistance,
                Math.abs(posDelta.y) / this._maxDistance,
            );

            const rotDegrees = this.getRotationSpeed() * timeDelta * operatorScale.x;
            const walkDistance = this.getWalkSpeed() * timeDelta * operatorScale.y;
            const elevationDistanceX = this.getElevationSpeed() * timeDelta * operatorScale.x;
            const elevationDistanceY = this.getElevationSpeed() * timeDelta * operatorScale.y;

            if (this._walkButton === Button.Left) {
                if (posDelta.x !== 0) {
                    if (posDelta.x > 0) this.rotateRight(rotDegrees);
                    else if (posDelta.x < 0) this.rotateLeft(rotDegrees);
                }

                if (posDelta.y !== 0) {
                    const camera = view.getCamera();
                    this._resetPosition(camera);

                    const target = camera.getTarget();
                    const position = camera.getPosition();
                    const forward = Point3.subtract(target, position).normalize();
                    const up = camera.getUp();

                    let walkDelta = Point3.scale(forward, walkDistance);
                    if (posDelta.y > 0) {
                        walkDelta = walkDelta.negate();
                    }

                    this.setWalkActive(true);
                    const bimMode = this.getBimModeEnabled();
                    this.getActiveWalk().set(async () => {
                        if (bimMode) {
                            await this._applyWalkDeltaWithCollisionCheck(camera, walkDelta, up);
                            await this._applyGravity();
                            await this._updateNearbyDoors();
                        } else {
                            return this._applyWalkDelta(camera, walkDelta);
                        }
                    });
                }
            } else if (this._walkButton === Button.Right || this._walkButton === Button.Middle) {
                if (Math.abs(posDelta.y) > 0) {
                    if (posDelta.y > 0) {
                        this.walkUp(elevationDistanceY);
                    } else {
                        this.walkDown(elevationDistanceY);
                    }
                }

                if (Math.abs(posDelta.x) > 0) {
                    if (posDelta.x > 0) {
                        this.walkRight(elevationDistanceX);
                    } else {
                        this.walkLeft(elevationDistanceX);
                    }
                }
            }

            this._timerId = requestAnimationFrame(() => {
                this._onTick();
            });
        }

        private _adjustTilt(amount: number): void {
            const view = this._viewer.view;
            this.setTilt(this.getTilt() + amount);

            const camera = view.getCamera();
            this._resetPosition(camera);

            const target = camera.getTarget();
            const position = camera.getPosition();

            const targetDistance = Point3.distance(target, position);
            const up = camera.getUp().normalize();
            const forward = Point3.subtract(target, position).normalize();
            const left = Point3.cross(up, forward).normalize();

            const tiltMatrix = Matrix.createFromOffAxisRotation(left, this.getTilt());
            tiltMatrix.transform(forward, forward);
            forward.normalize().scale(targetDistance);

            camera.setTarget(Point3.add(position, forward));
            view.setCamera(camera);
        }

        private async _resetCameraTarget(): Promise<void> {
            const view = this._viewer.view;
            const viewSize = view.getCanvasSize();

            const center = new Point2(Math.round(viewSize.x / 2), Math.round(viewSize.y / 2));
            const config = new PickConfig();

            const selection = await view.pickFromPoint(center, config);
            if (selection.isEntitySelection()) {
                const camera = view.getCamera();
                camera.setTarget(selection.getPosition());
                view.updateCamera(camera);
            }
        }
    }
}
