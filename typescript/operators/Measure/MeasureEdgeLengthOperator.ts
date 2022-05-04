/// <reference path="../../Core/MarkupManager.ts"/>

namespace Communicator.Operator {
    function isMeasureable(lineEntity: Selection.LineEntity): boolean {
        return (
            (lineEntity.getLineBits() &
                Internal.ScSelectionBits.SelectionBitsEdgeHasMeasurementData) !==
            0
        );
    }

    export class MeasureEdgeLengthOperator extends OperatorBase {
        private readonly _measureManager: MeasureManager;
        private readonly _pickConfig = new PickConfig(SelectionMask.Line);
        private readonly _moveSelectionAction = new Util.CurrentAction(true);
        private _lengthMarkup: Markup.Measure.MeasureLengthMarkup | null = null;
        private _edgeMarkup: Markup.Measure.MeasureStraightEdgeLengthMarkup | null = null;

        /** @hidden */
        public constructor(viewer: WebViewer, measureManager: MeasureManager) {
            super(viewer);
            this._measureManager = measureManager;
            this._pickConfig.restrictLinesAndPointsToSelectedFaceInstances = false;
        }

        /** @hidden */
        public onActivate(): void {
            if (this._edgeMarkup === null) {
                this._edgeMarkup = new Markup.Measure.MeasureStraightEdgeLengthMarkup(
                    this._viewer,
                    null,
                    new Matrix(),
                    1,
                );
            }
        }

        private _unregisterEdgeMarkup(): void {
            if (this._edgeMarkup === null) {
                return;
            }

            const id = this._edgeMarkup._getId();
            if (id !== "") {
                this._viewer.markupManager.unregisterMarkup(id);
                this._edgeMarkup._setId("");
            }
        }

        private _registerEdgeMarkup(): void {
            if (this._edgeMarkup !== null) {
                this._unregisterEdgeMarkup();
                this._edgeMarkup._setId(
                    this._viewer.markupManager.registerMarkup(this._edgeMarkup),
                );
            }
        }

        private _resetEdgeMarkup(): void {
            if (this._edgeMarkup !== null) {
                this._unregisterEdgeMarkup();
                this._edgeMarkup.reset();
            }
        }

        private async _performMoveSelection(
            position: Point2,
            edgeMarkup: Markup.Measure.MeasureStraightEdgeLengthMarkup,
        ): Promise<void> {
            const view = this._viewer.view;

            const selectionItem = await view.pickFromPoint(position, this._pickConfig);

            const lineEntity = selectionItem.getLineEntity();
            if (lineEntity && selectionItem.overlayIndex() === 0 && isMeasureable(lineEntity)) {
                edgeMarkup.setLineGeometry(lineEntity.getPoints());
                this._registerEdgeMarkup();
            } else {
                this._resetEdgeMarkup();
            }
        }

        private async _performUpSelection(position: Point2): Promise<void> {
            const view = this._viewer.view;
            const model = this._viewer.model;

            const selectionItem = await view.pickFromPoint(position, this._pickConfig);

            if (!!selectionItem.overlayIndex()) {
                return;
            }

            if (this._lengthMarkup && this._lengthMarkup._getStage() === 2) {
                // Unset lengthMarkup before finalizing in case finalization deactivates operator
                const lengthMarkup = this._lengthMarkup;
                this._lengthMarkup = null;

                lengthMarkup._nextStage();
                this._measureManager.finalizeMeasurement(lengthMarkup); // Note: This triggers a "measurementCreated" callback.
                return;
            }

            if (this._lengthMarkup || !selectionItem.isLineSelection()) {
                return;
            }

            const lineEntity = selectionItem.getLineEntity();
            if (!isMeasureable(lineEntity)) {
                return;
            }

            const nodeId = selectionItem.getNodeId();
            const unitMultiplier = model.getNodeUnitMultiplier(nodeId);
            const edgeProps = await model.getEdgeProperty(nodeId, lineEntity.getLineId());

            this._viewer.trigger("measurementBegin");

            if (!edgeProps) {
                return;
            }

            if (
                edgeProps instanceof SubentityProperties.LineElement ||
                edgeProps instanceof SubentityProperties.OtherEdgeElement
            ) {
                const matrix = model.getNodeNetMatrix(nodeId);
                this._lengthMarkup = new Markup.Measure.MeasureStraightEdgeLengthMarkup(
                    this._viewer,
                    edgeProps,
                    matrix,
                    unitMultiplier,
                );
                this._measureManager.addMeasurement(this._lengthMarkup);
                this._lengthMarkup.setLineGeometry(lineEntity!.getPoints());
                this._lengthMarkup._nextStage();
                this._lengthMarkup.adjust(position);
            } else if (edgeProps instanceof SubentityProperties.CircleElement) {
                const matrix = model.getNodeNetMatrix(nodeId);
                this._lengthMarkup = new Markup.Measure.MeasureCircleEdgeLengthMarkup(
                    this._viewer,
                    edgeProps,
                    matrix,
                    unitMultiplier,
                );
                this._measureManager.addMeasurement(this._lengthMarkup);
                this._lengthMarkup.setLineGeometry(lineEntity!.getPoints());
                this._lengthMarkup._nextStage();
                this._lengthMarkup.adjust(position);
            }

            if (this._lengthMarkup!._getStage() === 2) {
                this._viewer.trigger("measurementValueSet", this._lengthMarkup!);
            }
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);

            const edgeMarkup = this._edgeMarkup;
            if (edgeMarkup === null) {
                return;
            }

            // If the measurement edge color parameter has changed we have to reflect it on the current edgeMarkup.
            // But doing it in MouseMove event is very ugly.
            // TODO: update here when an event MeasurementEdgeColorChanged will exist.
            edgeMarkup.setMeasurementEdgeColor(this._viewer.measureManager.getMeasurementEdgeColor());

            const position = event.getPosition();

            if (this.isDragging() && this._primaryTouchId === null) {
                this._resetEdgeMarkup();
            } else {
                if (this._lengthMarkup === null) {
                    this._moveSelectionAction.set(() => {
                        return this._performMoveSelection(position, edgeMarkup);
                    });
                }

                this._viewer.markupManager.refreshMarkup();

                if (this._lengthMarkup !== null && this._lengthMarkup._getStage() > 0) {
                    this._lengthMarkup.adjust(position);
                }
            }
        }

        private async _onMouseUpImpl(event: Event.MouseInputEvent): Promise<void> {
            if (!this.isActive()) {
                return;
            }

            const touch = this._primaryTouchId !== null && this._lengthMarkup !== null;
            if (!(this._dragCount < 3 || touch)) {
                return;
            }

            const position = event.getPosition();
            await this._performUpSelection(position);
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            this._onMouseUpImpl(event) as Internal.UnusedPromise;

            // onMouseUp resets _dragCount, and must come after we check for it
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
                if (this._lengthMarkup !== null) {
                    this._measureManager.removeMeasurement(this._lengthMarkup);
                    this._lengthMarkup = null;
                } else {
                    this._measureManager.removeLastMeasurement();
                }

                if (this._edgeMarkup !== null) {
                    this._resetEdgeMarkup();
                }
            }
        }

        /** @hidden */
        public setHandled(): boolean {
            return this._lengthMarkup !== null;
        }

        /** @hidden */
        public onDeactivate(): void {
            if (this._lengthMarkup !== null) {
                this._measureManager.removeMeasurement(this._lengthMarkup);
                this._lengthMarkup = null;
            }

            if (this._edgeMarkup !== null) {
                this._resetEdgeMarkup();
            }
        }
    }
}
