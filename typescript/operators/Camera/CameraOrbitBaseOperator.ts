/// <reference path="../OperatorBase.ts"/>

namespace Communicator.Operator {
    /** @hidden */
    export namespace CameraOrbitBaseOperator {
        export type CameraRotateFunction = (turnTilt: number[]) => void;
    }

    /** @hidden */
    export class CameraOrbitBaseOperator extends OperatorBase {
        private _cameraRotateFunction: CameraOrbitBaseOperator.CameraRotateFunction;
        private _cameraRotationMomentumEnabled = false;

        private _isDown = false; //Indicates whether the left button is down
        private _mouseDragged = false; //Indicates whether the user moved the mouse while holding the left button

        private _averagedMousePoints = new TimedPoints();
        private _averageTimeIntervalMilliseconds = 150;

        private _previousMouseMovePoint = Point2.zero();
        private _mouseMovePoint = Point2.zero(); // Where the user is pressing during a drag
        private _mouseMoveOffset = Point2.zero();

        private _previousMouseMoveTime: number | null = null;
        private _mouseMoveTime: number | null = null;
        private _mouseMoveElapsedTimeSeconds = 0;

        private _rotationDegreesPerSecond: number[] = [0.0, 0.0]; // Number of degrees per second to rotate the camera, when animation is active. Might be negative

        private _animationLastTickTime = 0; // The last time _onTick() was called
        private _animationElapsedTimeSeconds = 0; // The amount of time taken during the last tick

        private _animationIntervalResult: number | null = null; // The result of calling Javascript's setInterval()
        private _preferredAnimationIntervalMilliseconds = 16; // The number of milliseconds per interval

        private _momentum = 0; // The rotation's momentum during an animation. Starts at 1 and goes to 0
        private _momentumLossPerSecond = 0; // The momentum loss rate

        private _degreesPerPixel = 0.5; // Converts input pixels to degrees
        private _maxRotationMagnitudeScale = 8; // Increase this to allow the user to increase the maximum fling speed

        private _initialSelectionPosition: Point2 | null = null;

        /** @hidden */
        public constructor(
            viewer: WebViewer,
            rotateFunction: CameraOrbitBaseOperator.CameraRotateFunction,
        ) {
            super(viewer);
            this._cameraRotateFunction = rotateFunction;
        }

        public getCameraRotationMomentumEnabled(): boolean {
            return this._cameraRotationMomentumEnabled;
        }

        public setCameraRotationMomentumEnabled(val: boolean): void {
            if (val !== this._cameraRotationMomentumEnabled) {
                this._cameraRotationMomentumEnabled = val;

                if (!val) this.stopAnimation();
            }
        }

        public isCurrentlyAnimating(): boolean {
            return this._cameraRotationMomentumEnabled && this.getMomentum() > 0;
        }

        /** @hidden */
        public onDeactivate(): void | Promise<void> {
            const p = super.onDeactivate();
            return p;
        }

        /** @hidden */
        public onViewOrientationChange(): void {
            this.stopAnimation();
        }

        public supportsAnimation(): boolean {
            return true;
        }

        /** @hidden */
        public onMouseDown(event: Event.MouseInputEvent): void {
            super.onMouseDown(event);

            if (this.isActive()) {
                this._initialSelectionPosition = event.getPosition();

                this._isDown = true;
                this.stopAnimation();
                this._mouseDragged = false;

                // Hold onto time and point
                this._previousMouseMoveTime = Date.now();
                this._mouseMoveTime = this._previousMouseMoveTime;
                this._mouseMovePoint.assign(this._initialSelectionPosition);
                this._previousMouseMovePoint.assign(this._mouseMovePoint);

                // Clear out average
                this._averagedMousePoints.clear();
                this._averagedMousePoints.add(this._mouseMovePoint, this._mouseMoveTime);
            }
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);

            if (this.isActive()) {
                if (!this._isDown) return;

                this._mouseDragged = true;

                // Hold onto previous points
                this._previousMouseMovePoint.assign(this._mouseMovePoint);

                // Hold onto current points and calculate offsets
                this._mouseMovePoint.assign(event.getPosition());
                this._mouseMoveOffset = Point2.subtract(
                    this._mouseMovePoint,
                    this._previousMouseMovePoint,
                );

                // Update times
                this._previousMouseMoveTime = this._mouseMoveTime;
                this._mouseMoveTime = Date.now();
                this._mouseMoveElapsedTimeSeconds =
                    this._previousMouseMoveTime === null
                        ? 0
                        : (this._mouseMoveTime - this._previousMouseMoveTime) / 1000;

                // Average
                this._averagedMousePoints.add(this._mouseMovePoint, this._mouseMoveTime);

                // Rotate
                const offsetForRotation = this._getMouseMoveOffsetForRotation();
                this._rotateCamera(offsetForRotation);
            }
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            if (this.isActive()) {
                this._isDown = false;

                if (this._mouseDragged && this.getCameraRotationMomentumEnabled()) {
                    this._mouseMoveOffset = this._averagedMousePoints.getAverageOffsetWithinMilliseconds(
                        this._averageTimeIntervalMilliseconds,
                    );

                    // Calculate angular velocity, and limit it
                    const offsetForRotation = this._getMouseMoveOffsetForRotation();
                    if (offsetForRotation[0] !== 0 || offsetForRotation[1] !== 0) {
                        for (let i = 0; i < 2; i++) {
                            const maxRotationDegreesPerSecond =
                                Math.abs(offsetForRotation[i]) * this._maxRotationMagnitudeScale;

                            this._rotationDegreesPerSecond[i] =
                                offsetForRotation[i] / this._mouseMoveElapsedTimeSeconds;
                            if (this._rotationDegreesPerSecond[i] < -maxRotationDegreesPerSecond)
                                this._rotationDegreesPerSecond[i] = -maxRotationDegreesPerSecond;
                            else if (
                                this._rotationDegreesPerSecond[i] > maxRotationDegreesPerSecond
                            )
                                this._rotationDegreesPerSecond[i] = maxRotationDegreesPerSecond;
                        }

                        this._momentum = 1.0;

                        this._startAnimation();
                    } else {
                        this._momentum = 0.0;
                    }
                }
            }

            super.onMouseUp(event);
        }

        private _rotateCamera(offsetForRotation: number[]): void {
            //Rotates the camera by delegating to the member 'cameraRotateFunction'
            this._cameraRotateFunction(offsetForRotation);
        }

        public stopAnimation(): void {
            if (this._animationIntervalResult !== null) {
                clearInterval(this._animationIntervalResult);
                this._animationIntervalResult = null;
            }
        }

        public getMomentum(): number {
            return this._momentum;
        }

        /**
         * Sets proportion of momentum lost per second if camera rotation momentum is enabled. At 0
         * no momentum is lost and the camera will orbit indefinitely. Above 1 the camera will stop
         * orbiting within a second of release. Only values greater than or equal to 0 are accepted.
         * @param amountLost Proportion of momentum lost per second
         */
        public setMomentumLossPerSecond(amountLost: number) {
            if (amountLost >= 0) {
                this._momentumLossPerSecond = amountLost;
            }
        }

        public getMomentumLossPerSecond(): number {
            return this._momentumLossPerSecond;
        }

        public isAnimating(): boolean {
            return this._animationIntervalResult !== null;
        }

        private _startAnimation(): void {
            if (this._animationIntervalResult !== null) return; // The animation is already running

            this._animationLastTickTime = Date.now();

            this._animationIntervalResult = window.setInterval(() => {
                this._onTick();
            }, this._preferredAnimationIntervalMilliseconds);
        }

        private _getMouseMoveOffsetForRotation(): number[] {
            return [
                -this._mouseMoveOffset.x * this._degreesPerPixel,
                this._mouseMoveOffset.y * this._degreesPerPixel,
            ];
        }

        private _onTick(): void {
            // Calculate updated time interval
            const now = Date.now();
            this._animationElapsedTimeSeconds = (now - this._animationLastTickTime) / 1000;
            this._animationLastTickTime = now;

            // Calculate time-based rotation offset
            const offsetForRotation = [
                this._animationElapsedTimeSeconds * this._rotationDegreesPerSecond[0],
                this._animationElapsedTimeSeconds * this._rotationDegreesPerSecond[1],
            ];
            this._rotateCamera(offsetForRotation);

            // Apply momentum loss to the angular velocity if necessary
            if (this._momentumLossPerSecond > 0) {
                this._momentum = Math.max(
                    0,
                    this._momentum -
                        this._animationElapsedTimeSeconds * this._momentumLossPerSecond,
                );
                if (this._momentum > 0) {
                    for (let i = 0; i < this._rotationDegreesPerSecond.length; i++)
                        this._rotationDegreesPerSecond[i] *= this._momentum;
                } else {
                    for (let i = 0; i < this._rotationDegreesPerSecond.length; i++)
                        this._rotationDegreesPerSecond[i] = 0;

                    this._rotateCamera(this._rotationDegreesPerSecond);
                    this.stopAnimation(); // Stop timer
                }
            }
        }
    }

    /** @hidden */
    class TimedPoints {
        private _points: Point2[];
        private _times: number[];
        private _count: number = 0;

        /**
         * Caches a stream of points generated in time by storing them in a wrapped array, from oldest to newest. When the wrap occurs, the oldest, earliest entries are overwritten
         * @param {number} maxPoints the maximum point stream size
         */
        public constructor(maxPoints: number = 10) {
            this._points = new Array<Point2>(maxPoints);
            this._times = new Array<number>(maxPoints);
        }

        /**
         * Clears the array of points
         */
        public clear(): void {
            this._count = 0;
        }

        /**
         * Adds a point to the array of points, possibly overwriting the oldest one
         */
        public add(point: Point2, now: number = Date.now()): void {
            const index = this._count % this._points.length;

            if (this._points[index] === undefined) this._points[index] = point.copy();
            else this._points[index].assign(point);

            this._times[index] = now;

            this._count++;
        }

        /**
         * Gets the average offset from the first point specified between (now - offset) and now
         */
        public getAverageOffsetWithinMilliseconds(
            millisec: number,
            now: number = Date.now(),
        ): Point2 {
            let startIndex = -1;
            const end = Point2.zero();

            const pointCount = Math.min(this._points.length, this._count);

            if (pointCount > 0) {
                let averagedCount = 0;

                // Step backwards starting from the wrapped last item, collecting all points within the specified time interval
                for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
                    const index = (this._count - 1 - pointIndex) % this._points.length;

                    // If we ran into a time that was outside the specified interval, break out since no more times will be within the interval
                    const timeOffset = now - this._times[index];
                    if (timeOffset > millisec) break;

                    // Update start index
                    startIndex = index;

                    // Add to end
                    end.add(this._points[index]);
                    averagedCount++;
                }

                if (averagedCount > 1) {
                    // There are at least two averaged points. Remove the start point
                    end.subtract(this._points[startIndex]);
                    averagedCount--;

                    // Average
                    end.scale(1.0 / averagedCount);
                } else {
                    // Only one averaged point, which means there was only one point within the specified time interval (so no offset)
                    startIndex = -1;
                    end.set(0, 0);
                }
            }

            if (startIndex >= 0) return Point2.subtract(end, this._points[startIndex]);
            else return end;
        }
    }
}
