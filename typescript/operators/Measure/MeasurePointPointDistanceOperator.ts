namespace Communicator.Operator {
    const enum Stage {
        NoPointsSelected,
        OnePointSelected,
        TwoPointsSelected,
    }

    export class MeasurePointPointDistanceOperator extends OperatorBase {
        private readonly _measureManager: MeasureManager;
        private _measureMarkup: Markup.Measure.MeasurePointPointDistanceMarkup | null = null;
        private _cursor: Common.PointCursor;
        private _cameraInteractionActive = false;

        /** @hidden */
        public constructor(viewer: WebViewer, measureManager: MeasureManager) {
            super(viewer);

            this._viewer = viewer;
            this._measureManager = measureManager;
            this._cursor = new Common.PointCursor(this._viewer);

            this._viewer.setCallbacks({
                beginInteraction: () => {
                    this._onBeginInteraction();
                },
                endInteraction: () => {
                    this._onEndInteraction();
                },
            });

            // TODO: was planning to have the "modelSwitched" callback here handle the switch from 3D to 2D and
            //  enabling the background selection, but upon receipt of a modelSwitched callback, our operator
            //  reports it is no longer active. But of course it is sort-of active in that you can still make
            //  measurements. This probably a deeper bug. This should get looked at with COM-2021
        }

        private _onBeginInteraction() {
            this._cameraInteractionActive = true;
            this._cursor.activateCursorSprite(false);
        }

        private _onEndInteraction() {
            this._cameraInteractionActive = false;
        }

        private _getStage(): Stage {
            return this._measureMarkup === null
                ? Stage.NoPointsSelected
                : this._measureMarkup._getStage();
        }

        private _draw(): void {
            let refresh = false;

            const stage = this._getStage();
            if (stage < Stage.TwoPointsSelected) {
                this._cursor.draw();
                refresh = true;
            }

            if (this._measureMarkup !== null) {
                this._measureMarkup.draw();
                refresh = true;
            }

            if (refresh) {
                this._viewer.markupManager.refreshMarkup();
            }
        }

        private async _finalizeMeasurement(
            mousePosition: Point2,
            useSnapping: boolean,
        ): Promise<void> {
            const measureMarkup = this._measureMarkup;
            if (measureMarkup === null) {
                console.assert(false);
                return;
            }

            const config = new PickConfig(useSnapping ? SelectionMask.All : SelectionMask.Face);

            const selectionItem = await this._viewer.view.pickFromPoint(mousePosition, config);
            if (!!selectionItem.overlayIndex()) {
                return;
            }

            // Unset markupItem before finalizing in case finalization deactivates operator
            measureMarkup!.finalize();
            this._measureMarkup = null;

            this._measureManager.finalizeMeasurement(measureMarkup!); // Note: This triggers a "measurementCreated" callback.
        }

        // Gets the first picked position or null if one is not selected.  This is used as a hint when updating the cursor for snapping.
        private _getFirstPickPosition() {
            let firstPickPoint: Point3 | null = null;
            if (this._measureMarkup !== null && this._getStage() >= Stage.OnePointSelected) {
                firstPickPoint = this._measureMarkup.getFirstPointPosition();
            }

            return firstPickPoint;
        }

        private async _updateMeasurementPoints(
            mousePosition: Point2,
            useSnapping: boolean,
        ): Promise<void> {
            const stage = this._getStage();
            console.assert(stage < Stage.TwoPointsSelected);

            this._viewer.trigger("measurementBegin");

            const firstSelectedPoint = this._getFirstPickPosition();

            const selection = await this._cursor.getSelectionCursorPoints(
                mousePosition,
                useSnapping,
                firstSelectedPoint,
            );
            if (selection === null || selection.worldPosition === null) {
                this._cursor.activateCursorSprite(false);
                return;
            }

            this._cursor.activateCursorSprite(true);

            if (this._measureMarkup === null) {
                this._measureMarkup = new Markup.Measure.MeasurePointPointDistanceMarkup(
                    this._viewer,
                );
                this._measureManager.addMeasurement(this._measureMarkup);
            }

            // COM-3095: when a drawing is active, Take point on 2d drawing plane (Z = 0)
            const measurementPos = selection.worldPosition.copy();
            if (this._viewer.sheetManager.isDrawingSheetActive()) {
                measurementPos.z = 0.0;
            }

            if (stage === Stage.NoPointsSelected) {
                this._measureMarkup.setFirstPointPosition(measurementPos);
                this._measureMarkup.setUnitMultiplier(
                    selection.selectionItem.isNodeSelection()
                        ? this._viewer.model.getNodeUnitMultiplier(
                              selection.selectionItem.getNodeId(),
                          )
                        : 1,
                );
            } else if (stage === Stage.OnePointSelected) {
                const firstPosition = this._getFirstPickPosition();
                if (!selection.worldPosition.equalsWithTolerance(firstPosition!, 0.0000001)) {
                    this._measureMarkup.setSecondPointPosition(measurementPos);
                    this._measureMarkup.adjust(selection.screenPosition);
                }
            }
        }

        /**
         * Determine if the given mouse event should cause snapping. This is influenced by
         * the snap configuration enabled value.
         */
        private _useSnapping(event: Event.MouseInputEvent): boolean {
            // COM-1683 Changed behavior to default to snapping unless the alt-key is down
            return this._cursor.snappingConfig.enabled && !event.altDown();
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);

            const stage = this._getStage();
            if (stage < Stage.TwoPointsSelected) {
                if (!this._cameraInteractionActive) {
                    const mousePosition = event.getPosition();
                    const firstSelectedPoint = this._getFirstPickPosition();
                    this._cursor.updateCursorSprite(
                        mousePosition,
                        this._useSnapping(event),
                        firstSelectedPoint,
                    );
                }
            } else if (stage === Stage.TwoPointsSelected) {
                this._measureMarkup!.adjust(event.getPosition());
                event.setHandled(true);
            }

            this._draw(); // XXX: This is probably redundant.
        }

        /** @hidden */
        public async onMouseUp(event: Event.MouseInputEvent): Promise<void> {
            if (this.isActive()) {
                const stage = this._getStage();

                const touch =
                    this._primaryTouchId !== null &&
                    this._measureMarkup !== null &&
                    stage > Stage.OnePointSelected;
                if (this._dragCount < 3 || touch) {
                    const useSnapping = this._useSnapping(event);
                    const mousePosition = event.getPosition();
                    if (stage <= Stage.OnePointSelected) {
                        await this._updateMeasurementPoints(mousePosition, useSnapping);
                    } else {
                        await this._finalizeMeasurement(mousePosition, useSnapping);
                    }
                }
            }

            // `onMouseUp` resets `_dragCount`, and must come after we check for it
            super.onMouseUp(event);
        }

        /** @hidden */
        public onKeyUp(_event: Event.KeyInputEvent): void {
            // do nothing
        }

        private _clearMeasurement(): void {
            if (this._measureMarkup !== null) {
                this._measureManager.removeMeasurement(this._measureMarkup);
                this._measureMarkup = null;
            } else {
                this._measureManager.removeLastMeasurement();
            }
        }

        /** @hidden */
        public onKeyDown(event: Event.KeyInputEvent): void {
            const keyCode = event.getKeyCode();

            if (keyCode === KeyCode.Escape) {
                this._clearMeasurement();
            }
        }

        /** @hidden */
        public setHandled(): boolean {
            return this._getStage() > Stage.OnePointSelected;
        }

        /** @hidden */
        public onActivate(): void {
            this._cursor.onOperatorActivate();
        }

        /** @hidden */
        public onDeactivate(): void {
            this._cursor.onOperatorDeactivate();

            if (this._measureMarkup !== null) {
                this._measureManager.removeMeasurement(this._measureMarkup);
                this._measureMarkup = null;
            }
        }
    }
}
