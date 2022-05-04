/// <reference path="../Operator.ts"/>
/// <reference path="../Markup/Redline/RedlineText.ts"/>

namespace Communicator.Operator {
    export class RedlineTextOperator extends RedlineOperator {
        private _redlineText: Markup.Redline.RedlineText | null = null;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);
        }

        /** @hidden */
        public createRedlineItem(_position: Point2): Markup.Redline.RedlineItem {
            this._redlineText = new Markup.Redline.RedlineText(this._viewer);
            return this._redlineText;
        }

        /** @hidden */
        public finalizeRedlineItem(position: Point2): Markup.Redline.RedlineItem | null {
            if (this._redlineText === null) {
                return null;
            }

            const view = this._viewer.view;
            const redlineText = this._redlineText;
            const cameraPoint = view.getCamera().getCameraPlaneIntersectionPoint(position, view);

            if (cameraPoint !== null) {
                redlineText.setPosition(cameraPoint);
            }
            this._redlineText = null;
            return redlineText;
        }
    }
}
