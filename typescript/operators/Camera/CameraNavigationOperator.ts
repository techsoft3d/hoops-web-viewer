/// <reference path="CameraOrbitOperator.ts"/>
/// <reference path="CameraPanOperator.ts"/>
/// <reference path="CameraZoomOperator.ts"/>

namespace Communicator.Operator {
    export class CameraNavigationOperator extends OperatorBase {
        private _orbitOperator: CameraOrbitOperator;
        private _panOperator: CameraPanOperator;
        private _zoomOperator: CameraZoomOperator;

        private _activeOperator: OperatorBase | null = null;

        private _activeTouchCount: number = 0;
        private _touchMoveCount: number = 0;
        private _returnToOrbit = false;

        private _bimNavigationEnabled = false;

        /** @hidden */
        public constructor(
            viewer: WebViewer,
            orbitOperator: CameraOrbitOperator,
            panOperator: CameraPanOperator,
            zoomOperator: CameraZoomOperator,
        ) {
            super(viewer);

            this._orbitOperator = orbitOperator;
            this._panOperator = panOperator;
            this._zoomOperator = zoomOperator;
        }

        /**
         * When BIM navigation is enabled, the following controls for orbit, pan, and zoom are set:
         * Left mouse button: orbit
         * Middle mouse wheel: zoom
         * Middle mouse button: pan
         * Right mouse button: zoom
         * @param bimNavigation
         */
        public setBimNavigationEnabled(bimNavigation: boolean): void {
            this._bimNavigationEnabled = bimNavigation;

            const orbitOperator = this._orbitOperator;
            const zoomOperator = this._zoomOperator;
            const panOperator = this._panOperator;

            orbitOperator.clearMapping();
            zoomOperator.clearMapping();
            panOperator.clearMapping();

            orbitOperator.setMapping(Button.Left);
            orbitOperator.setBimOrbitEnabled(bimNavigation);
            zoomOperator.setDollyZoomEnabled(bimNavigation);

            if (bimNavigation) {
                orbitOperator.setPrimaryButton(Button.Left);
                zoomOperator.setMapping(Button.Right);
                panOperator.setMapping(Button.Middle);

                this._setBimCamera();
            } else {
                orbitOperator.addMapping(Button.Middle);
                orbitOperator.setPrimaryButton(Button.Middle);
                zoomOperator.addMapping(Button.Left, KeyModifiers.Shift);
                panOperator.addMapping(Button.Right);
                panOperator.addMapping(Button.Left, KeyModifiers.Control);
            }
        }

        private _setBimCamera(): void {
            const camera = this._viewer.view.getCamera();
            const forward = Point3.subtract(camera.getPosition(), camera.getTarget()).normalize();

            const viewAxes = this._viewer.model.getViewAxes();
            const viewAxesUp = viewAxes.upVector.copy();

            const left = Point3.cross(forward, viewAxesUp);
            const up = Point3.cross(left, forward);

            camera.setUp(up);
            camera.setProjection(Projection.Perspective);

            this._viewer.view.setCamera(camera);
        }

        /**
         * Returns true if BIM navigation is enabled.
         */
        public getBimNavigationEnabled(): boolean {
            return this._bimNavigationEnabled;
        }

        /** @hidden */
        public onViewOrientationChange(): void {
            this._activeTouchCount = 0;
            this._returnToOrbit = false;
        }

        /** @hidden */
        public onMouseDown(event: Event.MouseInputEvent): void {
            super.onMouseDown(event);

            this._setActiveOperatorForMouseInput(event);

            if (this._activeOperator) {
                if (this._bimNavigationEnabled) {
                    this._setBimCamera();
                }

                this._activeOperator.onMouseDown(event);
            }
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);

            if (this._activeOperator && this._dragging && this._dragCount > 3) {
                this._activeOperator.onMouseMove(event);
            }
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            if (this._activeOperator) {
                this._activeOperator.onMouseUp(event);
            }

            if (!(this._activeOperator instanceof CameraOrbitOperator)) {
                this._orbitOperator._removeMarkup();
            }

            super.onMouseUp(event);
        }

        /** @hidden */
        public async onMousewheel(event: Event.MouseWheelInputEvent): Promise<void> {
            await this._zoomOperator.onMousewheel(event);
        }

        /** @hidden */
        public onTouchStart(event: Event.TouchInputEvent): void {
            ++this._activeTouchCount;

            this._orbitOperator.onTouchStart(event);
            this._zoomOperator.onTouchStart(event);

            if (this._viewer.sheetManager.isDrawingSheetActive()) {
                this._panOperator.onTouchStart(event);
                this._orbitOperator.onDeactivate();
            }

            if (this._activeTouchCount === 1) {
                this._primaryTouchId = event.getId();
            }

            if (this._activeTouchCount === 2) {
                this._orbitOperator.onDeactivate();
                this._panOperator.onTouchStart(event);
                this._zoomOperator.onTouchStart(event);
            }
        }

        /** @hidden */
        public onTouchMove(event: Event.TouchInputEvent): void {
            ++this._touchMoveCount;

            if (this._touchMoveCount > 5) {
                //user just released finger - restart orbit mode
                if (this._returnToOrbit) {
                    this._orbitOperator.onTouchStart(event);
                    this._returnToOrbit = false;
                } else if (this._activeTouchCount === 1) {
                    this._orbitOperator.onTouchMove(event);
                    this._zoomOperator.onTouchMove(event);
                    this._panOperator.onTouchMove(event);
                } else if (this._activeTouchCount === 2) {
                    this._zoomOperator.onTouchMove(event);
                    this._panOperator.onTouchMove(event);
                }
            }
        }

        /** @hidden */
        public onTouchEnd(event: Event.TouchInputEvent): void {
            if (this._activeTouchCount === 2) {
                //at this point we are going to be going back to single touch orbit
                this._returnToOrbit = true;
            }

            this._zoomOperator.onTouchEnd(event);
            this._panOperator.onTouchEnd(event);
            this._orbitOperator.onTouchEnd(event);

            if (this._activeTouchCount > 0) {
                --this._activeTouchCount;
            }

            if (this._activeTouchCount === 0) {
                this._touchMoveCount = 0;
            }
        }

        /** @hidden */
        public stopInteraction(): void | Promise<void> {
            const ps: Promise<void>[] = [];
            let p: void | Promise<void>;

            p = super.stopInteraction();
            if (p !== undefined) {
                ps.push(p);
            }

            this._activeTouchCount = 0;
            this._touchMoveCount = 0;

            p = this._zoomOperator.onDeactivate();
            if (p !== undefined) {
                ps.push(p);
            }

            p = this._panOperator.onDeactivate();
            if (p !== undefined) {
                ps.push(p);
            }

            p = this._orbitOperator.onDeactivate();
            if (p !== undefined) {
                ps.push(p);
            }

            return Util.waitForAll(ps);
        }

        private _setActiveOperatorForMouseInput(event: Event.MouseInputEvent): void {
            const orbitOperator = this._orbitOperator;
            const panOperator = this._panOperator;
            const zoomOperator = this._zoomOperator;

            this._activeOperator = null;

            if (this._viewer.sheetManager.isDrawingSheetActive()) {
                this._activeOperator = panOperator;
            } else {
                if (orbitOperator.checkMapping(event)) {
                    this._activeOperator = orbitOperator;
                } else if (zoomOperator.checkMapping(event)) {
                    this._activeOperator = zoomOperator;
                } else if (panOperator.checkMapping(event)) {
                    this._activeOperator = panOperator;
                }
            }
        }

        /** @hidden */
        public onDeactivate(): void {
            super.onDeactivate();

            this._orbitOperator.onDeactivate();
            this._panOperator.onDeactivate();
            this._zoomOperator.onDeactivate();
        }
    }
}
