/// <reference path="./CameraWalkBaseOperator.ts"/>

namespace Communicator.Operator {
    /**
     * Normalizes a set of directions such that it does not contain
     * opposing directions. If opposing directions do exist, then they
     * cancel each other and are removed from the set.
     */
    function normalizeDirections(directions: Set<WalkDirection>): void {
        removeOpposing(directions, WalkDirection.Forward, WalkDirection.Backward);
        removeOpposing(directions, WalkDirection.Left, WalkDirection.Right);
        removeOpposing(directions, WalkDirection.Up, WalkDirection.Down);
        removeOpposing(directions, WalkDirection.RotateLeft, WalkDirection.RotateRight);
        removeOpposing(directions, WalkDirection.TiltUp, WalkDirection.TiltDown);
    }

    /**
     * If the input set contains both `x` and `y`, then both `x` and `y` are removed from the set.
     * Otherwise this function does nothing.
     *
     * @param set The set to inspect and alter.
     * @param x The value that cancels with `y`.
     * @param y The value that cancels with `x`.
     */
    function removeOpposing<T>(set: Set<T>, x: T, y: T): void {
        if (set.has(x) && set.has(y)) {
            set.delete(x);
            set.delete(y);
        }
    }

    export class CameraKeyboardWalkOperator extends CameraWalkBaseOperator {
        private readonly _keyWalkMapping = new Map<KeyCode, WalkDirection>();

        private readonly _keyUpMap = new Map<KeyCode, number>();
        private readonly _keyDownMap = new Map<KeyCode, number>();

        private _mouseLookSpeed = 0;
        private _mouseLookEnabled = true;
        private _previousWalkTime = 0;

        private _tickTimerId: number | null = null;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);

            viewer.setCallbacks({
                camera: (camera) => {
                    if (camera.getProjection() !== Projection.Perspective) {
                        this._keyDownMap.clear();
                    }
                },
            });

            this.addKeyMapping(KeyCode.a, WalkDirection.Left);
            this.addKeyMapping(KeyCode.d, WalkDirection.Right);
            this.addKeyMapping(KeyCode.w, WalkDirection.Forward);
            this.addKeyMapping(KeyCode.s, WalkDirection.Backward);
            this.addKeyMapping(KeyCode.q, WalkDirection.RotateLeft);
            this.addKeyMapping(KeyCode.e, WalkDirection.RotateRight);
            this.addKeyMapping(KeyCode.r, WalkDirection.TiltUp);
            this.addKeyMapping(KeyCode.f, WalkDirection.TiltDown);
            this.addKeyMapping(KeyCode.x, WalkDirection.Up);
            this.addKeyMapping(KeyCode.c, WalkDirection.Down);

            this.addKeyMapping(KeyCode.LeftArrow, WalkDirection.Left);
            this.addKeyMapping(KeyCode.RightArrow, WalkDirection.Right);
            this.addKeyMapping(KeyCode.UpArrow, WalkDirection.Forward);
            this.addKeyMapping(KeyCode.DownArrow, WalkDirection.Backward);
        }

        /**
         * Adds a key mapping for a walk direction.
         * @param key
         * @param walkDirection
         */
        public addKeyMapping(key: KeyCode, walkDirection: WalkDirection): void {
            this._keyWalkMapping.set(key, walkDirection);
        }

        /**
         * Gets the walk direction key mapping.
         */
        public getKeyMapping(): Map<KeyCode, WalkDirection> {
            return Util.copyMap(this._keyWalkMapping);
        }

        /**
         * Clears all key mappings.
         */
        public clearKeyMappings(): void {
            this._keyWalkMapping.clear();
        }

        /** @hidden */
        public onMouseDown(event: Event.MouseInputEvent): void {
            super.onMouseDown(event);
            this._viewer.focusInput(true);
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);

            if (this._dragging && this._mouseLookEnabled) {
                this._viewer.view.setProjectionMode(Projection.Perspective);

                const screenWidth = window.screen.width;
                const screenHeight = window.screen.height;

                event.setHandled(true);
                const delta = Point2.subtract(this._ptPrevious, this._ptCurrent);
                this.rotateLeft((delta.x / screenWidth) * this._mouseLookSpeed);
                this.tiltUp((delta.y / screenHeight) * this._mouseLookSpeed);
            }
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            if (this._dragCount > 5) {
                event.setHandled(true);
            }
            super.onMouseUp(event);
        }

        /** @hidden */
        public onMousewheel(event: Event.MouseWheelInputEvent): void {
            this._viewer.view.setProjectionMode(Projection.Perspective);

            const view = this._viewer.view;
            const camera = view.getCamera();
            const position = event.getPosition();
            const wheelDelta = event.getWheelDelta();

            const p = view
                .pickFromPoint(position, new PickConfig(SelectionMask.Face))
                .then((selectionItem) => {
                    const selectionPosition = selectionItem.getPosition();
                    if (selectionItem !== null && selectionPosition !== null) {
                        const walkDirection = Point3.subtract(
                            camera.getPosition(),
                            selectionPosition,
                        ).normalize();
                        const walkDelta = walkDirection.scale(this.getZoomSpeed() * wheelDelta);
                        this._applyWalkDelta(camera, walkDelta);
                    } else {
                        this.walkBackward(wheelDelta * this.getWalkSpeed());
                    }
                });

            p as Internal.UnusedPromise; // XXX: Throwing away promise.
        }

        /** @hidden */
        public onKeyDown(event: Event.KeyInputEvent): void {
            this._viewer.view.setProjectionMode(Projection.Perspective);

            const keyCode = event.getKeyCode();

            if (keyCode === KeyCode.v) {
                this.toggleBimMode() as Internal.UnusedPromise;
            }

            if (!this._keyCodeActive(keyCode)) {
                this._keyDownMap.set(keyCode, event.getDate().getTime());
                this._onKeyChange(keyCode);
            }
        }

        /** @hidden */
        public onKeyUp(event: Event.KeyInputEvent): void {
            const keyCode = event.getKeyCode();

            this._keyUpMap.set(keyCode, event.getDate().getTime());
            this._onKeyChange(keyCode);
        }

        private _keyCodeActive(keyCode: number): boolean {
            const downTime = this._keyDownMap.get(keyCode);
            if (downTime !== undefined) {
                const upTime = this._keyUpMap.get(keyCode);
                if (upTime === undefined || downTime > upTime) {
                    return true;
                }
            }
            return false;
        }

        private _onKeyChange(keyCode: number): void {
            if (this._keyCodeActive(keyCode)) {
                if (this._keyWalkMapping.has(keyCode)) {
                    if (!this.getWalkActive()) {
                        this._previousWalkTime = Date.now();
                    }
                    this._onTick();
                }
            }
        }

        /**
         * Sets the speed for mouse look.
         * @param mouseLookSpeed
         */
        public setMouseLookSpeed(mouseLookSpeed: number): void {
            this._mouseLookSpeed = mouseLookSpeed;
        }

        /**
         * Gets the mouse look speed.
         */
        public getMouseLookSpeed(): number {
            return this._mouseLookSpeed;
        }

        /**
         * Sets whether the mouse look is enabled. If enabled, mouse move events will not continue down the operator stack.
         * @param mouseLookEnabled
         */
        public setMouseLookEnabled(mouseLookEnabled: boolean): void {
            this._mouseLookEnabled = mouseLookEnabled;
        }

        /**
         * Gets whether the mouse look is enabled. If enabled, mouse move events will not continue down the operator stack.
         */
        public getMouseLookEnabled(): boolean {
            return this._mouseLookEnabled;
        }

        public async resetDefaultWalkSpeeds(): Promise<void> {
            return super.resetDefaultWalkSpeeds().then(() => {
                this._mouseLookSpeed = 300;
            });
        }

        private _execWalkDirection(
            direction: WalkDirection,
            timeDelta: number,
            useBimMode: boolean,
        ): void | Promise<void> {
            const horizontalWalkDistance = this.getWalkSpeed() * timeDelta;
            switch (direction) {
                case WalkDirection.Forward:
                    return useBimMode
                        ? this.walkForwardWithCollision(horizontalWalkDistance)
                        : this.walkForward(horizontalWalkDistance);
                case WalkDirection.Backward:
                    return useBimMode
                        ? this.walkBackwardWithCollision(horizontalWalkDistance)
                        : this.walkBackward(horizontalWalkDistance);
                case WalkDirection.Left:
                    return useBimMode
                        ? this.walkLeftWithCollision(horizontalWalkDistance)
                        : this.walkLeft(horizontalWalkDistance);
                case WalkDirection.Right:
                    return useBimMode
                        ? this.walkRightWithCollision(horizontalWalkDistance)
                        : this.walkRight(horizontalWalkDistance);

                case WalkDirection.Up:
                    return this.walkUp(this.getElevationSpeed() * timeDelta);
                case WalkDirection.Down:
                    return this.walkDown(this.getElevationSpeed() * timeDelta);

                case WalkDirection.RotateLeft:
                    return this.rotateLeft(this.getRotationSpeed() * timeDelta);
                case WalkDirection.RotateRight:
                    return this.rotateRight(this.getRotationSpeed() * timeDelta);

                case WalkDirection.TiltUp:
                    return this.tiltUp(this.getRotationSpeed() * timeDelta);
                case WalkDirection.TiltDown:
                    return this.tiltDown(this.getRotationSpeed() * timeDelta);

                default:
                    Util.TypeAssertNever(direction);
            }
        }

        private _queueWalkDirections(timeDelta: number): void {
            const directionSet = new Set<WalkDirection>();

            this._keyWalkMapping.forEach((direction, keyCode) => {
                if (this._keyCodeActive(keyCode)) {
                    directionSet.add(direction);
                }
            });

            normalizeDirections(directionSet);
            const directionList = Util.setToArray(directionSet);
            directionList.sort(); // Sorting for execution consistency.

            if (directionList.length > 0) {
                this.setWalkActive(true);
                const bimModeEnabled = this.getBimModeEnabled();

                this.getActiveWalk().set(async () => {
                    const aggregatedWalk = new Util.ActionQueue(1, true);

                    if (timeDelta > 0) {
                        for (const direction of directionList) {
                            aggregatedWalk.push(() => {
                                return this._execWalkDirection(
                                    direction,
                                    timeDelta,
                                    bimModeEnabled,
                                );
                            });
                        }
                    }

                    if (bimModeEnabled) {
                        if (
                            !directionSet.has(WalkDirection.Up) &&
                            !directionSet.has(WalkDirection.Down)
                        ) {
                            aggregatedWalk.push(async () => {
                                await this._applyGravity();
                            });
                        }

                        aggregatedWalk.push(async () => {
                            await this._updateNearbyDoors();
                        });
                    }

                    if (aggregatedWalk.isIdle()) {
                        return;
                    } else {
                        return aggregatedWalk.waitForIdle();
                    }
                });
            }
        }

        /** @hidden */
        protected _onTick(): void {
            const updateTime = Date.now();
            const timeDelta = (updateTime - this._previousWalkTime) / 1000;
            this._previousWalkTime = updateTime;

            const walkActive = !this.getActiveWalk().isIdle();
            this.setWalkActive(walkActive);

            this._queueWalkDirections(timeDelta);

            if (this._tickTimerId !== null) {
                cancelAnimationFrame(this._tickTimerId);
                this._tickTimerId = null;
            }

            if (this.getWalkActive()) {
                this._tickTimerId = requestAnimationFrame(() => {
                    this._onTick();
                });
            }
        }
    }
}
