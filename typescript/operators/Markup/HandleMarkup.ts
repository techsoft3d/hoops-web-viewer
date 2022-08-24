/// <reference path="../../Markup/MarkupItem.ts"/>
/// <reference path="Note/NoteTextElement.ts"/>

/**
 * The Markup module factilitates interactions with markup in the WebViewer. More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/markup/markup-basics.html).
 * @preferred
 */
namespace Communicator.Markup {
    /** @hidden */
    class HandleMeshIds {
        public axis: MeshId | null = null;
        public plane: MeshId | null = null;
        public viewPlane: MeshId | null = null;
        public rotate: MeshId | null = null;
    }

    /** @hidden */
    class HandleData {
        constructor(
            position: Point3,
            vector: Point3 | null,
            matrix: Matrix,
            nodeId: NodeId,
            handleType: HandleType,
            groupId: number,
        ) {
            this.vector = vector;
            this.matrix = matrix;
            this.nodeId = nodeId;
            this.position = position;
            this.handleType = handleType;
            this.translation = Point3.zero();
            this.groupId = groupId;
        }

        public position: Point3;
        public translation: Point3;
        public vector: Point3 | null;
        public matrix: Matrix;
        public nodeId: NodeId;
        public handleType: HandleType;
        public groupId: number;
    }

    /** @hidden */
    export class HandleMarkup extends MarkupItem {
        public static readonly className = "Communicator.Markup.HandleMarkup";
        public static readonly defaultGroupId = -1;

        private readonly _viewer: WebViewer;
        private readonly _meshIds: HandleMeshIds = new HandleMeshIds();

        // geometry properties
        private static readonly _defaultScale = 0.02;
        private static readonly _cylinderRadius = 0.5;
        private static readonly _coneBaseRadius = 0.9;
        private static readonly _cylinderHeight = 7;
        private static readonly _capHeight = 1.2;
        private static readonly _taperHeight = 0.2;
        private static readonly _segmentCount = 20;
        private static readonly _planeOffset = 1;
        private static readonly _planeLength = 2.5;

        private _scaleModifier = 1;

        private static readonly _xColor = new Color(168, 56, 59);
        private static readonly _yColor = new Color(96, 166, 50);
        private static readonly _zColor = new Color(41, 81, 185);
        private static readonly _viewPlaneColor = Color.white();

        private _id: number = 0;
        private _handleData = new Map<NodeId, HandleData>();

        // transformation progress
        private readonly _translationFromInitialHandlePosition = Point3.zero();

        private _groupIdRotationMatrix = new Map<number, Matrix>();

        private _callbacks: CallbackMap | null;

        constructor(viewer: WebViewer) {
            super();
            this._viewer = viewer;

            this._callbacks = {
                camera: () => {
                    this._updateCamera();
                },
                _assemblyTreeReady: async () => {
                    this._updateViewport();
                    this._hideOverlay();

                    const p1 = this._createMeshId(this._getAxisMeshData()).then((meshId) => {
                        this._meshIds.axis = meshId;
                    });

                    const p2 = this._createMeshId(this._getPlaneMeshData()).then((meshId) => {
                        this._meshIds.plane = meshId;
                    });

                    const p3 = this._createMeshId(this._getViewPlaneMeshData()).then((meshId) => {
                        this._meshIds.viewPlane = meshId;
                    });

                    const p4 = this._createMeshId(this._getRotateMeshData()).then((meshId) => {
                        this._meshIds.rotate = meshId;
                    });

                    // XXX: These promises are thrown away.
                    p1 as Internal.UnusedPromise;
                    p2 as Internal.UnusedPromise;
                    p3 as Internal.UnusedPromise;
                    p4 as Internal.UnusedPromise;
                },
                modelSwitchStart: async () => {
                    await this.removeHandles();
                },
            };
            this._viewer.setCallbacks(this._callbacks);
        }

        public remove(): void {
            if (this._callbacks !== null) {
                this._viewer.unsetCallbacks(this._callbacks);
                this._callbacks = null;
            }

            super.remove();
        }

        private _getAxisMeshData(): MeshData {
            return Util.generateConeCylinderMeshData(
                HandleMarkup._cylinderRadius,
                HandleMarkup._segmentCount,
                HandleMarkup._cylinderHeight,
                HandleMarkup._coneBaseRadius,
                HandleMarkup._capHeight,
                HandleMarkup._taperHeight,
            );
        }

        private _getPlaneMeshData(): MeshData {
            const p0 = new Point3(HandleMarkup._planeOffset, 0, HandleMarkup._planeOffset);
            const p1 = new Point3(
                HandleMarkup._planeOffset + HandleMarkup._planeLength,
                0,
                HandleMarkup._planeOffset,
            );
            const p2 = new Point3(
                HandleMarkup._planeOffset + HandleMarkup._planeLength,
                0,
                HandleMarkup._planeOffset + HandleMarkup._planeLength,
            );
            const p3 = new Point3(
                HandleMarkup._planeOffset,
                0,
                HandleMarkup._planeOffset + HandleMarkup._planeLength,
            );

            // prettier-ignore
            const points = [
                p0.x, p0.y, p0.z,
                p1.x, p1.y, p1.z,
                p2.x, p2.y, p2.z,

                p0.x, p0.y, p0.z,
                p2.x, p2.y, p2.z,
                p3.x, p3.y, p3.z
            ];

            const normal = new Point3(0, -1, 0);

            // prettier-ignore
            const normals = [
                normal.x, normal.y, normal.z,
                normal.x, normal.y, normal.z,
                normal.x, normal.y, normal.z,
                normal.x, normal.y, normal.z,
                normal.x, normal.y, normal.z,
                normal.x, normal.y, normal.z
            ];

            const meshData = new MeshData();
            meshData.addFaces(points, normals);
            meshData.setBackfacesEnabled(true);

            meshData.addPolyline([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z]);
            meshData.addPolyline([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z]);
            meshData.addPolyline([p2.x, p2.y, p2.z, p3.x, p3.y, p3.z]);
            meshData.addPolyline([p3.x, p3.y, p3.z, p0.x, p0.y, p0.z]);

            return meshData;
        }

        private _getViewPlaneMeshData(): MeshData {
            return Util.generateSphereMeshData();
        }

        private _getRotateMeshData(
            angle: Degrees = 35,
            arcRadius: number = 12,
            scale: number = 0.5,
        ): MeshData {
            const arcAngle = (angle * Math.PI) / 180;

            const angleInc = 0.1;
            const halfArcAngle = 0.5 * arcAngle;

            const arc: number[] = [];
            for (let angleIter = -halfArcAngle; angleIter <= halfArcAngle; angleIter += angleInc) {
                const sinAngle = Math.sin(angleIter) * arcRadius;
                const cosAngle = Math.cos(angleIter) * arcRadius;

                arc.push(cosAngle);
                arc.push(0);
                arc.push(sinAngle);
            }

            const axisDirection = new Point3(0, 0, 1);
            const numSegments = 10;

            const meshData = Util.createCylinderMeshDataFromArc(
                arc,
                axisDirection,
                numSegments,
                scale,
            );
            meshData.setBackfacesEnabled(true);

            return meshData;
        }

        public async setAxisMeshData(meshData: MeshData): Promise<void> {
            if (this._meshIds.axis === null) {
                const meshId = await this._createMeshId(meshData);
                this._meshIds.axis = meshId;
            } else {
                return this._viewer.model.replaceMesh(this._meshIds.axis, meshData);
            }
        }

        public async setPlaneMeshData(meshData: MeshData): Promise<void> {
            if (this._meshIds.plane === null) {
                const meshId = await this._createMeshId(meshData);
                this._meshIds.plane = meshId;
            } else {
                return this._viewer.model.replaceMesh(this._meshIds.plane, meshData);
            }
        }

        public async setViewPlaneMeshData(meshData: MeshData): Promise<void> {
            if (this._meshIds.viewPlane === null) {
                const meshId = await this._createMeshId(meshData);
                this._meshIds.viewPlane = meshId;
            } else {
                return this._viewer.model.replaceMesh(this._meshIds.viewPlane, meshData);
            }
        }

        public async setRotateMeshData(meshData: MeshData): Promise<void> {
            if (this._meshIds.rotate === null) {
                const meshId = await this._createMeshId(meshData);
                this._meshIds.rotate = meshId;
            } else {
                return this._viewer.model.replaceMesh(this._meshIds.rotate, meshData);
            }
        }

        /**
         * Gets the associated overlay id
         */
        public getOverlayId(): OverlayIndex {
            return BuiltinOverlayIndex.Handles;
        }

        private _hideOverlay(): void {
            this._viewer.overlayManager.setVisibility(BuiltinOverlayIndex.Handles, false);
        }

        public hideOverlay(): DeprecatedPromise {
            this._hideOverlay();
            return Promise.resolve();
        }

        private _showOverlay(): void {
            this._viewer.overlayManager.setVisibility(BuiltinOverlayIndex.Handles, true);
            this._updateCamera();
        }

        public showOverlay(): DeprecatedPromise {
            this._showOverlay();
            return Promise.resolve();
        }

        private _updateViewport(): void {
            this._viewer.overlayManager.setViewport(
                BuiltinOverlayIndex.Handles,
                OverlayAnchor.UpperLeftCorner,
                0,
                OverlayUnit.ProportionOfCanvas,
                0,
                OverlayUnit.ProportionOfCanvas,
                1,
                OverlayUnit.ProportionOfCanvas,
                1,
                OverlayUnit.ProportionOfCanvas,
            );
        }

        public updateViewport(): DeprecatedPromise {
            this._updateViewport();
            return Promise.resolve();
        }

        public async addHandles(
            position: Point3,
            scaleModifier: number,
            groupId: number,
        ): Promise<void> {
            this._scaleModifier = scaleModifier;
            this._translationFromInitialHandlePosition.assign(Point3.zero());

            await this.createDefaultHandles(position, groupId);
            this._showOverlay();
        }

        private _updateCamera(): void {
            this._viewer.overlayManager.setCamera(
                BuiltinOverlayIndex.Handles,
                this._viewer.view.getCamera(),
            );
        }

        public getVector(nodeId: NodeId): Point3 | null {
            const handleData = this._handleData.get(nodeId);
            if (handleData !== undefined) {
                const vector = handleData.vector;
                if (vector !== null) {
                    return vector.copy();
                }
            }
            return null;
        }

        public getHandleType(nodeId: NodeId): HandleType | null {
            const handleData = this._handleData.get(nodeId);
            return handleData === undefined ? null : handleData.handleType;
        }

        public getHandleGroupId(nodeId: NodeId): number {
            const handleData = this._handleData.get(nodeId);
            return handleData === undefined ? HandleMarkup.defaultGroupId : handleData.groupId;
        }

        public getPosition(nodeId: NodeId): Point3 | null {
            const handleData = this._handleData.get(nodeId);
            if (handleData) {
                const translation = handleData.translation.copy();
                const position = handleData.position.copy();
                return position.add(this._translationFromInitialHandlePosition).add(translation);
            } else {
                return null;
            }
        }

        public getHandleNodeIds(groupId: number | null = null): NodeId[] {
            let nodeIds: any[] = [];
            this._handleData.forEach((data, nodeId) => {
                nodeIds.push([nodeId, data]);
            });
            if (groupId !== null) {
                nodeIds = nodeIds.filter((data) => data[1].groupId === groupId);
            }
            return nodeIds.map((data) => data[0]);
        }

        public async removeHandles(groupId: number | null = null): Promise<void> {
            const handleNodeIds = this.getHandleNodeIds(groupId);
            if (groupId === null) {
                this._handleData.clear();
                this._groupIdRotationMatrix.clear();
            } else {
                handleNodeIds.forEach((nodeId) => {
                    this._handleData.delete(nodeId);
                });
                this._groupIdRotationMatrix.delete(groupId);
            }
            if (this._handleData.size === 0) {
                this._id = 0;
                this._hideOverlay();
            }
            await this._viewer.model.deleteMeshInstances(handleNodeIds);
        }

        public isEmpty(): boolean {
            return this._handleData.size === 0;
        }

        public async createDefaultHandles(position: Point3, groupId: number): Promise<void> {
            const ps: Promise<void | NodeId>[] = [];

            ps.push(this.addViewPlaneHandle(position, HandleMarkup._viewPlaneColor, groupId));

            ps.push(
                this.addAxisTranslationHandle(
                    position,
                    new Point3(1, 0, 0),
                    HandleMarkup._xColor,
                    null,
                    groupId,
                ),
            );
            ps.push(
                this.addAxisTranslationHandle(
                    position,
                    new Point3(0, 1, 0),
                    HandleMarkup._yColor,
                    null,
                    groupId,
                ),
            );
            ps.push(
                this.addAxisTranslationHandle(
                    position,
                    new Point3(0, 0, 1),
                    HandleMarkup._zColor,
                    null,
                    groupId,
                ),
            );

            ps.push(
                this.addPlaneTranslationHandle(
                    position,
                    new Point3(1, 0, 0),
                    HandleMarkup._zColor,
                    Color.black(),
                    new Point3(0, -1, 0),
                    groupId,
                ),
            );
            ps.push(
                this.addPlaneTranslationHandle(
                    position,
                    new Point3(0, 1, 0),
                    HandleMarkup._xColor,
                    Color.black(),
                    new Point3(0, 0, -1),
                    groupId,
                ),
            );
            ps.push(
                this.addPlaneTranslationHandle(
                    position,
                    new Point3(0, 0, 1),
                    HandleMarkup._yColor,
                    Color.black(),
                    new Point3(-1, 0, 0),
                    groupId,
                ),
            );

            ps.push(
                this.addRotateHandle(
                    position,
                    new Point3(1, 0, 0),
                    HandleMarkup._zColor,
                    new Point3(0, -1, 0),
                    groupId,
                ),
            );
            ps.push(
                this.addRotateHandle(
                    position,
                    new Point3(0, 1, 0),
                    HandleMarkup._xColor,
                    new Point3(0, 0, -1),
                    groupId,
                ),
            );
            ps.push(
                this.addRotateHandle(
                    position,
                    new Point3(0, 0, 1),
                    HandleMarkup._yColor,
                    new Point3(-1, 0, 0),
                    groupId,
                ),
            );

            await Promise.all(ps);
        }

        private async _createMeshId(meshData: MeshData): Promise<MeshId> {
            const model = this._viewer.model;
            const meshId = await model.createMesh(meshData, { doNotDelete: true });
            return meshId;
        }

        public async addAxisTranslationHandle(
            position: Point3,
            translationAxis: Point3,
            color: Color,
            positionNormal: Point3 | null,
            groupId: number,
        ): Promise<NodeId> {
            if (this._meshIds.axis === null) {
                this._meshIds.axis = await this._createMeshId(this._getAxisMeshData());
            }

            const idString = `handle-axis-translation-${this._id++}`;
            const rotationMatrix = this._getRotationMatrixFromVector(
                translationAxis,
                positionNormal,
            );
            const nodeId = await this._createMeshInstance(
                this._meshIds.axis,
                idString,
                color,
                null,
                position.copy(),
                rotationMatrix.copy(),
            );
            this._handleData.set(
                nodeId,
                new HandleData(
                    position.copy(),
                    translationAxis.copy(),
                    rotationMatrix.copy(),
                    nodeId,
                    HandleType.Axis,
                    groupId,
                ),
            );
            return nodeId;
        }

        public async addViewPlaneHandle(
            position: Point3,
            color: Color,
            groupId: number,
        ): Promise<NodeId> {
            if (this._meshIds.viewPlane === null) {
                this._meshIds.viewPlane = await this._createMeshId(this._getViewPlaneMeshData());
            }

            const nodeId = await this._createMeshInstance(
                this._meshIds.viewPlane,
                "handle-sphere-instance",
                color,
                null,
                position,
                new Matrix(),
            );
            this._handleData.set(
                nodeId,
                new HandleData(
                    position.copy(),
                    null,
                    new Matrix(),
                    nodeId,
                    HandleType.ViewPlane,
                    groupId,
                ),
            );
            return nodeId;
        }

        public async addPlaneTranslationHandle(
            position: Point3,
            planeNormal: Point3,
            faceColor: Color,
            lineColor: Color,
            positionNormal: Point3 | null,
            groupId: number,
        ): Promise<NodeId> {
            if (this._meshIds.plane === null) {
                this._meshIds.plane = await this._createMeshId(this._getPlaneMeshData());
            }

            const idString = `handle-plane-translation-${this._id++}`;
            const rotationMatrix = this._getRotationMatrixFromVector(planeNormal, positionNormal);
            const nodeId = await this._createMeshInstance(
                this._meshIds.plane,
                idString,
                faceColor,
                lineColor,
                position,
                rotationMatrix,
            );
            this._handleData.set(
                nodeId,
                new HandleData(
                    position.copy(),
                    planeNormal.copy(),
                    rotationMatrix.copy(),
                    nodeId,
                    HandleType.Plane,
                    groupId,
                ),
            );
            return nodeId;
        }

        public async addRotateHandle(
            position: Point3,
            rotateAxis: Point3,
            instanceColor: Color,
            positionNormal: Point3 | null,
            groupId: number,
        ): Promise<NodeId> {
            if (this._meshIds.rotate === null) {
                this._meshIds.rotate = await this._createMeshId(this._getRotateMeshData());
            }

            const idString = `handle-rotate-${this._id++}`;
            const rotationMatrix = this._getRotationMatrixFromVector(rotateAxis, positionNormal);
            const nodeId = await this._createMeshInstance(
                this._meshIds.rotate,
                idString,
                instanceColor,
                null,
                position,
                rotationMatrix,
            );
            this._handleData.set(
                nodeId,
                new HandleData(
                    position.copy(),
                    rotateAxis.copy(),
                    rotationMatrix.copy(),
                    nodeId,
                    HandleType.Rotate,
                    groupId,
                ),
            );
            return nodeId;
        }

        private _getRotationMatrixFromVector(axisY: Point3, vector: Point3 | null): Matrix {
            if (!vector) {
                vector = new Point3(1, 0, 0);
                if (Point3.cross(vector, axisY).squaredLength() < 0.001) {
                    vector = new Point3(0, 1, 0);
                }
            }

            const axisX = Point3.cross(vector, axisY).normalize();
            const axisZ = Point3.cross(axisX, axisY).normalize();
            axisY.normalize();

            const matrix = new Matrix();

            matrix.m[0] = axisX.x;
            matrix.m[1] = axisX.y;
            matrix.m[2] = axisX.z;
            matrix.m[3] = 0;

            matrix.m[4] = axisY.x;
            matrix.m[5] = axisY.y;
            matrix.m[6] = axisY.z;
            matrix.m[7] = 0;

            matrix.m[8] = axisZ.x;
            matrix.m[9] = axisZ.y;
            matrix.m[10] = axisZ.z;
            matrix.m[11] = 0;

            matrix.m[12] = 0;
            matrix.m[13] = 0;
            matrix.m[14] = 0;
            matrix.m[15] = 1;

            return matrix;
        }

        private async _createMeshInstance(
            meshId: MeshId,
            id: string,
            faceColor: Color | null,
            lineColor: Color | null,
            position: Point3,
            userMatrix: Matrix,
        ): Promise<NodeId> {
            let matrix = this._createTransformationMatrix(position, new Matrix());
            matrix = Matrix.multiply(userMatrix, matrix);

            const meshInstanceData = new MeshInstanceData(
                meshId,
                matrix,
                id,
                faceColor || undefined,
                lineColor || undefined,
            );

            meshInstanceData.setOpacity(1);
            meshInstanceData.setCreationFlags(
                MeshInstanceCreationFlags.SuppressCameraScale |
                    MeshInstanceCreationFlags.DoNotCut |
                    MeshInstanceCreationFlags.DoNotExplode |
                    MeshInstanceCreationFlags.ExcludeBounding |
                    MeshInstanceCreationFlags.DoNotXRay |
                    MeshInstanceCreationFlags.OverrideSceneVisibility |
                    MeshInstanceCreationFlags.AlwaysDraw,
            );

            meshInstanceData.setOverlayIndex(BuiltinOverlayIndex.Handles);

            const model = this._viewer.model;
            return model.createMeshInstance(meshInstanceData, undefined, true, true);
        }

        private _createTransformationMatrix(translation: Point3, rotationMatrix: Matrix): Matrix {
            const scale = HandleMarkup._defaultScale * this._scaleModifier;
            let matrix = new Matrix().setScaleComponent(scale, scale, scale);
            matrix = Matrix.multiply(matrix, rotationMatrix);
            matrix.setTranslationComponent(translation.x, translation.y, translation.z);
            return matrix;
        }

        private _getHandlePosition(groupId: number): Point3 | null {
            let position: Point3 | null = null;
            this._handleData.forEach((handleData) => {
                if (handleData.groupId === groupId) {
                    position = handleData.position.copy();
                }
            });
            return position;
        }

        public getGroupIdRotationMatrix(groupId: number): Matrix {
            const matrix = this._groupIdRotationMatrix.get(groupId);
            if (matrix === undefined) {
                return new Matrix();
            }
            return matrix.copy();
        }

        public async updatePosition(
            newTranslation: Point3,
            newRotation: Matrix,
            finalizePosition: boolean,
            groupId: number,
            childrenGroupIds: Map<number, NodeId>,
        ): Promise<void> {
            const model = this._viewer.model;
            const ps: Promise<void>[] = [];

            const finalRotationMatrixMap = new Map<number, Matrix>();

            const activeHandlePosition = this._getHandlePosition(groupId);
            if (activeHandlePosition === null) {
                return;
            }

            this._handleData.forEach((handleData, nodeId) => {
                const handleGroupId = handleData.groupId;

                const isChildGroup = childrenGroupIds.get(handleGroupId) !== undefined;
                const isActiveHandleGroup = handleGroupId === groupId;

                if (!isActiveHandleGroup && !isChildGroup) {
                    return;
                }

                const handlePosition = handleData.position.copy();
                handlePosition.add(newTranslation.copy());

                const translation = handleData.translation.copy();
                handlePosition.add(translation);

                const totalRotation = Matrix.multiply(
                    this.getGroupIdRotationMatrix(handleGroupId),
                    newRotation,
                );
                const rotationMatrix = Matrix.multiply(handleData.matrix, totalRotation);

                if (isChildGroup) {
                    const toRotationCenter = Point3.subtract(handlePosition, activeHandlePosition);
                    newRotation.transform(toRotationCenter, handlePosition);
                    handlePosition.add(activeHandlePosition);
                }

                const matrix = this._createTransformationMatrix(handlePosition, rotationMatrix);

                if (finalizePosition) {
                    handleData.position.assign(handlePosition);
                    finalRotationMatrixMap.set(
                        handleGroupId,
                        Matrix.multiply(this.getGroupIdRotationMatrix(handleGroupId), newRotation),
                    );
                }

                ps.push(model.setNodeMatrix(nodeId, matrix));
            });

            finalRotationMatrixMap.forEach((matrix, groupId) => {
                this._groupIdRotationMatrix.set(groupId, matrix.copy());
            });

            await Promise.all(ps);
        }

        public resetTranslation(): void {
            if (this._translationFromInitialHandlePosition) {
                this._handleData.forEach((handleData) => {
                    handleData.translation.add(this._translationFromInitialHandlePosition);
                });
                this._translationFromInitialHandlePosition.assign(Point3.zero());
            }
        }

        public getTranslation(): Point3 {
            return this._translationFromInitialHandlePosition;
        }
    }
}
