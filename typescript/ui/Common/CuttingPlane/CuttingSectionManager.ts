/// <reference path="./interfaces.ts"/>

namespace Communicator.Ui.CuttingPlane.ControllerUtils {
    /**
     * @class CuttingSectionManager encapsulate the access to the cutting manager sections.
     */
    export class CuttingSectionManager {
        /**
         * @member _useIndividualCuttingSections a boolean representing whether the cutting section is done on a single plane or not
         */
        private _useIndividualCuttingSections: boolean = true;

        /**
         * @member _cuttingManager The CuttingManager of the WebViewer where the cutting planes are drawn
         */
        private _cuttingManager: CuttingManager | null = null;

        /**
         * @property useIndividualCuttingSections getter
         * @returns  a boolean representing whether the cutting section is done on a single plane or not
         */
        public get useIndividualCuttingSections(): boolean {
            return this._useIndividualCuttingSections;
        }

        /**
         * @property useIndividualCuttingSections setter
         *
         * @todo check if this can be remove and internalize the handling of this value or make it public
         *
         * @param  {boolean} value
         */
        public set useIndividualCuttingSections(value: boolean) {
            this._useIndividualCuttingSections = value;
        }

        /**
         * @property X get the CuttingSection for CuttingSectionIndex.X
         * @returns The CuttingSection for CuttingSectionIndex.X
         */
        public get X(): CuttingSection {
            if (!this._cuttingManager) {
                throw new Error("Ui.CuttingSectionManager as not been initialized");
            }

            return this._cuttingManager.getCuttingSection(CuttingSectionIndex.X)!;
        }

        /**
         * @property Y get the CuttingSection for CuttingSectionIndex.Y
         * @returns The CuttingSection for CuttingSectionIndex.Y
         */
        public get Y(): CuttingSection {
            if (!this._cuttingManager) {
                throw new Error("Ui.CuttingSectionManager as not been initialized");
            }

            return this._cuttingManager.getCuttingSection(CuttingSectionIndex.Y)!;
        }

        /**
         * @property Z get the CuttingSection for CuttingSectionIndex.Z
         * @returns The CuttingSection for CuttingSectionIndex.Z
         */
        public get Z(): CuttingSection {
            if (!this._cuttingManager) {
                throw new Error("Ui.CuttingSectionManager as not been initialized");
            }

            return this._cuttingManager.getCuttingSection(CuttingSectionIndex.Z)!;
        }

        /**
         * @property Face get the CuttingSection for CuttingSectionIndex.Face
         * @returns The CuttingSection for CuttingSectionIndex.Face
         */
        public get Face(): CuttingSection {
            if (!this._cuttingManager) {
                throw new Error("Ui.CuttingSectionManager as not been initialized");
            }

            return this._cuttingManager.getCuttingSection(CuttingSectionIndex.Face)!;
        }

        /**
         * @property activeStates get an array of boolean representing whether a plane in
         * [CuttingSectionIndex.X, CuttingSectionIndex.Y, CuttingSectionIndex.Z, CuttingSectionIndex.Face]
         * is active
         * @returns boolean
         */
        public get activeStates(): [boolean, boolean, boolean, boolean] {
            return [
                this.isActive(CuttingSectionIndex.X),
                this.isActive(CuttingSectionIndex.Y),
                this.isActive(CuttingSectionIndex.Z),
                this.isActive(CuttingSectionIndex.Face),
            ];
        }

        /**
         * @property planes get planes in either CuttingSectionIndex.X CuttingSection if its count is greater than 1
         * or every first plane of every section in
         * [CuttingSectionIndex.X, CuttingSectionIndex.Y, CuttingSectionIndex.Z, CuttingSectionIndex.Face]
         *
         * @todo check whether the X part is not something that must be modified due to refactoring (support use
         * individual on other section index)
         *
         * @returns an array of four cells containing either a plane or null.
         */
        public get planes(): (Plane | null)[] {
            if (this.X.getCount() > 1) {
                return [...Array(4)].map((_, index) => this.X.getPlane(index));
            } else {
                return [this.X, this.Y, this.Z, this.Face].map((current) => current.getPlane(0));
            }
        }

        /**
         * @property referenceGeometry get the reference geometry in either CuttingSectionIndex.X CuttingSection if its count
         * is greater than 1 or every first reference geometry of every section in
         * [CuttingSectionIndex.X, CuttingSectionIndex.Y, CuttingSectionIndex.Z, CuttingSectionIndex.Face]
         *
         * @todo check whether the X part is not something that must be modified due to refactoring (support use
         * individual on other section index)
         *
         * @returns an array of four cells containing either a plane or null.
         */
        public get referenceGeometry(): (Point3[] | null)[] {
            if (this.X.getCount() > 1) {
                return [...Array(4)].map((_, index) => this.X.getReferenceGeometry(index));
            } else {
                return [this.X, this.Y, this.Z, this.Face].map((current) =>
                    current.getReferenceGeometry(0),
                );
            }
        }

        /**
         * Get a Cutting Section given an index
         * @param sectionIndex The index of the cutting section
         * @returns The appropriate cutting section for this index from the cutting manager
         */
        public get(sectionIndex: CuttingSectionIndex): CuttingSection {
            if (!this._cuttingManager) {
                throw new Error("Ui.CuttingSectionManager as not been initialized");
            }

            return this._cuttingManager.getCuttingSection(sectionIndex)!;
        }

        /**
         * Get the total number of planes for all sections.
         * @returns the total number of planes for all sections.
         */
        public getCount(): number {
            return [this.X, this.Y, this.Z, this.Face].reduce(
                (currentValue, section) => currentValue + section.getCount(),
                0,
            );
        }

        /**
         * Initialize the component and store a reference to the CuttingManager of the WebViewer
         * @param viewer The viewer where the cutting planes to manage are
         */
        public init(viewer: WebViewer): void {
            this._cuttingManager = viewer.cuttingManager;
        }
        /**
         * Check whether a section is active or not.
         *
         * @throws Error if the CuttingSectionManager has not been initialized yet
         * @param  {CuttingSectionIndex} sectionIndex
         * @returns a boolean that represent whether a section is active or not
         */
        public isActive(sectionIndex: CuttingSectionIndex): boolean {
            if (!this._cuttingManager) {
                throw new Error("Ui.CuttingSectionManager as not been initialized");
            }

            return this.get(sectionIndex).isActive();
        }

        /**
         * Activate a plane if the section count is greater than 0
         * @param  {CuttingSectionIndex} sectionIndex the index of the plane to activate
         *
         * @todo improve this API, a function cannot silently fail like that at least return a boolean
         *
         * @returns Promise a promise returning when the plane has been activated or not
         */
        public async activate(sectionIndex: CuttingSectionIndex): Promise<void> {
            const section = this.get(sectionIndex);
            if (section.getCount() > 0) {
                return section.activate();
            }
        }

        /**
         * Activate all planes if the section count is greater than 0 depending on activeStates
         * if activeStates is undefined every planes are activated (if possible)
         * if activeStates is defined
         *  - activeStates[0] triggers activation of CuttingSectionIndex.X
         *  - activeStates[1] triggers activation of CuttingSectionIndex.Y
         *  - activeStates[2] triggers activation of CuttingSectionIndex.Z
         *  - activeStates[3] triggers activation of CuttingSectionIndex.Face
         *
         * @param  {activeStates} activeStates
         *
         * @todo improve this API, a function cannot silently fail like that at least return a boolean array
         * @todo improve this API, use named fields for activeStates
         *
         * @returns Promise a promise returning when the plane has been activated or not
         */
        public async activateAll(
            activeStates?: [boolean, boolean, boolean, boolean],
        ): Promise<void> {
            await Promise.all(
                [
                    CuttingSectionIndex.X,
                    CuttingSectionIndex.Y,
                    CuttingSectionIndex.Z,
                    CuttingSectionIndex.Face,
                ]
                    .map((current, index) =>
                        !activeStates || activeStates[index] ? this.activate(current) : null,
                    )
                    .filter(Boolean) as Promise<void>[],
            );
        }

        /**
         * Deactivate a plane
         * @param  {CuttingSectionIndex} sectionIndex the index of the plane to deactivate
         *
         * @todo improve this API, a function cannot silently fail like that at least return a boolean
         *
         * @returns Promise a promise returning when the plane has been activated or not
         */
        public deactivate(sectionIndex: CuttingSectionIndex): Promise<void> {
            return this.get(this.getCuttingSectionIndex(sectionIndex)).deactivate();
        }

        /**
         * Reset useIndividualCuttingSections to true
         *
         * @todo check whether it is still useful after the refactoring
         *
         */
        public reset(): void {
            this._useIndividualCuttingSections = true;
        }

        /**
         * Get the section index based on whether useIndividualCuttingSections is set or not.
         * Return CuttingSectionIndex.X (0) if useIndividualCuttingSections is set, sectionIndex otherwise.
         *
         * @todo maybe we can improve this API by aliasing the CuttingSectionIndex.X (0) with something like CuttingSectionIndividual = 0
         *
         * @param sectionIndex the index of the desired section
         * @returns CuttingSectionIndex.X (0) if useIndividualCuttingSections is set, sectionIndex otherwise
         */
        public getCuttingSectionIndex(sectionIndex: CuttingSectionIndex): CuttingSectionIndex {
            return this.useIndividualCuttingSections ? sectionIndex : CuttingSectionIndex.X;
        }

        /**
         * Clear a CuttingSection given its index
         * @param  {CuttingSectionIndex} sectionIndex the index of the section to clear
         * @returns a promise resolved with void on completion
         */
        public async clear(sectionIndex: CuttingSectionIndex): Promise<void> {
            return this.get(sectionIndex).clear();
        }

        /**
         * Clear a CuttingSection given its index
         * @param  {CuttingSectionIndex} sectionIndex the index of the section to clear
         * @returns a promise resolved with void on completion
         */
        public async clearAll(): Promise<void> {
            const ps: Promise<void>[] = [
                CuttingSectionIndex.X,
                CuttingSectionIndex.Y,
                CuttingSectionIndex.Z,
                CuttingSectionIndex.Face,
            ].map(async (current) => this.clear(current));

            await Promise.all(ps);
        }
        /**
         * get the index of a plane given section index
         * @param  {CuttingSectionIndex} sectionIndex the index of the section of the plane
         * @param  {Point3} normal? an optional normal used if sectionIndex === CuttingSectionIndex.Face
         * @returns the index of the plane according to the sec or -1 if not found.
         */
        public getPlaneIndex(sectionIndex: CuttingSectionIndex, normal?: Point3): number {
            if (this._useIndividualCuttingSections) {
                const section = this.get(this.getCuttingSectionIndex(sectionIndex));
                if (section.getPlane(0)) {
                    return 0;
                }
            } else {
                const section = this.get(0);
                const planeCount = section.getCount();

                for (let i = 0; i < planeCount; i++) {
                    const plane = section.getPlane(i);

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

        /**
         * Get the plane and the reference geometry for a given section index
         * @param  {CuttingSectionIndex} sectionIndex the section index of the data to get
         * @param  {Point3} normal? an optional normal used if sectionIndex === CuttingSectionIndex.Face
         * @returns {plane: Plane | null; referenceGeometry: Point3[] | null} an Object containing the
         * plane or null as plane and the reference geometry or null as referenceGeometry
         */
        public getPlaneAndGeometry(
            sectionIndex: CuttingSectionIndex,
            normal?: Point3,
        ): { plane: Plane | null; referenceGeometry: Point3[] | null } {
            const section = this.get(this.getCuttingSectionIndex(sectionIndex));
            if (section.getCount() <= 0) {
                return {
                    plane: null,
                    referenceGeometry: null,
                };
            }

            const planeIndex = this.getPlaneIndex(sectionIndex, normal);

            const plane = section.getPlane(planeIndex);
            const referenceGeometry = section.getReferenceGeometry(planeIndex);

            return { plane, referenceGeometry };
        }

        /**
         * Get the reference geometry for a given section index
         *
         * @param  {CuttingSectionIndex} sectionIndex the section index of the reference geometry to get
         * @param  {Box} boundingBox the bounding box of the model
         * @returns {Point3[]} the reference geometry of the section
         */
        public getReferenceGeometry(sectionIndex: CuttingSectionIndex, boundingBox: Box): Point3[] {
            if (!this._cuttingManager) {
                throw new Error("Ui.CuttingSectionManager as not been initialized");
            }

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
                return this._cuttingManager.createReferenceGeometryFromAxis(axis, boundingBox);
            }

            return [];
        }

        /**
         * Add a plane to a section
         * @param  {CuttingSectionIndex} sectionIndex the section where the plane should be added
         * @param  {Plane} plane the plane to add.
         * @param  {Point[]|null} referenceGeometry the reference geometry of the plane or null
         * @returns Promise a promise completed with undefined when its done
         */
        public async addPlane(
            sectionIndex: CuttingSectionIndex,
            plane: Plane,
            referenceGeometry: Point3[] | null,
        ): Promise<void> {
            await this.get(sectionIndex).addPlane(plane, referenceGeometry);
        }
    }
}
