namespace Communicator {
    /**
     * @hidden
     * Removes any ids from the array if they are not contained in the current sheet.
     * @param nodeIds [[NodeId]] array.
     */
    export function _filterActiveSheetNodeIds(viewer: WebViewer, nodeIds: NodeId[]): void {
        const model = viewer.model;
        const activeSheetId = viewer.sheetManager.getActiveSheetId();
        if (activeSheetId !== null) {
            const sheetParent = model.getNodeParent(activeSheetId)!;
            const sheets = model.getNodeChildren(sheetParent);

            Util.filterInPlace(nodeIds, (id: NodeId | null) => {
                let parentId = id;
                while (parentId !== null) {
                    if (parentId === activeSheetId) {
                        return true;
                    } else if (sheets.indexOf(parentId) !== -1) {
                        return false;
                    }
                    parentId = viewer.model.getNodeParent(parentId);
                }
                return true;
            });
        }
    }

    export class IsolateZoomHelper {
        private readonly _viewer: WebViewer;
        private readonly _noteTextManager: Markup.Note.NoteTextManager;
        private _camera: Camera | null = null;
        private _deselectOnIsolate: boolean = true;
        private _deselectOnZoom: boolean = true;
        private _isolateStatus: boolean = false;

        constructor(viewer: WebViewer) {
            this._viewer = viewer;
            this._noteTextManager = this._viewer.noteTextManager;

            this._viewer.setCallbacks({
                modelSwitched: () => {
                    this._camera = null;
                },
            });
        }

        private _setCamera(camera: Camera): void {
            if (this._camera === null) {
                this._camera = camera;
            }
        }

        public setDeselectOnIsolate(deselect: boolean): void {
            this._deselectOnIsolate = deselect;
        }

        public getIsolateStatus(): boolean {
            return this._isolateStatus;
        }

        public isolateNodes(
            nodeIds: NodeId[],
            initiallyHiddenStayHidden: boolean | null = null,
        ): Promise<void> {
            const view = this._viewer.view;

            this._setCamera(view.getCamera());

            _filterActiveSheetNodeIds(this._viewer, nodeIds);

            const p = view.isolateNodes(
                nodeIds,
                DefaultTransitionDuration,
                !this._viewer.sheetManager.isDrawingSheetActive(),
                initiallyHiddenStayHidden,
            );

            if (this._deselectOnIsolate) {
                this._viewer.selectionManager.clear();
            }
            this._isolateStatus = true;

            return p;
        }

        public fitNodes(nodeIds: NodeId[]): Promise<void> {
            const view = this._viewer.view;

            this._setCamera(view.getCamera());
            const p = view.fitNodes(nodeIds);

            if (this._deselectOnZoom) {
                this._viewer.selectionManager.clear();
            }

            return p;
        }

        public showAll(): Promise<void> {
            const model = this._viewer.model;

            if (this._viewer.sheetManager.isDrawingSheetActive()) {
                const sheetId = this._viewer.sheetManager.getActiveSheetId();
                if (sheetId !== null) {
                    return this.isolateNodes([sheetId]);
                }
                return Promise.resolve();
            } else {
                const ps: Promise<void>[] = [];

                if (model.isDrawing()) {
                    // Need to reset 3DNodes here
                    const nodes3D = this._viewer.sheetManager.get3DNodes();
                    ps.push(this.isolateNodes(nodes3D));
                } else ps.push(model.resetNodesVisibility());
                if (this._camera !== null) {
                    this._viewer.view.setCamera(this._camera, DefaultTransitionDuration);
                    this._camera = null;
                }
                this._isolateStatus = false;

                ps.push(this._updatePinVisibility());

                return Util.waitForAll(ps);
            }
        }

        private _updatePinVisibility(): Promise<void> {
            this._noteTextManager.setIsolateActive(this._isolateStatus);
            return this._noteTextManager.updatePinVisibility();
        }
    }
}
