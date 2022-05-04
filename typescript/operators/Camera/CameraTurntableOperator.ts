/// <reference path="CameraOrbitBaseOperator.ts"/>

namespace Communicator.Operator {
    export class CameraTurntableOperator extends CameraOrbitBaseOperator {
        private _rotationAxis: Point3;
        private _tiltAmount: number;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer, (turnTilt: number[]) => {
                this._rotateAroundAxis(this._rotationAxis, turnTilt[0]);
            });

            this._rotationAxis = new Point3(0, 0, 1);
            this._tiltAmount = 12;
        }

        private _rotateAroundAxis(axis: Point3, amount: number): void {
            const view = this._viewer.view;
            const camera = view.getCamera();

            const eye = camera.getPosition();
            const up = camera.getUp().normalize();
            const delta = camera.getTarget();

            const matrixAxis = Matrix.createFromOffAxisRotation(axis, amount);
            const matrixOrigin = new Matrix().setTranslationComponent(-delta.x, -delta.y, -delta.z);
            const matrixAxisToOrigin = Matrix.multiply(matrixOrigin, matrixAxis);
            const matrixOrigin2 = new Matrix().setTranslationComponent(delta.x, delta.y, delta.z);
            const matrixFinal = Matrix.multiply(matrixAxisToOrigin, matrixOrigin2);

            matrixFinal.transform(eye, eye);
            matrixAxis.transform(up, up);
            up.normalize();

            camera.setPosition(eye);
            camera.setUp(up);

            view.setCamera(camera);
        }

        /** @hidden */
        public onMousewheel(event: Event.MouseWheelInputEvent): void {
            const delta = event.getWheelDelta();
            const camera = this._viewer.view.getCamera();

            const up = camera.getUp().normalize();
            const forward = Point3.subtract(camera.getTarget(), camera.getPosition()).normalize();
            const left = Point3.cross(up, forward).normalize();

            if (delta > 0) this._rotateAroundAxis(left, this._tiltAmount);
            else this._rotateAroundAxis(left, -this._tiltAmount);
        }

        /**
         * Sets the rotation axis.
         * @param axis
         */
        public setRotationAxis(axis: Axis): boolean {
            let success = true;
            switch (axis) {
                case Axis.X:
                    this._rotationAxis.set(1, 0, 0);
                    break;

                case Axis.Y:
                    this._rotationAxis.set(0, 1, 0);
                    break;

                case Axis.Z:
                    this._rotationAxis.set(0, 0, 1);
                    break;

                default:
                    success = false;
                    break;
            }
            return success;
        }
    }
}
