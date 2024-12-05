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
            await this._viewer.applyFilter(filterId);
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
