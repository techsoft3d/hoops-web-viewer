/// <reference path="../OperatorBase.ts"/>

namespace Communicator.Operator {
    const MAX_TILT = 45;
    const MIN_TILT = -45;

    const MAX_ANGLE = 150;
    const MIN_ANGLE = 30;

    function clamp(value: number, min: number, max: number): number {
        return Math.max(Math.min(value, max), min);
    }

    /**
     * Returns the vector pointing down in the scene.
     */
    function getDownAxis(model: Model): Point3 {
        const upAxis = model.getViewAxes().upVector;
        console.assert(upAxis.isAxis());
        return Point3.scale(upAxis, -1);
    }

    /**
     * @param bimMask Restricts the objects the selection ray can select to the BIM types present in the mask.
     * @param maxWorldDistance If non-null, this limits the distance the selection ray can travel to hit an object.
     * @returns A ray pick config object suitable for BIM collision tests.
     */
    function buildCollisionRayConfig(
        bimMask: BimMask,
        maxWorldDistance: number | null,
    ): PickConfig {
        const config = new PickConfig(SelectionMask.Face);

        config.bimMask = bimMask;
        config.ignoreOverlays = true;

        if (maxWorldDistance !== null) {
            config.maxWorldDistance = maxWorldDistance;
        }

        return config;
    }

    /**
     * This returns the final position of a point object when gravity is applied.
     * If there are no floors to collide with, null is returned.
     *
     * It is the caller's responsibility to interpolate smooth motion if desired.
     *
     * @param view The `View` of the scene.
     * @param pointObject The point object to fall.
     * @param downVector The vector used to determine the direction of fall.
     * @param maxFallDistance If the fall distance would exceed this value, then gravity is not applied at all.
     */
    async function applyGravity(
        view: View,
        pointObject: Point3,
        downVector: Point3,
        maxFallDistance: number | null,
    ): Promise<Point3 | null> {
        const ray = new Ray(pointObject, downVector);
        const config = buildCollisionRayConfig(BimMask.Floor, maxFallDistance);

        const item = await view.pickFromRay(ray, config);
        if (item.isFaceSelection()) {
            return item.getPosition();
        }

        return null;
    }

    /**
     * Returns the point of collision or null if there is none.
     */
    async function testWallCollision(
        view: View,
        position: Point3,
        movementVector: Point3, // For general motion support, such as back and strafing motion in addition to forward motion.
        maxCollisionDistance: number,
    ): Promise<Selection.FaceSelectionItem | null> {
        const ray = new Ray(position, movementVector.copy().normalize());
        const config = buildCollisionRayConfig(BimMask.Wall, maxCollisionDistance);

        const item = await view.pickFromRay(ray, config);
        if (item.isFaceSelection()) {
            return item;
        }

        return null;
    }

    interface BimConfigs {
        floor: CameraWalkBaseOperator.Bim.FloorConfig;
        wall: CameraWalkBaseOperator.Bim.WallConfig;
        door: CameraWalkBaseOperator.Bim.DoorConfig;
    }

    class DoorCache {
        private readonly _viewer: WebViewer;
        private _nearbyDoors = new Set<NodeId>();

        public constructor(viewer: WebViewer) {
            this._viewer = viewer;
        }

        private _performSphereSelection(
            center: Point3,
            radius: number,
            bimMask: BimMask,
        ): Promise<Selection.NodeSelectionItem[]> {
            const selection = Util.IncrementalSelection.create("View", this._viewer);

            const pickConfig = new IncrementalPickConfig(SelectionMask.Face);
            pickConfig.bimMask = bimMask;
            pickConfig.onlyStreamedInstances = true;
            pickConfig.ignoreUnrequestedInstances = true;

            return selection.performSelection({
                pickConfig: pickConfig,
                sphereCenter: center,
                sphereRadius: radius,
            });
        }

        public async updateNearbyDoors(
            position: Point3,
            maxDoorDistance: number,
            nearbyDoorOpacity: number,
        ): Promise<void> {
            const selectedDoorItems = await this._performSphereSelection(
                position,
                maxDoorDistance,
                BimMask.Door,
            );

            const currentDoors = new Set<NodeId>();
            for (const item of selectedDoorItems) {
                const nodeId = item.getNodeId();
                currentDoors.add(nodeId);
            }

            const newDoors = Util.setSubtraction(currentDoors, this._nearbyDoors);
            const lostDoors = Util.setSubtraction(this._nearbyDoors, currentDoors);

            const newDoorsArray = Util.setToArray(newDoors);
            const lostDoorsArray = Util.setToArray(lostDoors);

            const model = this._viewer.model;

            model.setNodesOpacity(newDoorsArray, nearbyDoorOpacity);
            model.resetNodesOpacity(lostDoorsArray);

            this._nearbyDoors = currentDoors;
        }

        public forgetNearbyDoors(): void {
            const doorIds = Util.setToArray(this._nearbyDoors);
            this._nearbyDoors.clear();
            this._viewer.model.resetNodesOpacity(doorIds);
        }
    }

    /** @hidden */
    export class CameraWalkBaseOperator extends OperatorBase {
        private _elevationSpeed = 0;
        private _rotationSpeed = 0;
        private _viewAngle = 90;
        private _zoomDistance = 0;
        private _walkDistance = 0;

        private _tilt = 0;
        private _majorAxis = Axis.X;
        private _maxExtents = 0;

        private _walkActive = false;
        private readonly _activeWalk = new Util.CurrentAction(true);

        private _bimModeEnabled = false;
        private readonly _synchronizedToggleBimMode = new Util.CurrentActionSync();
        private readonly _doorCache: DoorCache;
        private _downAxis: Point3;

        private _initialInteractiveDrawLimitIncreaseStatus: boolean = true;

        // Pre model unit scaling.
        private readonly _logical: BimConfigs = {
            floor: { ...CameraKeyboardWalkOperator.Bim.Default.FloorConfig },
            wall: { ...CameraKeyboardWalkOperator.Bim.Default.WallConfig },
            door: { ...CameraKeyboardWalkOperator.Bim.Default.DoorConfig },
        };

        // Post model unit scaling.
        private readonly _effective: BimConfigs = {
            floor: { ...CameraKeyboardWalkOperator.Bim.Default.FloorConfig },
            wall: { ...CameraKeyboardWalkOperator.Bim.Default.WallConfig },
            door: { ...CameraKeyboardWalkOperator.Bim.Default.DoorConfig },
        };

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);

            this._doorCache = new DoorCache(viewer);

            // Note: This gets updated as needed.
            this._downAxis = new Point3(0, -1, 0);

            viewer.setCallbacks({
                subtreeLoaded: (_roots: NodeId[], source: NodeSource) => {
                    if (source === NodeSource.LoadModel) {
                        this._updateSceneFloor();
                    }
                },
            });
        }

        private _updateSceneFloor(): void {
            this._downAxis = getDownAxis(this._viewer.model);
        }

        public isBimModeEnabled(): boolean {
            return this._bimModeEnabled;
        }

        private async _enableBimMode(): Promise<void> {
            this._bimModeEnabled = true;

            this._effective.floor = this._scaleAgainstModelUnit(this._logical.floor);
            this._effective.wall = this._scaleAgainstModelUnit(this._logical.wall);
            this._effective.door = this._scaleAgainstModelUnit(this._logical.door);

            this._updateSceneFloor();
            await this._applyGravity();
            await this._updateNearbyDoors();
        }

        private _disableBimMode(): void {
            this._bimModeEnabled = false;
            this._doorCache.forgetNearbyDoors();
        }

        /**
         * Enables BIM mode, which includes collision detection
         */
        public enableBimMode(): Promise<void> {
            return this._synchronizedToggleBimMode.set(async () => {
                await this._enableBimMode();
            });
        }

        /**
         * Disables BIM mode, which includes collision detection
         */
        public disableBimMode(): Promise<void> {
            return this._synchronizedToggleBimMode.set(() => {
                this._disableBimMode();
            });
        }

        /**
         * Toggles BIM mode, deactivating it if it's activated and activating it if it's deactivated
         */
        public toggleBimMode(): Promise<void> {
            return this._synchronizedToggleBimMode.set(() => {
                if (this._bimModeEnabled) {
                    return this._disableBimMode();
                } else {
                    return this._enableBimMode();
                }
            });
        }

        /** @hidden */
        public async onActivate(): Promise<void> {
            this._viewer.view.setProjectionMode(Projection.Perspective);

            // Disable periodic draw limit increase while walking since it causes framerate dips (COM-1622)
            const view = this._viewer.view;
            this._initialInteractiveDrawLimitIncreaseStatus = await view.getInteractiveDrawLimitIncreaseEnabled();
            view.setInteractiveDrawLimitIncreaseEnabled(false);

            this._calculateInitialPosition();
            if (this._maxExtents === 0) {
                await this.resetDefaultWalkSpeeds();
            }

            if (this._bimModeEnabled) {
                await this._updateNearbyDoors();
            }

            // See if we should activate floorplan
            const shouldActivateFloorplan =
                this._viewer.floorplanManager.getConfiguration().autoActivate ===
                FloorplanAutoActivation.BimWalk;
            if (shouldActivateFloorplan) {
                // Only activate if this is a BIM capable model
                const storyNodes = this._viewer.model.getNodesByGenericType("IFCBUILDINGSTOREY");
                const hasIfc = storyNodes && storyNodes.size > 0;
                if (hasIfc) {
                    await this._viewer.floorplanManager.activate();
                }
            }
        }

        /** @hidden */
        public async onDeactivate(): Promise<void> {
            this._viewer.view.setInteractiveDrawLimitIncreaseEnabled(
                this._initialInteractiveDrawLimitIncreaseStatus,
            );
            this._doorCache.forgetNearbyDoors();

            // See if we should deactivate floorplan
            const shouldDeactivateFloorplan =
                this._viewer.floorplanManager.getConfiguration().autoActivate ===
                FloorplanAutoActivation.BimWalk;
            if (shouldDeactivateFloorplan) {
                // Only activate if this is a BIM capable model
                const storyNodes = this._viewer.model.getNodesByGenericType("IFCBUILDINGSTOREY");
                const hasIfc = storyNodes && storyNodes.size > 0;
                if (hasIfc) {
                    await this._viewer.floorplanManager.deactivate();
                }
            }

            super.onDeactivate();
        }

        /**
         * Sets the walk, rotate, and mouse look speeds to the default values.
         */
        public async resetDefaultWalkSpeeds(): Promise<void> {
            this._rotationSpeed = 40;
            this._viewAngle = 90;

            const bounding = await this._viewer.model.getLooseBounding();
            const extents = bounding.extents();
            this._maxExtents = Math.max(extents.x, extents.y, extents.z);
            this._walkDistance = this._maxExtents / 15;
            this._elevationSpeed = this._maxExtents / 10;
            this._zoomDistance = this._maxExtents / 30;
        }

        /**
         * Gets the floor distance config used by BIM mode.
         * See also: [[enableBimMode]].
         */
        public getBimFloorConfig(): CameraWalkBaseOperator.Bim.FloorConfig {
            return { ...this._logical.floor };
        }

        /**
         * Sets the floor distance config used by BIM mode.
         * See also: [[enableBimMode]].
         */
        public setBimFloorConfig(floorConfig: CameraWalkBaseOperator.Bim.FloorConfig): void {
            this._logical.floor = { ...floorConfig };
            this._effective.floor = this._scaleAgainstModelUnit(this._logical.floor);
        }

        /**
         * Gets the wall distance config used by BIM mode.
         * See also: [[enableBimMode]].
         */
        public getBimWallConfig(): CameraWalkBaseOperator.Bim.WallConfig {
            return { ...this._logical.wall };
        }

        /**
         * Sets the wall distance config used by BIM mode.
         * See also: [[enableBimMode]].
         */
        public setBimWallConfig(wallConfig: CameraWalkBaseOperator.Bim.WallConfig): void {
            this._logical.wall = { ...wallConfig };
            this._effective.wall = this._scaleAgainstModelUnit(this._logical.wall);
        }

        /**
         * Gets the door distance config used by BIM mode.
         * See also: [[enableBimMode]].
         */
        public getBimDoorConfig(): CameraWalkBaseOperator.Bim.DoorConfig {
            return { ...this._logical.door };
        }

        /**
         * Sets the door distance config used by BIM mode.
         */
        public setBimDoorConfig(doorConfig: CameraWalkBaseOperator.Bim.DoorConfig): void {
            this._logical.door = { ...doorConfig };
            this._effective.door = this._scaleAgainstModelUnit(this._logical.door);
        }

        private _scaleAgainstModelUnit<T extends object>(obj: T): T {
            const model = this._viewer.model;
            const scale = 1.0 / model.getNodeUnitMultiplier(model.getAbsoluteRootNode());

            obj = { ...(obj as any) };

            const props = Object.keys(obj);
            for (const prop of props) {
                const value = (obj as any)[prop];
                if (typeof value === "number") {
                    (obj as any)[prop] *= scale;
                }
            }

            return obj;
        }

        /** @hidden */
        public onMouseDown(event: Event.MouseInputEvent): void {
            super.onMouseDown(event);
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            super.onMouseUp(event);
        }

        /** @hidden */
        protected async _applyGravity(): Promise<void> {
            const view = this._viewer.view;
            const camera = view.getCamera();

            let startPos = camera.getPosition();
            let floorPos = await applyGravity(
                view,
                startPos,
                this._downAxis,
                this._effective.floor.maxFallDistance,
            );
            if (floorPos === null) {
                // Nudge start pos upward in for stair walking and test again.
                startPos = Point3.subtract(
                    startPos,
                    Point3.scale(this._downAxis, this._effective.floor.avatarOffset),
                );
                floorPos = await applyGravity(
                    view,
                    startPos,
                    this._downAxis,
                    this._effective.floor.maxFallDistance,
                );
                if (floorPos === null) {
                    return;
                }
            }

            const offsetFromFloor = new Point3(0, 0, this._effective.floor.avatarOffset);
            const finalPos = Point3.add(floorPos, offsetFromFloor);

            const fallDelta = Point3.subtract(finalPos, startPos);
            const fallDistance = fallDelta.length();

            if (fallDistance > this._effective.floor.negligibleClimbHeight) {
                const degrees = Util.computeAngleBetweenVector(fallDelta, this._downAxis);
                const isClimbing = degrees > 90.0;
                if (isClimbing) {
                    if (fallDistance > this._effective.floor.maxClimbHeight) {
                        return;
                    }
                }
            }

            this._applyWalkDelta(camera, fallDelta);
        }

        /** @hidden */
        protected _updateNearbyDoors(): Promise<void> {
            const camera = this._viewer.view.getCamera();
            const position = camera.getPosition();
            const doorOpacity = 0.5;
            return this._doorCache.updateNearbyDoors(
                position,
                this._effective.door.transparencyRange,
                doorOpacity,
            );
        }

        private _updateCamera(camera: Camera): void {
            this._resetPosition(camera);
            this._updateCameraTilt(camera);
            this._updateCameraViewAngle(camera);
            this._viewer.view.setCamera(camera);
        }

        /** @hidden */
        protected _applyWalkDelta(camera: Camera, walkDelta: Point3): void {
            camera.dolly(Point3.scale(walkDelta, -1.0));
            this._updateCamera(camera);
        }

        /** @hidden */
        protected async _applyWalkDeltaWithCollisionCheck(
            camera: Camera,
            walkDelta: Point3,
            upDir: Point3,
        ): Promise<void> {
            const position = camera.getPosition();

            const rotateLeft = Matrix.createFromOffAxisRotation(upDir, 90.0);
            const leftDir = rotateLeft.transform(walkDelta);

            const rotateRight = Matrix.createFromOffAxisRotation(upDir, -90.0);
            const rightDir = rotateRight.transform(walkDelta);

            const leftCollisionPromise = this._testWallCollision(
                position,
                leftDir,
                this._effective.wall.avatarOffset,
            );

            const rightCollisionPromise = this._testWallCollision(
                position,
                rightDir,
                this._effective.wall.avatarOffset,
            );

            const forwardCollisionPromise = this._testWallCollision(
                position,
                walkDelta,
                walkDelta.length() + this._effective.wall.avatarOffset,
            );

            const [leftCollision, rightCollision] = await Promise.all([
                leftCollisionPromise,
                rightCollisionPromise,
            ]);

            if (leftCollision !== null || rightCollision !== null) {
                const testBackSideCollision = (collision: Selection.FaceSelectionItem | null) => {
                    if (collision !== null) {
                        const wallNormal = collision.getFaceEntity().getNormal();
                        const degrees = Util.computeAngleBetweenVector(wallNormal, walkDelta);
                        return degrees > 90.0;
                    }
                    return false;
                };

                if (testBackSideCollision(leftCollision)) {
                    return;
                }

                if (testBackSideCollision(rightCollision)) {
                    return;
                }
            }

            const forwardCollision = await forwardCollisionPromise;

            if (forwardCollision !== null) {
                const originalWalkDistance = walkDelta.length();
                const walkDirection = Point3.scale(walkDelta, 1.0 / originalWalkDistance);

                const collisionDistance = Point3.subtract(
                    forwardCollision.getPosition(),
                    position,
                ).length();

                const maxWalkDistance = collisionDistance - this._effective.wall.avatarOffset;
                const newWalkDistance = Math.min(originalWalkDistance, maxWalkDistance);

                walkDelta = Point3.scale(walkDirection, newWalkDistance);
            }

            this._applyWalkDelta(camera, walkDelta);
        }

        private _testWallCollision(
            position: Point3,
            walkDirection: Point3,
            maxCollisionDistance: number,
        ): Promise<Selection.FaceSelectionItem | null> {
            return testWallCollision(
                this._viewer.view,
                position,
                walkDirection,
                maxCollisionDistance,
            );
        }

        private _walkBackward(walkDistance: number, testCollision: false): void;
        private _walkBackward(walkDistance: number, testCollision: true): Promise<void>;
        private _walkBackward(walkDistance: number, testCollision: boolean): void | Promise<void>;
        private _walkBackward(walkDistance: number, testCollision: boolean): void | Promise<void> {
            const view = this._viewer.view;
            const camera = view.getCamera();
            this._resetPosition(camera);

            const target = camera.getTarget();
            const position = camera.getPosition();
            const up = camera.getUp();

            const backward = Point3.subtract(position, target).normalize();

            const walkDelta = backward.copy().scale(walkDistance);
            if (testCollision) {
                return this._applyWalkDeltaWithCollisionCheck(camera, walkDelta, up);
            } else {
                return this._applyWalkDelta(camera, walkDelta);
            }
        }

        private _walkForward(walkDistance: number, testCollision: false): void;
        private _walkForward(walkDistance: number, testCollision: true): Promise<void>;
        private _walkForward(walkDistance: number, testCollision: boolean): void | Promise<void>;
        private _walkForward(walkDistance: number, testCollision: boolean): void | Promise<void> {
            return this._walkBackward(-walkDistance, testCollision);
        }

        private _walkLeft(walkDistance: number, testCollision: false): void;
        private _walkLeft(walkDistance: number, testCollision: true): Promise<void>;
        private _walkLeft(walkDistance: number, testCollision: boolean): void | Promise<void>;
        private _walkLeft(walkDistance: number, testCollision: boolean): void | Promise<void> {
            const view = this._viewer.view;
            const camera = view.getCamera();
            this._resetPosition(camera);

            const target = camera.getTarget();
            const position = camera.getPosition();
            const up = camera.getUp();

            const forward = Point3.subtract(target, position).normalize();
            const left = Point3.cross(up, forward).normalize();

            const walkDelta = left.copy().scale(walkDistance);
            if (testCollision) {
                return this._applyWalkDeltaWithCollisionCheck(camera, walkDelta, up);
            } else {
                return this._applyWalkDelta(camera, walkDelta);
            }
        }

        private _walkRight(walkDistance: number, testCollision: false): void;
        private _walkRight(walkDistance: number, testCollision: true): Promise<void>;
        private _walkRight(walkDistance: number, testCollision: boolean): void | Promise<void>;
        private _walkRight(walkDistance: number, testCollision: boolean): void | Promise<void> {
            return this._walkLeft(-walkDistance, testCollision);
        }

        public walkBackward(walkDistance: number): void {
            return this._walkBackward(walkDistance, false);
        }

        public walkForward(walkDistance: number): void {
            return this._walkForward(walkDistance, false);
        }

        public walkLeft(walkDistance: number): void {
            return this._walkLeft(walkDistance, false);
        }

        public walkRight(walkDistance: number): void {
            return this._walkRight(walkDistance, false);
        }

        public walkBackwardWithCollision(walkDistance: number): Promise<void> {
            return this._walkBackward(walkDistance, true);
        }

        public walkForwardWithCollision(walkDistance: number): Promise<void> {
            return this._walkForward(walkDistance, true);
        }

        public walkLeftWithCollision(walkDistance: number): Promise<void> {
            return this._walkLeft(walkDistance, true);
        }

        public walkRightWithCollision(walkDistance: number): Promise<void> {
            return this._walkRight(walkDistance, true);
        }

        public walkDown(walkDistance: number): void {
            const view = this._viewer.view;
            const camera = view.getCamera();
            this._resetPosition(camera);

            const walkDelta = camera.getUp().normalize().scale(walkDistance);
            this._applyWalkDelta(camera, walkDelta);
        }

        public walkUp(walkDistance: number): void {
            this.walkDown(-walkDistance);
        }

        public rotateRight(degrees: number): void {
            const view = this._viewer.view;
            const camera = view.getCamera();
            this._resetPosition(camera);

            const target = camera.getTarget();
            const position = camera.getPosition();
            const eye = Point3.subtract(position, target);
            const eyeLength = eye.length();

            const forward = Point3.subtract(target, position).normalize();

            const radians = Util.degreesToRadians(degrees);
            const tan = Math.tan(radians);
            const length = Point3.subtract(camera.getTarget(), camera.getPosition()).length();
            const scale = length * tan;

            const delta = Point3.cross(forward, camera.getUp()).scale(scale);

            let newTarget = target.copy().add(delta);
            const newEye = Point3.subtract(newTarget, position).normalize().scale(eyeLength);
            newTarget = Point3.add(position, newEye);
            camera.setTarget(newTarget);

            this._updateCamera(camera);
        }

        public rotateLeft(degrees: number): void {
            this.rotateRight(-degrees);
        }

        public tiltDown(degrees: number): void {
            this.setTilt(this._tilt + degrees);

            const view = this._viewer.view;
            const camera = view.getCamera();
            this._resetPosition(camera);
            this._updateCamera(camera);
        }

        public tiltUp(degrees: number): void {
            this.tiltDown(-degrees);
        }

        /** @hidden */
        protected _calculateInitialPosition(): void {
            const view = this._viewer.view;
            const camera = view.getCamera();

            this._calculateMajorAxis(camera);
            this.setTilt(this._calculateInitialTilt(camera));

            this._resetPosition(camera);
            this._updateCamera(camera);
        }

        private _updateCameraViewAngle(camera: Camera): void {
            const radians = Util.degreesToRadians(this._viewAngle);
            const tan = Math.tan(radians / 2);
            const length = Point3.subtract(camera.getTarget(), camera.getPosition()).length();
            const width = length * tan;
            camera.setWidth(width);
            camera.setHeight(width);
        }

        private _updateCameraTilt(camera: Camera): void {
            const position = camera.getPosition();
            const target = camera.getTarget();

            const up = camera.getUp().normalize();
            const forward = Point3.subtract(target, position).normalize();
            const left = Point3.cross(up, forward).normalize();

            // compute forward vector with tilt
            const targetDistance = Point3.distance(target, position);
            const matrix = Matrix.createFromOffAxisRotation(left, this._tilt);
            matrix.transform(forward, forward);
            camera.setTarget(Point3.add(position, forward.scale(targetDistance)));
        }

        private _calculateInitialTilt(camera: Camera): number {
            const target = camera.getTarget();
            const position = camera.getPosition();

            const delta = Point3.subtract(target, position);
            const l1 = delta.length();

            if (this._majorAxis === Axis.X) delta.x = 0;
            else if (this._majorAxis === Axis.Y) delta.y = 0;
            else if (this._majorAxis === Axis.Z) delta.z = 0;

            const l2 = delta.length();
            const deg = Math.acos(l2 / l1) * (180.0 / Math.PI);

            return deg;
        }

        /** @hidden */
        protected _resetPosition(camera: Camera): void {
            this._calculateMajorAxis(camera);

            const position = camera.getPosition();
            const target = camera.getTarget();

            const d = Point3.subtract(target, position);
            let length = d.length();

            // adjust length by walk distance for near plane clipping
            if (this.getWalkSpeed() > 0) {
                length = this.getWalkSpeed();
            }

            switch (this._majorAxis) {
                case Axis.X:
                    d.set(0, d.y, d.z);
                    camera.setUp(new Point3(1, 0, 0));
                    break;

                case Axis.Y:
                    d.set(d.x, 0, d.z);
                    camera.setUp(new Point3(0, 1, 0));
                    break;

                case Axis.Z:
                    d.set(d.x, d.y, 0);
                    camera.setUp(new Point3(0, 0, 1));
                    break;
            }

            d.normalize().scale(length);
            camera.setTarget(Point3.add(position, d));
        }

        /** @hidden */
        protected _calculateMajorAxis(camera: Camera): void {
            const up = camera.getUp();

            const x = Math.abs(up.x);
            const y = Math.abs(up.y);
            const z = Math.abs(up.z);

            if (z >= x && z >= y) this._majorAxis = Axis.Z;
            else if (y >= x && y >= z) this._majorAxis = Axis.Y;
            else this._majorAxis = Axis.X;
        }

        /**
         * Sets the speed to walk when using the mouse scroll wheel.
         * @param zoomSpeed distance for walking with the mouse scroll wheel.
         */
        public setZoomSpeed(zoomSpeed: number): void {
            this._zoomDistance = zoomSpeed;
        }

        /**
         * Gets the speed used when walking with the mouse scroll wheel.
         */
        public getZoomSpeed(): number {
            return this._zoomDistance;
        }

        /**
         * Sets the tilt value. Values must be between -45 and 45 degrees.
         * @param tilt
         */
        public setTilt(tilt: number): void {
            this._tilt = clamp(tilt, MIN_TILT, MAX_TILT);
            const camera = this._viewer.view.getCamera();
            this._updateCamera(camera);
        }

        /**
         * Gets the tilt value.
         */
        public getTilt(): number {
            return this._tilt;
        }

        /**
         * Sets the view angle. Values must be between 30 and 150 degrees.
         * @param viewAngle
         */
        public setViewAngle(degrees: number): void {
            const viewAngle = clamp(degrees, MIN_ANGLE, MAX_ANGLE);
            if (this._viewAngle !== viewAngle) {
                this._viewAngle = viewAngle;
                this._updateCamera(this._viewer.view.getCamera());
            }
        }

        /**
         * Gets the view angle.
         */
        public getViewAngle(): number {
            return this._viewAngle;
        }

        /**
         * Sets the walkSpeed for walking forward, backwards, left, and right.
         * @param walkSpeed The camera will move by walkSpeed per second.
         */
        public setWalkSpeed(walkSpeed: number): void {
            this._walkDistance = walkSpeed;
        }

        /**
         * Gets the walkSpeed for walking forward, backwards, left, and right.
         */
        public getWalkSpeed(): number {
            return this._walkDistance;
        }

        /**
         * Sets the elevation speed for moving the camera up and down.
         * @param elevationSpeed The camera will move by elevationSpeed per second.
         */
        public setElevationSpeed(elevationSpeed: number): void {
            this._elevationSpeed = elevationSpeed;
        }

        /**
         * Gets the elevation speed for moving the camera up and down.
         */
        public getElevationSpeed(): number {
            return this._elevationSpeed;
        }

        /**
         * Sets the rotation speed for tilt and rotate.
         * @param rotationSpeed The camera will rotate by rotationSpeed degrees per second.
         */
        public setRotationSpeed(rotationSpeed: number): void {
            this._rotationSpeed = rotationSpeed;
        }

        /**
         * Gets the rotation speed for tilt and rotate.
         */
        public getRotationSpeed(): number {
            return this._rotationSpeed;
        }

        /** @hidden */
        public setWalkActive(active: boolean): void {
            this._walkActive = active;
        }

        /**
         * Returns true if walking is currently active
         */
        public getWalkActive(): boolean {
            return this._walkActive;
        }

        /**
         * Returns true if BIM mode is currently active
         */
        public getBimModeEnabled(): boolean {
            return this._bimModeEnabled;
        }

        /**
         * Get major axis
         */
        public getMajorAxis(): Axis {
            return this._majorAxis;
        }

        /** @hidden */
        protected getActiveWalk(): Util.CurrentAction {
            return this._activeWalk;
        }
    }

    export namespace CameraWalkBaseOperator.Bim {
        /**
         * Distance configuration used when BIM mode is enabled.
         * See also: [[CameraWalkBaseOperator.enableBimMode]].
         */
        export interface FloorConfig {
            /**
             * The offset from the floor used for the avatar.
             */
            avatarOffset: number;

            /**
             * The maximum gain in height the avatar is allowed to scale.
             */
            maxClimbHeight: number;

            /**
             * Any gain in height less than this distance does not cause the avatar to buoy upward.
             */
            negligibleClimbHeight: number;

            /**
             * The maximum distance the avatar can fall.
             */
            maxFallDistance: number;
        }

        /**
         * Distance configuration used when BIM mode is enabled.
         * See also: [[CameraWalkBaseOperator.enableBimMode]].
         */
        export interface WallConfig {
            /**
             * The offset from walls used for the avatar.
             */
            avatarOffset: number;
        }

        /**
         * Distance configuration used when BIM mode is enabled.
         * See also: [[CameraWalkBaseOperator.enableBimMode]].
         */
        export interface DoorConfig {
            /**
             * The range from the avatar used to turn doors transparent.
             */
            transparencyRange: number;
        }

        export namespace Default {
            /**
             * The defaults used for [[CameraWalkBaseOperator.Bim.FloorConfig]].
             */
            // tslint:disable-next-line:no-shadowed-variable
            export enum FloorConfig {
                avatarOffset = 1500.0,
                maxClimbHeight = 600.0,
                negligibleClimbHeight = 20.0,
                maxFallDistance = 5000.0,
            }

            /**
             * The defaults used for [[CameraWalkBaseOperator.Bim.WallConfig]].
             */
            // tslint:disable-next-line:no-shadowed-variable
            export enum WallConfig {
                avatarOffset = 150.0,
            }

            /**
             * The defaults used for [[CameraWalkBaseOperator.Bim.DoorConfig]].
             */
            // tslint:disable-next-line:no-shadowed-variable
            export enum DoorConfig {
                transparencyRange = 4000.0,
            }
        }
    }
}
