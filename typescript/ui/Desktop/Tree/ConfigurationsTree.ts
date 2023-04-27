/// <reference path="../../js/hoops_web_viewer.d.ts"/>
/// <reference path="ViewTree.ts"/>

namespace Communicator.Ui {
    export class ConfigurationsTree extends ViewTree {
        constructor(viewer: WebViewer, elementId: HtmlId, iScroll: IScroll | null) {
            super(viewer, elementId, iScroll);
            this._tree.setCreateVisibilityItems(false);
            this._initEvents();
        }

        private _initEvents(): void {
            this._viewer.setCallbacks({
                firstModelLoaded: async () => {
                    await this._onNewModel();
                },
                modelSwitched: async () => {
                    await this._modelSwitched();
                },
                configurationActivated: (id: NodeId) => {
                    this._tree.selectItem(this._configurationsId(id), false);
                },
            });

            this._tree.registerCallback("selectItem", async (id: HtmlId) => {
                await this._onTreeSelectItem(id);
            });
        }

        private _modelSwitched(): Promise<void> {
            return this._onNewModel();
        }

        private async _onNewModel(): Promise<void> {
            const model = this._viewer.model;

            if (await model.cadConfigurationsEnabled()) {
                if (this._createConfigurationNodes()) {
                    this.showTab();
                } else {
                    this.hideTab();
                }
            }
        }

        private _createConfigurationNodes(): boolean {
            const configurations = this._viewer.model.getCadConfigurations();
            const keys = Object.keys(configurations);

            if (keys.length > 0) {
                this._tree.appendTopLevelElement(
                    "Configurations",
                    this._internalId,
                    "configurations",
                    true,
                );

                for (const key of keys) {
                    const nodeId = parseInt(key, 10);
                    this._tree.addChild(
                        configurations[nodeId]!,
                        this._configurationsId(nodeId),
                        this._internalId,
                        "view",
                        false,
                        Desktop.Tree.Configurations,
                    );
                }

                this._tree.expandInitialNodes(this._internalId);
                return true;
            }
            return false;
        }

        private async _onTreeSelectItem(htmlId: HtmlId): Promise<void> {
            const idParts = this._splitHtmlId(htmlId);

            if (this._internalId === idParts[0]) {
                await this._viewer.operatorManager.getOperator(OperatorId.Handle).removeHandles();
                await this._viewer.model.activateCadConfiguration(parseInt(idParts[1], 10));
            }
        }

        private _configurationsId(nodeId: NodeId): HtmlId {
            return this._internalId + ViewTree.separator + nodeId;
        }
    }
}
