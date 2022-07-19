/// <reference path="./CuttingPlane/Controller.ts"/>

namespace Communicator.Ui {
    /**
     * @deprecated CuttingPlaneStatus is deprecated in favor of CuttingPlane.Status
     */
    export type CuttingPlaneStatus = CuttingPlane.Status;

    /**
     * @deprecated CuttingPlaneInfo is deprecated in favor of CuttingPlane.Info
     */
    export class CuttingPlaneInfo extends CuttingPlane.Info {}

    /**
     * @deprecated CuttingPlaneController is deprecated in favor of CuttingPlane.Controller
     */
    export class CuttingPlaneController extends CuttingPlane.Controller {
        /**
         * @deprecated getPlaneInfo is deprecated in favor of CuttingPlane.Controller.individualCuttingSectionEnabled
         * @returns CuttingPlane.Controller.individualCuttingSectionEnabled
         */
        public getIndividualCuttingSectionEnabled(): boolean {
            return this.individualCuttingSectionEnabled;
        }

        /* tslint:disable:deprecation */
        /**
         * @deprecated getPlaneInfo is deprecated in favor of CuttingPlane.Controller.getPlaneStatus
         * @param sectionIndex the section index of the plane you want
         * @returns the plane info of the plane in section sectionIndex
         */
        public getPlaneInfo(sectionIndex: CuttingSectionIndex): CuttingPlaneInfo | undefined {
            return this._planeInfoMgr.get(sectionIndex);
        }
        /* tslint:enable:deprecation */
    }
}
