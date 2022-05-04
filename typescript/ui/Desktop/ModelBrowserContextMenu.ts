/// <reference path="../Common/ContextMenu.ts"/>

namespace Communicator.Ui.Desktop {
    export class ModelBrowserContextMenu extends Context.ContextMenu {
        private readonly _treeMap: Map<Tree, ViewTree | BCFTree>;

        constructor(
            containerId: HtmlId,
            viewer: WebViewer,
            treeMap: Map<Tree, ViewTree | BCFTree>,
            isolateZoomHelper: IsolateZoomHelper,
            colorPicker: ColorPicker,
        ) {
            super("modelbrowser", containerId, viewer, isolateZoomHelper, colorPicker);
            this._treeMap = treeMap;
            this._initEvents() as Unreferenced;
        }

        private async _initEvents(): Promise<void> {
            await this._registerContextMenuCallback(Tree.Model);
            await this._registerContextMenuCallback(Tree.Layers);
            await this._registerContextMenuCallback(Tree.Types);

            if (this._viewer.getStreamingMode() === StreamingMode.OnDemand) {
                const requestFunc = async () => {
                    await this._viewer.model.requestNodes(this.getContextItemIds(false, true));
                };

                this.appendSeparator();
                this.appendItem("request", "Request", requestFunc);
            }
        }

        private async _registerContextMenuCallback(tree: Tree): Promise<void> {
            const viewTree = this._treeMap.get(tree);
            if (viewTree !== undefined && viewTree instanceof ViewTree) {
                viewTree.registerCallback("context", async (htmlId: HtmlId, position: Point2) => {
                    await this._onTreeContext(htmlId, position);
                });
            }
        }

        private async _onTreeContext(htmlId: HtmlId, position: Point2): Promise<void> {
            const components = htmlId.split(ModelTree.separator);

            switch (components[0]) {
                case "layer":
                    await this.setActiveLayerName(htmlId);
                    break;
                case "types":
                    await this.setActiveType(components[1]);
                    break;
                case "typespart":
                case "layerpart":
                case "part":
                    const id = parseInt(components[1], 10);
                    await this.setActiveItemId(id);
                    break;
                default:
                    return;
            }

            this._position = null;
            this.showElements(position);
        }

        protected _onContextLayerClick(_event: JQuery.MouseDownEvent): void {
            this.hide();
        }
    }
}
