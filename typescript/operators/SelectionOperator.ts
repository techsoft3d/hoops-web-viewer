/// <reference path="../Core/View.ts"/>
/// <reference path="../Math/Point2.ts"/>

/// <reference path="OperatorBase.ts"/>

namespace Communicator.Operator {
    export class SelectionOperator extends OperatorBase {
        private _selectionButton = Button.Left;
        private _noteTextManager: Markup.Note.NoteTextManager;
        private _pickConfig = new PickConfig(SelectionMask.Face | SelectionMask.Line);
        private _forceEffectiveSceneVisibilityMask: SelectionMask | null = null;
        private _doubleClickFitWorld = true;

        /** @hidden */
        public constructor(viewer: WebViewer, noteTextManager: Markup.Note.NoteTextManager) {
            super(viewer);
            this._noteTextManager = noteTextManager;
        }

        /** Sets the [[PickConfig]] that will be passed to [[View.pickFromPoint]]. */
        public setPickConfig(config: PickConfig): void {
            this._pickConfig = config.copy();
        }

        /** Returns the [[PickConfig]] that will be passed to [[View.pickFromPoint]]. */
        public getPickConfig(): PickConfig {
            return this._pickConfig.copy();
        }

        /**
         * Gets the mask used for forcing effective scene visibility during selection.
         * @deprecated Use [[getPickConfig]] instead.
         */
        public getForceEffectiveSceneVisibilityMask(): SelectionMask {
            return this._forceEffectiveSceneVisibilityMask !== null
                ? this._forceEffectiveSceneVisibilityMask
                : this._pickConfig.forceEffectiveSceneVisibilityMask;
        }

        /**
         * Sets the mask used for forcing effective scene visibility during
         * selection.
         *
         * This setting overrides the value passed to [[setPickConfig]]. Passing
         * `null` causes the value passed to [[setPickConfig]] to be used.
         *
         * @deprecated Use [[setPickConfig]] instead.
         */
        public setForceEffectiveSceneVisibilityMask(mask: SelectionMask | null): void {
            this._forceEffectiveSceneVisibilityMask = mask;
        }

        /**
         * Gets the button used for selection.
         * @returns Button
         */
        public getSelectionButton(): Button {
            return this._selectionButton;
        }

        /**
         * Sets the button used for selection
         * @param button
         */
        public setSelectionButton(button: Button): void {
            this._selectionButton = button;
        }

        /** @hidden */
        public onKeyUp(event: Event.KeyInputEvent): void {
            if (event.getKeyCode() === KeyCode.Escape) {
                this._viewer.selectionManager.clear();
            }
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            if (this.isActive()) {
                const pointDistance = Point2.subtract(this._ptFirst, this._ptCurrent).length();
                if (
                    pointDistance < 5 &&
                    (event.getButton() === this._selectionButton || this._primaryTouchId !== null)
                ) {
                    const view = this._viewer.view;

                    let config = this._pickConfig;
                    if (this._forceEffectiveSceneVisibilityMask !== null) {
                        config = config.copy();
                        config.forceEffectiveSceneVisibilityMask = this._forceEffectiveSceneVisibilityMask;
                    }

                    const p = view.pickFromPoint(this._ptCurrent, config).then((selection) => {
                        const cuttingManager = this._viewer.cuttingManager;
                        const cuttingSelected =
                            cuttingManager.getCuttingSectionFromNodeId(selection.getNodeId()) !==
                            null;
                        const notePinSelected = this._noteTextManager.selectPin(selection);

                        const pickedMarkup = this._viewer.markupManager.pickMarkupItem(
                            this._ptCurrent,
                        );
                        if (pickedMarkup instanceof Markup.Redline.RedlineText) {
                            this._viewer.markupManager.selectMarkup(pickedMarkup);
                        }

                        if (!notePinSelected && !cuttingSelected && pickedMarkup === null) {
                            if (selection.isNodeSelection()) {
                                this._processSelectionClick(event, selection);
                            } else if (!this._isDoubleClick) {
                                this._viewer.selectionManager.clear();
                            }
                        }
                    });
                    p as Internal.UnusedPromise; // XXX: Throwing away promise.
                }
            }

            super.onMouseUp(event);
        }

        /** @hidden */
        public async onDoubleClick(): Promise<void> {
            if (this._doubleClickFitWorld) {
                return this._viewer.view.fitWorld();
            }
        }

        /**
         * When enabled, a double click will fit the view to the model bounding box.
         * @param doubleClickFitWorld
         */
        public setDoubleClickFitWorldEnabled(doubleClickFitWorld: boolean) {
            this._doubleClickFitWorld = doubleClickFitWorld;
        }

        // helper function to get the parent selection item if the part is already selected
        private _getSelectionOrParentIfSelected(
            selection: Selection.NodeSelectionItem,
        ): Selection.NodeSelectionItem {
            const selectionManager = this._viewer.selectionManager;
            if (!selectionManager.getSelectParentIfSelected()) {
                // If we're not propagating selection to parents just skip this whole thing
                return selection;
            }

            const model = this._viewer.model;
            const nodeId = selection.getNodeId();

            if (!model.isNodeLoaded(nodeId)) {
                return selection;
            }

            // If the selection item is PMI, don't check for a parent
            const nodeType: NodeType = model.getNodeType(nodeId);
            if (nodeType === NodeType.PmiBody) {
                return selection;
            }

            const parentSelectionItem = selectionManager.containsParent(selection);
            if (parentSelectionItem !== null) {
                // if the parent is already selected, select the parent of the parent
                const out = Selection.SelectionItem.create(
                    model.getNodeParent(parentSelectionItem.getNodeId()),
                );
                return out.isNodeSelection() ? out : selection;
            } else if (selectionManager.contains(selection)) {
                // if the item is already selected, select it's parent
                const out = Selection.SelectionItem.create(model.getNodeParent(nodeId));
                return out.isNodeSelection() ? out : selection;
            } else {
                // if neither the selected part or it's parent is selected, select the part
                return selection;
            }
        }

        private _processSelectionClick(
            event: Event.MouseInputEvent,
            selection: Selection.NodeSelectionItem,
        ): void {
            // don't add overlay geometry into the selection set
            const overlayIndex = selection.overlayIndex();
            if (overlayIndex !== 0 && overlayIndex !== null) {
                return;
            }

            const selectionManager = this._viewer.selectionManager;

            if (event.controlDown() || event.commandDown()) {
                selectionManager.toggle(selection);
            } else {
                const item = this._getSelectionOrParentIfSelected(selection);
                selectionManager.set(item);
            }
        }
    }
}
