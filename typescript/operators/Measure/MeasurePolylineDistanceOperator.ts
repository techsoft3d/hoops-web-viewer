namespace Communicator.Operator {
    export enum MeasurePolylineDistanceAnchor {
        /** Text box indicating measurement value will be anchored to the first point of the polyline. */
        First,

        /** Text box indicating measurement value will be anchored to the last point of the polyline.*/
        Last,

        /** Text box indicating measurement value will be anchored to the midpoint of the polyline.*/
        Midpoint,
    }

    /**
     * This operator allows you to create a polyline and measure its distance.
     * Click to add points to the polyline.  A cursor will show where the point will be placed.
     * The operator will perform vertex snapping by default.  Holding down the alt key will disable this feature.
     * To complete a measurement, double click when placing a point to create an open line measurement, or single click on the first point to create a closed loop.
     * When there is no active measurement being created, click on a text box to drag and reposition it relative to its anchor point.
     * If a measurement is currently being created, pressing the Escape key will discard it, otherwise the last created measurement will be discarded.
     */
    export class MeasurePolylineDistanceOperator extends OperatorBase {
        private _cursor: Common.PointCursor;
        private _markupItem: Markup.Measure.MeasurePolylineDistanceMarkup | null = null;
        private _measureManager: MeasureManager;
        private _cameraInteractionActive = false;
        private _textShapeOffset = new Point2(10, -25);
        private _anchor = MeasurePolylineDistanceAnchor.Last;
        private _dragPlane: Plane | null = null;

        /** @hidden */
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

        /** @hidden */
        public getMarkupItem() {
            return this._markupItem;
        }

        /** Sets the anchor type that will be set for markups created by this operator. */
        public setAnchor(anchor: MeasurePolylineDistanceAnchor) {
            this._anchor = anchor;
        }

        /**
         * Determine if the given mouse event should cause snapping. This is influenced by
         * the snap configuration enabled value.
         */
        private _useSnapping(event: Event.MouseInputEvent): boolean {
            // COM-1683 Changed behavior to default to snapping unless the alt-key is down
            return this._cursor.snappingConfig.enabled && !event.altDown();
        }

        private _getLastSelectedPoint() {
            if (this._markupItem) {
                return this._markupItem.getlast();
            }

            return null;
        }

        private _createNewMarkupItem(selection: Common.SelectionPoints) {
            this._markupItem = new Markup.Measure.MeasurePolylineDistanceMarkup(this._viewer);
            this._markupItem.setUnitMultiplier(
                selection.selectionItem.isNodeSelection()
                    ? this._viewer.model.getNodeUnitMultiplier(selection.selectionItem.getNodeId())
                    : 1,
            );
            this._markupItem.setName("MeasurePolylineDistanceMarkup");
            this._measureManager.addMeasurement(this._markupItem);
            this._markupItem.addPoint(selection.worldPosition!);
        }

        private _updateMarkupItem(pointerPosition: Point2, selection: Common.SelectionPoints) {
            if (this._markupItem === null || selection.worldPosition == null) return;

            const points = this._markupItem.getPoints();
            const firstPos = Point2.fromPoint3(this._viewer.view.projectPoint(points[0]));

            // check to see if the added point creates a loop and ends the measurement
            // note that nothing will happen if the point is clicked before a single segment has been created
            if (Point2.distance(firstPos, pointerPosition) < this._markupItem.pointRadius) {
                if (points.length > 2) {
                    this._markupItem.isLoop = true;
                    this._finalizeMeasurement();
                }
            } else {
                this._markupItem.addPoint(selection.worldPosition);
                this._updateAnchor(pointerPosition, selection.worldPosition);
            }
        }

        // Updates the cursor display and the measurement markup item based on a pointer position.
        private async _updateMeasurementItem(
            pointerPosition: Point2,
            useSnapping: boolean,
        ): Promise<void> {
            const lastSelectionPoint = this._getLastSelectedPoint();
            const selection = await this._cursor.getSelectionCursorPoints(
                pointerPosition,
                useSnapping,
                lastSelectionPoint,
            );
            if (selection === null || selection.worldPosition === null) {
                this._cursor.activateCursorSprite(false);
                return;
            } else {
                this._cursor.activateCursorSprite(true);
            }

            if (this._markupItem === null) {
                this._createNewMarkupItem(selection);
            } else {
                this._updateMarkupItem(pointerPosition, selection);
            }
        }

        private _isDraggingText() {
            return this._dragPlane !== null;
        }

        /** @hidden */
        public onMouseDown(event: Event.MouseInputEvent): void {
            super.onMouseDown(event);

            if (this._markupItem)
                // cant drag if we are currently working on a markup item
                return;

            const position = event.getPosition();
            if (this._pickExisting(position)) {
                this._dragPlane = this._calculateSelectionPlane(this._markupItem!.leaderPosition);
                event.setHandled(true); // prevent camera interaction
            }
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);

            if (this._isDraggingText()) {
                this._dragMarkupText(event);
                event.setHandled(true);
            } else if (!this._cameraInteractionActive) {
                const lastSelectedPoint = this._getLastSelectedPoint();
                this._cursor.updateCursorSprite(
                    event.getPosition(),
                    this._useSnapping(event),
                    lastSelectedPoint,
                );

                this._draw();
            }
        }

        /** @hidden */
        public async onMouseUp(event: Event.MouseInputEvent): Promise<void> {
            if (!this.isActive()) return;

            const mousePos = event.getPosition();
            if (this._isDraggingText()) {
                this._markupItem = null; // no longer want to operate on the item we were just dragging
                this._dragPlane = null;
            } else if (this._ptFirst.equals(mousePos)) {
                // make sure its a click
                const useSnapping = this._useSnapping(event);
                const mousePosition = mousePos;

                await this._updateMeasurementItem(mousePosition, useSnapping);
            }

            // `onMouseUp` resets `_dragCount`, and must come after we check for it
            super.onMouseUp(event);
        }

        /** @hidden */
        public onDoubleClick(_event: Event.MouseInputEvent): void {
            this._finalizeMeasurement();
        }

        private _dragMarkupText(event: Event.MouseInputEvent) {
            if (this._markupItem === null || this._dragPlane === null) return;
            const selectionRay = this._viewer.view.raycastFromPoint(event.getPosition())!;
            this._dragPlane.intersectsRay(selectionRay, this._markupItem.textPosition);

            this._draw();
        }

        private _finalizeMeasurement() {
            if (!this._markupItem) return;

            if (this._markupItem.isValid()) {
                // Unset markupItem before finalizing in case finalization deactivates operator
                const markupItem = this._markupItem;
                this._markupItem = null;

                markupItem.finalize();
                this._measureManager.finalizeMeasurement(markupItem!);
            } else {
                this._clearMeasurement();
            }
        }

        private _updateAnchor(pointerPosition: Point2, worldPos: Point3) {
            if (!this._markupItem) return;

            const points = this._markupItem.getPoints();
            if (points.length === 1) return;

            switch (this._anchor) {
                case MeasurePolylineDistanceAnchor.Last:
                    this._calculateAnchorPos(pointerPosition, worldPos);
                    break;
                case MeasurePolylineDistanceAnchor.First: {
                    if (points.length !== 2) return;

                    const screenPos = this._viewer.view.projectPoint(points[0]);
                    this._calculateAnchorPos(Point2.fromPoint3(screenPos), points[0]);
                    break;
                }

                case MeasurePolylineDistanceAnchor.Midpoint: {
                    let anchorPos: Point3;
                    const midpointValue = this._markupItem.getMeasurementValue() / 2.0;
                    let prevDist = 0.0;

                    for (let i = 1; i < points.length; i++) {
                        const pointVec = Point3.subtract(points[i], points[i - 1]);
                        const pointDist = pointVec.length();
                        const newDist = prevDist + pointDist;

                        if (newDist > midpointValue) {
                            const tarDistance = midpointValue - prevDist;
                            const ratio = tarDistance / pointDist;
                            pointVec.scale(ratio);
                            anchorPos = Point3.add(points[i - 1], pointVec);
                            break;
                        }

                        prevDist = newDist;
                    }

                    const screenPos = this._viewer.view.projectPoint(anchorPos!);
                    this._calculateAnchorPos(Point2.fromPoint3(screenPos), anchorPos!);
                    break;
                }
            }
        }

        private _calculateSelectionPlane(worldPos: Point3) {
            const camera = this._viewer.view.getCamera();
            const pointToCameraVec = Point3.subtract(camera.getPosition(), worldPos);
            pointToCameraVec.normalize();

            return Plane.createFromPointAndNormal(worldPos, pointToCameraVec);
        }

        private _calculateAnchorPos(screenPos: Point2, worldPos: Point3) {
            const camera = this._viewer.view.getCamera();
            const pointToCameraVec = Point3.subtract(camera.getPosition(), worldPos);
            pointToCameraVec.normalize();

            const selectionPlane = this._calculateSelectionPlane(worldPos);
            const offsetRay = this._viewer.view.raycastFromPoint(
                Point2.add(screenPos, this._textShapeOffset),
            );

            if (!offsetRay) return;

            selectionPlane.intersectsRay(offsetRay, this._markupItem!.textPosition);
            this._markupItem!.leaderPosition.assign(worldPos);
        }

        // Cancels the currently measurement being created or removes the last created measurement
        public _clearMeasurement() {
            if (this._markupItem !== null) {
                this._measureManager.removeMeasurement(this._markupItem);
                this._markupItem = null;
            } else {
                this._measureManager.removeLastMeasurement();
            }
        }

        private _draw() {
            this._viewer.markupManager.refreshMarkup();
        }

        protected _pickExisting(selectPoint: Point2): boolean {
            const markup = this._viewer.markupManager.pickMarkupItem(selectPoint);

            if (
                markup &&
                markup.getClassName() ===
                    "Communicator.Markup.Measure.MeasurePolylineDistanceMarkup"
            ) {
                this._markupItem = markup as Markup.Measure.MeasurePolylineDistanceMarkup;
                return true;
            } else {
                return false;
            }
        }

        /** @hidden */
        public onActivate(): void {
            this._cursor.onOperatorActivate();
        }

        /** @hidden */
        public onDeactivate(): void {
            this._cursor.onOperatorDeactivate();
        }

        /** @hidden */
        public onKeyDown(event: Event.KeyInputEvent): void {
            const keyCode = event.getKeyCode();

            if (keyCode === KeyCode.Escape) {
                this._clearMeasurement();
            }
        }

        private _onBeginInteraction() {
            this._cameraInteractionActive = true;
            this._cursor.activateCursorSprite(false);
        }

        private _onEndInteraction() {
            this._cameraInteractionActive = false;
        }
    }
}
