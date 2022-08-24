/// <reference path="../Core/View.ts"/>
/// <reference path="../Math/Point2.ts"/>
/// <reference path="OperatorBase.ts"/>

namespace Communicator.Operator {
    const enum GeometryReference {
        Axis,
        Plane,
        ViewPlane,
    }

    /**
     * Handles are added scene elements that can update the position of your parts through user interaction. Find more information [here](https://docs.techsoft3d.com/communicator/latest/build/tutorials/additive-manufacturing/handles.html).
     */
    export class HandleOperator extends OperatorBase {
        private _draggingHandle: boolean = false;

        private _newRotationMatrix: Matrix = new Matrix();

        private _translation: Point3 = Point3.zero();
        private _newTranslation: Point3 = Point3.zero();

        private _nodeIdGroupMap = new Map<number, NodeId[]>();
        private _groupIdCount = 0;

        private _activeChildrenGroupIds = new Map<number, NodeId>();

        private _initialLocalNodeMatrices: Matrix[] = [];
        private _newLocalNodeMatrices: Matrix[] = [];
        private _handleMarkup: Markup.HandleMarkup;

        private _trackedPoints: Point3[] = [];
        private _trackedPointsPositions: Point3[] = [];
        private _trackedPointCount = 0;

        private _previousContextClick: boolean = false;
        private _overlayIndex: OverlayIndex | null = null;

        private _activeHandleNodeId: NodeId | null = null;
        private _handleEventType = HandleEventType.Translate; // This is a dummy value.

        private _highlightedHandleId: NodeId | null = null;

        private _handleSize: number = 1;

        private _explodeActive: boolean = false;
        private _measureActive: boolean = false;

        private _settingMatrixInProgress: boolean = false;

        private _pickConfig: PickConfig;

        public constructor(viewer: WebViewer) {
            super(viewer);

            this._handleMarkup = new Markup.HandleMarkup(viewer);

            this._pickConfig = new PickConfig(SelectionMask.Face);
            this._pickConfig.restrictToOverlays = true;

            viewer.setCallbacks({
                explode: async (magnitude: number) => {
                    this._explodeActive = magnitude > 0;
                    if (this._explodeActive) {
                        await this.removeHandles();
                    }
                },
                measurementBegin: async () => {
                    this._measureActive = true;
                    await this.removeHandles();
                },
                measurementCreated: () => {
                    this._measureActive = false;
                },
                measurementDeleted: () => {
                    this._measureActive = false; 
                }
            });
        }

        /**
         * Sets the mesh data for axis handles.
         * @param meshData
         */
        public setAxisMeshData(meshData: MeshData): Promise<void> {
            return this._handleMarkup.setAxisMeshData(meshData);
        }

        /**
         * Sets the mesh data for plane handles.
         * @param meshData
         */
        public setPlaneMeshData(meshData: MeshData): Promise<void> {
            return this._handleMarkup.setPlaneMeshData(meshData);
        }

        /**
         * Sets the mesh data for view plane handles.
         * @param meshData
         */
        public setViewPlaneMeshData(meshData: MeshData): Promise<void> {
            return this._handleMarkup.setViewPlaneMeshData(meshData);
        }

        /**
         * Sets the mesh data for rotation handles.
         * @param meshData
         */
        public setRotateMeshData(meshData: MeshData): Promise<void> {
            return this._handleMarkup.setRotateMeshData(meshData);
        }

        /**
         * Add a point to the tracked points list. When the handle moves, these points will update in world space.
         * @param point
         * @returns point index
         */
        public addTrackedPoint(point: Point3): number {
            const index = this._trackedPointCount;
            this._trackedPoints[index] = point.copy();
            this._trackedPointsPositions[index] = point.copy();
            ++this._trackedPointCount;
            return index;
        }

        /**
         * Gets the tracked point list.
         */
        public getTrackedPoints(): Point3[] {
            return this._trackedPointsPositions;
        }

        /**
         * Clear the list of tracked points.
         */
        public clearTrackedPoints(): void {
            this._trackedPoints.length = 0;
            this._trackedPointsPositions.length = 0;
            this._trackedPointCount = 0;
        }

        /**
         * Returns a boolean value indicating if handles are available to be added to the scene
         * If there is an active explode, active measure, or the model is a 2d drawing.
         * this will be false.
         */
        public isEnabled(): boolean {
            return (
                !this._explodeActive &&
                !this._measureActive &&
                !this._viewer.sheetManager.isDrawingSheetActive()
            );
        }

        private _guardEnabled(): void {
            if (!this.isEnabled()) {
                const message = (() => {
                    if (this._explodeActive) {
                        return "Handles are not enabled when the model is exploded";
                    } else if (this._measureActive) {
                        return "Handles are not enabled while a measurement is in progress.";
                    } else if (this._viewer.sheetManager.isDrawingSheetActive()) {
                        return "Handles are not enabled for 2d drawings.";
                    } else {
                        return "Handles are not enabled.";
                    }
                })();
                throw new CommunicatorError(message);
            }
        }

        /**
         * Takes a scale value to change the handle size with 1 representing the default size
         * @param size
         */
        public setHandleSize(size: number): void {
            this._handleSize = size;
        }

        /**
         * Adds all handles into the scene, oriented along the primary axes
         * @param nodeIds corresponding to the parts that will move with the handles
         * @param position world space coordinates the the handle position
         */
        public async addHandles(
            nodeIds: NodeId[],
            position: Point3 | null = null,
            groupId: number | null = null,
        ): Promise<void> {
            this._previousContextClick = false;
            this._guardEnabled();

            if (!position) {
                const boundingBox = await this._viewer.model.getNodesBounding(nodeIds);
                return this.addHandles(nodeIds, boundingBox.center());
            }

            const existingGroupId = this._findGroupId(nodeIds);
            if (groupId === null) {
                groupId = existingGroupId !== null ? existingGroupId : this.generateGroupId();
            }

            this._nodeIdGroupMap.set(groupId, nodeIds);

            // Remove existing handle for this group if exists
            if (existingGroupId !== null) {
                await this._handleMarkup.removeHandles(groupId);
            }

            return this._handleMarkup.addHandles(position, this._handleSize, groupId);
        }

        /**
         * Returns the group id associated to the given group of node ids, returns null if does not exist
         * @param nodeIds
         */
        private _findGroupId(nodeIds: NodeId[]): number | null {
            let groupId = null;
            this._nodeIdGroupMap.forEach((nodes, group) => {
                if (
                    nodes.length === nodeIds.length &&
                    nodes.every((node) => nodeIds.indexOf(node) !== -1)
                ) {
                    groupId = group;
                }
            });
            return groupId;
        }

        /**
         * This will generate a unique id to associate a group of handles with a group of NodeIds.
         */
        public generateGroupId(): number {
            return this._groupIdCount++;
        }

        private _massageGroupId(groupId: number | null): number {
            return groupId === null ? Markup.HandleMarkup.defaultGroupId : groupId;
        }

        /**
         * Adds a handle that moves along an axis.
         * @param position center of the handle.
         * @param axis axis to move along
         * @param color color of the handle geometry
         * @param positionNormal optional vector to control the orientation of the handle geometry.
         * @param groupId optional parameter to associate this handle with a group of NodeIds
         */
        public async addAxisTranslationHandle(
            position: Point3,
            axis: Point3,
            color: Color,
            positionNormal: Point3 | null = null,
            groupId: number | null = null,
        ): Promise<NodeId> {
            this._previousContextClick = false;
            this._guardEnabled();

            return this._handleMarkup.addAxisTranslationHandle(
                position,
                axis,
                color,
                positionNormal,
                this._massageGroupId(groupId),
            );
        }

        /**
         * Adds a handle that rotates around an axis
         * @param position center of the handle.
         * @param axis axis to rotate around
         * @param color color of the handle geometry
         * @param positionNormal optional vector to control the orientation of the handle geometry.
         * @param groupId optional parameter to associate this handle with a group of NodeIds
         */
        public async addAxisRotationHandle(
            position: Point3,
            axis: Point3,
            color: Color,
            positionNormal: Point3 | null = null,
            groupId: number | null = null,
        ): Promise<NodeId> {
            this._previousContextClick = false;
            this._guardEnabled();

            return this._handleMarkup.addRotateHandle(
                position,
                axis,
                color,
                positionNormal,
                this._massageGroupId(groupId),
            );
        }

        /**
         * Adds a handle that restricts movement to a plane.
         * @param position center of the handle.
         * @param normal normal of the plane
         * @param faceColor face color of the handle geometry
         * @param lineColor outline color of the handle geometry
         * @param positionNormal optional vector to control the orientation of the handle geometry.
         * @param groupId optional parameter to associate this handle with a group of NodeIds
         */
        public async addPlaneTranslationHandle(
            position: Point3,
            normal: Point3,
            faceColor: Color,
            lineColor: Color,
            positionNormal: Point3 | null = null,
            groupId: number | null = null,
        ): Promise<NodeId> {
            this._previousContextClick = false;
            this._guardEnabled();

            return this._handleMarkup.addPlaneTranslationHandle(
                position,
                normal,
                faceColor,
                lineColor,
                positionNormal,
                this._massageGroupId(groupId),
            );
        }

        /**
         * Adds a handle that restricts movement to the viewplane.
         * @param position center of the handle
         * @param color geometry color
         * @param groupId optional parameter to associate this handle with a group of NodeIds
         */
        public async addViewPlaneTranslationHandle(
            position: Point3,
            color: Color,
            groupId: number | null = null,
        ): Promise<NodeId> {
            this._previousContextClick = false;
            this._guardEnabled();

            return this._handleMarkup.addViewPlaneHandle(
                position,
                color,
                this._massageGroupId(groupId),
            );
        }

        /**
         * Sets the NodeIds that any handles in the scene will move.
         * @param nodeIds
         * @param groupId optional parameter that associates a group of NodeIds with a group of handles.
         */
        public setNodeIds(nodeIds: NodeId[], groupId: number | null = null): void {
            this._nodeIdGroupMap.set(this._massageGroupId(groupId), nodeIds);
        }

        /**
         * Gets the NodeIds that the handles in the scene will move.
         * @param groupId optional paramater that specifies if the NodeIds to retrieve are part of a group.
         */
        public getNodeIds(groupId: number | null = null): NodeId[] {
            const nodeIds = this._nodeIdGroupMap.get(this._massageGroupId(groupId));
            return nodeIds === undefined ? [] : nodeIds.slice();
        }

        /**
         * Shows any handles that have been added to the scene.
         */
        public showHandles(): void {
            this._handleMarkup.showOverlay();
        }

        /**
         * Updates the current handle position.
         * @param translation additional translation
         * @param rotation additional rotation
         * @param finalizePosition keep translation and rotation. If true, added translation and rotation
         * will not reset the next time the position is updated.
         */
        public updatePosition(
            translation: Point3,
            rotation: Matrix,
            finalizePosition: boolean,
            groupId: number | null = null,
        ): Promise<void> {
            return this._handleMarkup.updatePosition(
                translation,
                rotation,
                finalizePosition,
                this._massageGroupId(groupId),
                this._activeChildrenGroupIds,
            );
        }

        /**
         * @returns the current handle position or null if not currently active.
         */
        public getPosition(): Point3 | null {
            const nodeIds = this._handleMarkup.getHandleNodeIds();
            if (nodeIds.length > 0) {
                const position = this._handleMarkup.getPosition(nodeIds[0]);
                if (position !== null) {
                    return position.copy();
                }
            }
            return null;
        }

        /**
         * Removes all handles from the scene.
         */
        public removeHandles(): Promise<void> {
            this._newRotationMatrix = new Matrix();
            this._translation = Point3.zero();
            this._highlightedHandleId = null;
            this._nodeIdGroupMap.clear();
            this._groupIdCount = 0;
            return this._handleMarkup.removeHandles();
        }

        /**
         * @returns the total translation applied to the handles.
         */
        public getTranslation(): Point3 {
            return this._translation;
        }

        private _initLocalNodeMatrices(nodeIds: NodeId[]): void {
            const model = this._viewer.model;
            this._initialLocalNodeMatrices = [];
            for (const nodeId of nodeIds) {
                this._initialLocalNodeMatrices.push(model.getNodeMatrix(nodeId));
            }
        }

        private _getHandleEventType(nodeId: NodeId): HandleEventType {
            const handleType = this._handleMarkup.getHandleType(nodeId);
            if (handleType === HandleType.Rotate) {
                return HandleEventType.Rotate;
            } else {
                return HandleEventType.Translate;
            }
        }

        private async _rotate(
            rotationAxis: Point3,
            rotationAngle: Degrees,
            position: Point3,
            groupId: number | null,
        ): Promise<void> {
            if (!this._draggingHandle || this._settingMatrixInProgress) return;

            const nodeIds = this.getNodeIds(groupId);

            await this._genericTransform(
                rotationAxis,
                rotationAngle,
                Point3.zero(),
                position,
                nodeIds,
                groupId,
            );
            this._viewer.trigger(
                "handleEvent",
                HandleEventType.Rotate,
                nodeIds,
                this._initialLocalNodeMatrices,
                this._newLocalNodeMatrices,
            );
        }

        private async _translate(
            translation: Point3,
            position: Point3,
            groupId: number | null,
        ): Promise<void> {
            if (!this._draggingHandle || this._settingMatrixInProgress) return;

            const nodeIds = this.getNodeIds(groupId);

            await this._genericTransform(Point3.zero(), 0, translation, position, nodeIds, groupId);
            this._viewer.trigger(
                "handleEvent",
                HandleEventType.Translate,
                nodeIds,
                this._initialLocalNodeMatrices,
                this._newLocalNodeMatrices,
            );
        }

        private async _genericTransform(
            rotationAxis: Point3,
            rotationAngle: Degrees,
            translation: Point3,
            position: Point3,
            nodeIds: NodeId[],
            groupId: number | null,
        ): Promise<void> {
            this._settingMatrixInProgress = true;

            const model = this._viewer.model;

            let rotationMatrix = new Matrix();
            this._newTranslation = translation;

            if (rotationAxis.squaredLength() > 0) {
                rotationMatrix = this._getRotationMatrix(
                    rotationAxis,
                    Point3.zero(),
                    rotationAngle,
                );
                this._newRotationMatrix = rotationMatrix.copy();
            }

            const ps: Promise<void>[] = [];

            ps.push(
                this.updatePosition(this._newTranslation, this._newRotationMatrix, false, groupId),
            );

            this._newLocalNodeMatrices = [];

            for (let i = 0; i < nodeIds.length; i++) {
                const transformedTranslation = this._newTranslation.copy();
                const nodeId = nodeIds[i];

                let matrix = this._initialLocalNodeMatrices[i].copy();

                const transformedRotationAxis = rotationAxis.copy();
                const transformedPosition = position.copy();
                let netParentMatrix;

                const parentNodeId = model.getNodeParent(nodeId);
                if (parentNodeId !== null) {
                    netParentMatrix = model.getNodeNetMatrix(parentNodeId);
                    const invNetParentMatrix = Matrix.inverse(netParentMatrix);
                    if (invNetParentMatrix !== null) {
                        //rotation
                        invNetParentMatrix.transform(transformedPosition, transformedPosition);
                        invNetParentMatrix.setTranslationComponent(0, 0, 0);
                        invNetParentMatrix.transform(
                            transformedRotationAxis,
                            transformedRotationAxis,
                        );

                        //translation
                        invNetParentMatrix.transform(
                            transformedTranslation,
                            transformedTranslation,
                        );
                    }
                } else {
                    netParentMatrix = null;
                }

                if (rotationAxis.squaredLength() > 0) {
                    rotationMatrix = this._getRotationMatrix(
                        transformedRotationAxis,
                        transformedPosition,
                        netParentMatrix && netParentMatrix.upperLeft3x3Determinant() < 0
                            ? -rotationAngle
                            : rotationAngle,
                    );

                    matrix = Matrix.multiply(matrix, rotationMatrix);
                }

                matrix.setTranslationComponent(
                    matrix.m[12] + transformedTranslation.x,
                    matrix.m[13] + transformedTranslation.y,
                    matrix.m[14] + transformedTranslation.z,
                );

                ps.push(model.setNodeMatrix(nodeId, matrix));
                this._newLocalNodeMatrices.push(matrix);
            }

            const trackedPointMatrix = this._newRotationMatrix.copy();
            trackedPointMatrix.setTranslationComponent(translation.x, translation.y, translation.z);

            for (let i = 0; i < this._trackedPoints.length; ++i) {
                const worldTrackedPoint = this._trackedPoints[i].copy();
                const localTrackedPoint = Point3.subtract(worldTrackedPoint, position);
                trackedPointMatrix.transform(localTrackedPoint, localTrackedPoint);
                const newWorldTrackedPoint = Point3.add(localTrackedPoint, position);
                this._trackedPointsPositions[i] = newWorldTrackedPoint;
            }

            await Util.waitForAll(ps);
            this._settingMatrixInProgress = false;
        }

        /** @hidden */
        public async _testRotate(
            rotationAxis: Point3,
            rotationAngle: Degrees,
            groupId: number | null = null,
        ): Promise<void> {
            groupId = this._massageGroupId(groupId);
            const activeHandleNodeId = this._getActiveNodeIdByGroupId(groupId);
            if (activeHandleNodeId !== null) {
                const handlePos = this._handleMarkup.getPosition(activeHandleNodeId);
                if (handlePos === null) {
                    return;
                }

                this._startDragging(activeHandleNodeId, HandleEventType.Rotate);
                await this._rotate(rotationAxis, rotationAngle, handlePos, groupId);
                await this._stopDragging();
            }
        }

        /** @hidden */
        public async _testTranslate(
            translation: Point3,
            groupId: number | null = null,
        ): Promise<void> {
            groupId = this._massageGroupId(groupId);
            const activeHandleNodeId = this._getActiveNodeIdByGroupId(groupId);
            if (activeHandleNodeId !== null) {
                this._startDragging(activeHandleNodeId, HandleEventType.Translate);
                await this._translate(translation, Point3.zero(), groupId);
                await this._stopDragging();
            }
        }

        private _getActiveNodeIdByGroupId(activeGroupId: number): NodeId | null {
            const nodeIds = this._handleMarkup.getHandleNodeIds();
            for (let i = 0; i < nodeIds.length; ++i) {
                const nodeId = nodeIds[i];
                if (this._handleMarkup.getHandleGroupId(nodeId) === activeGroupId) {
                    return nodeId;
                }
            }

            return null;
        }

        private _startDragging(activeHandleNodeId: NodeId, handleEventType: HandleEventType): void {
            this._activeHandleNodeId = activeHandleNodeId;
            this._handleEventType = handleEventType;

            const activeGroupId = this._handleMarkup.getHandleGroupId(activeHandleNodeId);
            const activeNodeIds = this.getNodeIds(activeGroupId);

            const activeChildrenGroupIds = new Map<number, NodeId>();
            this._nodeIdGroupMap.forEach((nodeIds, groupId) => {
                if (groupId === activeGroupId) {
                    return;
                }

                nodeIds.forEach((nodeId) => {
                    let parentNodeId = this._viewer.model.getNodeParent(nodeId);
                    while (parentNodeId !== null) {
                        if (activeNodeIds.indexOf(parentNodeId) !== -1) {
                            activeChildrenGroupIds.set(groupId, nodeId);
                            break;
                        }
                        parentNodeId = this._viewer.model.getNodeParent(parentNodeId);
                    }
                });
            });

            this._activeChildrenGroupIds = activeChildrenGroupIds;

            if (activeNodeIds.length > 0) {
                this._initLocalNodeMatrices(activeNodeIds);
                this._viewer.trigger(
                    "handleEventStart",
                    this._handleEventType,
                    activeNodeIds,
                    this._initialLocalNodeMatrices,
                );
                this._draggingHandle = true;
            }
        }

        private async _stopDragging(): Promise<void> {
            this._draggingHandle = false;
            if (this._activeHandleNodeId !== null) {
                const groupId = this._handleMarkup.getHandleGroupId(this._activeHandleNodeId);
                await this.updatePosition(
                    this._newTranslation,
                    this._newRotationMatrix,
                    true,
                    groupId,
                );

                const nodeIds = this.getNodeIds(groupId);

                this._activeHandleNodeId = null;
                this._activeChildrenGroupIds.clear();

                this._viewer.trigger(
                    "handleEventEnd",
                    this._handleEventType,
                    nodeIds,
                    this._initialLocalNodeMatrices,
                    this._newLocalNodeMatrices,
                );

                this._newRotationMatrix = new Matrix();

                this._handleMarkup.resetTranslation();
                this._translation.add(this._newTranslation);
                this._newTranslation = Point3.zero();

                this._trackedPoints = this._trackedPointsPositions.slice();
            }
        }

        /** @hidden */
        public async onMouseDown(event: Event.MouseInputEvent): Promise<void> {
            super.onMouseDown(event);

            this._overlayIndex = null;
            const selection = await this._viewer.view.pickFromPoint(
                event.getPosition(),
                this._pickConfig,
            );
            if (selection.isNodeEntitySelection()) {
                const nodeId = selection.getNodeId();
                const handleId = this._viewer.model.getNodeName(nodeId);
                if (handleId !== null && handleId.slice(0, 7) === "handle-") {
                    event.setHandled(true);
                    const activeHandleType = this._getHandleEventType(nodeId);
                    this._startDragging(nodeId, activeHandleType);
                }
            }
        }

        private _onHandleDrag() {
            if (this._activeHandleNodeId === null) {
                return;
            }

            const view = this._viewer.view;
            const camera = view.getCamera();

            let rotationAngle: Degrees = 0;
            let rotationAxis = Point3.zero();
            let translation = Point3.zero();

            const handleType = this._handleMarkup.getHandleType(this._activeHandleNodeId);
            const vector = this._handleMarkup.getVector(this._activeHandleNodeId);
            const handlePosition = this._handleMarkup.getPosition(this._activeHandleNodeId);

            if (handleType === null || handlePosition === null) {
                return;
            }

            const groupId = this._handleMarkup.getHandleGroupId(this._activeHandleNodeId);

            switch (handleType) {
                case HandleType.Axis:
                    if (vector !== null) {
                        translation = this._getTranslationComponent(
                            handlePosition,
                            vector,
                            GeometryReference.Axis,
                            groupId,
                        );
                        this._translate(
                            translation,
                            handlePosition,
                            groupId,
                        ) as Internal.UnusedPromise;
                    }
                    break;
                case HandleType.Plane:
                    if (vector !== null) {
                        translation = this._getTranslationComponent(
                            handlePosition,
                            vector,
                            GeometryReference.Plane,
                            groupId,
                        );
                        this._translate(
                            translation,
                            handlePosition,
                            groupId,
                        ) as Internal.UnusedPromise;
                    }
                    break;
                case HandleType.ViewPlane:
                    const target = camera.getTarget();
                    const position = camera.getPosition();
                    const viewPlaneNormal = Point3.subtract(position, target).normalize();
                    translation = this._getTranslationComponent(
                        handlePosition,
                        viewPlaneNormal,
                        GeometryReference.ViewPlane,
                        groupId,
                    );

                    this._translate(translation, handlePosition, groupId) as Internal.UnusedPromise;

                    break;
                case HandleType.Rotate:
                    if (vector !== null) {
                        rotationAxis = vector;

                        const transformAxisMatrix = this._handleMarkup
                            .getGroupIdRotationMatrix(groupId)
                            .copy()
                            .setTranslationComponent(0, 0, 0);
                        transformAxisMatrix.transform(rotationAxis, rotationAxis);
                        rotationAngle = this._getRotationAngle(handlePosition, rotationAxis);

                        this._rotate(
                            rotationAxis,
                            rotationAngle,
                            handlePosition,
                            groupId,
                        ) as Internal.UnusedPromise;
                    }
                    break;
                default:
                    Util.TypeAssertNever(handleType);
            }
        }

        /** @hidden */
        public async onMouseMove(event: Event.MouseInputEvent): Promise<void> {
            super.onMouseMove(event);

            if (this._draggingHandle && this._activeHandleNodeId !== null) {
                this._onHandleDrag();
            } else {
                // If we are not dragging, highlight the handles as we mouse over them.
                const selection = await this._viewer.view.pickFromPoint(
                    event.getPosition(),
                    this._pickConfig,
                );
                await this._highlightHandle(selection);
            }
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            if (
                !this._draggingHandle &&
                this._dragCount < 3 &&
                event.getButton() !== Button.Right &&
                !this._previousContextClick &&
                !this._viewer.getContextMenuStatus() &&
                (this._overlayIndex === 0 || this._overlayIndex === null)
            ) {
                this.removeHandles() as Internal.UnusedPromise;
            }

            // detect if the context menu is active
            this._previousContextClick =
                event.getButton() === Button.Right || this._viewer.getContextMenuStatus();

            if (this._draggingHandle) {
                this._stopDragging() as Internal.UnusedPromise;
            }

            super.onMouseUp(event);
        }

        /** @hidden */
        public setHandled(): boolean {
            return this._draggingHandle;
        }

        private _getClosestPoint(
            selectionPosition: Point3,
            normal: Point3,
            currentPosition: Point2,
        ): Point3 | null {
            const p1 = selectionPosition.copy();
            const p2 = selectionPosition.copy().add(normal);
            const p3 = this._viewer.view.unprojectPoint(currentPosition, 0);
            const p4 = this._viewer.view.unprojectPoint(currentPosition, 0.5);

            if (p3 !== null && p4 !== null) {
                return Util.lineLineIntersect(p1, p2, p3, p4);
            }
            return null;
        }

        private _getTranslationComponent(
            position: Point3,
            normal: Point3,
            geometryReference: GeometryReference,
            groupId: number,
        ): Point3 {
            if (geometryReference !== GeometryReference.ViewPlane) {
                const transformNormalMatrix = this._handleMarkup
                    .getGroupIdRotationMatrix(groupId)
                    .copy()
                    .setTranslationComponent(0, 0, 0);
                transformNormalMatrix.transform(normal, normal); // Intentionally transforming the normal as a point.
            }

            let firstPoint: Point3 | null = null;
            let intersectionPoint: Point3 | null = null;

            if (
                geometryReference === GeometryReference.Plane ||
                geometryReference === GeometryReference.ViewPlane
            ) {
                firstPoint = this._getPlaneIntersectionPoint(position, normal, this._ptFirst);
                if (firstPoint !== null) {
                    intersectionPoint = this._getPlaneIntersectionPoint(
                        firstPoint,
                        normal,
                        this._ptCurrent,
                    );
                }
            } else if (geometryReference === GeometryReference.Axis) {
                firstPoint = this._getClosestPoint(position, normal, this._ptFirst);
                if (firstPoint !== null) {
                    intersectionPoint = this._getClosestPoint(firstPoint, normal, this._ptCurrent);
                }
            }

            if (intersectionPoint !== null && firstPoint !== null) {
                return Point3.subtract(intersectionPoint, firstPoint);
            }
            return Point3.zero();
        }

        private async _clearHighlightedHandle(): Promise<void> {
            if (this._highlightedHandleId !== null) {
                await this._viewer.model.unsetNodesFaceColor([this._highlightedHandleId]);
                this._highlightedHandleId = null;
            }
        }

        private async _highlightHandle(selection: Selection.SelectionItem): Promise<void> {
            if (selection.isNodeEntitySelection()) {
                if (selection.overlayIndex() === BuiltinOverlayIndex.Handles) {
                    const model = this._viewer.model;
                    const handleId = model.getNodeName(selection.getNodeId());

                    if (handleId !== null && handleId.slice(0, 7) === "handle-") {
                        const nodeId = selection.getNodeId();
                        if (this._highlightedHandleId === nodeId) {
                            return;
                        }

                        await this._clearHighlightedHandle();
                        this._highlightedHandleId = nodeId;
                        model.setNodesFaceColor([this._highlightedHandleId], Color.green());
                        return;
                    }
                }
            }
            return this._clearHighlightedHandle();
        }

        private _getPlaneIntersectionPoint(
            planePoint: Point3,
            planeNormal: Point3,
            position: Point2,
        ): Point3 | null {
            const p1 = this._viewer.view.unprojectPoint(position, 0);
            const p2 = this._viewer.view.unprojectPoint(position, 0.5);

            if (p1 === null || p2 === null) {
                return null;
            }

            const ray = new Ray(p1, p2.copy().subtract(p1));
            const plane = Plane.createFromPointAndNormal(planePoint, planeNormal);

            const intersectionPoint = Point3.zero();
            if (plane.intersectsRay(ray, intersectionPoint)) {
                return intersectionPoint;
            }
            return null;
        }

        private _getRotationAngle(position: Point3, rotationPlaneNormal: Point3): Degrees {
            console.assert(position !== null);

            const intersectionPoint1 = this._getPlaneIntersectionPoint(
                position,
                rotationPlaneNormal,
                this._ptFirst,
            );
            const intersectionPoint2 = this._getPlaneIntersectionPoint(
                position,
                rotationPlaneNormal,
                this._ptCurrent,
            );

            if (intersectionPoint1 === null || intersectionPoint2 === null) {
                return 0;
            }

            const vector1 = Point3.subtract(intersectionPoint1, position).normalize();
            const vector2 = Point3.subtract(intersectionPoint2, position).normalize();

            const dot = Point3.dot(vector1, vector2);

            let angle = (Math.acos(dot) * 180) / Math.PI;

            const direction = Point3.dot(Point3.cross(vector1, vector2), rotationPlaneNormal);
            if (direction < 0) {
                angle = -angle;
            }

            return angle;
        }

        private _getRotationMatrix(
            axisNormal: Point3,
            position: Point3,
            rotationAngle: Degrees,
        ): Matrix {
            const translateOriginMatrix = new Matrix().setTranslationComponent(
                -position.x,
                -position.y,
                -position.z,
            );
            const rotationMatrix = Matrix.createFromOffAxisRotation(axisNormal, rotationAngle);
            const translatePositionMatrix = new Matrix().setTranslationComponent(
                position.x,
                position.y,
                position.z,
            );

            return Matrix.multiply(
                Matrix.multiply(translateOriginMatrix, rotationMatrix),
                translatePositionMatrix,
            );
        }
    }
}
