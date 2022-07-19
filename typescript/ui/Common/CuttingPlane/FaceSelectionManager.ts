/// <reference path="./interfaces.ts"/>

namespace Communicator.Ui.CuttingPlane.ControllerUtils {
    /**
     * @class FaceSelectionManager encapsulates Face Selection for cutting planes
     */
    export class FaceSelectionManager {
        /**
         * @member _faceSelection the current face selection item if there is one or null;
         */
        private _faceSelection: Selection.FaceSelectionItem | null = null;

        /**
         * Set the face selection item or reset it to null
         * @param  {Selection.FaceSelectionItem|null=null} item
         */
        public reset(item: Selection.FaceSelectionItem | null = null): void {
            this._faceSelection = item;
        }

        /**
         * @property  isSet is true if the current face selection item is not null
         * @returns true if the current face selection item is not null, false otherwise
         */
        public get isSet(): boolean {
            return this._faceSelection !== null;
        }

        /**
         * @property normal is the normal of the current face selection entity if any
         * @returns the normal of the current face selection entity if any, undefined otherwise
         */
        public get normal(): Point3 | undefined {
            return this._faceSelection
                ? this._faceSelection.getFaceEntity().getNormal()
                : undefined;
        }

        /**
         * @property position is the position of the current face selection entity if any
         * @returns the position of the current face selection entity if any, undefined otherwise
         */
        public get position(): Point3 | undefined {
            return this._faceSelection ? this._faceSelection.getPosition() : undefined;
        }

        /**
         * Get the reference geometry for the face section.
         * @param  {WebViewer} viewer the WebViewer were the cutting planes are displayed
         * @param  {Box} boundingBox the model bounding box
         * @returns the reference geometry for the face section
         */
        public getReferenceGeometry(viewer: WebViewer, boundingBox: Box): Point3[] {
            if (!this.isSet) {
                return [];
            }

            return viewer.cuttingManager.createReferenceGeometryFromFaceNormal(
                this.normal as Point3,
                this.position as Point3,
                boundingBox,
            );
        }
    }
}
