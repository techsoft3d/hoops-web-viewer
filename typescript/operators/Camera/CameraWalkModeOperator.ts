namespace Communicator.Operator {
    export class CameraWalkModeOperator implements Operator {
        private _keyboardWalkOperator: CameraKeyboardWalkOperator;
        private _walkOperator: CameraWalkOperator;
        private _activeOperator: CameraKeyboardWalkOperator | CameraWalkOperator;

        private _walkMode: WalkMode;
        private _active: boolean;

        /** @hidden */
        public constructor(
            _viewer: WebViewer,
            walkOperator: CameraWalkOperator,
            keyboardWalkOperator: CameraKeyboardWalkOperator,
        ) {
            this._keyboardWalkOperator = keyboardWalkOperator;
            this._walkOperator = walkOperator;
            this._activeOperator = walkOperator;
            this._walkMode = WalkMode.Mouse;
            this._active = false;
        }

        /**
         * Sets the walk mode to Mouse or Keyboard.
         * @param walkMode
         */
        public async setWalkMode(walkMode: WalkMode): Promise<void> {
            if (this._walkMode !== walkMode) {
                this._walkMode = walkMode;

                if (walkMode === WalkMode.Keyboard) {
                    this._activeOperator = this._keyboardWalkOperator;
                    if (this._active) {
                        await this._walkOperator.onDeactivate();
                        await this._keyboardWalkOperator.onActivate();
                    }
                } else {
                    this._activeOperator = this._walkOperator;
                    if (this._active) {
                        await this._keyboardWalkOperator.onDeactivate();
                        await this._walkOperator.onActivate();
                    }
                }
            }
        }

        /**
         * Gets the walk mode.
         * @returns Keyboard or Mouse
         */
        public getWalkMode(): WalkMode {
            if (this._activeOperator instanceof CameraKeyboardWalkOperator) {
                return WalkMode.Keyboard;
            } else {
                return WalkMode.Mouse;
            }
        }

        /** @hidden */
        public onMouseDown(event: Event.MouseInputEvent): void {
            this._activeOperator.onMouseDown(event);
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            this._activeOperator.onMouseMove(event);
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            this._activeOperator.onMouseUp(event);
        }

        /** @hidden */
        public onMousewheel(event: Event.MouseWheelInputEvent): void {
            this._activeOperator.onMousewheel(event);
        }

        /** @hidden */
        public onTouchStart(event: Event.TouchInputEvent): void {
            this._activeOperator.onTouchStart(event);
        }

        /** @hidden */
        public onTouchMove(event: Event.TouchInputEvent): void {
            this._activeOperator.onTouchMove(event);
        }

        /** @hidden */
        public onTouchEnd(event: Event.TouchInputEvent): void {
            this._activeOperator.onTouchEnd(event);
        }

        /** @hidden */
        public onKeyDown(event: Event.KeyInputEvent): void {
            this._activeOperator.onKeyDown(event);
        }

        /** @hidden */
        public onKeyUp(event: Event.KeyInputEvent): void {
            if (this._activeOperator instanceof CameraKeyboardWalkOperator) {
                this._activeOperator.onKeyUp(event);
            }
        }

        /** @hidden */
        public onDeactivate(): void | Promise<void> {
            return this._activeOperator.onDeactivate();
        }

        /** @hidden */
        public onActivate(): void | Promise<void> {
            this._active = true;
            return this._activeOperator.onActivate();
        }

        /** @hidden */
        public onViewOrientationChange(): void {
            this._active = false;
        }

        /** @hidden */
        public stopInteraction(): void | Promise<void> {
            return this._activeOperator.stopInteraction();
        }

        /**
         * Sets BIM mode enables/disabled on both mouse and keyboard walk
         */
        public async setBimModeEnabled(enabled: boolean): Promise<void> {
            const ps = [];
            if (enabled) {
                ps.push(this._keyboardWalkOperator.enableBimMode());
                ps.push(this._walkOperator.enableBimMode());
            } else {
                ps.push(this._keyboardWalkOperator.disableBimMode());
                ps.push(this._walkOperator.disableBimMode());
            }
            return Promise.all(ps).then(() => {
                return;
            });
        }

        /**
         * Resets speeds to defaults on both mouse and keyboard walk
         */
        public async resetDefaultWalkSpeeds(): Promise<void> {
            return Promise.all([
                this._walkOperator.resetDefaultWalkSpeeds(),
                this._keyboardWalkOperator.resetDefaultWalkSpeeds(),
            ]).then(() => {
                return;
            });
        }

        /**
         * Sets BIM floor config on both mouse and keyboard walk
         */
        public setBimFloorConfig(floorConfig: CameraWalkBaseOperator.Bim.FloorConfig): void {
            this._walkOperator.setBimFloorConfig(floorConfig);
            this._keyboardWalkOperator.setBimFloorConfig(floorConfig);
        }

        /**
         * Sets BIM wall config on both mouse and keyboard walk
         */
        public setBimWallConfig(wallConfig: CameraWalkBaseOperator.Bim.WallConfig): void {
            this._walkOperator.setBimWallConfig(wallConfig);
            this._keyboardWalkOperator.setBimWallConfig(wallConfig);
        }

        /**
         * Sets BIM door config on both mouse and keyboard walk
         */
        public setBimDoorConfig(doorConfig: CameraWalkBaseOperator.Bim.DoorConfig): void {
            this._walkOperator.setBimDoorConfig(doorConfig);
            this._keyboardWalkOperator.setBimDoorConfig(doorConfig);
        }

        /**
         * Sets zoom speed on both mouse and keyboard walk
         */
        public setZoomSpeed(speed: number): void {
            this._walkOperator.setZoomSpeed(speed);
            this._keyboardWalkOperator.setZoomSpeed(speed);
        }

        /**
         * Sets walk speed for both mouse and keyboard walk
         */
        public setWalkSpeed(speed: number): void {
            this._walkOperator.setWalkSpeed(speed);
            this._keyboardWalkOperator.setWalkSpeed(speed);
        }

        /**
         * Sets elevation speed for both mouse and keyboard walk
         */
        public setElevationSpeed(speed: number): void {
            this._walkOperator.setElevationSpeed(speed);
            this._keyboardWalkOperator.setElevationSpeed(speed);
        }

        /**
         * Sets rotation speed for both mouse and keyboard walk
         */
        public setRotationSpeed(speed: number): void {
            this._walkOperator.setRotationSpeed(speed);
            this._keyboardWalkOperator.setRotationSpeed(speed);
        }

        /**
         * Sets view angle (FOV) for both mouse and keyboard walk operators
         */
        public setViewAngle(angle: number): void {
            this._walkOperator.setViewAngle(angle);
            this._keyboardWalkOperator.setViewAngle(angle);
        }
    }
}
