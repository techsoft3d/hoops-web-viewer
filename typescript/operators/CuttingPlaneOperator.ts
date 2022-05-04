/// <reference path="../Core/View.ts"/>
/// <reference path="OperatorBase.ts"/>

namespace Communicator.Operator {
    /** @hidden */
    class CuttingPlaneOperatorContext {
        constructor(
            cuttingSection: CuttingSection,
            node: NodeId,
            cuttingPlaneIndex: number,
            cuttingPlane: Plane,
            selectionPosition: Point3,
        ) {
            this.section = cuttingSection;
            this.node = node;
            this.planeIndex = cuttingPlaneIndex;
            this.plane = cuttingPlane;
            this.selectionPosition = selectionPosition;
            this.origPlaneD = cuttingPlane.d;
        }

        public readonly section: CuttingSection;
        public readonly selectionPosition: Point3;
        public readonly node: number;
        public readonly plane: Plane;
        public readonly planeIndex: number;
        public readonly origPlaneD: number;
    }

    /** @hidden */
    export class CuttingPlaneOperator extends OperatorBase {
        private _cuttingManager: CuttingManager;

        /**
         * The context will only be non-null after a successful selection of the cutting plane has happened, and
         * only for the duration of the mouse up-move-down sequence.
         */
        private _context: CuttingPlaneOperatorContext | null = null;

        /** @hidden */
        public constructor(viewer: WebViewer, cuttingManager: CuttingManager) {
            super(viewer);
            this._cuttingManager = cuttingManager;
        }

        /** @hidden */
        public async onMouseDown(event: Event.MouseInputEvent): Promise<void> {
            super.onMouseDown(event);

            if (
                this._context === null &&
                this.isActive() &&
                this._cuttingManager.hasActiveCuttingSection()
            ) {
                await this._startSelection(event);
                event.setHandled(this._context !== null);
            }
        }

        /** @hidden */
        public async onMouseMove(event: Event.MouseInputEvent): Promise<void> {
            super.onMouseMove(event);

            const context = this._context;
            if (this.isActive() && context !== null) {
                event.setHandled(true);
                await this._updatePlane(event.getPosition(), context, false);
                this._viewer.trigger("cuttingPlaneDrag", context.section, context.planeIndex);
            }
        }

        private async _updatePlane(
            position: Point2,
            context: CuttingPlaneOperatorContext,
            setMatrix: boolean,
        ): Promise<void> {
            const p1 = context.selectionPosition;
            const p2 = context.plane.normal.copy().add(context.selectionPosition);
            const p3 = this._viewer.view.unprojectPoint(position, 0);
            const p4 = this._viewer.view.unprojectPoint(position, 0.5);
            if (p3 !== null && p4 !== null) {
                const closestPoint = Util.lineLineIntersect(p1, p2, p3, p4);
                if (closestPoint !== null) {
                    const delta = Point3.subtract(closestPoint, context.selectionPosition);
                    const signedDeltaLen =
                        Point3.dot(delta, context.plane.normal) < 0
                            ? delta.length()
                            : -delta.length();
                    context.plane.d = context.origPlaneD + signedDeltaLen;

                    const translate = context.plane.normal.copy().scale(-signedDeltaLen);
                    const matrix = new Matrix().setTranslationComponent(
                        translate.x,
                        translate.y,
                        translate.z,
                    );

                    await context.section.updatePlane(
                        context.planeIndex,
                        context.plane,
                        matrix,
                        setMatrix,
                        false,
                    );
                }
                this._cuttingManager.delayCapping();
            }
        }

        /** @hidden */
        public async onMouseUp(event: Event.MouseInputEvent): Promise<void> {
            const context = this._context;
            if (this.isActive() && context !== null) {
                event.setHandled(true);
                await this._updatePlane(event.getPosition(), context, true);
                this._viewer.trigger("cuttingPlaneDragEnd", context.section, context.planeIndex);
            }
            this._context = null;
            super.onMouseUp(event);
        }

        /** @hidden */
        public setHandled(): boolean {
            return this.isActive() && this._context !== null;
        }

        /**
         * Perform the selection operation. If successful, the cutting plane context will be properly
         * setup, otherwise the cutting plane context will be null.
         */
        private async _startSelection(event: Event.MouseInputEvent): Promise<void> {
            this._context = null; // Just to be sure
            const mousePos = event.getPosition();

            // SCW: Note that I'm adding Line to the mask per the old code, but I can't notice any difference
            //  in terms of actual behavior. I thought if the plane was parallel to the view (ie visibly just
            //  a line on the screen) it might allow selection of the plane, but it doesn't.
            const selectMask = SelectionMask.Face | SelectionMask.Line;
            const config = new PickConfig(selectMask);
            config.ignoreCappingGeometry = true;

            // Setting the force-face visibility mask because selection will currently ignore faces with
            // OverrideSceneVisibility while in wire-frame mode.
            config.forceEffectiveSceneVisibilityMask = SelectionMask.Face;

            const compositeItem = await this._viewer.view.compositePickFromPoint(mousePos, config);
            const selectedItem = compositeItem.fetchMostRelevant(selectMask);
            if (selectedItem === null) return;

            const nodeId = selectedItem.getNodeId();
            const cuttingSection = this._cuttingManager.getCuttingSectionFromNodeId(nodeId);
            if (cuttingSection !== null) {
                const cuttingPlaneIndex = cuttingSection.getPlaneIndexByNodeId(nodeId)!;
                this._context = new CuttingPlaneOperatorContext(
                    cuttingSection,
                    nodeId,
                    cuttingPlaneIndex,
                    cuttingSection.getPlane(cuttingPlaneIndex)!,
                    selectedItem.getPosition(),
                );

                this._cuttingManager.delayCapping();

                this._viewer.trigger("cuttingPlaneDragStart", cuttingSection, cuttingPlaneIndex);
            }
        }
    }
}
