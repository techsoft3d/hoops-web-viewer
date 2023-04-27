/// <reference path="../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui.Context {
    export class ContextMenuItem {
        public action: () => Promise<void>;
        public element: HTMLDivElement;

        constructor(action: () => Promise<void>, element: HTMLDivElement) {
            this.action = action;
            this.element = element;
        }

        public setEnabled(enabled: boolean): void {
            if (enabled) $(this.element).removeClass("disabled");
            else $(this.element).addClass("disabled");
        }

        public setText(text: string): void {
            this.element.innerHTML = text;
        }

        public show(): void {
            $(this.element).show();
        }

        public hide(): void {
            $(this.element).hide();
        }
    }

    export interface ContextItemMap {
        reset: ContextMenuItem;
        visibility: ContextMenuItem;
        isolate: ContextMenuItem;
        zoom: ContextMenuItem;
        transparent: ContextMenuItem;
        handles: ContextMenuItem;
        showall: ContextMenuItem;
        setColor: ContextMenuItem;
        modifyColor: ContextMenuItem;

        request?: ContextMenuItem;
        meshlevel0?: ContextMenuItem;
        meshlevel1?: ContextMenuItem;
        meshlevel2?: ContextMenuItem;
    }

    export class ContextMenu {
        protected readonly _viewer: WebViewer;
        protected readonly _isolateZoomHelper: IsolateZoomHelper;
        private readonly _containerId: HtmlId;
        private readonly _menuElement: HTMLDivElement;
        private readonly _contextLayer: HTMLDivElement;
        private readonly _colorPicker: ColorPicker;

        private _contextItemMap!: ContextItemMap;

        private _activeItemId: NodeId | null = null;
        private _activeLayerName: string | null = null;
        private _activeType: GenericType | null = null;
        private _separatorCount: number = 0;

        protected _position: Point3 | null = null;
        protected _modifiers = KeyModifiers.None;

        constructor(
            menuClass: string,
            containerId: HtmlId,
            viewer: WebViewer,
            isolateZoomHelper: IsolateZoomHelper,
            colorPicker: ColorPicker,
        ) {
            this._viewer = viewer;
            this._containerId = containerId;
            this._isolateZoomHelper = isolateZoomHelper;
            this._colorPicker = colorPicker;

            this._menuElement = this._createMenuElement(menuClass);
            this._contextLayer = this._createContextLayer();

            this._initElements();

            this._viewer.setCallbacks({
                firstModelLoaded: () => {
                    this._onNewModel();
                },
                modelSwitched: () => {
                    this._onNewModel();
                },
            });
        }

        public _getContextItemMap(): ContextItemMap {
            return this._contextItemMap;
        }

        private _onNewModel(): void {
            if (this._viewer.sheetManager.isDrawingSheetActive()) {
                this._contextItemMap.reset.hide();

                if (this._contextItemMap.meshlevel0 !== undefined)
                    this._contextItemMap.meshlevel0.hide();

                if (this._contextItemMap.meshlevel1 !== undefined)
                    this._contextItemMap.meshlevel1.hide();

                if (this._contextItemMap.meshlevel2 !== undefined)
                    this._contextItemMap.meshlevel2.hide();

                $(".contextmenu-separator-3").hide();
            }
        }

        private _isMenuItemEnabled(): boolean {
            if (
                this._activeLayerName !== null ||
                this._activeType !== null ||
                (this._activeItemId !== null &&
                    !this._viewer.noteTextManager.checkPinInstance(this._activeItemId))
            ) {
                return true;
            }

            const axisOverlay = 1;

            const selectionItems = this._viewer.selectionManager.getResults();

            for (const item of selectionItems) {
                if (item.overlayIndex() !== axisOverlay) {
                    return true;
                }
            }

            return false;
        }

        private _isMenuItemVisible(): boolean {
            const activeItemVisible = this._isItemVisible(this._activeItemId);
            const activeLayerVisible = this._isLayerVisibile(this._activeLayerName);
            const activeTypeVisibile = this._isTypeVisible(this._activeType);

            return activeItemVisible || activeLayerVisible || activeTypeVisibile;
        }

        private async _isColorSet(contextItemIds: NodeId[]): Promise<boolean> {
            const activeColor = this._colorPicker.getColor();

            let colorSet = true;

            for (let i = 0; i < contextItemIds.length; ++i) {
                const colorMap = await this._viewer.model.getNodeColorMap(
                    contextItemIds[i],
                    ElementType.Faces,
                );
                if (colorMap.size === 0) {
                    return false;
                } else {
                    colorMap.forEach((color) => {
                        if (!color.equals(activeColor)) {
                            colorSet = false;
                        }
                    });
                }
            }

            return colorSet;
        }

        private async _updateMenuItems(): Promise<void> {
            const contextItemIds = this.getContextItemIds(true, true, false);

            const menuItemEnabled = this._isMenuItemEnabled();
            const menuItemVisible = this._isMenuItemVisible();

            this._contextItemMap.visibility.setText(menuItemVisible ? "Hide" : "Show");
            this._contextItemMap.visibility.setEnabled(menuItemEnabled);
            this._contextItemMap.isolate.setEnabled(menuItemEnabled);
            this._contextItemMap.zoom.setEnabled(menuItemEnabled);
            this._contextItemMap.transparent.setEnabled(menuItemEnabled);

            this._contextItemMap.setColor.setText(
                `${(await this._isColorSet(contextItemIds)) ? "Uns" : "S"}et Color`,
            );

            const handleOperator = this._viewer.operatorManager.getOperator(OperatorId.Handle);
            if (handleOperator && handleOperator.isEnabled && menuItemEnabled) {
                const enableHandles = contextItemIds.length > 0 && handleOperator.isEnabled();
                this._contextItemMap.handles.setEnabled(enableHandles);
            } else {
                this._contextItemMap.handles.setEnabled(false);
            }

            if (this._contextItemMap.meshlevel0 !== undefined) {
                this._contextItemMap.meshlevel0.setEnabled(menuItemEnabled);
            }
            if (this._contextItemMap.meshlevel1 !== undefined) {
                this._contextItemMap.meshlevel1.setEnabled(menuItemEnabled);
            }
            if (this._contextItemMap.meshlevel2 !== undefined) {
                this._contextItemMap.meshlevel2.setEnabled(menuItemEnabled);
            }
        }

        public async setActiveLayerName(layerName: LayerName): Promise<void> {
            this._activeLayerName = LayersTree.getLayerName(layerName);
            await this._updateMenuItems();
        }

        public async setActiveType(genericType: GenericType): Promise<void> {
            this._activeType = genericType;
            await this._updateMenuItems();
        }

        public async setActiveItemId(activeItemId: NodeId | null): Promise<void> {
            this._activeItemId = activeItemId;
            await this._updateMenuItems();
        }

        public showElements(position: Point2): void {
            this._viewer.setContextMenuStatus(true);

            const canvasSize = this._viewer.view.getCanvasSize();

            const menuElement = $(this._menuElement);

            const menuWidth = menuElement.outerWidth();
            const menuHeight = menuElement.outerHeight();

            //make the context menu smaller if it is taller than the screen
            if (menuHeight !== undefined && menuWidth !== undefined) {
                if (menuHeight > canvasSize.y) {
                    menuElement.addClass("small");
                }

                let positionY = position.y;
                let positionX = position.x;

                // check for overflow y
                if (positionY + menuHeight > canvasSize.y) {
                    positionY = canvasSize.y - menuHeight - 1;
                }

                //check for overflow x
                if (positionX + menuWidth > canvasSize.x) {
                    positionX = canvasSize.x - menuWidth - 1;
                }

                $(this._menuElement).css({
                    left: `${positionX}px`,
                    top: `${positionY}px`,
                    display: "block",
                });
            }

            $(this._menuElement).show();
            $(this._contextLayer).show();
        }

        protected _onContextLayerClick(event: JQuery.MouseDownEvent): void {
            if (event.button === 0) this.hide();
        }

        public hide(): void {
            this._viewer.setContextMenuStatus(false);

            this._activeItemId = null;
            this._activeLayerName = null;
            this._activeType = null;

            $(this._menuElement).hide();
            $(this._contextLayer).hide();

            $(this._menuElement).removeClass("small");
        }

        public async action(action: keyof ContextItemMap): Promise<void> {
            const contextMenuItem = this._contextItemMap[action];
            if (contextMenuItem !== undefined) {
                await contextMenuItem.action();
            }
        }

        private _doMenuClick(event: JQuery.ClickEvent): void {
            const $target = $(event.target);

            if ($target.hasClass("disabled")) return;

            const itemId = $target.attr("id");
            if (itemId !== undefined) {
                this.action(itemId as keyof ContextItemMap) as Unreferenced;
            }

            this.hide();
        }

        private _createMenuElement(menuClass: string): HTMLDivElement {
            const menuElement = document.createElement("div");

            menuElement.classList.add("ui-contextmenu");
            menuElement.classList.add(menuClass);
            menuElement.style.position = "absolute";
            menuElement.style.zIndex = "6";
            menuElement.style.display = "none";

            menuElement.oncontextmenu = () => {
                return false;
            };

            menuElement.ontouchmove = (event) => {
                event.preventDefault();
            };

            $(menuElement).on("click", ".ui-contextmenu-item", (event) => {
                this._doMenuClick(event);
            });

            return menuElement;
        }

        private _createContextLayer(): HTMLDivElement {
            const contextLayer = document.createElement("div");

            contextLayer.style.position = "relative";
            contextLayer.style.width = "100%";
            contextLayer.style.height = "100%";
            contextLayer.style.backgroundColor = "transparent";
            contextLayer.style.zIndex = "5";
            contextLayer.style.display = "none";

            contextLayer.oncontextmenu = () => {
                return false;
            };

            contextLayer.ontouchmove = (event) => {
                event.preventDefault();
            };

            $(contextLayer).on("mousedown", (event) => {
                this._onContextLayerClick(event);
            });

            return contextLayer;
        }

        private _initElements(): void {
            this._createDefaultMenuItems();

            const container = document.getElementById(this._containerId);
            if (container !== null) {
                container.appendChild(this._menuElement);
                container.appendChild(this._contextLayer);
            }
        }
        private _isMenuItemExecutable(): boolean {
            return (
                this._activeItemId !== null ||
                this._activeLayerName !== null ||
                this._activeType !== null ||
                this._viewer.selectionManager.size() > 0
            );
        }

        private _createDefaultMenuItems(): void {
            const model = this._viewer.model;
            const operatorManager = this._viewer.operatorManager;

            this._contextItemMap = ({} as any) as ContextItemMap;

            const isAllIfcSpace = (nodeIds: NodeId[]) => {
                return nodeIds.every((nodeId) => {
                    return model.hasEffectiveGenericType(nodeId, StaticGenericType.IfcSpace);
                });
            };

            const isolateFunc = async () => {
                if (this._isMenuItemExecutable()) {
                    const nodeIds = this.getContextItemIds(true, true);

                    await this._isolateZoomHelper.isolateNodes(
                        nodeIds,
                        isAllIfcSpace(nodeIds) ? false : null,
                    );
                }
            };

            const zoomFunc = async () => {
                if (this._isMenuItemExecutable()) {
                    await this._isolateZoomHelper.fitNodes(this.getContextItemIds(true, true));
                }
            };

            const visibilityFunc = async () => {
                if (this._isMenuItemExecutable()) {
                    const visible = !this._isMenuItemVisible();
                    const nodeIds = this.getContextItemIds(true, true);
                    await model.setNodesVisibility(
                        nodeIds,
                        visible,
                        isAllIfcSpace(nodeIds) ? false : null,
                    );
                }
            };

            const transparentFunc = async () => {
                if (this._isMenuItemExecutable()) {
                    const contextItemIds = this.getContextItemIds(true, true);
                    const opacityOfFirstItem = (
                        await model.getNodesOpacity([contextItemIds[0]])
                    )[0];

                    if (opacityOfFirstItem === null || opacityOfFirstItem === 1) {
                        model.setNodesOpacity(contextItemIds, 0.5);
                    } else {
                        model.resetNodesOpacity(contextItemIds);
                    }
                }
            };

            const handlesFunc = async () => {
                if (this._isMenuItemExecutable()) {
                    const handleOperator = operatorManager.getOperator(OperatorId.Handle);
                    const contextItemIds = this.getContextItemIds(true, true, false);
                    if (contextItemIds.length > 0) {
                        await handleOperator.addHandles(
                            contextItemIds,
                            this._modifiers === KeyModifiers.Shift ? null : this._position,
                        );
                    }
                }
            };

            const resetFunc = async () => {
                const handleOperator = operatorManager.getOperator(OperatorId.Handle);
                await handleOperator.removeHandles();
                await model.reset();
                model.unsetNodesFaceColor([model.getAbsoluteRootNode()]);
                // Force restore correct pmi color since unsetNodesFaceColor reset pmi color as well
                model.setPmiColorOverride(model.getPmiColorOverride());
            };

            const meshLevelFunc = (meshLevel: number) => {
                if (this._isMenuItemExecutable()) {
                    model.setMeshLevel(this.getContextItemIds(true, true), meshLevel);
                }
            };

            const showAllFunc = async () => {
                await this._isolateZoomHelper.showAll();
            };

            const setColorFunc = async () => {
                const contextItemIds = this.getContextItemIds(true, true, false);
                if (contextItemIds.length > 0) {
                    if (await this._isColorSet(contextItemIds)) {
                        this._viewer.model.unsetNodesFaceColor(contextItemIds);
                    } else {
                        const color = this._colorPicker.getColor().copy();
                        this._viewer.model.setNodesFaceColor(contextItemIds, color);
                    }
                }
            };

            const modifyColorFunc = async () => {
                this._colorPicker.show();
            };

            this.appendItem("isolate", "Isolate", isolateFunc);
            this.appendItem("zoom", "Zoom", zoomFunc);
            this.appendItem("visibility", "Hide", visibilityFunc);
            this.appendSeparator();
            this.appendItem("transparent", "Transparent", transparentFunc);
            this.appendSeparator();
            this.appendItem("setColor", "Set Color", setColorFunc);
            this.appendItem("modifyColor", "Modify Color", modifyColorFunc);
            this.appendSeparator();
            this.appendItem("handles", "Show Handles", handlesFunc);
            this.appendItem("reset", "Reset Model", resetFunc);

            // Mesh level options should only be shown if the model is streaming from the server
            if (this._viewer.getCreationParameters().hasOwnProperty("model")) {
                this.appendSeparator();

                for (let i = 0; i < 3; ++i) {
                    this.appendItem(
                        `meshlevel${i}` as keyof ContextItemMap,
                        `Mesh Level ${i}`,
                        async () => {
                            meshLevelFunc(i);
                        },
                    );
                }
            }

            this.appendSeparator();
            this.appendItem("showall", "Show all", showAllFunc);
        }

        public getContextItemIds(
            includeSelected: boolean,
            includeClicked: boolean,
            includeRoot: boolean = true,
        ): NodeId[] {
            const selectionManager = this._viewer.selectionManager;

            const model = this._viewer.model;
            const rootId = model.getAbsoluteRootNode();
            const itemIds: NodeId[] = [];

            // selected items
            if (includeSelected) {
                const selectedItems = selectionManager.getResults();
                for (const item of selectedItems) {
                    const id = item.getNodeId();
                    if (
                        model.isNodeLoaded(id) &&
                        (includeRoot || (!includeRoot && id !== rootId))
                    ) {
                        itemIds.push(id);
                    }
                }
            }

            if (this._activeLayerName !== null) {
                const layerIds = this._viewer.model.getLayerIdsFromName(this._activeLayerName);
                if (layerIds !== null) {
                    for (const layerId of layerIds) {
                        const nodeIds = this._viewer.model.getNodesFromLayer(layerId);
                        if (nodeIds !== null) {
                            for (const nodeId of nodeIds) {
                                const selectionItem = Selection.SelectionItem.create(nodeId);
                                if (!selectionManager.contains(selectionItem)) {
                                    itemIds.push(nodeId);
                                }
                            }
                        }
                    }
                }
            }

            if (this._activeType !== null) {
                const nodeIds = this._viewer.model.getNodesByGenericType(this._activeType);
                if (nodeIds !== null) {
                    nodeIds.forEach((nodeId) => {
                        const selectionItem = Selection.SelectionItem.create(nodeId);
                        if (!selectionManager.contains(selectionItem)) {
                            itemIds.push(nodeId);
                        }
                    });
                }
            }

            if (this._activeItemId !== null) {
                const selectionItem = Selection.SelectionItem.create(this._activeItemId);
                const containsParent = selectionManager.containsParent(selectionItem) !== null;
                const containsItem = itemIds.indexOf(this._activeItemId) !== -1;

                // also include items if they are clicked on but not selected (and not a child of a parent that is selected)
                if (
                    includeClicked &&
                    (includeRoot ||
                        (!includeRoot &&
                            this._activeItemId !== rootId &&
                            (itemIds.length === 0 || (!containsItem && !containsParent))))
                ) {
                    itemIds.push(this._activeItemId);
                }
            }

            return itemIds;
        }

        public appendItem(
            itemId: keyof ContextItemMap,
            label: string,
            action: () => Promise<void>,
        ): ContextMenuItem {
            const item = document.createElement("div");
            item.classList.add("ui-contextmenu-item");
            item.innerHTML = label;
            item.id = itemId;
            this._menuElement.appendChild(item);

            const contextMenuItem = new ContextMenuItem(action, item);
            this._contextItemMap[itemId] = contextMenuItem;

            return contextMenuItem;
        }

        public appendSeparator(): void {
            const item = document.createElement("div");
            item.classList.add(`contextmenu-separator-${this._separatorCount++}`);
            item.classList.add("ui-contextmenu-separator");
            item.style.width = "100%";
            item.style.height = "1px";
            this._menuElement.appendChild(item);
        }

        private _isItemVisible(nodeId: NodeId | null): boolean {
            if (nodeId === null) {
                const selectionItems = this._viewer.selectionManager.getResults();
                if (selectionItems.length === 0) {
                    return false;
                }
                nodeId = selectionItems[0].getNodeId();
            }

            return this._viewer.model.getNodeVisibility(nodeId);
        }

        private _isLayerVisibile(layerName: LayerName | null): boolean {
            if (layerName !== null) {
                const layerIds = this._viewer.model.getLayerIdsFromName(layerName);
                if (layerIds !== null) {
                    for (const layerId of layerIds) {
                        const nodeIds = this._viewer.model.getNodesFromLayer(layerId);
                        if (nodeIds !== null) {
                            for (const nodeId of nodeIds) {
                                if (this._viewer.model.getNodeVisibility(nodeId)) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
            return false;
        }

        private _isTypeVisible(genericType: GenericType | null): boolean {
            let typeVisible = false;
            if (genericType !== null) {
                const nodeIds = this._viewer.model.getNodesByGenericType(genericType);
                if (nodeIds !== null) {
                    nodeIds.forEach((nodeId) => {
                        typeVisible = typeVisible || this._viewer.model.getNodeVisibility(nodeId);
                    });
                }
            }
            return typeVisible;
        }
    }
}
