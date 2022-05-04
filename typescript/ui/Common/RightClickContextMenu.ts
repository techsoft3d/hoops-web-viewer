namespace Communicator.Ui {
    export class RightClickContextMenu extends Context.ContextMenu {
        constructor(
            containerId: HtmlId,
            viewer: WebViewer,
            isolateZoomHelper: IsolateZoomHelper,
            colorPicker: ColorPicker,
        ) {
            super("rightclick", containerId, viewer, isolateZoomHelper, colorPicker);

            this._initEvents();
        }

        private _initEvents(): void {
            this._viewer.setCallbacks({
                contextMenu: async (position: Point2, modifiers: KeyModifiers) => {
                    this._modifiers = modifiers;
                    await this.doContext(position);
                },
            });
        }

        public async doContext(position: Point2): Promise<void> {
            const config = new PickConfig(SelectionMask.All);
            const selectionItem = await this._viewer.view.pickFromPoint(position, config);
            const axisOverlay = 1;

            let nodeType: NodeType | undefined;
            if (selectionItem.isNodeSelection()) {
                nodeType = this._viewer.model.getNodeType(selectionItem.getNodeId());
            }

            if (
                nodeType === undefined ||
                nodeType === NodeType.Pmi ||
                nodeType === NodeType.PmiBody ||
                selectionItem.overlayIndex() === axisOverlay
            ) {
                await this.setActiveItemId(null);
            } else {
                await this.setActiveItemId(selectionItem.getNodeId());
            }

            this._position = selectionItem.getPosition();
            this.showElements(position);
        }

        protected async _onContextLayerClick(event: JQuery.MouseDownEvent): Promise<void> {
            if (event.button === 2) await this.doContext(new Point2(event.pageX, event.pageY));
            else super._onContextLayerClick(event);
        }
    }
}
