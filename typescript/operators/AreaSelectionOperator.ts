/// <reference path="OperatorBase.ts"/>

namespace Communicator.Operator {
    export class AreaSelectionOperator extends OperatorBase {
        private _incrementalSelection: Util.IncrementalSelection<"SelectionManager">;
        private _rectangleMarkup: SelectionRectangleMarkup;
        private _forceEffectiveSceneVisibilityMask = SelectionMask.None;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);

            this._rectangleMarkup = new SelectionRectangleMarkup(viewer, false);

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

        public hasActiveSelection(): boolean {
            return !this._incrementalSelection.isIdle();
        }

        public async waitForIdle(): Promise<void> {
            return this._incrementalSelection.waitForIdle();
        }

        public async clearSelection(): Promise<void> {
            return this._incrementalSelection.clearSelection();
        }

        private _allowSelection(min: Point2, max: Point2): boolean {
            if (min.x === max.x || min.y === max.y) {
                return false;
            }
            return true;
        }

        private _createBeginConfig(
            min: Point2,
            max: Point2,
            mustBeFullyContained: boolean,
        ): Util.IncrementalSelection.ScreenByAreaConfig {
            const config = new IncrementalPickConfig();
            config.forceEffectiveSceneVisibilityMask = this._forceEffectiveSceneVisibilityMask;
            config.ignoreCuttingSections = false;
            config.ignoreUnrequestedInstances = true;

            if (mustBeFullyContained) {
                config.mustBeFullyContained = true;
            }

            return {
                pickConfig: config,
                areaCssMin: min,
                areaCssMax: max,
            };
        }

        private async _performSelection(clearSelection: boolean): Promise<void> {
            const min = this._rectangleMarkup.min.copy();
            const max = this._rectangleMarkup.max.copy();
            const mustBeFullyContained =
                this._rectangleMarkup.initialPosition.x < this._rectangleMarkup.currentPosition.x;

            if (clearSelection) {
                await this.clearSelection();
            }

            if (!this._allowSelection(min, max)) {
                return;
            }

            const beginConfig = this._createBeginConfig(min, max, mustBeFullyContained);

            try {
                return await this._incrementalSelection.performSelection(beginConfig);
            } catch (error) {
                if (!(error instanceof SelectionInvalidatedError)) {
                    throw error;
                }
            }
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
        public onMouseDown(e: Event.MouseInputEvent): void {
            super.onMouseDown(e);
            if (this.isActive()) {
                e.setHandled(true);
                if (this._rectangleMarkup.isActive()) {
                    this._rectangleMarkup.deactivate();
                }
                this._rectangleMarkup.activate(e.getPosition());
            }
        }

        /** @hidden */
        public onMouseMove(e: Event.MouseInputEvent): void {
            super.onMouseMove(e);
            if (this.isActive() && this._rectangleMarkup.isActive()) {
                e.setHandled(true);
                this._rectangleMarkup.updateCurrentPosition(e.getPosition());
                const markupManager = this._viewer.markupManager;
                markupManager.refreshMarkup();
            }
        }

        /** @hidden */
        public onMouseUp(e: Event.MouseInputEvent): void {
            if (this.isActive() && this._rectangleMarkup.isActive()) {
                e.setHandled(true);
                this._rectangleMarkup.updateCurrentPosition(e.getPosition());
                const clearSelection = !e.controlDown();
                this._performSelection(clearSelection) as Internal.UnusedPromise;
            }
            if (this._rectangleMarkup.isActive()) {
                this._rectangleMarkup.deactivate();
            }
            super.onMouseUp(e);
        }
    }
}
