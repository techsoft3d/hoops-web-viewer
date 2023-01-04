namespace Communicator.Operator {
    async function isMeasurable(
        model: Model,
        selectionItem: Selection.FaceSelectionItem,
    ): Promise<boolean> {
        if (selectionItem.getSelectionType() !== SelectionType.None) {
            const nodeId = selectionItem.getNodeId();
            const faceEntity = selectionItem.getFaceEntity();
            const hasMeasurementData = await model.isFaceMeasurable(
                nodeId,
                faceEntity.getCadFaceIndex(),
            );
            if (!hasMeasurementData) {
                return false;
            }
            const bits = faceEntity.getCadFaceBits();
            return (bits & Internal.ScSelectionBits.SelectionBitsFacePlanar) !== 0;
        }
        return false;
    }

    export class MeasureFaceFaceAngleOperator extends OperatorBase {
        private readonly _measureManager: MeasureManager;
        private readonly _moveSelectionAction = new Util.CurrentAction(true);
        private _currentHighlight: Selection.FaceSelectionItem | null = null;
        private _markup: Markup.Measure.MeasureFaceFaceAngleMarkup | null = null;
        private _useAuthoredNormals: boolean = true;

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

            if (model.getNodeType(selectionItem.getNodeId()) !== NodeType.BodyInstance) {
                return;
            }

            if (this._markup) {
                const firstSelection = this._markup.getFirstSelection();
                if (nodeId === firstSelection.getNodeId()) {
                    const face1 = firstSelection.getFaceEntity().getCadFaceIndex();
                    const face2 = faceEntity.getCadFaceIndex();
                    if (face1 === face2) {
                        return; // Don't measure the same face against itself.
                    }
                }
            }

            if (this._currentHighlight !== null) {
                if (!selectionItem.equals(this._currentHighlight)) {
                    this._unsetCurrentHighlight();
                    if (await isMeasurable(model, selectionItem)) {
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
            } else if (this._currentHighlight === null) {
                if (await isMeasurable(model, selectionItem)) {
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

                    // trigger a callback once the measurement is complete
                    this._measureManager.finalizeMeasurement(markup);
                }

                return;
            }

            if (!selectionItem.isFaceSelection()) {
                return;
            }

            if (
                !(
                    model.getNodeType(selectionItem.getNodeId()) === NodeType.BodyInstance &&
                    (!this._markup || this._markup._getStage() <= 1)
                )
            ) {
                return;
            }

            if (!(await isMeasurable(model, selectionItem))) {
                return;
            }

            const faceEntity = selectionItem.getFaceEntity();
            const faceProps = await model.getFaceProperty(
                selectionItem.getNodeId(),
                faceEntity.getCadFaceIndex(),
            );
            if (!(faceProps instanceof SubentityProperties.PlaneElement)) {
                return;
            }

            this._unsetCurrentHighlight();

            if (this._markup === null) {
                this._markup = new Markup.Measure.MeasureFaceFaceAngleMarkup(this._viewer);
                this._markup.setUseAuthoredNormals(this._useAuthoredNormals);
                await this._markup.setFirstFace(selectionItem);
                this._measureManager.addMeasurement(this._markup);
            } else {
                const faceSet = await this._markup.setSecondFace(selectionItem);
                if (faceSet) {
                    this._markup.adjust(position);
                }
            }
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);

            const position = event.getPosition();

            if (!this._markup || this._markup._getStage() <= 1) {
                this._performMoveSelection(position) as Internal.UnusedPromise;
            }

            this._viewer.markupManager.refreshMarkup();

            if (this._markup !== null && this._markup._getStage() > 0) {
                this._markup.adjust(position);
            }
        }

        private _onMouseUpImpl(event: Event.MouseInputEvent): void {
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
            this._moveSelectionAction.set(() => {
                return this._performUpSelection(position);
            });
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            this._onMouseUpImpl(event);

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
            this._unsetCurrentHighlight();

            if (this._markup !== null) {
                this._measureManager.removeMeasurement(this._markup);
                this._markup.cleanup();
                this._markup = null;
            }
        }

        /**
         * Sets whether created markup will use authored normals or use selection results to calculate angles
         * @param use
         */
        public setUseAuthoredNormals(use: boolean): void {
            this._useAuthoredNormals = use;
        }

        /**
         * Gets whether created markup will use authored normals or use selection results to calculate angles
         */
        public getUseAuthoredNormals(): boolean {
            return this._useAuthoredNormals;
        }
    }
}
