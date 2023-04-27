/// <reference path="../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui.Desktop {
    export type AnyViewTree =
        | ModelTree
        | CadViewTree
        | SheetsTree
        | ConfigurationsTree
        | LayersTree
        | FiltersTree
        | TypesTree
        | BCFTree
        | RelationshipsTree;
    export enum Tree {
        Model,
        CadView,
        Sheets,
        Configurations,
        Layers,
        Filters,
        Types,
        BCF,
        Relationships,
    }

    export class ModelBrowser {
        private _elementId: HtmlId;
        private _containerId: HtmlId;
        private _viewer: WebViewer;
        private _isolateZoomHelper: IsolateZoomHelper;
        private _colorPicker: ColorPicker;

        private _contextMenu: ModelBrowserContextMenu;
        private _canvasSize: Point2;

        private _treeMap = new Map<Tree, AnyViewTree>();
        private _scrollTreeMap = new Map<Tree, IScroll>();
        private _elementIdMap = new Map<Tree, HtmlId>();

        private _relationshipTree!: RelationshipsTree;

        private _header: HTMLDivElement;

        // assigned in _createHeader()
        private _content!: HTMLDivElement;
        private _minimizeButton!: HTMLDivElement;
        private _modelBrowserTabs!: HTMLDivElement;

        // assigned in _createPropertyWindow()
        private _propertyWindow!: HTMLDivElement;
        private _treePropertyContainer!: HTMLDivElement;

        private _relationshipsWindow!: HTMLDivElement;

        private _browserWindow: HTMLDivElement;
        private _browserWindowMargin = 3;

        private _scrollRefreshTimer = new Util.Timer();
        private _scrollRefreshTimestamp = 0;
        private _scrollRefreshInterval = 300;

        private _minimized: boolean = true;

        private _modelHasRelationships: boolean = false;

        constructor(
            elementId: HtmlId,
            containerId: HtmlId,
            viewer: WebViewer,
            isolateZoomHelper: IsolateZoomHelper,
            colorPicker: ColorPicker,
            cuttingController: CuttingPlane.Controller,
        ) {
            this._elementId = elementId;
            this._containerId = containerId;
            this._viewer = viewer;
            this._isolateZoomHelper = isolateZoomHelper;
            this._colorPicker = colorPicker;
            this._canvasSize = this._viewer.view.getCanvasSize();

            this._header = this._createHeader();
            this._browserWindow = this._createBrowserWindow();

            // property window html
            this._createPropertyWindow();

            $(this._browserWindow).resizable({
                resize: (_event, ui: JQueryUI.ResizableUIParams) => {
                    this.onResize(ui.size.height);
                },
                minWidth: 35,
                minHeight: 37,
                handles: "e",
            });

            this._elementIdMap.set(Tree.Model, "modelTree");
            this._elementIdMap.set(Tree.CadView, "cadViewTree");
            this._elementIdMap.set(Tree.Sheets, "sheetsTree");
            this._elementIdMap.set(Tree.Configurations, "configurationsTree");
            this._elementIdMap.set(Tree.Layers, "layersTree");
            this._elementIdMap.set(Tree.Filters, "filtersTree");
            this._elementIdMap.set(Tree.Types, "typesTree");
            this._elementIdMap.set(Tree.BCF, "bcfTree");

            this._elementIdMap.forEach((elementId, treeType) => {
                this._addTree(elementId, treeType, cuttingController);
            });

            this._contextMenu = new ModelBrowserContextMenu(
                this._containerId,
                this._viewer,
                this._treeMap,
                this._isolateZoomHelper,
                this._colorPicker,
            );

            this._initEvents();

            this._minimizeModelBrowser(); // https://techsoft3d.atlassian.net/browse/COM-590
        }

        private _computeRelationshipTreeVisibility(modelRootIds: NodeId[]): void {
            for (const rootId of modelRootIds) {
                const hasRelationships = this._viewer.model
                    ._getModelStructure()
                    .hasRelationships(rootId);
                if (!this._modelHasRelationships && hasRelationships) {
                    this._modelHasRelationships = true;
                    this._updateRelationshipsTreeVisibility();
                    return;
                }
            }
        }

        private _initEvents(): void {
            const onModel = (modelRootIds: NodeId[]) => {
                this._showTree(Tree.Model);
                this._computeRelationshipTreeVisibility(modelRootIds);
            };

            const onModelSwitched = (_clearOnly: boolean, modelRootIds: NodeId[]) => {
                onModel(modelRootIds);
            };

            const onSubtreeLoaded = (modelRootIds: NodeId[]) => {
                this._computeRelationshipTreeVisibility(modelRootIds);
            };

            this._viewer.setCallbacks({
                modelStructureLoadBegin: () => {
                    this._onModelStructureLoadBegin();
                },
                modelStructureParseBegin: () => {
                    this._onModelStructureParsingBegin();
                },
                assemblyTreeReady: () => {
                    this._onAssemblyTreeReady();
                },
                firstModelLoaded: onModel,
                modelSwitched: onModelSwitched,
                frameDrawn: () => {
                    this._canvasSize = this._viewer.view.getCanvasSize();
                    this.onResize(this._canvasSize.y);
                },
                subtreeLoaded: onSubtreeLoaded,
            });

            this._registerScrollRefreshCallbacks();

            $("#contextMenuButton").on("click", (event) => {
                const position = new Point2(event.clientX!, event.clientY!);
                this._viewer.trigger("contextMenu", position, KeyModifiers.None);
            });
        }

        private _registerScrollRefreshCallbacks(): void {
            this._treeMap.forEach((tree) => {
                if (tree instanceof ViewTree) {
                    tree.registerCallback("expand", () => {
                        this._refreshBrowserScroll();
                    });

                    tree.registerCallback("collapse", () => {
                        this._refreshBrowserScroll();
                    });

                    tree.registerCallback("addChild", () => {
                        this._refreshBrowserScroll();
                    });
                }
            });

            this._relationshipTree.registerCallback("expand", () => {
                this._refreshBrowserScroll();
            });

            this._relationshipTree.registerCallback("collapse", () => {
                this._refreshBrowserScroll();
            });

            this._relationshipTree.registerCallback("addChild", () => {
                this._refreshBrowserScroll();
            });
        }

        private _refreshBrowserScroll(): void {
            const expectedTimestamp = ++this._scrollRefreshTimestamp;

            if (this._scrollRefreshTimer.isIdle(Util.TimerIdleType.BeforeAction)) {
                this._scrollRefreshTimer.set(this._scrollRefreshInterval, () => {
                    this._scrollTreeMap.forEach((iScroll) => {
                        iScroll.refresh();
                    });

                    if (expectedTimestamp !== this._scrollRefreshTimestamp) {
                        this._refreshBrowserScroll();
                    }
                });
            }
        }

        private _setPropertyWindowVisibility(visible: boolean): void {
            if (visible) {
                this._propertyWindow.classList.remove("hidden");
            } else {
                this._propertyWindow.classList.add("hidden");
            }
            this.onResize(this._viewer.view.getCanvasSize().y);
        }

        private _updateRelationshipsTreeVisibility() {
            this._setRelationshipsWindowVisibility(this._modelHasRelationships);
        }

        private _setRelationshipsWindowVisibility(visible: boolean): void {
            if (visible) {
                this._relationshipsWindow.classList.remove("hidden");
            } else {
                this._relationshipsWindow.classList.add("hidden");
            }
            this.onResize(this._viewer.view.getCanvasSize().y);
        }

        private _setTreeVisibility(tree: ViewTree | BCFTree, visibile: boolean): void {
            const treeElementId = tree.getElementId();
            const $treeScrollContainer = $(`#${treeElementId}ScrollContainer`);
            const $treeTab = $(`#${treeElementId}Tab`);

            if (visibile) {
                $treeScrollContainer.show();
                $treeTab.addClass("browser-tab-selected");

                if (tree instanceof BCFTree) {
                    this._setPropertyWindowVisibility(false);
                    this._setRelationshipsWindowVisibility(false);
                } else {
                    this._setPropertyWindowVisibility(true);
                    this._updateRelationshipsTreeVisibility();
                }
            } else {
                $treeScrollContainer.hide();
                if ($treeTab) {
                    $treeTab.removeClass("browser-tab-selected");
                }
            }
        }

        /** @hidden */
        public _showTree(activeTreeType: Tree): void {
            this._treeMap.forEach((viewTree, treeType) => {
                this._setTreeVisibility(viewTree, treeType === activeTreeType);
            });

            this._refreshBrowserScroll();
        }

        public _getContextMenu(): ModelBrowserContextMenu {
            return this._contextMenu;
        }

        public _addTree(
            elementId: HtmlId,
            treeType: Tree,
            cuttingController: CuttingPlane.Controller,
        ): void {
            const iScroll = this._initializeIScroll(elementId);
            this._scrollTreeMap.set(treeType, iScroll);

            let tree: AnyViewTree;

            if (treeType === Tree.Model) {
                tree = new ModelTree(this._viewer, elementId, iScroll);
            } else if (treeType === Tree.CadView) {
                tree = new CadViewTree(this._viewer, elementId, iScroll, cuttingController);
            } else if (treeType === Tree.Sheets) {
                tree = new SheetsTree(this._viewer, elementId, iScroll);
            } else if (treeType === Tree.Configurations) {
                tree = new ConfigurationsTree(this._viewer, elementId, iScroll);
            } else if (treeType === Tree.Layers) {
                tree = new LayersTree(this._viewer, elementId, iScroll);
            } else if (treeType === Tree.Filters) {
                tree = new FiltersTree(this._viewer, elementId, iScroll);
            } else if (treeType === Tree.Types) {
                tree = new TypesTree(this._viewer, elementId, iScroll);
            } else if (treeType === Tree.BCF) {
                tree = new BCFTree(this._viewer, elementId, iScroll);
            } else if (treeType === Tree.Relationships) {
                tree = new RelationshipsTree(this._viewer, elementId, iScroll);
            } else {
                Util.TypeAssertNever(treeType);
            }

            this._treeMap.set(treeType, tree!);
        }

        private _createBrowserWindow(): HTMLDivElement {
            const div = document.getElementById(this._elementId) as HTMLDivElement;
            $(div).on("touchmove", (event) => {
                if (event.originalEvent) event.originalEvent.preventDefault();
            });

            div.classList.add("ui-modelbrowser-window");
            div.classList.add("desktop-ui-window");
            div.classList.add("ui-modelbrowser-small");
            div.style.position = "absolute";
            const width = $(window).width();
            if (width !== undefined) {
                div.style.width = `${Math.max(width / 4, 400)}px`;
            }
            div.style.top = `${this._browserWindowMargin}px`;
            div.style.left = `${this._browserWindowMargin}px`;

            div.appendChild(this._header);

            return div;
        }

        private _createDiv(htmlId: HtmlId, classList: string[]): HTMLDivElement {
            const div = document.createElement("div");
            div.id = htmlId;

            for (const clazz of classList) {
                div.classList.add(clazz);
            }
            return div;
        }

        private _createHeader(): HTMLDivElement {
            const div = this._createDiv("ui-modelbrowser-header", [
                "ui-modelbrowser-header",
                "desktop-ui-window-header",
            ]);

            const t = document.createElement("table");
            const tr = document.createElement("tr");
            t.appendChild(tr);

            const minimizetd = document.createElement("td");
            minimizetd.classList.add("ui-modelbrowser-minimizetd");

            this._minimizeButton = this._createDiv("ui-modelbrowser-minimizebutton", [
                "ui-modelbrowser-minimizebutton",
                "minimized",
            ]);
            this._minimizeButton.onclick = () => {
                this._onMinimizeButtonClick();
            };

            minimizetd.appendChild(this._minimizeButton);
            tr.appendChild(minimizetd);

            // model browser label
            const modelBrowserLabel = document.createElement("td");
            modelBrowserLabel.id = "modelBrowserLabel";
            modelBrowserLabel.innerHTML = ""; //"Model Browser";
            tr.appendChild(modelBrowserLabel);

            const menuNode = this._createDiv("contextMenuButton", ["ui-modeltree-icon", "menu"]);
            tr.appendChild(menuNode);
            div.appendChild(t);

            this._content = this._createDiv("modelTreeContainer", [
                "ui-modelbrowser-content",
                "desktop-ui-window-content",
            ]);
            this._content.style.overflow = "auto";

            const loadingDiv = this._createDiv("modelBrowserLoadingDiv", []);
            loadingDiv.innerHTML = "Loading...";
            this._content.appendChild(loadingDiv);

            this._createIScrollWrapper(this._content, "modelTree");
            this._createIScrollWrapper(this._content, "cadViewTree");
            this._createIScrollWrapper(this._content, "sheetsTree");
            this._createIScrollWrapper(this._content, "configurationsTree");
            this._createIScrollWrapper(this._content, "layersTree");
            this._createIScrollWrapper(this._content, "filtersTree");
            this._createIScrollWrapper(this._content, "typesTree");
            this._createIScrollWrapper(this._content, "bcfTree");

            // tabs
            this._modelBrowserTabs = this._createDiv("modelBrowserTabs", []);

            this._createBrowserTab("modelTreeTab", "Model Tree", true, Tree.Model);
            this._createBrowserTab("cadViewTreeTab", "Views", false, Tree.CadView);
            this._createBrowserTab("sheetsTreeTab", "Sheets", false, Tree.Sheets);
            this._createBrowserTab(
                "configurationsTreeTab",
                "Configurations",
                false,
                Tree.Configurations,
            );
            this._createBrowserTab("layersTreeTab", "Layers", false, Tree.Layers);
            this._createBrowserTab("relationTreeTab", "Relations", false, Tree.Relationships);
            this._createBrowserTab("filtersTreeTab", "Filters", false, Tree.Filters);
            this._createBrowserTab("typesTreeTab", "Types", false, Tree.Types);
            this._createBrowserTab("bcfTreeTab", "BCF", false, Tree.BCF);

            div.appendChild(this._modelBrowserTabs);

            return div;
        }

        private _createIScrollWrapper(containerElement: HTMLDivElement, htmlId: HtmlId): void {
            // extra container wrapping the content of the model browser for touch scrolling
            const divScrollContainer = this._createDiv(`${htmlId}ScrollContainer`, []);
            divScrollContainer.classList.add("tree-scroll-container");
            divScrollContainer.appendChild(this._createDiv(htmlId, []));
            containerElement.appendChild(divScrollContainer);
        }

        private _createBrowserTab(
            htmlId: HtmlId,
            name: string,
            selected: boolean,
            tree: Tree,
        ): HTMLLabelElement {
            const tab = document.createElement("label");
            tab.id = htmlId;
            tab.textContent = name;
            tab.classList.add("ui-modelbrowser-tab");
            tab.classList.add("hidden");
            if (selected) {
                tab.classList.add("browser-tab-selected");
            }

            tab.onclick = (_event: MouseEvent) => {
                this._showTree(tree);
            };

            this._modelBrowserTabs.appendChild(tab);

            return tab;
        }

        private _initializeIScroll(htmlId: HtmlId): IScroll {
            const wrapper = $(`#${htmlId}ScrollContainer`).get(0);
            return new IScroll(wrapper, {
                mouseWheel: true,
                scrollbars: true,
                interactiveScrollbars: true,
                preventDefault: false,
            });
        }

        private _createRelationshipTree(containerElt: HTMLDivElement): RelationshipsTree {
            this._createIScrollWrapper(containerElt, "relationshipsTree");
            const iScroll = this._initializeIScroll("relationshipsTree");
            this._scrollTreeMap.set(Tree.Relationships, iScroll);
            const relationshipTree = new RelationshipsTree(
                this._viewer,
                "relationshipsTree",
                iScroll,
            );
            this._setTreeVisibility(relationshipTree, true);

            return relationshipTree;
        }

        private _createPropertyWindow(): void {
            this._propertyWindow = document.createElement("div");
            this._propertyWindow.classList.add("propertyWindow");
            this._propertyWindow.id = "propertyWindow";

            const container = document.createElement("div");
            container.id = "propertyContainer";

            this._propertyWindow.appendChild(container);

            this._treePropertyContainer = document.createElement("div");
            this._treePropertyContainer.id = "treePropertyContainer";

            this._relationshipsWindow = document.createElement("div");
            this._relationshipsWindow.classList.add("relationshipsWindow", "hidden");
            this._relationshipsWindow.id = "relationshipsWindow";

            this._treePropertyContainer.appendChild(this._content);
            this._treePropertyContainer.appendChild(this._relationshipsWindow);
            this._treePropertyContainer.appendChild(this._propertyWindow);

            this._browserWindow.appendChild(this._treePropertyContainer);
            this._relationshipTree = this._createRelationshipTree(this._relationshipsWindow);

            $(this._propertyWindow).resizable({
                resize: () => {
                    this.onResizeElement(
                        this._viewer.view.getCanvasSize().y,
                        this._relationshipsWindow,
                    );
                },
                handles: "n",
            });

            $(this._relationshipsWindow).resizable({
                resize: () => {
                    this.onResizeElement(this._viewer.view.getCanvasSize().y, this._content);
                },
                handles: "n",
            });
        }

        private _onMinimizeButtonClick(): void {
            if (!this._minimized) {
                this._minimizeModelBrowser();
            } else {
                this._maximizeModelBrowser();
            }
        }

        public _maximizeModelBrowser(): void {
            this._minimized = false;
            this.freeze(false);

            const $minimizeButton = jQuery(this._minimizeButton);
            $minimizeButton.addClass("maximized");
            $minimizeButton.removeClass("minimized");

            jQuery(this._content).slideDown({
                progress: () => {
                    this._onSlide();
                    $("#modelBrowserWindow").removeClass("ui-modelbrowser-small");
                },
                complete: () => {
                    $(this._browserWindow).children(".ui-resizable-handle").show();
                },
                duration: DefaultUiTransitionDuration,
            });
            this._refreshBrowserScroll();
        }

        private _minimizeModelBrowser(): void {
            this._minimized = true;
            this.freeze(true);

            const $minimizeButton = jQuery(this._minimizeButton);
            $minimizeButton.removeClass("maximized");
            $minimizeButton.addClass("minimized");

            jQuery(this._content).slideUp({
                progress: () => {
                    this._onSlide();
                    $("#modelBrowserWindow").addClass("ui-modelbrowser-small");
                },
                complete: () => {
                    $(this._browserWindow).children(".ui-resizable-handle").hide();
                },
                duration: DefaultUiTransitionDuration,
            });
            this._refreshBrowserScroll();
        }

        private onResize(height: number): void {
            const headerHeight = $(this._header).outerHeight();
            const propertyWindowHeight = $(this._propertyWindow).outerHeight();
            const relationShipsWindowHeight = $(this._relationshipsWindow).outerHeight();

            if (
                headerHeight !== undefined &&
                propertyWindowHeight !== undefined &&
                relationShipsWindowHeight !== undefined
            ) {
                this._treePropertyContainer.style.height = `${
                    height - headerHeight - this._browserWindowMargin * 2
                }px`;

                const contentHeight =
                    height -
                    headerHeight -
                    propertyWindowHeight -
                    relationShipsWindowHeight -
                    this._browserWindowMargin * 2;
                this._browserWindow.style.height = `${height - this._browserWindowMargin * 2}px`;

                this._content.style.height = `${contentHeight}px`;

                this._refreshBrowserScroll();
            }
        }

        private onResizeElement(height: number, htmlElementToResize: HTMLDivElement): void {
            const headerOuterHeight = $(this._header).outerHeight();
            const contentOuterHeight = $(this._content).outerHeight();
            const propertyWindowOuterHeight = $(this._propertyWindow).outerHeight();
            const relationShipsWindowOuterHeight = $(this._relationshipsWindow).outerHeight();

            const elementToResizeHidden = $(htmlElementToResize).hasClass("hidden");
            if (elementToResizeHidden) {
                htmlElementToResize = this._content;
            }
            const elementToResizeOuterHeight = $(htmlElementToResize).outerHeight();
            const elementToResizeHeight = $(htmlElementToResize).height();

            if (
                headerOuterHeight !== undefined &&
                propertyWindowOuterHeight !== undefined &&
                relationShipsWindowOuterHeight !== undefined &&
                contentOuterHeight !== undefined &&
                elementToResizeOuterHeight !== undefined &&
                elementToResizeHeight !== undefined
            ) {
                this._treePropertyContainer.style.height = `${
                    height - headerOuterHeight - this._browserWindowMargin * 2
                }px`;

                const elementToResizeVerticalPadding =
                    elementToResizeOuterHeight - elementToResizeHeight;
                const elementOuterHeight =
                    height -
                    headerOuterHeight -
                    propertyWindowOuterHeight -
                    relationShipsWindowOuterHeight -
                    contentOuterHeight +
                    elementToResizeOuterHeight -
                    this._browserWindowMargin * 2;

                let elementHeight = elementOuterHeight - elementToResizeVerticalPadding;
                if (elementHeight < 0) {
                    elementHeight = 0;
                }

                this._browserWindow.style.height = `${height - this._browserWindowMargin * 2}px`;
                htmlElementToResize.style.height = `${elementHeight}px`;

                this._refreshBrowserScroll();
            }
        }

        private _onSlide(): void {
            const headerHeight = $(this._header).outerHeight();
            const contentHeight = $(this._content).outerHeight();
            const propertyWindowHeight = $(this._propertyWindow).outerHeight();
            const relationShipsWindowHeight = $(this._relationshipsWindow).outerHeight();

            if (
                headerHeight !== undefined &&
                contentHeight !== undefined &&
                propertyWindowHeight !== undefined &&
                relationShipsWindowHeight !== undefined
            ) {
                const browserWindowHeight =
                    contentHeight + headerHeight + propertyWindowHeight + relationShipsWindowHeight;
                this._browserWindow.style.height = `${browserWindowHeight}px`;
            }
        }

        private _onModelStructureParsingBegin(): void {
            const $loadingDiv = $("#modelBrowserLoadingDiv");
            $loadingDiv.html("Parsing...");
        }

        private _onModelStructureLoadBegin(): void {
            const $containerDiv = $(`#${this._elementId}`);
            $containerDiv.show();
        }

        private _onAssemblyTreeReady(): void {
            const $loadingDiv = $("#modelBrowserLoadingDiv");
            $loadingDiv.remove();

            this._showTree(Tree.Model);

            const modelBrowserHeight = $(this._elementId).height();
            if (modelBrowserHeight !== undefined) {
                this.onResize(modelBrowserHeight);
            }
        }

        public freeze(freeze: boolean): void {
            this._getTree(Tree.Model).freezeExpansion(freeze);
        }

        public enablePartSelection(enable: boolean): void {
            this._getTree(Tree.Model).enablePartSelection(enable);
        }

        public updateSelection(items: Selection.NodeSelectionItem[] | null): void {
            this._getTree(Tree.Model).updateSelection(items);
        }

        /** @hidden */
        public _getTree(tree: Tree.Model): ModelTree;
        /** @hidden */
        public _getTree(tree: Tree.CadView): CadViewTree;
        /** @hidden */
        public _getTree(tree: Tree.Sheets): SheetsTree;
        /** @hidden */
        public _getTree(tree: Tree.Configurations): ConfigurationsTree;
        /** @hidden */
        public _getTree(tree: Tree.Layers): LayersTree;
        /** @hidden */
        public _getTree(tree: Tree.Filters): FiltersTree;
        /** @hidden */
        public _getTree(tree: Tree.Types): TypesTree;
        /** @hidden */
        public _getTree(tree: Tree.BCF): BCFTree;
        /** @hidden */
        public _getTree(tree: Tree.Relationships): RelationshipsTree;
        /** @hidden */
        public _getTree(tree: Tree): RelationshipsTree;

        /** @hidden */
        public _getTree(tree: Tree): AnyViewTree | undefined {
            return this._treeMap.get(tree);
        }
    }
}
