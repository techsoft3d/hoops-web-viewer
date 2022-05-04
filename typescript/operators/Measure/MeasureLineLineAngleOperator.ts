namespace Communicator.Operator {
    /**
     * This operator allows you to measure the angle between two lines.
     * The measured angle can be between 0 - 180 degrees.
     * Click to add points to create the lines. A cursor will show where the next point will be placed.
     * The operator will perform vertex snapping by default. Holding down the alt key will disable this feature.
     * The first point placed is the common point between the lines.
     * The second and third points placed create two lines using the first point.
     * After the third point has been placed, the measurement will be finalized, and the angle between the two lines will be displayed.
     * If a measurement is currently being created, pressing the Escape key will discard it, otherwise the last created measurement will be discarded.
     */
    export class MeasureLineLineAngleOperator extends OperatorBase {
        private _cursor: Common.PointCursor;
        private _markupItem: Markup.Measure.MeasureLineLineAngleMarkup | null = null;
        private _measureManager: MeasureManager;
        private _cameraInteractionActive = false;

        public constructor(viewer: WebViewer, measureManager: MeasureManager) {
            super(viewer);

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
        }

        private _onBeginInteraction() {
            this._cameraInteractionActive = true;
            this._cursor.activateCursorSprite(false);
        }

        private _onEndInteraction() {
            this._cameraInteractionActive = false;
        }

        /**
         * Determine if the given mouse event should cause snapping.
         * This is influenced by the snap configuration enabled value.
         */
        private _useSnapping(event: Event.MouseInputEvent): boolean {
            // COM-1683 Changed behavior to default to snapping unless the alt-key is down
            return this._cursor.snappingConfig.enabled && !event.altDown();
        }

        private async _addPoint(position: Point2, useSnapping: boolean): Promise<void> {
            const selection = await this._cursor.getSelectionCursorPoints(
                position,
                useSnapping,
                null,
            );
            if (selection === null || selection.worldPosition === null) return;

            if (this._markupItem === null) {
                this._markupItem = new Markup.Measure.MeasureLineLineAngleMarkup(this._viewer);
                this._measureManager.addMeasurement(this._markupItem);

                this._viewer.trigger("measurementBegin");
            }

            this._markupItem.addPoint(selection.worldPosition);
            if (this._markupItem._isFinalized()) {
                // Unset markupItem before finalizing in case finalization deactivates operator
                const markupItem = this._markupItem;
                this._markupItem = null;

                this._measureManager.finalizeMeasurement(markupItem);
            }
        }

        private async _updateMarkupSelectionPosition(
            position: Point2,
            useSnapping: boolean,
        ): Promise<void> {
            if (this._markupItem === null) return;

            const selection = await this._cursor.getSelectionCursorPoints(
                position,
                useSnapping,
                null,
            );
            if (selection === null) return;

            this._markupItem.setSelectionPosition(selection.worldPosition);
        }

        public async onMouseMove(event: Event.MouseInputEvent): Promise<void> {
            super.onMouseMove(event);

            if (this._cameraInteractionActive) return;

            const position = event.getPosition();
            const useSnapping = this._useSnapping(event);
            this._cursor.updateCursorSprite(position, useSnapping, null);
            await this._updateMarkupSelectionPosition(position, useSnapping);
            this._viewer.markupManager.refreshMarkup();
        }

        public async onMouseUp(event: Event.MouseInputEvent): Promise<void> {
            if (!this.isActive()) return;

            const position = event.getPosition();
            if (this._ptFirst.equals(position)) {
                // make sure its a click
                await this._addPoint(position, this._useSnapping(event));
            }

            // `onMouseUp` resets `_dragCount`, and must come after we check for it
            super.onMouseUp(event);
        }

        public onKeyDown(event: Event.KeyInputEvent): void {
            const keyCode = event.getKeyCode();
            if (keyCode === KeyCode.Escape) {
                this._clearMeasurement();
            }
        }

        private _clearMeasurement() {
            if (this._markupItem !== null) {
                this._measureManager.removeMeasurement(this._markupItem);
                this._markupItem = null;
            } else {
                this._measureManager.removeLastMeasurement();
            }
        }

        public setHandled(): boolean {
            return this._markupItem !== null && this._markupItem._getStage() > 1;
        }

        public onActivate(): void {
            this._cursor.onOperatorActivate();
        }

        public onDeactivate(): void {
            this._cursor.onOperatorDeactivate();

            if (this._markupItem !== null) {
                this._measureManager.removeMeasurement(this._markupItem);
                this._markupItem = null;
            }
        }
    }
}
