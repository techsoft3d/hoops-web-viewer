/** @hidden */
namespace Communicator.Operator.Common {
    export function worldPointToScreenPoint(viewer: WebViewer, worldPosition: Point3): Point2 {
        const wp4 = new Point4(worldPosition.x, worldPosition.y, worldPosition.z, 1);
        const sp4 = new Point4(0, 0, 0, 0);

        viewer.view.getFullCameraMatrix().transform4(wp4, sp4);

        const invW = 1 / sp4.w;
        const screenPosition = new Point2(sp4.x * invW, sp4.y * invW);

        const dims = viewer.model.getClientDimensions();
        const w = dims[0];
        const h = dims[1];

        screenPosition.x = 0.5 * w * (screenPosition.x + 1);
        screenPosition.y = 0.5 * h * (screenPosition.y + 1);

        screenPosition.x = Math.max(0, Math.min(screenPosition.x, w));
        screenPosition.y = h - Math.max(0, Math.min(screenPosition.y, h));

        return screenPosition;
    }

    export class SelectionPoints {
        public readonly worldPosition: Point3 | null;
        public readonly screenPosition: Point2;
        public readonly selectionItem: Selection.SelectionItem;

        public constructor(
            worldPosition: Point3 | null,
            screenPosition: Point2,
            selectionItem: Selection.SelectionItem,
        ) {
            this.worldPosition = worldPosition;
            this.screenPosition = screenPosition;
            this.selectionItem = selectionItem;
        }
    }

    // TODO: Don't see anyway to influence this for the operator
    interface SnappingConfig {
        enabled: boolean;
        preferVertices: boolean;
    }

    class CursorMarkup extends Markup.Measure.MeasureMarkup {
        private readonly _cursorSprite = new Markup.Shape.Circle();
        private readonly _markupId: string;

        public constructor(viewer: WebViewer) {
            super(viewer);

            this._name = "CursorMarkup";
            const measurementColor = viewer.measureManager.getMeasurementColor();
            this._cursorSprite.setFillColor(measurementColor);
            this._cursorSprite.setStrokeColor(measurementColor);
            this._cursorSprite.setRadius(0);

            this._markupId = viewer.markupManager.registerMarkup(this);
        }

        public draw(): void {
            const renderer = this._viewer.markupManager.getRenderer();
            renderer.drawCircle(this._cursorSprite);
        }

        public enable(enable: boolean): void {
            this._cursorSprite.setRadius(enable ? 2.5 : 0);
        }

        public isEnabled(): boolean {
            return this._cursorSprite.getRadius() > 0;
        }

        public setPosition(point: Point2): void {
            this._cursorSprite.setCenter(point);
        }

        public destroy(): void {
            this._viewer.markupManager.unregisterMarkup(this._markupId);
        }
    }

    export class PointCursor {
        private _viewer: WebViewer;
        public _cursorMarkup: CursorMarkup | null = null;
        public readonly snappingConfig: SnappingConfig;
        private readonly _updateCursorSpriteAction = new Util.CurrentAction(true);

        public constructor(viewer: WebViewer) {
            this._viewer = viewer;

            this.snappingConfig = {
                enabled: true,
                preferVertices: true,
            };
        }

        public async getSelectionCursorPoints(
            mousePosition: Point2,
            useSnapping: boolean,
            previousPickPoint: Point3 | null,
        ): Promise<SelectionPoints | null> {
            const config = new PickConfig(useSnapping ? SelectionMask.All : SelectionMask.Face);
            if (useSnapping) {
                // Allows picking of lines even if we're not hovering the model.
                config.enableProximityFaces = true;
                config.restrictLinesAndPointsToSelectedFaceInstances = false;
            }

            const selectionItem = await this._viewer.view.pickFromPoint(mousePosition, config);
            if (selectionItem.overlayIndex() !== 0) {
                return null;
            }

            let worldPosition = selectionItem.getPosition();
            let screenPosition = mousePosition;

            if (this.snappingConfig.enabled) {
                const lineEntity = selectionItem.getLineEntity();
                const pointEntity = selectionItem.getPointEntity();
                const faceEntity = selectionItem.getFaceEntity();
                if (lineEntity || pointEntity || faceEntity) {
                    let worldSnapPosition: Point3 | null = null;
                    if (lineEntity !== null) {
                        worldSnapPosition = this._getLineSnapPoint(
                            lineEntity,
                            useSnapping,
                            previousPickPoint,
                        );
                    } else if (pointEntity !== null) {
                        worldSnapPosition = pointEntity.getPosition();
                    } else if (faceEntity !== null && faceEntity.isProximityFace()) {
                        worldSnapPosition = faceEntity.getPosition();
                    }

                    if (worldSnapPosition !== null) {
                        worldPosition = worldSnapPosition;
                        screenPosition = worldPointToScreenPoint(this._viewer, worldPosition);
                    }
                }
            }

            return new SelectionPoints(worldPosition, screenPosition, selectionItem);
        }

        public updateCursorSprite(
            mousePosition: Point2,
            useSnapping: boolean,
            firstSelectedPoint: Point3 | null,
        ): void {
            this._updateCursorSpriteAction.set(() => {
                return this._updateCursorSpriteImpl(mousePosition, useSnapping, firstSelectedPoint);
            });
        }

        private async _updateCursorSpriteImpl(
            mousePosition: Point2,
            useSnapping: boolean,
            firstSelectedPoint: Point3 | null,
        ): Promise<void> {
            if (this._cursorMarkup !== null) {
                if (useSnapping) {
                    const selection = await this.getSelectionCursorPoints(
                        mousePosition,
                        useSnapping,
                        firstSelectedPoint,
                    );
                    if (selection !== null) {
                        this._cursorMarkup.setPosition(selection.screenPosition);
                        this.activateCursorSprite(true);
                    } else {
                        this.activateCursorSprite(false);
                    }
                } else {
                    this._cursorMarkup.setPosition(mousePosition);
                }
            }

            //this._draw(); // TODO: this belongs in the calling operator
        }

        public draw() {
            if (this._cursorMarkup !== null) this._cursorMarkup.draw();
        }

        public activateCursorSprite(enable: boolean): void {
            if (this._cursorMarkup !== null) {
                this._cursorMarkup.enable(enable);
            }
        }

        /**
         * Finds the best point to use for the given lineEntity given the snapping behavior and settings.
         */
        private _getLineSnapPoint(
            lineEntity: Selection.LineEntity,
            useSnapping: boolean,
            firstSelectedPoint: Point3 | null,
        ): Point3 | null {
            // Always favor vertex snapping if it's viable
            const bestVertexPosition = this.snappingConfig.preferVertices
                ? lineEntity.getBestVertex()
                : null;
            if (bestVertexPosition !== null) {
                return bestVertexPosition;
            }

            // The currently selected position from the line entity will be correct unless we want to find
            // the snap-based center of the second-point line
            const selectedPosition = lineEntity.getPosition();
            if (!useSnapping || firstSelectedPoint == null) {
                return selectedPosition;
            }

            // Getting here means we're snapping and selecting the second point. We need to support either
            //   1) Snapping to the closest point on the line from our original point if we're *near* that closest point OR
            //   2) Just snapping to the line if we're not near the closest point.
            // Thus, we need to figure out the closest point to make that decision. But first we have to figure out
            // which line segment from the set in the selection contains the current selection point. (It would be
            // nice if the selection information indicated that segment, but that's a deeper change into
            // the selection code and really needs it's own JIRA card)
            const points = lineEntity.getPoints();
            const onLineEpsilon = 1.0e-10;
            const firstSegmentVertexIndex = (() => {
                for (let i = 0; i < points.length - 1; i++) {
                    if (
                        Util.isPointOnLineSegment(
                            points[i],
                            points[i + 1],
                            selectedPosition,
                            onLineEpsilon,
                        )
                    ) {
                        return i;
                    }
                }

                // Punt if we didn't find a match and just use the first segment. Should never happen
                // unless maybe we have a bad epsilon
                return 0;
            })();

            // Find closest point on that selected line segment from our first selection point
            const p0 = points[firstSegmentVertexIndex];
            const p1 = points[firstSegmentVertexIndex + 1];

            // Avoid throwing an error when line points are missing, i.e. capping geometry
            if (p0 === undefined || p1 === undefined) {
                return selectedPosition;
            }

            const closestLinePoint = Util.closestPointFromPointToSegment(
                p0,
                p1,
                firstSelectedPoint,
            );

            // Determine if we are within the acceptable tolerance of the closest point on the second line
            const closestScreenPoint = worldPointToScreenPoint(this._viewer, closestLinePoint);
            const selectedScreenPoint = worldPointToScreenPoint(this._viewer, selectedPosition);
            const pixelDistanceSq = Point2.subtract(
                closestScreenPoint,
                selectedScreenPoint,
            ).squaredLength();
            const pickTolerance = this._viewer.selectionManager.getPickTolerance();
            const toleranceSq = pickTolerance * pickTolerance;

            return pixelDistanceSq <= toleranceSq ? closestLinePoint : selectedPosition;
        }

        private _clearCursorMarkup() {
            if (this._cursorMarkup !== null) {
                this._cursorMarkup.destroy();
                this._cursorMarkup = null;
            }
        }

        public onOperatorActivate(): void {
            this._clearCursorMarkup();

            this._cursorMarkup = new CursorMarkup(this._viewer);

            // For 2D drawings, make the background sheet selectable while we're active so
            // the user can point-to-point measure anything on the drawing
            //
            // TODO: Known issue here if hwv.switchToModel() is called while we're active, and the
            // switch is from a 3D to 2D, the background won't be selectable. But there are other issues
            // with the measurement operator already when switching models... fix them then. COM-2021

            if (this._viewer.sheetManager.isDrawingSheetActive()) {
                this._viewer.sheetManager.setBackgroundSelectionEnabled(
                    true,
                ) as Internal.UnusedPromise;
            }
        }

        public onOperatorDeactivate(): void {
            this._clearCursorMarkup();

            // Restore the no-selection behavior for 2D drawings when we're done. Note that if a model-switch to 3D
            // happened while we're active, the background selection will be disabled by the sheet manager so it's
            // fine that it won't get called here.
            if (this._viewer.sheetManager.isDrawingSheetActive()) {
                this._viewer.sheetManager.setBackgroundSelectionEnabled(
                    false,
                ) as Internal.UnusedPromise;
            }
        }
    }
}
