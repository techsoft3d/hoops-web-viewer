/// <reference path="../Operator.ts"/>
/// <reference path="../Markup/Redline/RedlineCircle.ts"/>
/// <reference path="RedlineOperator.ts"/>

namespace Communicator.Operator {
    export class RedlineCircleOperator extends RedlineOperator {
        private _redlineCircle: Markup.Redline.RedlineCircle | null = null;
        private _previewHandle: string | null = null;
        private _centerSet = false;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);
        }

        /** @hidden */
        public createRedlineItem(position: Point2): Markup.Redline.RedlineItem {
            const view = this._viewer.view;
            this._redlineCircle = new Markup.Redline.RedlineCircle(this._viewer);
            this._previewHandle = this._viewer.markupManager.registerMarkup(this._redlineCircle);

            const cameraPoint = view.getCamera().getCameraPlaneIntersectionPoint(position, view);
            if (cameraPoint !== null) {
                this._centerSet = true;
                this._redlineCircle.setCenter(cameraPoint);
                this._redlineCircle.setRadiusPoint(cameraPoint);
            }
            return this._redlineCircle;
        }

        /** @hidden */
        public updateRedlineItem(position: Point2): void {
            const view = this._viewer.view;

            if (this._redlineCircle) {
                const cameraPoint = view
                    .getCamera()
                    .getCameraPlaneIntersectionPoint(position, view);
                if (cameraPoint !== null) {
                    if (!this._centerSet) {
                        this._centerSet = true;
                        this._redlineCircle.setCenter(cameraPoint);
                    }
                    this._redlineCircle.setRadiusPoint(cameraPoint);
                    this._viewer.markupManager.refreshMarkup();
                }
            }
        }

        /** @hidden */
        public finalizeRedlineItem(_position: Point2): Markup.Redline.RedlineItem | null {
            const markup = this._viewer.markupManager;
            let markupItem: Markup.Redline.RedlineItem | null = null;

            if (this._redlineCircle) {
                if (this._redlineCircle.isValid()) {
                    markupItem = this._redlineCircle;
                }
                this._redlineCircle = null;

                if (this._previewHandle !== null) {
                    markup.unregisterMarkup(this._previewHandle);
                    this._previewHandle = null;
                }
                markup.refreshMarkup();
            }

            return markupItem;
        }
    }
}
