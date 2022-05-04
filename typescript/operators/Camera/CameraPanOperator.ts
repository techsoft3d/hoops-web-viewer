/// <reference path="../OperatorBase.ts"/>

namespace Communicator.Operator {
    export class CameraPanOperator extends OperatorBase {
        private _cameraPtPrevious: Point3 = Point3.zero();

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);
        }

        /** @hidden */
        public onMouseDown(event: Event.MouseInputEvent): void {
            super.onMouseDown(event);

            if (this.isActive() || this._viewer.sheetManager.isDrawingSheetActive()) {
                const view = this._viewer.view;

                const camera = view.getCamera();
                const intersectionPoint = camera.getCameraPlaneIntersectionPoint(
                    event.getPosition(),
                    view,
                );

                if (intersectionPoint) {
                    this._cameraPtPrevious.assign(intersectionPoint);
                }
            }
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);

            if (this.isActive() || this._viewer.sheetManager.isDrawingSheetActive()) {
                const view = this._viewer.view;
                const camera = view.getCamera();
                const intersectionPoint = camera.getCameraPlaneIntersectionPoint(
                    event.getPosition(),
                    view,
                );

                if (intersectionPoint) {
                    const delta = Point3.subtract(intersectionPoint, this._cameraPtPrevious);
                    camera.dolly(delta);
                    view.setCamera(camera);
                }
            }
        }
    }
}
