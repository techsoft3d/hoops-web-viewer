/// <reference path="ViewTree.ts"/>
/// <reference path="../../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui {
    export class SheetsTree extends ViewTree {
        private _currentSheetId: HtmlId | null = null;
        private readonly _3dSheetId: HtmlId = `${this._internalId}${ViewTree.separator}3D`;

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
                sheetActivated: (sheetId: SheetId) => {
                    this._onSheetActivated(sheetId);
                },
                sheetDeactivated: () => {
                    this._onSheetDeactivated();
                },
            });

            this._tree.registerCallback("selectItem", async (id: HtmlId) => {
                await this._onTreeSelectItem(id);
            });
        }

        private _setCurrentSheetId(htmlId: HtmlId): void {
            const $currentSheetNode = $(`#${this._currentSheetId}`);
            if ($currentSheetNode !== null) {
                $currentSheetNode.removeClass("selected-sheet");
            }

            const $sheetNode = $(`#${htmlId}`);
            if ($sheetNode !== null) {
                $sheetNode.addClass("selected-sheet");
            }
            this._currentSheetId = htmlId;
        }

        private _onNewModel(): void {
            this._tree.clear();

            if (this._viewer.model.isDrawing()) {
                const model = this._viewer.model;
                const sheetNodeIds = this._viewer.sheetManager.getSheetIds();

                for (const sheetNodeId of sheetNodeIds) {
                    const name = model.getNodeName(sheetNodeId);
                    const sheetElemId = this._sheetTreeId(sheetNodeId);
                    this._tree.appendTopLevelElement(name, sheetElemId, "sheet", false);
                }

                if (this._viewer.sheetManager.get3DNodes().length > 0) {
                    this._tree.appendTopLevelElement(
                        "3D Model",
                        this._3dSheetId,
                        "sheet",
                        false,
                        false,
                        false,
                    );
                    this._currentSheetId = this._3dSheetId;
                }

                this.showTab();
            } else {
                // hide sheets tab if the model is not a drawing
                this.hideTab();
            }
        }

        private _onSheetActivated(sheetId: SheetId): void {
            this._setCurrentSheetId(this._sheetTreeId(sheetId));
        }

        private _onSheetDeactivated(): void {
            this._setCurrentSheetId(this._3dSheetId);
        }

        private async _onTreeSelectItem(htmlId: HtmlId): Promise<void> {
            if (htmlId === this._3dSheetId) {
                return this._viewer.sheetManager.deactivateSheets();
            } else {
                const idParts = this._splitHtmlId(htmlId);
                const id = parseInt(idParts[1], 10);

                if (this._currentSheetId === this._3dSheetId) {
                    this._viewer.model.setViewAxes(new Point3(0, 0, 1), new Point3(0, 1, 0));
                    await this._viewer.setViewOrientation(ViewOrientation.Front, 0);
                }

                return this._viewer.sheetManager.setActiveSheetId(id);
            }
        }

        private _sheetTreeId(sheetId: SheetId): HtmlId {
            return `${this._internalId}${ViewTree.separator}${sheetId}`;
        }
    }
}
