/// <reference path="./PlaneInfoManager.ts"/>
/// <reference path="./CuttingSectionManager.ts"/>
/// <reference path="./BoundingManager.ts"/>
/// <reference path="./FaceSelectionManager.ts"/>
/// <reference path="./StateMachine.ts"/>

namespace Communicator.Ui.CuttingPlane {
    export class Controller implements ControllerUtils.IController {
        protected readonly _viewer: WebViewer;
        protected readonly _stateMachine: ControllerUtils.StateMachine;

        protected readonly _planeInfoMgr = new ControllerUtils.PlaneInfoManager();
        protected readonly _cuttingSectionsMgr = new ControllerUtils.CuttingSectionManager();
        protected readonly _modelBoundingMgr = new ControllerUtils.BoundingManager();
        protected readonly _faceSelectionMgr = new ControllerUtils.FaceSelectionManager();

        protected _showReferenceGeometry: boolean = true;

        protected readonly _pendingFuncs: {
            visibility?: () => Promise<void>;
            inverted?: () => Promise<void>;
        } = {};

        constructor(viewer: WebViewer) {
            this._viewer = viewer;
            this._stateMachine = new ControllerUtils.StateMachine(this);

            this._viewer.setCallbacks({
                assemblyTreeReady: () => this._stateMachine.handle("init"),
                visibilityChanged: () => this._stateMachine.handle("update"),
                hwfParseComplete: () => this._stateMachine.handle("update"),
                firstModelLoaded: () => this._stateMachine.handle("refresh"),
                modelSwitched: () => this._stateMachine.handle("refresh"),
                modelSwitchStart: () => this._stateMachine.handle("clear"),
            });
        }

        public async init(): Promise<void> {
            await this._initSection();
            await this._updateBoundingBox();
        }

        public async update(): Promise<void> {
            await this._updateBoundingBox();
        }

        public async refresh(): Promise<void> {
            await this._updateBoundingBox();
            await this.resetCuttingPlanes();
        }

        public async clear(): Promise<void> {
            await this._cuttingSectionsMgr.clearAll();
        }

        public get individualCuttingSectionEnabled(): boolean {
            return this._cuttingSectionsMgr.useIndividualCuttingSections;
        }

        public getPlaneStatus(sectionIndex: CuttingSectionIndex) {
            return this._planeInfoMgr.get(sectionIndex).status;
        }

        public async onSectionsChanged(): Promise<void> {
            const planes: (Plane | null)[] = this._cuttingSectionsMgr.planes;
            const referenceGeometry: (Point3[] | null)[] =
                this._cuttingSectionsMgr.referenceGeometry;
            const activePlane = planes.filter((plane) => plane === null).length === 0;
            const noActiveGeometry =
                referenceGeometry.filter((geometry) => geometry !== null).length === 0;

            this._showReferenceGeometry = !activePlane || !noActiveGeometry;
            this._cuttingSectionsMgr.useIndividualCuttingSections =
                this._cuttingSectionsMgr.X.getCount() <= 1;

            this._resetCuttingData();

            for (let i = 0; i < planes.length; ++i) {
                const plane = planes[i];
                if (plane === null) {
                    continue;
                }

                const sectionIndex = ControllerUtils.PlaneInfoManager.getPlaneSectionIndex(plane);
                const planeInfo = this._planeInfoMgr.get(sectionIndex);
                if (planeInfo.status === Status.Hidden) {
                    planeInfo.status = ControllerUtils.PlaneInfoManager.getCuttingStatus(
                        sectionIndex,
                        plane,
                    );
                    planeInfo.plane = plane;
                    planeInfo.referenceGeometry = referenceGeometry[i];
                }
            }

            this._viewer.pauseRendering();
            await this._cuttingSectionsMgr.clearAll();
            await this._restorePlanes();
            this._viewer.resumeRendering();
        }

        public getReferenceGeometryEnabled(): boolean {
            return this._showReferenceGeometry;
        }

        private async _updateBoundingBox(): Promise<void> {
            const changed = await this._modelBoundingMgr.update(this._viewer);
            if (changed) {
                this._planeInfoMgr.update();
                const activeStates = this._cuttingSectionsMgr.activeStates;
                this._storePlanes();
                await this._cuttingSectionsMgr.clearAll();
                await this._restorePlanes(activeStates);
            }
        }

        private _resetCuttingData(): void {
            this._planeInfoMgr.clear();
            this._faceSelectionMgr.reset();
        }

        public resetCuttingPlanes(): Promise<void> {
            this._resetCuttingData();
            this._showReferenceGeometry = true;
            return this._cuttingSectionsMgr.clearAll();
        }

        private async _initSection(): Promise<void> {
            await Promise.all([
                this._modelBoundingMgr.init(this._viewer),
                this._cuttingSectionsMgr.init(this._viewer),
                this._triggerPendingFuncs(),
            ]);
        }

        private async _triggerPendingFuncs(): Promise<void> {
            if (this._pendingFuncs.inverted) {
                const func = this._pendingFuncs.inverted;
                delete this._pendingFuncs.inverted;
                await func();
            }
            if (this._pendingFuncs.visibility) {
                const func = this._pendingFuncs.visibility;
                delete this._pendingFuncs.visibility;
                await func();
            }
        }

        public async toggle(sectionIndex: CuttingSectionIndex): Promise<void> {
            const planeInfo = this._planeInfoMgr.get(sectionIndex);
            switch (planeInfo.status) {
                case Status.Hidden:
                    if (sectionIndex === CuttingSectionIndex.Face) {
                        const selectionItem = this._viewer.selectionManager.getLast();
                        if (selectionItem !== null && selectionItem.isFaceSelection()) {
                            this._faceSelectionMgr.reset(selectionItem);
                            // clear any cutting planes in the face cutting section
                            await this._cuttingSectionsMgr.Face.clear();
                            planeInfo.status = Status.Visible;
                            await this.setCuttingPlaneVisibility(true, sectionIndex);
                        }
                    } else {
                        planeInfo.status = Status.Visible;
                        await this.setCuttingPlaneVisibility(true, sectionIndex);
                    }
                    break;
                case Status.Visible:
                    planeInfo.status = Status.Inverted;
                    await this.setCuttingPlaneInverted(sectionIndex);
                    break;
                case Status.Inverted:
                    planeInfo.status = Status.Hidden;
                    await this.setCuttingPlaneVisibility(false, sectionIndex);
                    break;
            }
        }

        public getCount(): number {
            return this._cuttingSectionsMgr.getCount();
        }

        public async setCuttingPlaneVisibility(
            visibility: boolean,
            sectionIndex: CuttingSectionIndex,
        ): Promise<void> {
            const index = this._cuttingSectionsMgr.getCuttingSectionIndex(sectionIndex);
            const section = this._cuttingSectionsMgr.get(index) as CuttingSection | undefined;
            if (section === undefined) {
                this._pendingFuncs.visibility = async () => {
                    await this.setCuttingPlaneVisibility(visibility, sectionIndex);
                };
                return;
            }

            this._viewer.delayCapping();

            if (visibility) {
                const planeInfo = this._planeInfoMgr.get(sectionIndex);
                if (planeInfo.plane === null) {
                    planeInfo.plane = this._generateCuttingPlane(sectionIndex);
                    planeInfo.referenceGeometry = this._generateReferenceGeometry(sectionIndex);
                }
                await this._setSection(sectionIndex);
            } else {
                await this.refreshPlaneGeometry();
            }

            const count = this.getCount();
            const active = this._cuttingSectionsMgr.isActive(sectionIndex);

            if (count > 0 && !active) {
                await this._cuttingSectionsMgr.activateAll();
            } else if (active && count === 0) {
                await this._cuttingSectionsMgr.deactivate(sectionIndex);
            }
        }

        public async setCuttingPlaneInverted(sectionIndex: CuttingSectionIndex): Promise<void> {
            const section = this._cuttingSectionsMgr.get(
                this._cuttingSectionsMgr.getCuttingSectionIndex(sectionIndex),
            ) as CuttingSection | undefined;

            if (section === undefined) {
                this._pendingFuncs.inverted = async () => {
                    await this.setCuttingPlaneInverted(sectionIndex);
                };
                return;
            }

            this._viewer.delayCapping();

            const index = this._cuttingSectionsMgr.getPlaneIndex(
                sectionIndex,
                this._faceSelectionMgr.normal,
            );
            const plane = section.getPlane(index);
            if (plane) {
                plane.normal.negate();
                plane.d *= -1;
                await section.updatePlane(index, plane, new Matrix(), false, false);
            }
        }

        public async toggleReferenceGeometry(): Promise<void> {
            if (this.getCount() > 0) {
                this._showReferenceGeometry = !this._showReferenceGeometry;
                await this.refreshPlaneGeometry();
            }
        }

        public async refreshPlaneGeometry(): Promise<void> {
            this._storePlanes();
            await this._cuttingSectionsMgr.clearAll();
            await this._restorePlanes();
        }

        public async toggleCuttingMode(): Promise<void> {
            if (this.getCount() > 1) {
                this._storePlanes();
                await this._cuttingSectionsMgr.clearAll();
                this._cuttingSectionsMgr.useIndividualCuttingSections =
                    !this._cuttingSectionsMgr.useIndividualCuttingSections;
                await this._restorePlanes();
            }
        }

        private async _setSection(sectionIndex: CuttingSectionIndex): Promise<void> {
            const { plane, referenceGeometry } = this._planeInfoMgr.get(sectionIndex);
            if (plane === null) {
                return;
            }

            return this._cuttingSectionsMgr.addPlane(
                sectionIndex,
                plane,
                this._showReferenceGeometry ? referenceGeometry : null,
            );
        }

        private async _restorePlane(sectionIndex: CuttingSectionIndex): Promise<void> {
            const planeInfo = this._planeInfoMgr.get(sectionIndex);
            if (
                planeInfo !== undefined &&
                planeInfo.plane !== null &&
                planeInfo.status !== Status.Hidden
            ) {
                if (planeInfo.referenceGeometry === null || planeInfo.updateReferenceGeometry) {
                    planeInfo.referenceGeometry = this._generateReferenceGeometry(sectionIndex);
                }
                await this._setSection(sectionIndex);
            }
        }

        private async _restorePlanes(
            activeStates?: [boolean, boolean, boolean, boolean],
        ): Promise<void> {
            await Promise.all([
                this._restorePlane(CuttingSectionIndex.X),
                this._restorePlane(CuttingSectionIndex.Y),
                this._restorePlane(CuttingSectionIndex.Z),
                this._restorePlane(CuttingSectionIndex.Face),
            ]);
            await this._cuttingSectionsMgr.activateAll(activeStates);
        }

        private _storePlanes(): void {
            /**
             * Create a map of [CuttingSectionIndex => CuttingPlaneInfo]
             * reset them all and filter only visible planes.
             */
            const planesInfo = new Map<CuttingSectionIndex, Info>(
                [
                    CuttingSectionIndex.X,
                    CuttingSectionIndex.Y,
                    CuttingSectionIndex.Z,
                    CuttingSectionIndex.Face,
                ]
                    .map((sectionIndex): [CuttingSectionIndex, Info] => {
                        this._planeInfoMgr.reset(sectionIndex);
                        return [sectionIndex, this._planeInfoMgr.get(sectionIndex)];
                    })
                    .filter(([sectionIndex, _]) => !this._planeInfoMgr.isHidden(sectionIndex)),
            );

            const normal = this._faceSelectionMgr.normal;
            planesInfo.forEach((planeInfo, sectionIndex) => {
                const { plane, referenceGeometry } = this._cuttingSectionsMgr.getPlaneAndGeometry(
                    sectionIndex,
                    normal,
                );
                planeInfo.plane = plane;
                planeInfo.referenceGeometry = referenceGeometry;
            });
        }

        private _generateReferenceGeometry(sectionIndex: CuttingSectionIndex): Point3[] {
            if (sectionIndex === CuttingSectionIndex.Face) {
                return this._faceSelectionMgr.getReferenceGeometry(
                    this._viewer,
                    this._modelBoundingMgr.box,
                );
            }

            return this._cuttingSectionsMgr.getReferenceGeometry(
                sectionIndex,
                this._modelBoundingMgr.box,
            );
        }

        private _generateCuttingPlane(sectionIndex: CuttingSectionIndex): Plane | null {
            const plane = new Plane();
            const box = this._modelBoundingMgr.box;
            switch (sectionIndex) {
                case CuttingSectionIndex.X:
                    plane.normal.set(1, 0, 0);
                    plane.d = -box.max.x;
                    break;
                case CuttingSectionIndex.Y:
                    plane.normal.set(0, 1, 0);
                    plane.d = -box.max.y;
                    break;
                case CuttingSectionIndex.Z:
                    plane.normal.set(0, 0, 1);
                    plane.d = -box.max.z;
                    break;
                case CuttingSectionIndex.Face:
                    if (this._faceSelectionMgr.isSet) {
                        const normal = this._faceSelectionMgr.normal!;
                        const position = this._faceSelectionMgr.position!;
                        plane.setFromPointAndNormal(position, normal);
                    } else {
                        return null;
                    }
            }

            return plane;
        }
    }
}
