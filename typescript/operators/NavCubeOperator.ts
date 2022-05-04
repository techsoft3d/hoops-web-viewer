/// <reference path="OperatorBase.ts"/>

namespace Communicator.Operator {
    export class NavCubeOperator extends OperatorBase {
        private readonly _navCube: NavCube;
        private readonly _pickConfig: PickConfig;

        /** @hidden */
        constructor(viewer: WebViewer) {
            super(viewer);
            this._navCube = viewer.view.getNavCube();

            this._pickConfig = new PickConfig(SelectionMask.Face);
            this._pickConfig.restrictToOverlays = true;
        }

        /** @hidden */
        public async onMouseMove(event: Event.MouseInputEvent): Promise<void> {
            super.onMouseMove(event);

            const position = event.getPosition();
            const dragged = this._dragging && this._dragCount > 1;
            if (this._navCube.getEnabled() && !dragged && this._navCube.insideOverlay(position)) {
                const selection = await this._viewer.view.pickFromPoint(position, this._pickConfig);
                this._navCube.onMoveSelection(selection);
            }
        }

        /** @hidden */
        public async onMouseUp(event: Event.MouseInputEvent): Promise<void> {
            if (
                this._navCube.getEnabled() &&
                Point2.subtract(this._ptFirst, this._ptCurrent).squaredLength() < 25
            ) {
                const selection = await this._viewer.view.pickFromPoint(
                    this._ptFirst,
                    this._pickConfig,
                );
                await this._navCube.onClickSelection(selection);
            }
            super.onMouseUp(event);
        }
    }
}
