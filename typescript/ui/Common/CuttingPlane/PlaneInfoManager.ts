/// <reference path="../../js/hoops_web_viewer.d.ts"/>
/// <reference path="./interfaces.ts"/>

namespace Communicator.Ui.CuttingPlane.ControllerUtils {
    /**
     * @class PlaneInfoManager encapsulates the the handling of the planes' information
     */
    export class PlaneInfoManager {
        /**
         * @member _planeInfoMap a map of plane information for each CuttingSection
         */
        private readonly _planeInfoMap = new Map<CuttingSectionIndex, Info>();

        /**
         * Get the plane Information for CuttingSectionIndex.X
         * @returns the plane Information for CuttingSectionIndex.X
         */
        public get X(): Info {
            return this.get(CuttingSectionIndex.X);
        }

        /**
         * Get the plane Information for CuttingSectionIndex.Y
         * @returns the plane Information for CuttingSectionIndex.Y
         */
        public get Y(): Info {
            return this.get(CuttingSectionIndex.Y);
        }

        /**
         * Get the plane Information for CuttingSectionIndex.Z
         * @returns the plane Information for CuttingSectionIndex.Z
         */
        public get Z(): Info {
            return this.get(CuttingSectionIndex.Z);
        }

        /**
         * Get the plane Information for CuttingSectionIndex.Face
         * @returns the plane Information for CuttingSectionIndex.Face
         */
        public get Face(): Info {
            return this.get(CuttingSectionIndex.Face);
        }

        /**
         * Check whether a cutting plane is hidden or not for a given section
         * @param  {CuttingSectionIndex} sectionIndex the section index of the plane to check
         * @returns true if the cutting plane is hidden, false otherwise.
         */
        public isHidden(sectionIndex: CuttingSectionIndex): boolean {
            return this.get(sectionIndex)!.status === Status.Hidden;
        }

        /**
         * Get the plane information for a given cutting section
         *
         * If the info does not exist in the map it creates it
         *
         * @param  {CuttingSectionIndex} sectionIndex the section index of the info to get
         * @returns the plane information for the given section
         */
        public get(sectionIndex: CuttingSectionIndex): Info {
            let planeInfo = this._planeInfoMap.get(sectionIndex);
            if (planeInfo === undefined) {
                planeInfo = new Info();
                this._planeInfoMap.set(sectionIndex, planeInfo);
            }
            return planeInfo;
        }

        /**
         * Resets a plane's information
         *
         * Sets plane and referenceGeometry to null
         *
         * @param  {CuttingSectionIndex} sectionIndex
         */
        public reset(sectionIndex: CuttingSectionIndex) {
            const planeInfo = this.get(sectionIndex);
            planeInfo.plane = null;
            planeInfo.referenceGeometry = null;
        }

        /**
         * Deletes the plane's information for a given section in the map
         *
         * @note it will be recreated if get is called with the same section index
         *
         * @param  {CuttingSectionIndex} sectionIndex the section index of the plane's information to delete
         */
        public delete(sectionIndex: CuttingSectionIndex) {
            this._planeInfoMap.delete(sectionIndex);
        }

        /**
         * Deletes all planes' information
         *
         * @note they will be recreated if get is called with each of their section index
         */
        public clear() {
            this._planeInfoMap.clear();
        }

        /**
         * Update all planes' info
         *
         * @todo check if this is still necessary after refactoring or if something more elegant is feasible
         */
        public update() {
            this._planeInfoMap.forEach((current) => {
                current.updateReferenceGeometry = true;
            });
        }

        /**
         * Get the status of a plane given the plain and its section index
         * @param  {CuttingSectionIndex} sectionIndex the section index of the plane
         * @param  {Plane} plane the plane to get its status
         * @returns {Status} the status of the plane
         */
        public static getCuttingStatus(sectionIndex: CuttingSectionIndex, plane: Plane): Status {
            if (
                (plane.normal.x >= 0 && plane.normal.y >= 0 && plane.normal.z >= 0) ||
                sectionIndex === CuttingSectionIndex.Face
            ) {
                return Status.Visible;
            } else {
                return Status.Inverted;
            }
        }

        /**
         * Get the section index for a given plane based on its normal
         * @param  {Plane} plane the plane to get the section for
         * @returns the section index of the given plane
         */
        public static getPlaneSectionIndex(plane: Plane): CuttingSectionIndex {
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
    }
}
