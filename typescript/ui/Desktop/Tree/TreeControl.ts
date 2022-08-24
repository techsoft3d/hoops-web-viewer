namespace Communicator.Ui.Control {
    class TaggedId {
        constructor(id: NodeId | Uuid) {
            if (typeof id === "number") {
                this.nodeId = id;
            } else {
                this.guid = id;
            }
        }

        public readonly nodeId: NodeId | null = null;
        public readonly guid: Uuid | null = null;
    }

    export type ItemType =
        | "modelroot"
        | "assembly"
        | "body"
        | "part"
        | "container"
        | "view"
        | "viewfolder"
        | "measurement"
        | "configurations"
        | "sheet"
        | "layer"
        | "filter";

    export class VisibilityControl {
        private readonly _viewer: WebViewer;

        private readonly _fullHiddenParentIds: NodeId[] = [];
        private readonly _partialHiddenParentIds: NodeId[] = [];

        private _assemblyTreeReadyOccurred: boolean = false;

        constructor(viewer: WebViewer) {
            this._viewer = viewer;

            const updateVisibilityState = () => {
                this.updateModelTreeVisibilityState();
                return Promise.resolve();
            };

            this._viewer.setCallbacks({
                _assemblyTreeReady: () => {
                    this._assemblyTreeReadyOccurred = true;
                    return updateVisibilityState();
                },
                firstModelLoaded: updateVisibilityState,
            });
        }

        private _clearStyles(): void {
            for (const id of this._fullHiddenParentIds) {
                this._removeVisibilityHiddenClass(id, "partHidden");
            }
            this._fullHiddenParentIds.length = 0;

            for (const id of this._partialHiddenParentIds) {
                this._removeVisibilityHiddenClass(id, "partialHidden");
            }
            this._partialHiddenParentIds.length = 0;
        }

        private _applyStyles(): void {
            for (const id of this._fullHiddenParentIds) {
                this._addVisibilityHiddenClass(id, "partHidden");
            }

            for (const id of this._partialHiddenParentIds) {
                this._addVisibilityHiddenClass(id, "partialHidden");
            }
        }

        public updateModelTreeVisibilityState(): void {
            // guard against calling model before the model structure is ready
            if (this._assemblyTreeReadyOccurred) {
                this._clearStyles();

                const model = this._viewer.model;
                const nodeQueue: NodeId[] = [model.getAbsoluteRootNode()];

                for (const nodeId of nodeQueue) {
                    const nodeStatus = model.getBranchVisibility(nodeId);

                    if (nodeStatus === BranchVisibility.Hidden) {
                        this._fullHiddenParentIds.push(nodeId);
                    } else if (nodeStatus === BranchVisibility.Mixed) {
                        this._partialHiddenParentIds.push(nodeId);

                        const nodeChildren = model.getNodeChildren(nodeId);
                        for (const child of nodeChildren) {
                            nodeQueue.push(child);
                        }
                    }
                }

                this._applyStyles();
            }
        }

        private _getVisibilityItem(nodeId: NodeId): JQuery {
            return $(`#visibility${ViewTree.separator}part${ViewTree.separator}${nodeId}`);
        }

        private _addVisibilityHiddenClass(nodeId: NodeId, className: string): void {
            this._getVisibilityItem(nodeId).addClass(className);
        }

        private _removeVisibilityHiddenClass(nodeId: NodeId, className: string): void {
            this._getVisibilityItem(nodeId).removeClass(className);
        }
    }

    export class TreeControl {
        private readonly _elementId: HtmlId;
        private readonly _listRoot: HTMLUListElement;
        private readonly _partVisibilityRoot: HTMLUListElement;

        private readonly _separator: string; // For [[HtmlId]]s

        // keeps track of the last non selection item (measurement, view, etc)
        private _$lastNonSelectionItem?: JQuery;

        // keeps track of the last clicked list item id
        private _lastItemId: string | null = null;

        // keeps track of the selection items
        private readonly _selectedPartItems: JQuery[] = [];

        // keep track of nodes that are in the selection set but not in the model tree
        private readonly _futureHighlightIds = new Set<NodeId>();

        // keep track of nodes that have children that are selected, but are not in the model tree
        private readonly _futureMixedIds = new Set<NodeId>();

        // keep track of selected items parents
        private readonly _selectedItemsParentIds: NodeId[] = [];

        // keeps track of layer selection items
        private _selectedLayers: LayerName[] = [];

        // keep track of layers with a selected item
        private readonly _mixedItemsLayer = new Set<LayerId>();

        // keeps track of component types selection items
        private _selectedTypes: LayerName[] = [];

        // keeps track of component type ids that may have children selected
        private _futureMixedTypesIds: NodeId[] = [];

        // keeps track of component types that have children selected
        private _mixedTypes = new Set<GenericType>();

        // keeps track of the model visibility state
        private _visibilityControl: VisibilityControl;

        private readonly _callbacks = new Map<TreeCallbackName, Function[]>();
        private readonly _childrenLoaded = new Set<HtmlId>();
        private readonly _loadedNodes = new Set<NodeId>();
        private _touchTimer = new Util.Timer();

        // prevent the model browser nodes from expanding
        private _freezeExpansion: boolean = false;

        // Set timer for scrolling and clear it each time a new item in the tree should be visible.
        // This will avoid scrolling down the tree when several nodes are selected at once.
        private _scrollTimer = new Util.Timer();

        // prevent selection highlighting from triggering if multiple items are being selected in succesion
        private _selectionLabelHighlightTimer = new Util.Timer();

        private readonly _viewer: WebViewer;
        private readonly _treeScroll: IScroll | null;

        // when true, visibility items will be created along with each item added to the tree
        private _createVisibilityItems = true;

        constructor(
            elementId: HtmlId,
            viewer: WebViewer,
            separator: string,
            treeScroll: IScroll | null,
        ) {
            this._elementId = elementId;
            this._viewer = viewer;
            this._treeScroll = treeScroll;

            this._separator = separator;

            this._visibilityControl = new VisibilityControl(viewer);

            this._partVisibilityRoot = document.createElement("ul");
            this._listRoot = document.createElement("ul");

            this._init();
        }

        public setCreateVisibilityItems(createVisibilityItems: boolean): void {
            this._createVisibilityItems = createVisibilityItems;
        }

        public getElementId(): HtmlId {
            return this._elementId;
        }

        public getRoot(): HTMLElement {
            return this._listRoot;
        }

        public getPartVisibilityRoot(): HTMLElement {
            return this._partVisibilityRoot;
        }

        public getVisibilityControl(): VisibilityControl {
            return this._visibilityControl;
        }

        public registerCallback(name: "addChild", func: () => void): void;
        public registerCallback(name: "collapse", func: (id: HtmlId) => void): void;
        public registerCallback(
            name: "context",
            func: (id: HtmlId, position: Point2) => void,
        ): void;
        public registerCallback(name: "expand", func: (id: HtmlId) => void): void;
        public registerCallback(name: "loadChildren", func: (id: HtmlId) => void): void;
        public registerCallback(
            name: "selectItem",
            func: (id: HtmlId, mode: SelectionMode) => void,
        ): void;
        public registerCallback(name: TreeCallbackName, func: Function): void; // XXX: Why is this needed for the compiler? Aren't discriminated types good enough?
        public registerCallback(name: "clickItemButton", func: (id: HtmlId) => void): void;
        public registerCallback(name: TreeCallbackName, func: Function): void {
            if (!this._callbacks.has(name)) this._callbacks.set(name, []);

            this._callbacks.get(name)!.push(func);
        }

        private _triggerCallback(name: "addChild"): void;
        private _triggerCallback(name: "collapse", id: HtmlId): void;
        private _triggerCallback(name: "context", id: HtmlId, position: Point2): void;
        private _triggerCallback(name: "expand", id: HtmlId): void;
        private _triggerCallback(name: "loadChildren", id: HtmlId): void;
        private _triggerCallback(name: "selectItem", id: HtmlId, mode: SelectionMode): void;
        private _triggerCallback(name: "clickItemButton", id: HtmlId): void;

        private _triggerCallback(name: TreeCallbackName, ...args: any[]): void {
            const callbacks = this._callbacks.get(name);

            if (callbacks) {
                for (const callback of callbacks) {
                    callback.apply(null, args);
                }
            }
        }

        public deleteNode(htmlId: HtmlId): void {
            const id = htmlId.charAt(0) === "#" ? htmlId.slice(1) : htmlId;
            jQuery(`#${id}`).remove();
            jQuery(`#visibility${this._separator}${id}`).remove();
        }

        private _getTaggedId(
            id: string,
            treeType: Desktop.Tree,
            name: string | null,
        ): TaggedId | null {
            const annotationViewsLabel = "Annotation Views";
            if (
                name !== null &&
                name === annotationViewsLabel &&
                treeType === Desktop.Tree.CadView
            ) {
                return new TaggedId(annotationViewsLabel); // return a non null tagged id for annotation views
            } else {
                return this._parseTaggedId(id);
            }
        }

        public addChild(
            name: string | null,
            htmlId: HtmlId,
            parent: HtmlId,
            itemType: ItemType,
            hasChildren: boolean,
            treeType: Desktop.Tree,
            accessible: boolean = true,
            ignoreLoaded: boolean = false,
        ): HTMLElement | null {
            const taggedId = this._getTaggedId(htmlId, treeType, name);
            if (taggedId === null) {
                return null;
            }

            if (
                treeType === Desktop.Tree.Model &&
                itemType !== "container" &&
                taggedId.nodeId !== null
            ) {
                // ignoreLoaded is true for PMI folders, as the taggedId will be the same
                // as the PMI parent node and would otherwise be prevented as a duplicate
                if (this._loadedNodes.has(taggedId.nodeId) && !ignoreLoaded) {
                    return null;
                }
                this._loadedNodes.add(taggedId.nodeId);
            }

            if (name === null) {
                name = "unnamed";
            }

            // add corresponding visibility icon
            this._addVisibilityToggleChild(htmlId, parent, itemType);

            const $parent = jQuery(`#${parent}`);
            $parent
                .children(".ui-modeltree-container")
                .children(".ui-modeltree-expandNode")
                .css("visibility", "visible");

            const $childList = $parent.children("ul");

            let selected = false;
            let mixed = false;

            if (taggedId.nodeId !== null) {
                selected = this._futureHighlightIds.has(taggedId.nodeId);
                mixed = this._futureMixedIds.has(taggedId.nodeId);

                if (selected) {
                    this._futureHighlightIds.delete(taggedId.nodeId);
                }
                if (mixed) {
                    this._futureMixedIds.delete(taggedId.nodeId);
                }
            }

            const node = this._buildNode(
                name,
                htmlId,
                itemType,
                hasChildren,
                selected,
                mixed,
                accessible,
                treeType === Desktop.Tree.Relationships,
            );

            // ensure parent node has children
            if ($childList.length === 0) {
                const target = document.createElement("ul");
                target.classList.add("ui-modeltree-children");
                $parent.append(target);
                target.appendChild(node);
            } else {
                $childList.get(0).appendChild(node);
            }

            if (selected) {
                const $listItem = this._getListItem(htmlId);
                if ($listItem !== null) {
                    this._selectedPartItems.push($listItem);
                }
            }

            this._triggerCallback("addChild");

            return node;
        }

        private _addVisibilityToggleChild(
            htmlId: HtmlId,
            parent: HtmlId,
            itemType: ItemType,
        ): void {
            // mirrors addChild for the visibility toggle icons

            const $parent = jQuery(`#visibility${this._separator}${parent}`);

            $parent.children(".ui-modeltree-visibility-container").css("visibility", "visible");

            const $childList = $parent.children("ul");

            let target: HTMLElement;

            // ensure parent node has children
            if ($childList.length === 0) {
                target = document.createElement("ul");
                target.classList.add("ui-modeltree-visibility-children");
                $parent.append(target);
            } else {
                target = $childList.get(0);
            }

            const node = this._buildPartVisibilityNode(htmlId, itemType);
            if (node !== null) {
                target.appendChild(node);
            }
        }

        private _buildPartVisibilityNode(htmlId: HtmlId, itemType: ItemType): HTMLElement | null {
            if (!this._createVisibilityItems) {
                return null;
            }

            const itemNode = document.createElement("div");
            itemNode.classList.add("ui-modeltree-partVisibility-icon");

            const childItem = document.createElement("li");
            childItem.classList.add("ui-modeltree-item");
            childItem.classList.add("visibility");
            childItem.id = `${ViewTree.visibilityPrefix}${ViewTree.separator}${htmlId}`;
            childItem.appendChild(itemNode);

            // measurement ids cannot be parsed to check if the node is a PMI
            // and can result in hiding the visibility icon in the model browser
            if (itemType !== "measurement") {
                // hide the visibility icon on PMI items
                let nodeId: number | undefined;

                const nodeIdStr = htmlId.split(this._separator).pop();
                if (nodeIdStr !== undefined) {
                    nodeId = parseInt(nodeIdStr, 10);
                }
                if (nodeId === undefined || isNaN(nodeId)) {
                    return childItem;
                }

                const nodeType = this._viewer.model.getNodeType(nodeId);
                if (nodeType === NodeType.Pmi || nodeType === NodeType.PmiBody) {
                    childItem.style.visibility = "hidden";
                }
            }

            return childItem;
        }

        public freezeExpansion(freeze: boolean): void {
            this._freezeExpansion = freeze;
        }

        public updateSelection(
            items: (Event.NodeSelectionEvent | Selection.NodeSelectionItem)[] | null,
        ): void {
            if (items === null) {
                items = this._viewer.selectionManager.getResults();
            }
            const nodeIds = items.map((item) => {
                if (item instanceof Event.NodeSelectionEvent) {
                    const x = item.getSelection();
                    if (x.isNodeSelection()) {
                        item = x;
                    } else {
                        console.assert(false);
                        return InvalidNodeId;
                    }
                }
                return item.getNodeId();
            });
            this._updateTreeSelectionHighlight(nodeIds);
            this._doUnfreezeSelection(nodeIds);
        }

        public collapseAllChildren(elementId: HtmlId): void {
            if (!this._freezeExpansion) {
                $(`#${elementId} .ui-modeltree-children`).hide();
                $(`#${elementId} .ui-modeltree-visibility-children`).hide();
                $(`#${elementId} .expanded`).removeClass("expanded");
            }
        }

        private _expandChildren(htmlId: HtmlId, ignoreFreeze: boolean): void {
            const $item = $(`#${htmlId}`);

            this.preloadChildrenIfNecessary(htmlId);

            if (!this._freezeExpansion || ignoreFreeze) {
                if ($item.length > 0) {
                    $item.children(".ui-modeltree-children").show();

                    // ensure that expand button is updated
                    $item
                        .children(".ui-modeltree-container")
                        .children(".ui-modeltree-expandNode")
                        .addClass("expanded");
                }
                this._expandVisibilityChildren(htmlId);
            }
        }

        public expandChildren(htmlId: HtmlId): void {
            this._expandChildren(htmlId, false);
        }

        public _expandVisibilityChildren(htmlId: HtmlId): void {
            const $item = $(`#visibility${this._separator + htmlId}`);

            if ($item.length > 0) {
                const $visibilityChildren = $item.children(".ui-modeltree-visibility-children");
                $visibilityChildren.addClass("visible");
                $visibilityChildren.show();
            }
        }

        public collapseChildren(htmlId: HtmlId): void {
            this._collapseVisibilityChildren(htmlId);

            const $item = $(`#${htmlId}`);

            if ($item.length > 0) $item.children(".ui-modeltree-children").hide();
        }

        private _collapseVisibilityChildren(htmlId: HtmlId): void {
            const $item = $(`#visibility${this._separator}${htmlId}`);

            if ($item.length > 0) $item.children(".ui-modeltree-visibility-children").hide();
        }

        private _buildNode(
            name: string,
            htmlId: HtmlId,
            itemType: ItemType,
            hasChildren: boolean,
            selected: boolean = false,
            mixed: boolean = false,
            accessible: boolean = true,
            isFromRelationships: boolean = false,
        ): HTMLElement {
            const childItem = document.createElement("li");
            childItem.classList.add("ui-modeltree-item");

            if (selected) {
                childItem.classList.add("selected");
            }

            if (mixed) {
                childItem.classList.add("mixed");
            }

            childItem.id = htmlId;

            const itemNode = document.createElement("div");
            itemNode.classList.add("ui-modeltree-container");
            itemNode.style.whiteSpace = "nowrap";

            const expandNode = document.createElement("div");
            expandNode.classList.add("ui-modeltree-expandNode");
            if (!hasChildren) expandNode.style.visibility = "hidden";
            itemNode.appendChild(expandNode);

            const iconNode = document.createElement("div");
            iconNode.classList.add("ui-modeltree-icon");
            iconNode.classList.add(itemType);
            itemNode.appendChild(iconNode);

            const labelNode = document.createElement("div");
            if (isFromRelationships === false) {
                if (accessible) {
                    labelNode.classList.add("ui-modeltree-label");
                }
            } else {
                if (accessible) {
                    labelNode.classList.add("ui-modeltree-relationships-label");
                } else {
                    labelNode.classList.add("ui-modeltree-relationships-label_unaccess");
                }
            }

            labelNode.innerHTML = $('<div>').text(name).html();
            labelNode.title = name;
            itemNode.appendChild(labelNode);

            const mixedSelection = document.createElement("div");
            mixedSelection.classList.add("ui-mixedselection-icon");
            itemNode.appendChild(mixedSelection);

            childItem.appendChild(itemNode);

            return childItem;
        }

        public childrenAreLoaded(htmlId: HtmlId): boolean {
            return this._childrenLoaded.has(htmlId);
        }

        public preloadChildrenIfNecessary(htmlId: HtmlId): void {
            if (htmlId !== null && !this._childrenLoaded.has(htmlId)) {
                this._triggerCallback("loadChildren", htmlId);
                this._childrenLoaded.add(htmlId);
            }
        }

        private _processExpandClick(event: JQuery.ClickEvent): void {
            const $target = jQuery(event.target);
            const $listItem = $target.parents(".ui-modeltree-item");

            const htmlId = $listItem.get(0).id;

            if ($target.hasClass("expanded")) {
                this._collapseListItem(htmlId);
            } else {
                this._expandListItem(htmlId);
            }
        }

        /** @hidden */
        public _collapseListItem(htmlId: HtmlId): void {
            this.collapseChildren(htmlId);
            const $target = $(`#${htmlId}`).find(".ui-modeltree-expandNode").first();
            $target.removeClass("expanded");
            this._triggerCallback("collapse", htmlId);
        }

        /** @hidden */
        public _expandListItem(htmlId: HtmlId): void {
            // if children are not loaded, we need to request the nodes for it
            this.expandChildren(htmlId);
            const $target = $(`#${htmlId}`).find(".ui-modeltree-expandNode").first();
            $target.addClass("expanded");
            this._triggerCallback("expand", htmlId);
        }

        public selectItem(htmlId: HtmlId | null, triggerEvent: boolean = true): void {
            this._doSelection(htmlId, triggerEvent);
        }

        public highlightItem(htmlId: HtmlId | null, triggerEvent: boolean = true): void {
            this._doHighlight(htmlId, triggerEvent);
        }

        private _getListItem(htmlId: HtmlId): JQuery | null {
            const $listItem = $(this._listRoot).find(`#${htmlId}`);
            if ($listItem.length > 0) {
                return $listItem;
            }
            return null;
        }

        private _updateNonSelectionHighlight($listItem: JQuery): void {
            if (this._$lastNonSelectionItem !== undefined) {
                this._$lastNonSelectionItem.removeClass("selected");
            }

            $listItem.addClass("selected");
            this._$lastNonSelectionItem = $listItem;
        }

        private _doUnfreezeSelection(selectionIds: NodeId[]): void {
            for (const id of selectionIds) {
                const parentId = this._viewer.model.getNodeParent(id);

                const $listItem = this._getListItem(`part${ViewTree.separator}${id}`);
                if ($listItem !== null && !$listItem.hasClass("selected")) {
                    $listItem.addClass("selected");
                    this._selectedPartItems.push($listItem);
                } else if ($listItem === null) {
                    this._futureHighlightIds.add(id);
                }

                if (parentId !== null) {
                    const layerPartId = LayersTree.getLayerPartId(parentId);

                    if (layerPartId !== null) {
                        const $parentListItem = this._getListItem(layerPartId);
                        if ($parentListItem !== null && !$parentListItem.hasClass("selected")) {
                            $parentListItem.addClass("selected");
                            this._selectedPartItems.push($parentListItem);
                        } else if ($parentListItem === null) {
                            this._futureHighlightIds.add(parentId);
                        }
                    }

                    const $typesListParentItem = this._getListItem(
                        TypesTree.getComponentPartId(parentId),
                    );
                    if ($typesListParentItem !== null) {
                        if (!$typesListParentItem.hasClass("selected")) {
                            $typesListParentItem.addClass("selected");
                            this._selectedPartItems.push($typesListParentItem);
                        }
                    }
                }

                const $typesListItem = this._getListItem(TypesTree.getComponentPartId(id));
                if ($typesListItem !== null) {
                    if (!$typesListItem.hasClass("selected")) {
                        $typesListItem.addClass("selected");
                        this._selectedPartItems.push($typesListItem);
                    }
                }
            }
        }

        /** @hidden */
        public _doSelection(htmlId: HtmlId | null, triggerEvent: boolean = true): void {
            if (htmlId !== null) {
                const idParts = htmlId.split(this._separator);

                const isPart = idParts[0] === "part";
                const isLayerPart = idParts[0] === "layerpart";
                const isTypePart = idParts[0] === "typespart";

                const $listItem = $(`#${htmlId}`);
                let contains = false;

                if (isPart || isLayerPart || isTypePart) {
                    $listItem.addClass("selected");

                    // we will keep track of selection items in an array to update the highlighting for multiple items
                    for (const $item of this._selectedPartItems) {
                        const item = $item.get(0);
                        if (item !== undefined) {
                            if (htmlId === item.id) {
                                contains = true;
                                break;
                            }
                        }
                    }
                    if (!contains) {
                        //only add the item to the selected items if it is not already included
                        this._selectedPartItems.push($listItem);
                    }
                } else if (htmlId.lastIndexOf("sheet", 0) === 0) {
                    // nothing to do
                } else {
                    // keeps track of the item if it's not of type 'part'.
                    if (htmlId.lastIndexOf("container", 0) === 0) {
                        return;
                    } else if (idParts[0] === LayersTree.layerPartContainerPrefix) {
                        return;
                    } else {
                        this._updateNonSelectionHighlight($listItem);
                    }
                }

                if (triggerEvent) {
                    this._lastItemId = htmlId;
                    const toggleKeyActive = typeof key !== "undefined" && (key.ctrl || key.command);
                    const repeatSelection = contains && this._selectedPartItems.length === 1;
                    const mode =
                        toggleKeyActive || repeatSelection
                            ? SelectionMode.Toggle
                            : SelectionMode.Set;
                    this._triggerCallback("selectItem", htmlId, mode);
                }

                /* This function gets called twice when a label is selected. Once when a label is selected,
                 * and again after the selection callback is triggered. If a label is clicked, we do not want
                 * to scroll the item into view.
                 */
                if (this._lastItemId !== htmlId && !this._freezeExpansion && !triggerEvent) {
                    this._scrollToItem($listItem);
                }
            }

            this._lastItemId = htmlId;

            this._selectionLabelHighlightTimer.set(30, () => {
                const selectionIds = this._viewer.selectionManager
                    .getResults()
                    .map((item) => item.getNodeId());
                this._updateTreeSelectionHighlight(selectionIds);
            });
        }

        public _doHighlight(htmlId: HtmlId | null, triggerEvent: boolean = true): void {
            const $listItem = $(`#${htmlId}`);
            this._updateNonSelectionHighlight($listItem);
            if (triggerEvent && htmlId !== null)
                this._triggerCallback("selectItem", htmlId, SelectionMode.Set);
        }

        public _doSelectIfcItem(htmlId: HtmlId | null, triggerEvent: boolean = true): void {
            const $listItem = $(`#${htmlId}`);
            this._updateNonSelectionHighlight($listItem);
            if (triggerEvent && htmlId !== null) this._triggerCallback("clickItemButton", htmlId);
        }

        /**
         * Increased by automated tests for more consistent behavior.
         * @hidden
         */
        public static _ScrollToItemDelayMs = 10;

        private _scrollToItem($listItem: JQuery): void {
            this._scrollTimer.set(TreeControl._ScrollToItemDelayMs, () => {
                const offset = $listItem.offset();
                const containerHeight = $("#modelTreeContainer").innerHeight();

                if (offset !== undefined && containerHeight !== undefined) {
                    const offsetTop = offset.top;
                    const hiddenTop = offsetTop < 6;
                    const hiddenBottom = offsetTop > containerHeight;

                    // only scroll to the element if it is not currently visible in the model browser
                    if (hiddenTop || hiddenBottom) {
                        this._scrollTimer.clear();
                        if (this._treeScroll) {
                            this._treeScroll.refresh();
                            this._treeScroll.scrollToElement(
                                $listItem.get(0),
                                DefaultUiTransitionDuration,
                                true,
                                true,
                            );
                        }
                    }
                }
            });
        }

        private _parseTaggedId(htmlId: HtmlId): TaggedId | null {
            const uuid = this._parseUuid(htmlId);
            if (uuid !== null) {
                return new TaggedId(uuid);
            }

            const nodeId = this._parseNodeId(htmlId);
            if (nodeId !== null) {
                return new TaggedId(nodeId);
            }

            return null;
        }

        // Note that measurements and markup views have guid identifers.
        // In the case that we are asked to parse an html id for such an element we cannot deduce a node identifier for the item.
        // In that case the _parseGuid function should be used to deduce the id.
        private _parseNodeId(htmlId: HtmlId): NodeId | null {
            const idComponents = htmlId.split(this._separator);

            if (
                idComponents.length < 2 ||
                idComponents[0] === "measurement" ||
                idComponents[0] === "markupview"
            ) {
                return null;
            }

            const idPart = idComponents[idComponents.length - 1];
            if (idPart !== undefined) {
                const nodeId = parseInt(idPart, 10);
                if (!isNaN(nodeId)) {
                    return nodeId;
                }
            }
            return null;
        }

        private _parseUuid(htmlId: HtmlId): Uuid | null {
            const hyphenatedUuidLen = 36;
            const idPart = htmlId.split(this._separator).pop();
            if (idPart !== undefined && idPart.length === hyphenatedUuidLen) {
                return idPart;
            }
            return null;
        }

        private _parseMeasurementId(htmlId: HtmlId): Uuid | undefined {
            return htmlId.split(this._separator).pop();
        }

        private _parseVisibilityLayerName(htmlId: HtmlId): LayerName | null {
            const idParts = htmlId.split(`${ViewTree.visibilityPrefix}${ViewTree.separator}`);
            if (idParts.length !== 2) {
                return null;
            }
            return LayersTree.getLayerName(idParts[1]);
        }

        private _parseVisibilityLayerNodeId(htmlId: HtmlId): NodeId | null {
            const idParts = htmlId.split(`${ViewTree.visibilityPrefix}${ViewTree.separator}`);
            if (idParts.length !== 2) {
                return null;
            }
            return LayersTree.getPartId(idParts[1]);
        }

        private _updateLayerTreeSelectionHighlight(nodeIds: NodeId[]): void {
            for (const layerName of this._selectedLayers) {
                $(`#${LayersTree.getLayerId(layerName)}`).removeClass("selected");
            }

            this._mixedItemsLayer.forEach((layerId) => {
                const layerName = this._viewer.model.getLayerName(layerId);
                if (layerName !== null) {
                    $(`#${LayersTree.getLayerId(layerName)}`).addClass("mixed");
                }
            });

            this._selectedLayers = this._viewer.selectionManager.getSelectedLayers();
            for (const layerName of this._selectedLayers) {
                $(`#${LayersTree.getLayerId(layerName)}`).addClass("selected");
                $(`#${LayersTree.getLayerId(layerName)}`).removeClass("mixed");
            }
            for (const nodeId of nodeIds) {
                $(`#${LayersTree.getLayerPartId(nodeId)}`).addClass("selected");
            }
        }

        private _addMixedTypeClass(nodeId: NodeId): boolean {
            const type = this._viewer.model.getNodeGenericType(nodeId);
            if (type !== null && !this._mixedTypes.has(type)) {
                $(`#${TypesTree.getGenericTypeId(type)}`).addClass("mixed");
                this._mixedTypes.add(type);
                return true;
            }
            return false;
        }

        private _updateTypesTreeSelectionHighlight(): void {
            for (const type of this._selectedTypes) {
                $(`#${TypesTree.getGenericTypeId(type)}`).removeClass("selected");
            }

            for (const nodeId of this._futureMixedTypesIds) {
                if (!this._addMixedTypeClass(nodeId)) {
                    const parentId = this._viewer.model.getNodeParent(nodeId);
                    if (parentId !== null) {
                        this._addMixedTypeClass(parentId);
                    }
                }
            }

            this._selectedTypes = this._viewer.selectionManager.getSelectedTypes();
            for (const type of this._selectedTypes) {
                const $type = $(`#${TypesTree.getGenericTypeId(type)}`);
                $type.addClass("selected");
                $type.removeClass("mixed");
            }
        }

        // update the tree highlighting for selection items (not cadviews, measurements, etc)
        private _updateTreeSelectionHighlight(selectionIds: NodeId[]): void {
            // update the future highlight list to reflect the current selection set
            this._futureHighlightIds.forEach((key) => {
                if (selectionIds.indexOf(key) >= 0) {
                    this._futureHighlightIds.delete(key);
                }
            });

            for (const nodeId of this._selectedItemsParentIds) {
                $(`#part${ViewTree.separator}${nodeId}`).removeClass("mixed");
            }
            this._selectedItemsParentIds.length = 0;
            this._futureMixedIds.clear();

            this._mixedItemsLayer.forEach((layerId) => {
                const layerName = this._viewer.model.getLayerName(layerId);
                if (layerName !== null) {
                    $(`#${LayersTree.getLayerId(layerName)}`).removeClass("mixed");
                }
            });
            this._mixedItemsLayer.clear();

            this._mixedTypes.forEach((type) => {
                $(`#${TypesTree.getGenericTypeId(type)}`).removeClass("mixed");
            });
            this._mixedTypes.clear();
            this._futureMixedTypesIds = [];

            // remove items that are no longer selected.
            Util.filterInPlace(this._selectedPartItems, ($item: JQuery) => {
                const element = $item.get(0);
                if (element !== undefined) {
                    const nodeId = this._parseNodeId(element.id);
                    if (nodeId === null) {
                        return false;
                    } else if (selectionIds.indexOf(nodeId) < 0) {
                        $(`#part${ViewTree.separator}${nodeId}`).removeClass("selected");
                        $(`#typespart${ViewTree.separator}${nodeId}`).removeClass("selected");

                        const layerPartNodeId = LayersTree.getLayerPartId(nodeId);
                        if (layerPartNodeId!) $(`#${layerPartNodeId}`).removeClass("selected");
                        return false;
                    }
                }
                return true;
            });

            // add all parents of selected items for the "mixed" icon
            for (const nodeId of selectionIds) {
                this._updateParentIdList(nodeId);
                this._updateMixedLayers(nodeId);
                this._updateMixedTypes(nodeId);
            }

            for (const nodeId of this._selectedItemsParentIds) {
                const $listItem = this._getListItem(`part${ViewTree.separator}${nodeId}`);
                if ($listItem !== null && !$listItem.hasClass("mixed")) {
                    $listItem.addClass("mixed");
                } else {
                    this._futureMixedIds.add(nodeId);
                }
            }

            this._updateLayerTreeSelectionHighlight(selectionIds);
            this._updateTypesTreeSelectionHighlight();
        }

        // add mixed class to parents of selected items
        private _updateParentIdList(childId: NodeId): void {
            const model = this._viewer.model;
            if (model.isNodeLoaded(childId)) {
                let parentId = model.getNodeParent(childId);
                while (parentId !== null && this._selectedItemsParentIds.indexOf(parentId) === -1) {
                    this._selectedItemsParentIds.push(parentId);
                    parentId = model.getNodeParent(parentId);
                }
            }
        }

        // add mixed class to layers with selected items
        private _updateMixedLayers(nodeId: NodeId): void {
            const addNodeLayer = (nodeId: NodeId) => {
                const layerId = this._viewer.model.getNodeLayerId(nodeId);
                if (layerId !== null) {
                    this._mixedItemsLayer.add(layerId);
                }
            };

            const childNodeIds = this._viewer.model.getNodeChildren(nodeId);
            for (const childNodeId of childNodeIds) {
                addNodeLayer(childNodeId);
            }
            addNodeLayer(nodeId);
        }

        // add mixed class to types with selected items
        private _updateMixedTypes(nodeId: NodeId): void {
            this._futureMixedTypesIds.push(nodeId);
        }

        private _processLabelContext(event: JQuery.TriggeredEvent, position?: Point2): void {
            const $target = jQuery(event.target);
            const $listItem = $target.closest(".ui-modeltree-item");

            if (!position) {
                position = new Point2(event.clientX!, event.clientY!);
            }

            const id = $listItem.get(0).id;
            this._triggerCallback("context", id, position);
        }

        private _processLabelClick(event: JQuery.ClickEvent): void {
            const $target = jQuery(event.target);
            const $listItem = $target.closest(".ui-modeltree-item");
            this._doSelection($listItem.get(0).id, true);
        }

        private _processLabelRSClick(event: JQuery.ClickEvent): void {
            const $target = jQuery(event.target);
            const $listItem = $target.closest(".ui-modeltree-item");
            this._doHighlight($listItem.get(0).id, true);
        }

        private _processLabelRSClickButton(event: JQuery.ClickEvent): void {
            const $target = jQuery(event.target);
            const $listItem = $target.closest(".ui-modeltree-item");
            this._doSelectIfcItem($listItem.get(0).id, true);
        }

        public appendTopLevelElement(
            name: string | null,
            htmlId: HtmlId,
            itemType: ItemType,
            hasChildren: boolean,
            loadChildren: boolean = true,
            markChildrenLoaded = false,
        ): HTMLElement {
            if (name === null) {
                name = "unnamed";
            }
            const childItem = this._buildNode(name, htmlId, itemType, hasChildren);

            if (htmlId.substring(0, 4) === "part" && this._listRoot.firstChild) {
                this._listRoot.insertBefore(childItem, this._listRoot.firstChild);
            } else {
                this._listRoot.appendChild(childItem);
            }

            const childVisibilityItem = this._buildPartVisibilityNode(htmlId, itemType);
            if (childVisibilityItem !== null) {
                this._partVisibilityRoot.appendChild(childVisibilityItem);
            }

            if (loadChildren) {
                this.preloadChildrenIfNecessary(htmlId);
            }
            if (markChildrenLoaded) {
                this._childrenLoaded.add(htmlId);
            }

            return childItem;
        }

        public insertNodeAfter(
            name: string | null,
            htmlId: HtmlId,
            itemType: string,
            element: HTMLElement,
            hasChildren: boolean,
        ): HTMLElement {
            return this._insertNodeAfter(name, htmlId, itemType as ItemType, element, hasChildren);
        }

        /** @hidden */
        public _insertNodeAfter(
            name: string | null,
            htmlId: HtmlId,
            itemType: ItemType,
            element: HTMLElement,
            hasChildren: boolean,
        ): HTMLElement {
            if (name === null) {
                name = "unnamed";
            }
            if (element.parentNode === null) {
                throw new CommunicatorError("element.parentNode is null");
            }

            const childItem = this._buildNode(name, htmlId, itemType, hasChildren);
            if (element.nextSibling)
                element.parentNode.insertBefore(childItem, element.nextSibling);
            else element.parentNode.appendChild(childItem);

            this.preloadChildrenIfNecessary(htmlId);

            return childItem;
        }

        public clear(): void {
            while (this._listRoot.firstChild) {
                this._listRoot.removeChild(this._listRoot.firstChild);
            }

            while (this._partVisibilityRoot.firstChild) {
                this._partVisibilityRoot.removeChild(this._partVisibilityRoot.firstChild);
            }

            this._childrenLoaded.clear();
            this._loadedNodes.clear();
        }

        // expand to first node with multiple children
        public expandInitialNodes(htmlId: HtmlId): void {
            let currentHtmlId = htmlId;

            let childNodes: HTMLElement[] = [];

            while (childNodes.length <= 1) {
                childNodes = this._getChildItemsFromModelTreeItem($(`#${currentHtmlId}`));

                // If there are no children, do not try to expand them
                if (childNodes.length === 0) {
                    break;
                }

                this._expandChildren(currentHtmlId, true);
                currentHtmlId = childNodes[0].id;
                this.preloadChildrenIfNecessary(currentHtmlId);
            }
        }

        /** @hidden */
        public async _processVisibilityClick(htmlId: HtmlId): Promise<void> {
            const prefix = htmlId.split(this._separator)[1];
            switch (prefix) {
                case "part":
                    return this._processPartVisibilityClick(htmlId);
                case "measurement":
                    return this._processMeasurementVisibilityClick(htmlId);
                case "layer":
                    return this._processLayerVisibilityClick(htmlId);
                case "layerpart":
                    return this._processLayerPartVisibilityClick(htmlId);
                case "types":
                    return this._processTypesVisibilityClick(htmlId);
                case "typespart":
                    return this._processTypesPartVisibilityClick(htmlId);
            }
        }

        private async _processPartVisibilityClick(htmlId: HtmlId): Promise<void> {
            const nodeId = this._parseNodeId(htmlId);
            if (nodeId !== null) {
                await this._processPartVisibility(nodeId);
            }
        }

        public async _processPartVisibility(nodeId: NodeId): Promise<void> {
            const model = this._viewer.model;
            const visibility = model.getNodeVisibility(nodeId);
            const isIfcSpace = model.hasEffectiveGenericType(nodeId, StaticGenericType.IfcSpace);
            await model.setNodesVisibility([nodeId], !visibility, isIfcSpace ? false : null);
        }

        //update the visibility state of measurement items in the scene
        private _processMeasurementVisibilityClick(htmlId: HtmlId): void {
            const parsedGuid = this._parseMeasurementId(htmlId);
            const measureItems = this._viewer.measureManager.getAllMeasurements();

            if (parsedGuid === "measurementitems") {
                // root folder, toggle all measurement items visibility
                let visibility = true;
                for (const measureItem of measureItems) {
                    if (measureItem.getVisibility()) {
                        visibility = false;
                        break;
                    }
                }

                for (const measureItem of measureItems) {
                    measureItem.setVisibility(visibility);
                }
            } else {
                for (const measureItem of measureItems) {
                    if (parsedGuid === measureItem._getId()) {
                        const visibility = measureItem.getVisibility();
                        measureItem.setVisibility(!visibility);
                    }
                }
            }
        }

        private async _processTypesVisibilityClick(htmlId: HtmlId): Promise<void> {
            const type = htmlId.split(this._separator).pop();

            if (type === undefined) {
                return;
            }

            await this._processTypesVisibility(type);
        }

        public async _processTypesVisibility(type: GenericType): Promise<void> {
            const model = this._viewer.model;

            let visibility = false;
            const nodeIds = model.getNodesByGenericType(type);

            if (nodeIds !== null) {
                const visibilityIds: NodeId[] = [];

                nodeIds.forEach((nodeId) => {
                    visibility = visibility || model.getNodeVisibility(nodeId);
                    visibilityIds.push(nodeId);
                });

                await model.setNodesVisibility(
                    visibilityIds,
                    !visibility,
                    type === StaticGenericType.IfcSpace ? false : null,
                );

                this.updateTypesVisibilityIcons();
            }
        }

        private async _processTypesPartVisibilityClick(htmlId: HtmlId): Promise<void> {
            const nodeId = this._parseNodeId(htmlId);
            if (nodeId === null) {
                return;
            }
            await this._processTypesPartVisibility(nodeId);
        }

        public async _processTypesPartVisibility(nodeId: NodeId): Promise<void> {
            const model = this._viewer.model;
            const visibility = await model.getNodeVisibility(nodeId);
            const isIfcSpace = model.hasEffectiveGenericType(nodeId, StaticGenericType.IfcSpace);
            await model.setNodesVisibility([nodeId], !visibility, isIfcSpace ? false : null);
        }

        public updateTypesVisibilityIcons(): void {
            const model = this._viewer.model;
            const typeIds = model.getGenericTypeIdMap();

            typeIds.forEach((nodeIds, type) => {
                let partHidden = false;
                let partShown = false;
                nodeIds.forEach((nodeId) => {
                    const elem = $(
                        `#visibility${ViewTree.separator}${TypesTree.getComponentPartId(nodeId)}`,
                    );
                    elem.removeClass("partHidden");
                    if (model.getNodeVisibility(nodeId)) {
                        partShown = true;
                    } else {
                        partHidden = true;
                        elem.addClass("partHidden");
                    }
                });

                const elem = $(
                    `#visibility${ViewTree.separator}${TypesTree.getGenericTypeId(type)}`,
                );
                elem.removeClass(["partHidden", "partialHidden"]);
                if (partHidden && partShown) {
                    elem.addClass("partialHidden");
                } else if (partHidden) {
                    elem.addClass("partHidden");
                }
            });
        }

        // handles a visibility click for a top level folder in the layers tree
        private async _processLayerVisibilityClick(htmlId: HtmlId): Promise<void> {
            const layerName = this._parseVisibilityLayerName(htmlId);

            if (!layerName) {
                return;
            }

            let visibility = false;
            const nodeIds = this._viewer.model.getNodesFromLayerName(layerName, true);
            if (nodeIds !== null) {
                for (let i = 0; i < nodeIds.length; ++i) {
                    visibility = visibility || this._viewer.model.getNodeVisibility(nodeIds[i]);
                    if (visibility) {
                        break;
                    }
                }
                _filterActiveSheetNodeIds(this._viewer, nodeIds);

                if (nodeIds.length > 0) {
                    await this._viewer.model.setNodesVisibility(nodeIds, !visibility, null);
                }
            }
        }

        // handles a visibility click for a child of a top level folder in the layers tree
        private async _processLayerPartVisibilityClick(htmlId: HtmlId): Promise<void> {
            const nodeId = this._parseVisibilityLayerNodeId(htmlId);

            if (nodeId !== null) {
                const visibility = this._viewer.model.getNodeVisibility(nodeId);
                const nodeIds = [nodeId];
                _filterActiveSheetNodeIds(this._viewer, nodeIds);
                if (nodeIds.length > 0) {
                    await this._viewer.model.setNodesVisibility(nodeIds, !visibility, null);
                }
            }
        }

        public updateLayersVisibilityIcons(): void {
            const layerNames = this._viewer.model.getUniqueLayerNames();

            layerNames.forEach((layerName) => {
                const nodeIds = this._viewer.model.getNodesFromLayerName(layerName, true);

                if (nodeIds !== null) {
                    let partHidden = false;
                    let partShown = false;
                    for (let i = 0; i < nodeIds.length; ++i) {
                        let id: NodeId | null = nodeIds[i];

                        // For non drawing models, the parent id is used (This was mainly for BIM models)
                        if (!this._viewer.model.isDrawing()) {
                            id = this._viewer.model.getNodeParent(nodeIds[i]);
                        }

                        if (id !== null) {
                            const elem = $(
                                `#visibility${ViewTree.separator}${LayersTree.getLayerPartId(id)}`,
                            );
                            elem.removeClass("partHidden");
                            if (this._viewer.model.getNodeVisibility(nodeIds[i])) {
                                partShown = true;
                            } else {
                                partHidden = true;
                                elem.addClass("partHidden");
                            }
                        }
                    }

                    const elem = $(
                        `#visibility${ViewTree.separator}${LayersTree.getLayerId(layerName)}`,
                    );
                    elem.removeClass(["partHidden", "partialHidden"]);
                    if (partHidden && partShown) {
                        elem.addClass("partialHidden");
                    } else if (partHidden) {
                        elem.addClass("partHidden");
                    }
                }
            });
        }

        // update the visibility icons in the measurement folder
        public updateMeasurementVisibilityIcons(): void {
            const measureItems = this._viewer.measureManager.getAllMeasurements();

            let hiddenCount = 0;
            for (const measureItem of measureItems) {
                const visibility = measureItem.getVisibility();

                const elem = $(
                    `#visibility${ViewTree.separator}measurement${
                        ViewTree.separator
                    }${measureItem._getId()}`,
                );

                if (!visibility) {
                    hiddenCount++;
                    elem.addClass("partHidden");
                } else {
                    elem.removeClass("partHidden");
                }
            }

            const measurementFolder = $(`#visibility${ViewTree.separator}measurementitems`);
            if (hiddenCount === measureItems.length) {
                measurementFolder.removeClass("partialHidden");
                measurementFolder.addClass("partHidden");
            } else if (hiddenCount > 0 && hiddenCount < measureItems.length) {
                measurementFolder.removeClass("partHidden");
                measurementFolder.addClass("partialHidden");
            } else {
                measurementFolder.removeClass("partialHidden");
                measurementFolder.removeClass("partHidden");
            }
            this._viewer.markupManager.updateLater();
        }

        private _init(): void {
            const container = document.getElementById(this._elementId);
            if (container === null) {
                throw new CommunicatorError("container is null");
            }

            this._partVisibilityRoot.classList.add("ui-visibility-toggle");
            container.appendChild(this._partVisibilityRoot);

            this._listRoot.classList.add("ui-modeltree");
            this._listRoot.classList.add("ui-modeltree-item");
            container.appendChild(this._listRoot);

            $(container).on("click", ".ui-modeltree-label", (event) => {
                this._processLabelClick(event);
            });

            $(container).on("click", ".ui-modeltree-relationships-label", (event) => {
                this._processLabelRSClick(event);
            });

            $(container).on("click", ".ui-model-tree-relationships-button", (event) => {
                this._processLabelRSClickButton(event);
            });

            $(container).on("click", ".ui-modeltree-expandNode", (event) => {
                this._processExpandClick(event);
            });

            $(container).on("click", ".ui-modeltree-partVisibility-icon", async (event) => {
                const $target = jQuery(event.target);
                const $listItem = $target.closest(".ui-modeltree-item");
                const htmlId = $listItem[0].id;
                await this._processVisibilityClick(htmlId);
            });

            $(container).on("click", "#contextMenuButton", (event) => {
                this._processLabelContext(event);
            });

            $(container).on("mouseup", ".ui-modeltree-label, .ui-modeltree-icon", (event) => {
                if (event.button === 2) this._processLabelContext(event);
            });

            $(container).on("touchstart", (event) => {
                this._touchTimer.set(1000, () => {
                    const e: any = event.originalEvent;
                    const x = e.touches[0].pageX;
                    const y = e.touches[0].pageY;
                    const position = new Point2(x, y);

                    this._processLabelContext(event, position);
                });
            });

            $(container).on("touchmove", (_event) => {
                this._touchTimer.clear();
            });

            $(container).on("touchend", (_event) => {
                this._touchTimer.clear();
            });

            $(container).on("contextmenu", ".ui-modeltree-label", (event) => {
                event.preventDefault();
            });
        }

        private _getChildItemsFromModelTreeItem($modeltreeItem: JQuery): HTMLElement[] {
            const $childItems = $modeltreeItem
                .children(".ui-modeltree-children")
                .children(".ui-modeltree-item");
            return $.makeArray($childItems);
        }
    }
}
