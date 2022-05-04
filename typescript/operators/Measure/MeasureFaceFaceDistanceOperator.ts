namespace Communicator.Operator {
    function isMeasurable(selectionItem: Selection.FaceSelectionItem): boolean {
        if (selectionItem.getSelectionType() !== SelectionType.None) {
            const faceEntity = selectionItem.getFaceEntity();
            return (
                (faceEntity.getCadFaceBits() &
                    Internal.ScSelectionBits.SelectionBitsFaceHasMeasurementData) !==
                0
            );
        }
        return false;
    }

    export class MeasureFaceFaceDistanceOperator extends OperatorBase {
        private readonly _measureManager: MeasureManager;
        private readonly _moveSelectionAction = new Util.CurrentAction(true);
        private _currentHighlight: Selection.FaceSelectionItem | null = null;
        private _markup: Markup.Measure.MeasureFaceFaceDistanceMarkup | null = null;

        public constructor(viewer: WebViewer, measureManager: MeasureManager) {
            super(viewer);
            this._measureManager = measureManager;
        }

        private _unsetCurrentHighlight(): void {
            if (this._currentHighlight !== null) {
                this._viewer.model.unsetNodeFaceColor(
                    this._currentHighlight.getNodeId(),
                    this._currentHighlight.getFaceEntity().getCadFaceIndex(),
                );

                this._currentHighlight = null;
            }
        }

        private async _performMoveSelection(position: Point2): Promise<void> {
            const view = this._viewer.view;
            const model = this._viewer.model;

            const selectionItem = await view.pickFromPoint(position, new PickConfig());
            if (selectionItem.overlayIndex() !== 0 || !selectionItem.isFaceSelection()) {
                return;
            }

            const nodeId = selectionItem.getNodeId();
            const faceEntity = selectionItem.getFaceEntity();

            if (model.getNodeType(nodeId) !== NodeType.BodyInstance) {
                return;
            }

            if (this._markup) {
                const firstSelection = this._markup.getFirstSelection();
                if (
                    firstSelection !== null &&
                    nodeId === firstSelection.getNodeId() &&
                    faceEntity.getCadFaceIndex() ===
                        firstSelection.getFaceEntity().getCadFaceIndex()
                ) {
                    return;
                }
            }

            if (this._currentHighlight !== null) {
                if (!selectionItem.equals(this._currentHighlight)) {
                    this._unsetCurrentHighlight();
                    if (isMeasurable(selectionItem)) {
                        this._currentHighlight = selectionItem;
                        model.setNodeFaceColor(
                            nodeId,
                            faceEntity.getCadFaceIndex(),
                            Color.yellow(),
                        );
                    }
                } else if (selectionItem.getSelectionType() === SelectionType.None) {
                    this._unsetCurrentHighlight();
                }
            } else {
                if (isMeasurable(selectionItem)) {
                    this._currentHighlight = selectionItem;
                    model.setNodeFaceColor(nodeId, faceEntity.getCadFaceIndex(), Color.yellow());
                }
            }
        }

        private async _performUpSelection(position: Point2): Promise<void> {
            const view = this._viewer.view;
            const model = this._viewer.model;

            const selectionItem = await view.pickFromPoint(position, new PickConfig());

            if (!!selectionItem.overlayIndex()) {
                return;
            }

            if (this._markup && this._markup._getStage() > 1) {
                this._viewer.trigger("measurementBegin");

                this._markup._nextStage();
                if (this._markup._isFinalized()) {
                    // Unset markup before finalizing in case finalization deactivates operator
                    const markup = this._markup;
                    this._markup = null;

                    this._measureManager.finalizeMeasurement(markup); // Note: This triggers a "measurementCreated" callback.
                }

                return;
            }

            if (!selectionItem.isFaceSelection()) {
                return;
            }

            const nodeId = selectionItem.getNodeId();
            const faceEntity = selectionItem.getFaceEntity();

            if (!isMeasurable(selectionItem)) {
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

            const faceProps = await model.getFaceProperty(nodeId, faceEntity.getCadFaceIndex());
            if (!faceProps) {
                return;
            }

            const matrix = model.getNodeNetMatrix(nodeId);

            this._unsetCurrentHighlight();

            if (
                faceProps instanceof SubentityProperties.PlaneElement ||
                faceProps instanceof SubentityProperties.CylinderElement
            ) {
                const bounding = await model.getNodesBounding([nodeId]);

                if (!this._markup) {
                    this._markup = new Markup.Measure.MeasureFaceFaceDistanceMarkup(this._viewer);
                    this._markup.setUnitMultiplier(model.getNodeUnitMultiplier(nodeId));
                    this._markup.setFirstFace(selectionItem, faceProps, matrix, bounding);
                    this._measureManager.addMeasurement(this._markup);
                } else {
                    await this._markup.setSecondFace(
                        position,
                        selectionItem,
                        faceProps,
                        matrix,
                        bounding,
                    );
                }
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
        public onMouseUp(event: Event.MouseInputEvent): void {
            this._onMouseUpImpl(event) as Internal.UnusedPromise;

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
                    this._markup.cleanup();
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

            this._unsetCurrentHighlight();

            if (this._markup !== null) {
                this._measureManager.removeMeasurement(this._markup);
                this._markup.cleanup();
                this._markup = null;
            }
        }
    }
}
