/// <reference path="./interfaces.ts"/>

namespace Communicator.Ui.CuttingPlane.ControllerUtils {
    /**
     * @class BoundingManager this is a buffer class that holds the model bounding
     * box and update it if needed
     */
    export class BoundingManager {
        /**
         * @member _modelBounding Copy of the bounding box model used as a buffer value yo allow synchronous access
         */
        private _modelBounding: Box = new Box();

        /**
         * @property @readonly box the latest bounding box
         */
        public get box(): Box {
            return this._modelBounding;
        }

        /**
         * Initialize the bounding box with the current model bounding box value
         * @param viewer the WebViewer of the cutting planes
         */
        public async init(viewer: WebViewer): Promise<void> {
            this._modelBounding = await viewer.model.getModelBounding(true, false);
        }

        /**
         * update the bounding box if the model bounding box is different than the current one
         * @param viewer the WebViewer of the cutting planes
         * @returns true if the bounding boxed changed, false otherwise
         */
        public async update(viewer: WebViewer): Promise<boolean> {
            const modelBounding = await viewer.model.getModelBounding(true, false);
            const minDiff = this._modelBounding.min.equalsWithTolerance(modelBounding.min, 0.01);
            const maxDiff = this._modelBounding.max.equalsWithTolerance(modelBounding.max, 0.01);

            if (!minDiff || !maxDiff) {
                this._modelBounding = modelBounding;
                return true;
            }

            return false;
        }
    }
}
