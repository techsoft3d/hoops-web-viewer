/// <reference path="../../js/hoops_web_viewer.d.ts"/>
/// <reference path="../../Common/CuttingPlane/Controller.ts"/>
/// <reference path="ViewTree.ts"/>

namespace Communicator.Ui {
    interface View {
        name: string;
        nodeId: NodeId;
    }

    export class CadViewTree extends ViewTree {
        private readonly _annotationViewsString: string = "annotationViews";
        private readonly _annotationViewsLabel: string = "Annotation Views";
        private readonly _combineStateViewsString: string = "combineStateViews";
        private readonly _combineStateViewsLabel: string = "Combine State Views";
        private _viewFolderCreated: boolean = false;

        private _lastSelectedhtmlId: string | null = null;

        private _cadViewIds = new Set<NodeId>();

        private _cuttingController?: CuttingPlane.Controller;

        constructor(
            viewer: WebViewer,
            elementId: HtmlId,
            iScroll: IScroll | null,
            cuttingController?: CuttingPlane.Controller,
        ) {
            super(viewer, elementId, iScroll);

            this._tree.setCreateVisibilityItems(false);
            this._initEvents();
            this._cuttingController = cuttingController;
        }

        private _initEvents(): void {
            this._viewer.setCallbacks({
                firstModelLoaded: async (_modelRootIds: NodeId[], isHwf: boolean) => {
                    // Don't add CAD views on newModel if the model is an HWF because CAD views that are
                    // dynamically generated during the HWF parsing process trigger other callbacks that
                    // add them to the CadViewTree. Otherwise duplicate entries show in the Views Tab.
                    if (!isHwf) {
                        this._updateCadViews();
                    }
                },
                subtreeLoaded: () => {
                    this._updateCadViews();
                },
                configurationActivated: () => {
                    this._tree.clear();
                    this._cadViewIds.clear();
                    this._viewFolderCreated = false;
                    this._updateCadViews();
                },
                modelSwitched: () => {
                    this._modelSwitched();
                },
                sheetActivated: () => {
                    if (this._viewer.model.isDrawing()) {
                        // SCA : remove the hightlight of the selected view
                        if (this._lastSelectedhtmlId != null) {
                            const thisElement = document.getElementById(this._lastSelectedhtmlId);
                            if (thisElement !== null) {
                                thisElement.classList.remove("selected");
                            }
                        }
                        this.hideTab();
                    }
                },
                sheetDeactivated: () => {
                    if (this._viewer.model.isDrawing()) {
                        this.showTab();
                    }
                },
                cadViewCreated: (cadViewId: NodeId, cadViewName: string) => {
                    const newCadView = new Map<NodeId, string>();
                    newCadView.set(cadViewId, cadViewName);
                    this._addCadViews(newCadView);
                },
            });

            this._tree.registerCallback("selectItem", async (id: HtmlId) => {
                await this._onTreeSelectItem(id);
            });
        }

        private _modelSwitched(): void {
            this._tree.clear();
            this._cadViewIds.clear();
            this._viewFolderCreated = false;
            this._updateCadViews();
        }

        private _updateCadViews() {
            const cadViews = this._viewer.model.getCadViewMap();
            this._addCadViews(cadViews);
        }

        private _addCadViews(cadViews: Map<NodeId, string>): void {
            this._createCadViewNodes(cadViews);

            // remove tab if there is no cad views

            if (cadViews.size <= 0) {
                this.hideTab();
            } else {
                this.showTab();
            }

            this._tree.expandInitialNodes(this._internalId);
            this._tree.expandInitialNodes(this._internalId + this._annotationViewsString);
            this._tree.expandInitialNodes(this._internalId + this._combineStateViewsString);
        }

        private _allowView(viewNodeId: NodeId): boolean {
            const activeConfig = this._viewer.model.getActiveCadConfiguration();
            const nodeConfig = this._viewer.model.getCadViewConfiguration(viewNodeId);

            return activeConfig === null || nodeConfig === null || nodeConfig === activeConfig;
        }

        private _createCadViewNodes(cadViews: Map<NodeId, string>): void {
            if (cadViews.size === 0) {
                return;
            }

            // Top Level views element should only be created once
            if (!this._viewFolderCreated) {
                this._tree.appendTopLevelElement("Views", this._internalId, "viewfolder", true);
                this._viewFolderCreated = true;
            }

            const model = this._viewer.model;
            const enableShatteredModelUiViews =
                this._viewer.getCreationParameters().enableShatteredModelUiViews === true;

            const allowView = (nodeId: NodeId) => {
                return (
                    this._allowView(nodeId) &&
                    (enableShatteredModelUiViews || !model.isWithinExternalModel(nodeId))
                );
            };

            const regularViews: View[] = [];
            const annotationViews: View[] = [];
            const combineStateViews: View[] = [];

            cadViews.forEach((name: string, nodeId: NodeId) => {
                if (!this._cadViewIds.has(nodeId) && allowView(nodeId)) {
                    this._cadViewIds.add(nodeId);
                    if (model.isAnnotationView(nodeId)) {
                        annotationViews.push({ name, nodeId });
                    } else if (model.isCombineStateView(nodeId)) {
                        combineStateViews.push({ name, nodeId });
                    } else {
                        regularViews.push({ name, nodeId });
                    }
                }
            });

            // regular views
            regularViews.forEach((view: View) => {
                this._tree.addChild(
                    view.name,
                    this._cadViewId(view.nodeId),
                    this._internalId,
                    "view",
                    false,
                    Desktop.Tree.CadView,
                );
            });

            // Annotation views
            if (annotationViews.length > 0) {
                this._tree.addChild(
                    this._annotationViewsLabel,
                    this._internalId + this._annotationViewsString,
                    this._internalId,
                    "viewfolder",
                    true,
                    Desktop.Tree.CadView,
                    true,
                    false,
                    this._annotationViewsLabel,
                );

                annotationViews.forEach((view: View) => {
                    const parsedValue = view.name.split("# Annotation View")[0];
                    this._tree.addChild(
                        parsedValue,
                        this._cadViewId(view.nodeId),
                        this._internalId + this._annotationViewsString,
                        "view",
                        false,
                        Desktop.Tree.CadView,
                    );
                });
            }

            // Combine state views
            if (combineStateViews.length > 0) {
                this._tree.addChild(
                    this._combineStateViewsLabel,
                    this._internalId + this._combineStateViewsString,
                    this._internalId,
                    "viewfolder",
                    true,
                    Desktop.Tree.CadView,
                    true,
                    false,
                    this._combineStateViewsLabel,
                );

                combineStateViews.forEach((view: View) => {
                    this._tree.addChild(
                        view.name,
                        this._cadViewId(view.nodeId),
                        this._internalId + this._combineStateViewsString,
                        "view",
                        false,
                        Desktop.Tree.CadView,
                    );
                });
            }
        }

        private async _onTreeSelectItem(htmlId: HtmlId): Promise<void> {
            const idParts = this._splitHtmlId(htmlId);

            if (idParts[0] === this._internalId) {
                const handleOperator = this._viewer.operatorManager.getOperator(OperatorId.Handle);
                await handleOperator.removeHandles();
                if (this._cuttingController) {
                    await this._cuttingController.pause();
                }
                await this._viewer.model.activateCadView(parseInt(idParts[1], 10));
                if (this._cuttingController) {
                    setTimeout(() => this._cuttingController!.resume(), 300);
                }
            }

            // toggle recursive selection based on what is clicked
            const thisElement = document.getElementById(htmlId);
            if (thisElement !== null) {
                if (
                    thisElement.tagName === "LI" &&
                    htmlId !== this._internalId &&
                    htmlId !== this._internalId + this._annotationViewsString &&
                    htmlId !== this._internalId + this._combineStateViewsString
                ) {
                    thisElement.classList.add("selected");
                    this._lastSelectedhtmlId = htmlId;
                } else {
                    thisElement.classList.remove("selected");
                }
            }
        }

        private _cadViewId(id: NodeId): HtmlId {
            return this._internalId + ViewTree.separator + id;
        }
    }

    /** @deprecated Use [[CadViewTree]] instead. */
    export type CADViewTree = CadViewTree;
    /** @deprecated Use [[CadViewTree]] instead. */
    export const CADViewTree = CadViewTree;
}
