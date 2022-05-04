/// <reference path="OperatorBase.ts"/>

namespace Communicator.Operator {
    export class AxisTriadOperator extends OperatorBase {
        private readonly _axisTriad: AxisTriad;
        private readonly _pickConfig: PickConfig;

        /** @hidden */
        constructor(viewer: WebViewer) {
            super(viewer);
            this._axisTriad = viewer.view.getAxisTriad();

            this._pickConfig = new PickConfig(SelectionMask.Face);
            this._pickConfig.restrictToOverlays = true;
        }

        /** @hidden */
        public async onMouseUp(event: Event.MouseInputEvent): Promise<void> {
            if (
                this._axisTriad.getEnabled() &&
                Point2.subtract(this._ptFirst, this._ptCurrent).squaredLength() < 25 &&
                this._axisTriad.insideOverlay(event.getPosition())
            ) {
                const selection = await this._viewer.view.pickFromPoint(
                    this._ptFirst,
                    this._pickConfig,
                );
                await this._axisTriad.onClickSelection(selection);
            }

            super.onMouseUp(event);
        }
    }
}
