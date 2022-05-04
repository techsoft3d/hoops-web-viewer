/// <reference path="OperatorBase.ts"/>

namespace Communicator.Operator {
    export class FloorplanOperator extends OperatorBase {
        private readonly _manager: FloorplanManager;

        private _draggingAvatar: boolean = false;
        private _restrictToAvatar: boolean = true;

        // Stored value of floorplan floor lock to be restored at the end of drag
        private _floorLocked: boolean = false;

        /** @hidden */
        constructor(viewer: WebViewer) {
            super(viewer);
            this._manager = viewer.floorplanManager;
        }

        /** @hidden */
        public async onMouseDown(event: Event.MouseInputEvent): Promise<void> {
            super.onMouseDown(event);
            if (!this._manager.isActive()) {
                return;
            }

            const position = event.getPosition();
            let insideOverlayOrAvatar: boolean;
            if (!this._restrictToAvatar) {
                insideOverlayOrAvatar = this._manager.insideOverlay(position);
            } else {
                const pickConfig = new PickConfig();
                pickConfig.restrictToOverlays = true;
                const selected = await this._viewer.view.pickFromPoint(position, pickConfig);
                insideOverlayOrAvatar = selected.getNodeId() === this._manager.getAvatarNodeId();
            }

            if (insideOverlayOrAvatar) {
                this._draggingAvatar = true;
                this._floorLocked = this._manager.getFloorLock();
                await this._manager.setFloorLock(true);
                this._manager.snapAvatarToPoint(position);
                event.setHandled(true);
            }
        }

        /** @hidden */
        public async onMouseUp(event: Event.MouseInputEvent) {
            super.onMouseUp(event);
            if (this._draggingAvatar) {
                // setFloorLock should only be called here if we are dragging the avatar.
                // This prevents the _setFloorplanSync queue from entering a state where
                // it never resolves, due to camera changes from an operator that is active.
                await this._manager.setFloorLock(this._floorLocked);
            }
            this._draggingAvatar = false;
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);
            if (!this._manager.isActive()) {
                return;
            }

            if (this._draggingAvatar) {
                event.setHandled(true);
                const position = event.getPosition();
                const insideOverlay = this._manager.insideOverlay(position);
                if (insideOverlay) {
                    this._manager.snapAvatarToPoint(position);
                }
            }
        }

        /**
         * Set whether or not dragging is restricted to the avatar. If true the operator will only function if
         * the selection begins on the avatar
         */
        public restrictToAvatar(restrict: boolean) {
            this._restrictToAvatar = restrict;
        }
    }
}
