namespace Communicator.Operator {
    /**
     * Provide camera movement for the 3Dconnexion SpaceMouse.
     */
    export class SpaceMouseOperator extends OperatorBase {
        private _modelBounding: Box = new Box();
        private _selectionBounding: Box = new Box();
        private _pivot: Point3 = Point3.zero();

        private _hitRayOrigin: Point3 | null = null;
        private _hitRayDirection: Point3 | null = null;
        private _hitRayAperture: number = 0;
        private _hitRaySelectionOnly: boolean = false;
        private _hitRaySelectionItem: Selection.SelectionItem | null = null;

        private _connexion: _3Dconnexion | null = null;
        private _3dMouseInitialized: boolean = false;

        private async _updateModelBounding(): Promise<void> {
            this._modelBounding = await this._viewer.model.getModelBounding(true, true);
            if (this._connexion === null || !this._3dMouseInitialized) {
                return;
            }

            const center = this._modelBounding.center();
            this._connexion.update3dcontroller({
                pivot: {
                    position: [center.x, center.y, center.z],
                },
            });
            this._pivot = center;
        }

        private async _updateSelectionBounding(): Promise<void> {
            const nodes = this._viewer.selectionManager.getResults().map((s) => s.getNodeId());
            if (nodes.length === 0) {
                this._selectionBounding = new Box();
                return;
            }
            this._selectionBounding = await this._viewer.model.getNodesBounding(nodes);
        }

        private async _updateHitTest(): Promise<void> {
            this._hitRayAperture; // unused
            const viewer = this._viewer;

            if (this._hitRayOrigin === null || this._hitRayDirection === null) {
                return;
            }
            const ray = new Ray(this._hitRayOrigin, this._hitRayDirection);
            const config = new PickConfig();
            const selectionItem = await viewer.view.pickFromRay(ray, config);

            const node = selectionItem.getNodeId();
            if (node === null) {
                this._hitRaySelectionItem = null;
                return;
            }
            if (this._hitRaySelectionOnly && !viewer.selectionManager.isNodeSelected(node)) {
                this._hitRaySelectionItem = null;
                return;
            }
            this._hitRaySelectionItem = selectionItem;
        }

        public constructor(viewer: WebViewer) {
            super(viewer);

            this._viewer.setCallbacks({
                modelStructureReady: async () => {
                    await this._updateModelBounding();
                },

                subtreeLoaded: async () => {
                    await this._updateModelBounding();
                },

                subtreeDeleted: async () => {
                    await this._updateModelBounding();
                },

                selectionArray: async () => {
                    await this._updateSelectionBounding();
                },

                sceneReady: () => {
                    const client: _3Dconnexion.Client = {
                        onConnect: () => {
                            if (this._connexion === null) {
                                return;
                            }
                            const viewElement = this._viewer.getViewElement().parentElement!;
                            this._connexion.create3dmouse(viewElement, "WebViewer");
                        },

                        on3dmouseCreated: () => {
                            this._3dMouseInitialized = true;
                            if (this._connexion === null) {
                                return;
                            }
                        },

                        onDisconnect: (reason) => {
                            console.log(`3Dconnexion NL-Server disconnected ${reason}`);
                        },

                        getCoordinateSystem: () => {
                            // prettier-ignore
                            return [
                                0, 0, -1, 0, 
                                1, 0, 0, 0, 
                                0, 1, 0, 0, 
                                0, 0, 0, 1
                            ];
                        },

                        getConstructionPlane: () => {
                            // TODO
                            // used for construction in orthographic projection
                            return null;
                        },

                        getFov: () => {
                            const camera = this._viewer.view.getCamera();
                            const width = camera.getWidth();
                            const length = Point3.subtract(
                                camera.getTarget(),
                                camera.getPosition(),
                            ).length();

                            return Util.radiansToDegrees(2 * Math.atan(width / (2 * length)));
                        },

                        setFov: (fov) => {
                            const camera = this._viewer.view.getCamera();

                            const radians = Util.degreesToRadians(fov);
                            const tan = Math.tan(radians / 2);
                            const length = Point3.subtract(
                                camera.getTarget(),
                                camera.getPosition(),
                            ).length();
                            const width = length * tan;
                            const aspect = camera.getHeight() / camera.getWidth();

                            camera.setWidth(width);
                            camera.setHeight(width * aspect);

                            this._viewer.view.setCamera(camera);
                        },

                        getPerspective: () => {
                            return (
                                this._viewer.view.getCamera().getProjection() ===
                                Projection.Perspective
                            );
                        },

                        getViewExtents: () => {
                            const camera = this._viewer.view.getCamera();

                            const position = camera.getPosition();
                            const target = camera.getTarget();
                            const halfWidth = camera.getWidth() / 2;
                            const halfHeight = camera.getHeight() / 2;

                            const positionZero = Point3.subtract(position, target);
                            const near = camera.getNearLimit();
                            const far = positionZero.z / near;
                            return [-halfWidth, -halfHeight, far, halfWidth, halfHeight, near];
                        },

                        setViewExtents: (extents) => {
                            const topLeft = new Point2(extents[0], extents[4]);
                            const topRight = new Point2(extents[3], extents[4]);
                            const bottomRight = new Point2(extents[3], extents[1]);
                            const newWidth = Point2.distance(topLeft, topRight);
                            const newHeight = Point2.distance(topRight, bottomRight);

                            const camera = this._viewer.view.getCamera();
                            camera.setWidth(newWidth);
                            camera.setHeight(newHeight);

                            this._viewer.view.setCamera(camera);
                        },

                        getViewFrustum: () => {
                            const camera = this._viewer.view.getCamera();
                            const width = camera.getWidth();
                            const length = Point3.subtract(
                                camera.getTarget(),
                                camera.getPosition(),
                            ).length();

                            const fov_rads = 2 * Math.atan(width / (2 * length));
                            const aspect = camera.getWidth() / camera.getHeight();

                            const near = camera.getNearLimit();
                            const top = Math.tan(fov_rads * 0.5) * near;
                            const bottom = -top;
                            const left = aspect * bottom;
                            const right = aspect * top;
                            const far = Point3.distance(camera.getPosition(), camera.getTarget());
                            return [left, right, bottom, top, near, far];
                        },

                        getViewMatrix: () => {
                            const camera = this._viewer.view.getCamera();
                            const up = camera.getUp().normalize();
                            const eye = Point3.subtract(
                                camera.getTarget(),
                                camera.getPosition(),
                            ).normalize();
                            const right = Point3.cross(eye, up).normalize();
                            const pos = camera.getPosition();

                            // prettier-ignore
                            const viewMatrix = [
                                right.x, right.y, right.z, 0,
                                up.x,    up.y,    up.z,    0,
                                eye.x,   eye.y,   eye.z,   0,
                                pos.x,   pos.y,   pos.z,   1,
                            ];

                            return viewMatrix;
                        },

                        setViewMatrix: async (m) => {
                            const camera = this._viewer.view.getCamera();

                            const up = new Point3(m[4], m[5], m[6]);
                            const eye = new Point3(m[8], m[9], m[10]);

                            const position = new Point3(m[12], m[13], m[14]);

                            const eyeLength = Point3.subtract(
                                camera.getPosition(),
                                camera.getTarget(),
                            ).length();

                            const target = position.copy().add(eye.copy().scale(eyeLength));

                            camera.setTarget(target);
                            camera.setPosition(position);
                            camera.setUp(up);

                            this._viewer.view.setCamera(camera);
                        },

                        getViewRotatable: () => {
                            return !this._viewer.model.isDrawing();
                        },

                        getViewTarget: () => {
                            const target = this._viewer.view.getCamera().getTarget();
                            return [target.x, target.y, target.z];
                        },

                        getFrontView: () => {
                            // prettier-ignore
                            return [
                                0, 1, 0, 0, 
                                0, 0, 1, 0, 
                                -1, 0, 0, 0, 
                                0, 0, 0, 1
                            ];
                        },

                        getPivotPosition: () => {
                            return [this._pivot.x, this._pivot.y, this._pivot.z];
                        },

                        setPivotPosition: (pivot) => {
                            this._pivot = Point3.createFromArray(pivot);
                        },

                        getPointerPosition: () => {
                            const mouse3dPoint = this._viewer.view.unprojectPoint(
                                this._ptCurrent,
                                0,
                            );
                            if (mouse3dPoint === null) {
                                return [0, 0, 0];
                            }
                            return [mouse3dPoint.x, mouse3dPoint.y, mouse3dPoint.z];
                        },

                        getModelExtents: () => {
                            return [
                                this._modelBounding.min.x,
                                this._modelBounding.min.y,
                                this._modelBounding.min.z,
                                this._modelBounding.max.x,
                                this._modelBounding.max.y,
                                this._modelBounding.max.z,
                            ];
                        },

                        setLookFrom: async (origin) => {
                            this._hitRayOrigin = Point3.createFromArray(origin);
                            // NOTE: the `setLook*` functions are always called as a group and
                            // `setLookFrom` is always called last. That's why we can update the results here and
                            // not anywhere else.
                            await this._updateHitTest();
                        },

                        setLookDirection: (direction) => {
                            this._hitRayDirection = Point3.createFromArray(direction);
                        },

                        setLookAperture: (aperture) => {
                            this._hitRayAperture = aperture;
                        },

                        setSelectionOnly: async (selectionOnly) => {
                            this._hitRaySelectionOnly = selectionOnly;
                            await this._updateHitTest();
                        },

                        getLookAt: () => {
                            if (this._hitRaySelectionItem === null) {
                                return null;
                            }
                            const pos = this._hitRaySelectionItem.getPosition();
                            if (pos === null) {
                                return null;
                            }
                            return [pos.x, pos.y, pos.z];
                        },

                        getSelectionEmpty: () => {
                            return this._viewer.selectionManager.getFirst() === null;
                        },

                        getSelectionExtents: () => {
                            return [
                                this._selectionBounding.min.x,
                                this._selectionBounding.min.y,
                                this._selectionBounding.min.z,
                                this._selectionBounding.max.x,
                                this._selectionBounding.max.y,
                                this._selectionBounding.max.z,
                            ];
                        },
                    };

                    this._connexion = new _3Dconnexion(client);
                    this._connexion.connect();
                },
            });
        }
    }
}
