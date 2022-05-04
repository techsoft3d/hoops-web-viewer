/// <reference path="../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui {
    export const enum CuttingPlaneStatus {
        Hidden,
        Visible,
        Inverted,
    }

    export class CuttingPlaneInfo {
        public plane: Plane | null = null;
        public referenceGeometry: Point3[] | null = null;
        public status: CuttingPlaneStatus = CuttingPlaneStatus.Hidden;
        public updateReferenceGeometry: boolean = false;
    }

    export class CuttingPlaneController {
        private readonly _viewer: WebViewer;

        private readonly _cuttingSections: CuttingSection[] = [];
        private _modelBounding: Box = new Box();

        private readonly _planeInfo = new Map<CuttingSectionIndex, CuttingPlaneInfo>();

        private _showReferenceGeometry: boolean = true;
        private _useIndividualCuttingSections: boolean = true;

        private _boundingBoxUpdate: boolean = false;

        private _faceSelection: Selection.FaceSelectionItem | null = null;

        private _initSectionCalled: boolean = false;

        private readonly _pendingFuncs: {
            visibility?: () => Promise<void>;
            inverted?: () => Promise<void>;
        } = {};

        constructor(viewer: WebViewer) {
            this._viewer = viewer;

            const refreshCuttingPlanes = async () => {
                await this._updateBoundingBox();
                await this.resetCuttingPlanes();
            };

            this._viewer.setCallbacks({
                assemblyTreeReady: async () => {
                    await this._initSection();
                    await this._updateBoundingBox();
                },
                visibilityChanged: async () => {
                    await this._updateBoundingBox();
                },
                hwfParseComplete: async () => {
                    await this._updateBoundingBox();
                },
                firstModelLoaded: refreshCuttingPlanes,
                modelSwitched: refreshCuttingPlanes,
                modelSwitchStart: async () => {
                    await this._clearCuttingSections();
                },
            });
        }

        private _getCuttingStatus(
            sectionIndex: CuttingSectionIndex,
            plane: Plane,
        ): CuttingPlaneStatus {
            if (
                (plane.normal.x >= 0 && plane.normal.y >= 0 && plane.normal.z >= 0) ||
                sectionIndex === CuttingSectionIndex.Face
            ) {
                return CuttingPlaneStatus.Visible;
            } else {
                return CuttingPlaneStatus.Inverted;
            }
        }

        public async onSectionsChanged(): Promise<void> {
            const planes: (Plane | null)[] = [];
            const referenceGeometry: (Point3[] | null)[] = [];
            let referenceGeometryShown = true;
            let useIndividualCuttingSections = false;

            const cuttingSectionX = this._cuttingSections[0];
            const cuttingSectionY = this._cuttingSections[1];
            const cuttingSectionZ = this._cuttingSections[2];
            const cuttingSectionFace = this._cuttingSections[3];

            if (cuttingSectionX.getCount() > 1) {
                planes[0] = cuttingSectionX.getPlane(0);
                planes[1] = cuttingSectionX.getPlane(1);
                planes[2] = cuttingSectionX.getPlane(2);
                planes[3] = cuttingSectionX.getPlane(3);

                referenceGeometry[0] = cuttingSectionX.getReferenceGeometry(0);
                referenceGeometry[1] = cuttingSectionX.getReferenceGeometry(1);
                referenceGeometry[2] = cuttingSectionX.getReferenceGeometry(2);
                referenceGeometry[3] = cuttingSectionX.getReferenceGeometry(3);
            } else {
                useIndividualCuttingSections = true;

                planes[0] = cuttingSectionX.getPlane(0);
                planes[1] = cuttingSectionY.getPlane(0);
                planes[2] = cuttingSectionZ.getPlane(0);
                planes[3] = cuttingSectionFace.getPlane(0);

                referenceGeometry[0] = cuttingSectionX.getReferenceGeometry(0);
                referenceGeometry[1] = cuttingSectionY.getReferenceGeometry(0);
                referenceGeometry[2] = cuttingSectionZ.getReferenceGeometry(0);
                referenceGeometry[3] = cuttingSectionFace.getReferenceGeometry(0);
            }

            const activePlane =
                planes[0] !== null ||
                planes[1] !== null ||
                planes[2] !== null ||
                planes[3] !== null;

            if (
                activePlane &&
                referenceGeometry[0] === null &&
                referenceGeometry[1] === null &&
                referenceGeometry[2] === null &&
                referenceGeometry[3] === null
            ) {
                referenceGeometryShown = false;
            }

            this._resetCuttingData();

            this._showReferenceGeometry = referenceGeometryShown;
            this._useIndividualCuttingSections = useIndividualCuttingSections;

            for (let i = 0; i < planes.length; ++i) {
                const plane = planes[i];
                if (plane !== null) {
                    const sectionIndex = this._getPlaneSectionIndex(plane);
                    const planeInfo = this._ensurePlaneInfo(sectionIndex);
                    if (planeInfo.status === CuttingPlaneStatus.Hidden) {
                        planeInfo.status = this._getCuttingStatus(sectionIndex, plane);
                        planeInfo.plane = plane;
                        planeInfo.referenceGeometry = referenceGeometry[i];
                    }
                }
            }

            this._viewer.pauseRendering();
            await this._clearCuttingSections();
            await this._restorePlanes();
            this._viewer.resumeRendering();
        }

        private _getPlaneSectionIndex(plane: Plane): CuttingSectionIndex {
            const x = Math.abs(plane.normal.x);
            const y = Math.abs(plane.normal.y);
            const z = Math.abs(plane.normal.z);

            if (x === 1 && y === 0 && z === 0) {
                return CuttingSectionIndex.X;
            } else if (x === 0 && y === 1 && z === 0) {
                return CuttingSectionIndex.Y;
            } else if (x === 0 && y === 0 && z === 1) {
                return CuttingSectionIndex.Z;
            } else {
                return CuttingSectionIndex.Face;
            }
        }

        public getReferenceGeometryEnabled(): boolean {
            return this._showReferenceGeometry;
        }

        public getIndividualCuttingSectionEnabled(): boolean {
            return this._useIndividualCuttingSections;
        }

        public getPlaneInfo(sectionIndex: CuttingSectionIndex): CuttingPlaneInfo | undefined {
            return this._planeInfo.get(sectionIndex);
        }

        private _ensurePlaneInfo(sectionIndex: CuttingSectionIndex): CuttingPlaneInfo {
            let planeInfo = this._planeInfo.get(sectionIndex);
            if (planeInfo === undefined) {
                planeInfo = new CuttingPlaneInfo();
                this._planeInfo.set(sectionIndex, planeInfo);
            }
            return planeInfo;
        }

        private _setStatus(sectionIndex: CuttingSectionIndex, status: CuttingPlaneStatus): void {
            this._ensurePlaneInfo(sectionIndex).status = status;
        }

        private async _updateBoundingBox(): Promise<void> {
            if (!this._boundingBoxUpdate && this._initSectionCalled) {
                this._boundingBoxUpdate = true;

                const modelBounding = await this._viewer.model.getModelBounding(true, false);
                const minDiff = this._modelBounding.min.equalsWithTolerance(
                    modelBounding.min,
                    0.01,
                );
                const maxDiff = this._modelBounding.max.equalsWithTolerance(
                    modelBounding.max,
                    0.01,
                );

                if (!minDiff || !maxDiff) {
                    this._modelBounding = modelBounding;
                    this._ensurePlaneInfo(CuttingSectionIndex.X).updateReferenceGeometry = true;
                    this._ensurePlaneInfo(CuttingSectionIndex.Y).updateReferenceGeometry = true;
                    this._ensurePlaneInfo(CuttingSectionIndex.Z).updateReferenceGeometry = true;
                    this._ensurePlaneInfo(CuttingSectionIndex.Face).updateReferenceGeometry = true;
                    const activeStates = [
                        this._isActive(CuttingSectionIndex.X),
                        this._isActive(CuttingSectionIndex.Y),
                        this._isActive(CuttingSectionIndex.Z),
                        this._isActive(CuttingSectionIndex.Face),
                    ];
                    this._storePlanes();
                    await this._clearCuttingSections();
                    await this._restorePlanes(activeStates);
                }

                this._boundingBoxUpdate = false;
            }
        }

        private _resetAxis(sectionIndex: CuttingSectionIndex): void {
            this._planeInfo.delete(sectionIndex);

            if (sectionIndex === CuttingSectionIndex.Face) {
                this._faceSelection = null;
            }
        }

        private _resetCuttingData(): void {
            this._resetAxis(CuttingSectionIndex.X);
            this._resetAxis(CuttingSectionIndex.Y);
            this._resetAxis(CuttingSectionIndex.Z);
            this._resetAxis(CuttingSectionIndex.Face);

            this._useIndividualCuttingSections = true;
            this._showReferenceGeometry = true;
            this._faceSelection = null;
        }

        public resetCuttingPlanes(): Promise<void> {
            this._resetCuttingData();
            return this._clearCuttingSections();
        }

        private async _initSection(): Promise<void> {
            const modelBounding = await this._viewer.model.getModelBounding(true, false);
            this._modelBounding = modelBounding.copy();

            const cuttingManager = this._viewer.cuttingManager;

            this._cuttingSections[CuttingSectionIndex.X] = cuttingManager.getCuttingSection(
                CuttingSectionIndex.X,
            )!;
            this._cuttingSections[CuttingSectionIndex.Y] = cuttingManager.getCuttingSection(
                CuttingSectionIndex.Y,
            )!;
            this._cuttingSections[CuttingSectionIndex.Z] = cuttingManager.getCuttingSection(
                CuttingSectionIndex.Z,
            )!;
            this._cuttingSections[CuttingSectionIndex.Face] = cuttingManager.getCuttingSection(
                CuttingSectionIndex.Face,
            )!;

            await this._triggerPendingFuncs();
            this._initSectionCalled = true;
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
            switch (this._ensurePlaneInfo(sectionIndex).status) {
                case CuttingPlaneStatus.Hidden:
                    if (sectionIndex === CuttingSectionIndex.Face) {
                        const selectionItem = this._viewer.selectionManager.getLast();
                        if (selectionItem !== null && selectionItem.isFaceSelection()) {
                            this._faceSelection = selectionItem;
                            // clear any cutting planes in the face cutting section
                            await this._cuttingSections[sectionIndex].clear();
                            this._setStatus(sectionIndex, CuttingPlaneStatus.Visible);
                            await this.setCuttingPlaneVisibility(true, sectionIndex);
                        }
                    } else {
                        this._setStatus(sectionIndex, CuttingPlaneStatus.Visible);
                        await this.setCuttingPlaneVisibility(true, sectionIndex);
                    }
                    break;
                case CuttingPlaneStatus.Visible:
                    this._setStatus(sectionIndex, CuttingPlaneStatus.Inverted);
                    await this.setCuttingPlaneInverted(sectionIndex);
                    break;
                case CuttingPlaneStatus.Inverted:
                    this._setStatus(sectionIndex, CuttingPlaneStatus.Hidden);
                    await this.setCuttingPlaneVisibility(false, sectionIndex);
                    break;
            }
        }

        public getCount(): number {
            let count = 0;
            for (const section of this._cuttingSections) {
                count += section.getCount();
            }
            return count;
        }

        public async setCuttingPlaneVisibility(
            visibility: boolean,
            sectionIndex: CuttingSectionIndex,
        ): Promise<void> {
            const index = this._getCuttingSectionIndex(sectionIndex);
            const section = this._cuttingSections[index] as CuttingSection | undefined;
            if (section === undefined) {
                this._pendingFuncs.visibility = async () => {
                    await this.setCuttingPlaneVisibility(visibility, sectionIndex);
                };
                return;
            }

            this._viewer.delayCapping();

            if (visibility) {
                const planeInfo = this._ensurePlaneInfo(sectionIndex);
                if (planeInfo.plane === null) {
                    planeInfo.plane = this._generateCuttingPlane(sectionIndex);
                    planeInfo.referenceGeometry = this._generateReferenceGeometry(sectionIndex);
                }
                await this._setSection(sectionIndex);
            } else {
                await this.refreshPlaneGeometry();
            }

            const count = this.getCount();
            const active = this._isActive(sectionIndex);

            if (count > 0 && !active) {
                await this._activatePlanes();
            } else if (active && count === 0) {
                await this._deactivateAxis(sectionIndex);
            }
        }

        public async setCuttingPlaneInverted(sectionIndex: CuttingSectionIndex): Promise<void> {
            const section = this._cuttingSections[this._getCuttingSectionIndex(sectionIndex)] as
                | CuttingSection
                | undefined;

            if (section === undefined) {
                this._pendingFuncs.inverted = async () => {
                    await this.setCuttingPlaneInverted(sectionIndex);
                };
                return;
            }

            this._viewer.delayCapping();

            const index = this._getPlaneIndex(sectionIndex);
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
            await this._clearCuttingSections();
            await this._restorePlanes();
        }

        public async toggleCuttingMode(): Promise<void> {
            if (this.getCount() > 1) {
                this._storePlanes();
                await this._clearCuttingSections();
                this._useIndividualCuttingSections = !this._useIndividualCuttingSections;
                await this._restorePlanes();
            }
        }

        private _isActive(sectionIndex: CuttingSectionIndex): boolean {
            return this._cuttingSections[this._getCuttingSectionIndex(sectionIndex)].isActive();
        }

        private _deactivateAxis(sectionIndex: CuttingSectionIndex): Promise<void> {
            return this._cuttingSections[this._getCuttingSectionIndex(sectionIndex)].deactivate();
        }

        private _getCuttingSectionIndex(sectionIndex: CuttingSectionIndex): number {
            return this._useIndividualCuttingSections ? sectionIndex : 0;
        }

        private async _clearCuttingSection(sectionIndex: CuttingSectionIndex): Promise<void> {
            const section = this._cuttingSections[sectionIndex] as CuttingSection | undefined;
            if (section !== undefined) {
                await section.clear();
            }
        }

        private _clearCuttingSections(): Promise<void> {
            const ps: Promise<void>[] = [];

            ps.push(this._clearCuttingSection(CuttingSectionIndex.X));
            ps.push(this._clearCuttingSection(CuttingSectionIndex.Y));
            ps.push(this._clearCuttingSection(CuttingSectionIndex.Z));
            ps.push(this._clearCuttingSection(CuttingSectionIndex.Face));

            return Util.waitForAll(ps);
        }

        private async _activateSection(sectionIndex: CuttingSectionIndex): Promise<void> {
            const section = this._cuttingSections[sectionIndex] as CuttingSection | undefined;
            if (section !== undefined && section.getCount() > 0) {
                await section.activate();
            }
        }

        private _activatePlanes(activeStates?: boolean[]): Promise<void> {
            const ps: Promise<void>[] = [];
            if (!activeStates || activeStates[0])
                ps.push(this._activateSection(CuttingSectionIndex.X));
            if (!activeStates || activeStates[1])
                ps.push(this._activateSection(CuttingSectionIndex.Y));
            if (!activeStates || activeStates[2])
                ps.push(this._activateSection(CuttingSectionIndex.Z));
            if (!activeStates || activeStates[3])
                ps.push(this._activateSection(CuttingSectionIndex.Face));
            return Util.waitForAll(ps);
        }

        private _getPlaneIndex(sectionIndex: CuttingSectionIndex): number {
            if (this._useIndividualCuttingSections) {
                sectionIndex = this._getCuttingSectionIndex(sectionIndex);
                const section = this._cuttingSections[sectionIndex];
                if (section.getPlane(0)) {
                    return 0;
                }
            } else {
                const section = this._cuttingSections[0];
                const planeCount = section.getCount();

                for (let i = 0; i < planeCount; i++) {
                    const plane = section.getPlane(i);

                    let normal: Point3 | undefined;
                    if (this._faceSelection) {
                        normal = this._faceSelection.getFaceEntity().getNormal();
                    }

                    if (plane) {
                        if (
                            (plane.normal.x && sectionIndex === CuttingSectionIndex.X) ||
                            (plane.normal.y && sectionIndex === CuttingSectionIndex.Y) ||
                            (plane.normal.z && sectionIndex === CuttingSectionIndex.Z) ||
                            (sectionIndex === CuttingSectionIndex.Face &&
                                normal &&
                                plane.normal.equals(normal))
                        ) {
                            return i;
                        }
                    }
                }
            }
            return -1;
        }

        private async _setSection(sectionIndex: CuttingSectionIndex): Promise<void> {
            const planeInfo = this._planeInfo.get(sectionIndex);
            if (planeInfo !== undefined && planeInfo.plane !== null) {
                const cuttingSection =
                    this._cuttingSections[this._getCuttingSectionIndex(sectionIndex)];
                const referenceGeometry = this._showReferenceGeometry
                    ? planeInfo.referenceGeometry
                    : null;
                await cuttingSection.addPlane(planeInfo.plane, referenceGeometry);
            }
        }

        private async _restorePlane(sectionIndex: CuttingSectionIndex): Promise<void> {
            const planeInfo = this._planeInfo.get(sectionIndex);
            if (
                planeInfo !== undefined &&
                planeInfo.plane !== null &&
                planeInfo.status !== CuttingPlaneStatus.Hidden
            ) {
                if (planeInfo.referenceGeometry === null || planeInfo.updateReferenceGeometry) {
                    planeInfo.referenceGeometry = this._generateReferenceGeometry(sectionIndex);
                }
                await this._setSection(sectionIndex);
            }
        }

        private async _restorePlanes(activeStates?: boolean[]): Promise<void> {
            await Promise.all([
                this._restorePlane(CuttingSectionIndex.X),
                this._restorePlane(CuttingSectionIndex.Y),
                this._restorePlane(CuttingSectionIndex.Z),
                this._restorePlane(CuttingSectionIndex.Face),
            ]);
            await this._activatePlanes(activeStates);
        }

        private _storePlane(sectionIndex: CuttingSectionIndex): void {
            const section = this._cuttingSections[this._getCuttingSectionIndex(sectionIndex)];

            const planeInfo = this._ensurePlaneInfo(sectionIndex);
            planeInfo.plane = null;
            planeInfo.referenceGeometry = null;

            if (section.getCount() > 0 && planeInfo.status !== CuttingPlaneStatus.Hidden) {
                const planeIndex = this._getPlaneIndex(sectionIndex);

                const plane = section.getPlane(planeIndex);
                const referenceGeometry = section.getReferenceGeometry(planeIndex);

                planeInfo.plane = plane;
                planeInfo.referenceGeometry = referenceGeometry;
            }
        }

        private _storePlanes(): void {
            this._storePlane(CuttingSectionIndex.X);
            this._storePlane(CuttingSectionIndex.Y);
            this._storePlane(CuttingSectionIndex.Z);
            this._storePlane(CuttingSectionIndex.Face);
        }

        private _generateReferenceGeometry(sectionIndex: CuttingSectionIndex): Point3[] {
            const cuttingManager = this._viewer.cuttingManager;

            let referenceGeometry: Point3[] = [];

            if (sectionIndex === CuttingSectionIndex.Face) {
                if (this._faceSelection) {
                    const normal = this._faceSelection.getFaceEntity().getNormal();
                    const position = this._faceSelection.getPosition();
                    referenceGeometry = cuttingManager.createReferenceGeometryFromFaceNormal(
                        normal,
                        position,
                        this._modelBounding,
                    );
                }
            } else {
                let axis: Axis | undefined;
                switch (sectionIndex) {
                    case CuttingSectionIndex.X:
                        axis = Axis.X;
                        break;
                    case CuttingSectionIndex.Y:
                        axis = Axis.Y;
                        break;
                    case CuttingSectionIndex.Z:
                        axis = Axis.Z;
                        break;
                }

                if (axis !== undefined) {
                    referenceGeometry = cuttingManager.createReferenceGeometryFromAxis(
                        axis,
                        this._modelBounding,
                    );
                }
            }

            return referenceGeometry;
        }

        private _generateCuttingPlane(sectionIndex: CuttingSectionIndex): Plane | null {
            const plane = new Plane();

            switch (sectionIndex) {
                case CuttingSectionIndex.X:
                    plane.normal.set(1, 0, 0);
                    plane.d = -this._modelBounding.max.x;
                    break;
                case CuttingSectionIndex.Y:
                    plane.normal.set(0, 1, 0);
                    plane.d = -this._modelBounding.max.y;
                    break;
                case CuttingSectionIndex.Z:
                    plane.normal.set(0, 0, 1);
                    plane.d = -this._modelBounding.max.z;
                    break;
                case CuttingSectionIndex.Face:
                    if (this._faceSelection) {
                        this._faceSelection = this._faceSelection;
                        const normal = this._faceSelection.getFaceEntity().getNormal();
                        const position = this._faceSelection.getPosition();
                        plane.setFromPointAndNormal(position, normal);
                    } else {
                        return null;
                    }
            }

            return plane;
        }
    }
}
