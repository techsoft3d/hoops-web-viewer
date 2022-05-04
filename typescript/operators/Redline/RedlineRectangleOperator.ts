namespace Communicator.Operator {
    export class RedlineRectangleOperator extends RedlineOperator {
        private _redlineRectangle: Markup.Redline.RedlineRectangle | null = null;
        private _previewHandle: string | null = null;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);
        }

        /** @hidden */
        public createRedlineItem(position: Point2): Markup.Redline.RedlineItem {
            const view = this._viewer.view;
            const cameraPoint = view.getCamera().getCameraPlaneIntersectionPoint(position, view);

            this._redlineRectangle = new Markup.Redline.RedlineRectangle(this._viewer);
            if (cameraPoint !== null) {
                this._redlineRectangle.setPoint1(cameraPoint);
                this._redlineRectangle.setPoint2(cameraPoint);
            }

            this._previewHandle = this._viewer.markupManager.registerMarkup(this._redlineRectangle);

            return this._redlineRectangle;
        }

        /** @hidden */
        public updateRedlineItem(position: Point2): void {
            if (this._redlineRectangle) {
                const view = this._viewer.view;
                const cameraPoint = view
                    .getCamera()
                    .getCameraPlaneIntersectionPoint(position, view);

                if (cameraPoint !== null) {
                    this._redlineRectangle.setPoint2(cameraPoint);
                }

                this._viewer.markupManager.refreshMarkup();
            }
        }

        /** @hidden */
        public finalizeRedlineItem(_position: Point2): Markup.Redline.RedlineItem | null {
            let markupItem: Markup.Redline.RedlineItem | null = null;

            if (this._redlineRectangle && this._previewHandle) {
                const markup = this._viewer.markupManager;
                if (this._redlineRectangle.isValid()) markupItem = this._redlineRectangle;

                markup.unregisterMarkup(this._previewHandle);
                this._previewHandle = null;
                this._redlineRectangle = null;
                markup.refreshMarkup();
            }

            return markupItem;
        }
    }
}
