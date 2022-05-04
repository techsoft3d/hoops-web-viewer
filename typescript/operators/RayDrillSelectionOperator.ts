/// <reference path="OperatorBase.ts"/>
/// <reference path="../Core/View.ts"/>
/// <reference path="../Math/Point2.ts"/>
/// <reference path="../Markup/Shapes/Rectangle.ts"/>

namespace Communicator.Operator {
    export class RayDrillSelectionOperator extends OperatorBase {
        private _incrementalSelection: Util.IncrementalSelection<"SelectionManager">;
        private _selectionButton = Button.Left;
        private _ignoreTransparency = false;
        private _forceEffectiveSceneVisibilityMask = SelectionMask.None;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);

            this._incrementalSelection = Util.IncrementalSelection.create(
                "SelectionManager",
                viewer,
            );

            viewer.setCallbacks({
                _resetAssemblyTreeBegin: async () => {
                    await this.clearSelection();
                    return this.waitForIdle();
                },
                selectionArray: async (items: Event.NodeSelectionEvent[]) => {
                    if (items.length === 0) {
                        await this._incrementalSelection.stopSelection();
                    }
                },
            });
        }

        /**
         * Gets the mask used for forcing effective scene visibility during selection.
         */
        public getForceEffectiveSceneVisibilityMask(): SelectionMask {
            return this._forceEffectiveSceneVisibilityMask;
        }

        /**
         * Sets the mask used for forcing effective scene visibility during selection.
         */
        public setForceEffectiveSceneVisibilityMask(mask: SelectionMask): void {
            this._forceEffectiveSceneVisibilityMask = mask;
        }

        public setIgnoreTransparency(value: boolean): void {
            this._ignoreTransparency = value;
        }

        public getIgnoreTransparency(): boolean {
            return this._ignoreTransparency;
        }

        public hasActiveSelection(): boolean {
            return !this._incrementalSelection.isIdle();
        }

        public async waitForIdle(): Promise<void> {
            return this._incrementalSelection.waitForIdle();
        }

        public async clearSelection(): Promise<void> {
            return this._incrementalSelection.clearSelection();
        }

        private _createBeginConfig(rayOrigin: Point2): Util.IncrementalSelection.RayDrillConfig {
            const config = new IncrementalPickConfig();
            config.forceEffectiveSceneVisibilityMask = this._forceEffectiveSceneVisibilityMask;
            config.ignoreUnrequestedInstances = true;

            return {
                pickConfig: config,
                rayCssOrigin: rayOrigin,
                rayCssBoxRadius: 10,
            };
        }

        private async _selectionPredicate(item: Selection.NodeSelectionItem): Promise<boolean> {
            const model = this._viewer.model;
            const id = item.getNodeId();
            if (id === null) {
                return false;
            }
            const [result] = await model.getNodesHaveTransparency([id]);
            return !result;
        }

        private async _performSelection(rayOrigin: Point2): Promise<void> {
            const beginConfig = this._createBeginConfig(rayOrigin);

            const predicate = this._ignoreTransparency
                ? (item: Selection.NodeSelectionItem) => this._selectionPredicate(item)
                : null;
            return this._incrementalSelection.performSelection(beginConfig, predicate);
        }

        ///////////////////////////////////////////////////////////////////////////////////

        /** @hidden */
        public setHandled(): boolean {
            return true;
        }

        /** @hidden */
        public onKeyUp(e: Event.KeyInputEvent): void {
            if (e.getKeyCode() === KeyCode.Escape) {
                this.clearSelection() as Internal.UnusedPromise;
            }
        }

        /** @hidden */
        public onMouseUp(e: Event.MouseInputEvent): void {
            if (this.isActive()) {
                (async () => {
                    if (
                        (e.getButton() === this._selectionButton ||
                            this._primaryTouchId !== null) &&
                        Point2.subtract(this._ptFirst, this._ptCurrent).squaredLength() < 25
                    ) {
                        if (!e.controlDown()) {
                            await this.clearSelection();
                        }
                        await this._performSelection(e.getPosition());
                    }
                })() as Internal.UnusedPromise;
            }
            super.onMouseUp(e);
        }
    }
}
