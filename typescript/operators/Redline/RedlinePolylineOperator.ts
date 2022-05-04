/// <reference path="../Operator.ts"/>
/// <reference path="../Markup/Redline/RedlinePolyline.ts"/>
/// <reference path="RedlineOperator.ts"/>

namespace Communicator.Operator {
    export class RedlinePolylineOperator extends RedlineOperator {
        private _redlinePolyline: Markup.Redline.RedlinePolyline | null = null;
        private _previewHandle: string | null = null;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);
        }

        /** @hidden */
        public createRedlineItem(position: Point2): Markup.Redline.RedlineItem {
            const view = this._viewer.view;
            this._redlinePolyline = new Markup.Redline.RedlinePolyline(this._viewer);
            this._previewHandle = this._viewer.markupManager.registerMarkup(this._redlinePolyline);

            const cameraPoint = view.getCamera().getCameraPlaneIntersectionPoint(position, view);
            if (cameraPoint !== null) {
                this._redlinePolyline.addPoint(cameraPoint);
            }
            return this._redlinePolyline;
        }

        /** @hidden */
        public updateRedlineItem(position: Point2): void {
            if (this._redlinePolyline) {
                const view = this._viewer.view;
                const cameraPoint = view
                    .getCamera()
                    .getCameraPlaneIntersectionPoint(position, view);
                if (cameraPoint !== null) {
                    this._redlinePolyline.addPoint(cameraPoint);
                    this._viewer.markupManager.refreshMarkup();
                }
            }
        }

        /** @hidden */
        public finalizeRedlineItem(_position: Point2): Markup.Redline.RedlineItem | null {
            const markup = this._viewer.markupManager;
            let markupItem: Markup.Redline.RedlineItem | null = null;

            if (this._redlinePolyline) {
                if (this._redlinePolyline.isValid()) {
                    markupItem = this._redlinePolyline;
                }
                this._redlinePolyline = null;

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
