namespace Communicator.Operator {
    /**
     * This operator allows you to measure the minimum distance between two bodies.
     * Moving the mouse over the model will highlight the body that will be measured.
     * Clicking will select the first node to be measured, it will stay highlighted as
     * you move the mouse away. Clicking a second time on a different body will begin the
     * measurement. Once the measurement is completed you can move the mouse to position the
     * measurement text box. The markup drawn represents the shortest distance between the
     * two bodies you selected. Clicking a final time will place the measurement text box
     * and finalize the measurement.
     */
    export class MeasureBodyBodyDistanceOperator extends OperatorBase {
        private readonly _measureManager: MeasureManager;
        private readonly _moveSelectionAction = new Util.CurrentAction(true);
        private _currentMoveHighlight: Selection.NodeSelectionItem | null = null;
        private _currentSelectHighlight: Selection.NodeSelectionItem | null = null;
        private _markup: Markup.Measure.MeasureBodyBodyDistanceMarkup | null = null;

        public constructor(viewer: WebViewer, measureManager: MeasureManager) {
            super(viewer);
            this._measureManager = measureManager;
        }

        private _unsetCurrentMoveHighlight(): void {
            if (this._currentMoveHighlight !== null) {
                this._viewer.model.setNodesHighlighted(
                    [this._currentMoveHighlight.getNodeId()],
                    false,
                );
                this._currentMoveHighlight = null;
            }
        }

        private _unsetCurrentSelectionHighlight(): void {
            if (this._currentSelectHighlight !== null) {
                this._viewer.model.setNodesHighlighted(
                    [this._currentSelectHighlight.getNodeId()],
                    false,
                );
                this._currentSelectHighlight = null;
            }
        }

        private async _performMoveSelection(position: Point2): Promise<void> {
            const view = this._viewer.view;
            const model = this._viewer.model;

            const selectionItem = await view.pickFromPoint(position, new PickConfig());
            if (selectionItem.overlayIndex() !== 0 || !selectionItem.isNodeSelection()) {
                this._unsetCurrentMoveHighlight();
                return;
            }

            const nodeId = selectionItem.getNodeId();

            if (nodeId === null || model.getNodeType(nodeId) !== NodeType.BodyInstance) {
                return;
            }

            if (this._markup) {
                const firstNode = this._markup.getFirstNode();
                if (firstNode !== null && nodeId === firstNode) {
                    return;
                }
            }

            if (this._currentMoveHighlight !== null) {
                if (!selectionItem.equals(this._currentMoveHighlight)) {
                    this._unsetCurrentMoveHighlight();
                    this._currentMoveHighlight = selectionItem;
                    model.setNodesHighlighted([nodeId], true);
                } else if (selectionItem.getSelectionType() === SelectionType.None) {
                    this._unsetCurrentMoveHighlight();
                }
            } else {
                this._currentMoveHighlight = selectionItem;
                model.setNodesHighlighted([nodeId], true);
            }
        }

        private async _performUpSelection(position: Point2): Promise<void> {
            const view = this._viewer.view;
            const model = this._viewer.model;

            const selectionItem = await view.pickFromPoint(position, new PickConfig());

            if (!!selectionItem.overlayIndex()) {
                return;
            }

            if (this._markup && this._markup._getStage() === 1) {
                this._viewer.trigger("measurementBegin");
            }

            if (this._markup && this._markup._getStage() > 1) {
                // Unset markup before finalizing in case finalization deactivates operator
                const markup = this._markup;
                this._markup = null;

                markup.finalize();
                this._measureManager.finalizeMeasurement(markup); // Note: This triggers a "measurementCreated" callback.

                return;
            }

            const nodeId = selectionItem.getNodeId();
            if (nodeId === null) {
                return;
            }

            if (
                !(
                    model.getNodeType(nodeId) === NodeType.BodyInstance &&
                    (!this._markup || this._markup._getStage() <= 1)
                )
            ) {
                return;
            }

            this._unsetCurrentMoveHighlight();

            if (!this._markup) {
                this._markup = new Markup.Measure.MeasureBodyBodyDistanceMarkup(this._viewer);
                this._markup.setUnitMultiplier(model.getNodeUnitMultiplier(nodeId));
                this._markup.setFirstNode(nodeId);

                if (selectionItem.isNodeSelection()) {
                    this._unsetCurrentSelectionHighlight();
                    this._currentSelectHighlight = selectionItem;
                    this._viewer.model.setNodesHighlighted([nodeId], true);
                }

                this._measureManager.addMeasurement(this._markup);
            } else {
                this._unsetCurrentSelectionHighlight();
                await this._markup.setSecondNode(nodeId);
                this._markup.adjust(position);
            }
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);

            const position = event.getPosition();

            if (!this._markup || this._markup._getStage() <= 1) {
                this._moveSelectionAction.set(() => {
                    return this._performMoveSelection(position);
                });
            }

            this._viewer.markupManager.refreshMarkup();

            if (this._markup !== null && this._markup._getStage() > 0) {
                this._markup.adjust(position);
            }
        }

        private async _onMouseUpImpl(event: Event.MouseInputEvent): Promise<void> {
            if (!this.isActive()) {
                return;
            }

            const touch =
                this._primaryTouchId !== null &&
                this._markup !== null &&
                this._markup._getStage() > 1;
            if (!(this._dragCount < 3 || touch)) {
                return;
            }

            const position = event.getPosition();
            await this._performUpSelection(position);
        }

        /** @hidden */
        public async onMouseUp(event: Event.MouseInputEvent): Promise<void> {
            await this._onMouseUpImpl(event);

            // `onMouseUp` resets `_dragCount`, and must come after we check for it
            super.onMouseUp(event);
        }

        /** @hidden */
        public setDraggingEnabled(dragging: boolean): void {
            this._dragging = dragging;
        }

        /** @hidden */
        public onKeyUp(_event: Event.KeyInputEvent): void {
            // do nothing
        }

        /** @hidden */
        public onKeyDown(event: Event.KeyInputEvent): void {
            const keyCode = event.getKeyCode();
            if (keyCode === KeyCode.Escape) {
                if (this._markup !== null) {
                    //this._markup.cleanup();
                    this._measureManager.removeMeasurement(this._markup);
                    this._markup = null;
                } else {
                    this._measureManager.removeLastMeasurement();
                }
            }
        }

        /** @hidden */
        public setHandled(): boolean {
            return this._markup !== null && this._markup._getStage() > 1;
        }

        /** @hidden */
        public onDeactivate(): void {
            super.onDeactivate();

            this._unsetCurrentMoveHighlight();

            if (this._markup !== null) {
                this._measureManager.removeMeasurement(this._markup);
                //this._markup.cleanup();
                this._markup = null;
            }
        }
    }
}
