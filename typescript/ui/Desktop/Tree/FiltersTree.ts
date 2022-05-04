/// <reference path="ViewTree.ts"/>
/// <reference path="../../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui {
    export class FiltersTree extends ViewTree {
        constructor(viewer: WebViewer, elementId: HtmlId, iScroll: IScroll | null) {
            super(viewer, elementId, iScroll);
            this._tree.setCreateVisibilityItems(false);
            this._initEvents();
        }

        private _initEvents(): void {
            const onNewModel = () => {
                this._onNewModel();
            };

            this._viewer.setCallbacks({
                assemblyTreeReady: onNewModel,
                firstModelLoaded: onNewModel,
                modelSwitched: onNewModel,
                subtreeLoaded: onNewModel,
            });

            this._tree.registerCallback("selectItem", async (htmlId: HtmlId) => {
                await this._onTreeSelectItem(htmlId);
            });
        }

        private async _onTreeSelectItem(htmlId: HtmlId): Promise<void> {
            const thisElement = document.getElementById(htmlId);
            if (thisElement === null) {
                return;
            }

            const idParts = this._splitHtmlId(htmlId);
            if (idParts[0] === this._internalId) {
                await this._setFilter(parseInt(idParts[1], 10));
            }
        }

        private async _setFilter(filterId: FilterId): Promise<void> {
            const model = await this._viewer.model;
            const filteredNodes = model.getNodesFromFiltersId([filterId]);
            if (filteredNodes !== null) {
                const nodeIds: NodeId[] = [];
                filteredNodes.nodeIds.forEach((nodeId) => {
                    nodeIds.push(nodeId);
                });

                await this._viewer.pauseRendering();

                await model.reset();

                if (filteredNodes.isInclusive) {
                    await model.setNodesVisibility([model.getAbsoluteRootNode()], false);
                    await model.setNodesVisibility(nodeIds, true);
                } else {
                    await model.setNodesVisibility(nodeIds, false);
                }

                await this._viewer.resumeRendering();
            }
        }

        private _onNewModel(): void {
            this._tree.clear();

            const filters = this._viewer.model.getFilters();
            filters.forEach((filterName, filterId) => {
                this._tree.appendTopLevelElement(
                    filterName,
                    this.getFilterId(filterId),
                    "assembly",
                    false,
                );
            });

            if (filters.size > 0) {
                this.showTab();
            } else {
                this.hideTab();
            }
        }

        public getFilterId(id: NodeId): HtmlId {
            return this._internalId + ViewTree.separator + id;
        }
    }
}
