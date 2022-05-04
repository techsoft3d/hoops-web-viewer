/// <reference path="../../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui {
    export class ModelTree extends ViewTree {
        private _lastModelRoot: HTMLElement | null = null;
        private _startedWithoutModelStructure = false;
        private _partSelectionEnabled = true;
        private _currentSheetId: SheetId | null = null;

        private _measurementFolderId: HtmlId = "measurementitems";

        private _updateVisibilityStateTimer = new Util.Timer();
        private _updateSelectionTimer = new Util.Timer();

        constructor(viewer: WebViewer, elementId: HtmlId, iScroll: IScroll | null) {
            super(viewer, elementId, iScroll);
            this._initEvents();
        }

        public freezeExpansion(freeze: boolean): void {
            this._tree.freezeExpansion(freeze);
        }

        public modelStructurePresent(): boolean {
            const model = this._viewer.model;

            return model.getNodeName(model.getAbsoluteRootNode()) !== "No product structure";
        }

        public enablePartSelection(enable: boolean): void {
            this._partSelectionEnabled = enable;
        }

        private _initEvents(): void {
            const reset = () => {
                this._reset();
            };

            this._viewer.setCallbacks({
                assemblyTreeReady: () => {
                    this._onNewModel();
                },
                firstModelLoaded: reset,
                hwfParseComplete: reset,
                modelSwitched: reset,
                selectionArray: (events: Event.NodeSelectionEvent[]) => {
                    this._onPartSelection(events);
                },
                incrementalSelectionBatchEnd: () => {
                    this._updateSelectionTimer.set(50, () => {
                        this.updateSelection(null);
                    });
                },
                visibilityChanged: () => {
                    this._tree.getVisibilityControl().updateModelTreeVisibilityState();
                },
                viewCreated: (view: Markup.MarkupView) => {
                    this._onNewView(view);
                },
                viewLoaded: (view: Markup.MarkupView) => {
                    this._onNewView(view);
                },
                subtreeLoaded: (nodeIdArray: NodeId[]) => {
                    this._onSubtreeLoaded(nodeIdArray);
                    this._tree.getVisibilityControl().updateModelTreeVisibilityState();
                },
                subtreeDeleted: (nodeIdArray: NodeId[]) => {
                    this._onSubtreeDeleted(nodeIdArray);
                },
                modelSwitchStart: () => {
                    this._tree.clear();
                },
                measurementCreated: (measurement: Markup.Measure.MeasureMarkup) => {
                    this._onNewMeasurement(measurement);
                },
                measurementLoaded: (measurement: Markup.Measure.MeasureMarkup) => {
                    this._onNewMeasurement(measurement);
                },
                measurementDeleted: (measurement: Markup.Measure.MeasureMarkup) => {
                    this._onDeleteMeasurement(measurement);
                },
                measurementShown: () => {
                    this._tree.updateMeasurementVisibilityIcons();
                },
                measurementHidden: () => {
                    this._tree.updateMeasurementVisibilityIcons();
                },
                sheetActivated: (id: SheetId) => {
                    if (id !== this._currentSheetId) {
                        this._currentSheetId = id;
                        this._refreshModelTree(id);
                    }
                },
                sheetDeactivated: () => {
                    this._reset();
                },
                configurationActivated: (id: NodeId) => {
                    this._refreshModelTree(id);
                },
            });

            this._tree.registerCallback("loadChildren", (htmlId: HtmlId) => {
                this._loadNodeChildren(htmlId);
            });

            this._tree.registerCallback(
                "selectItem",
                async (htmlId: HtmlId, selectionMode: SelectionMode) => {
                    await this._onTreeSelectItem(htmlId, selectionMode);
                },
            );
        }

        private _refreshModelTree(nodeId: NodeId): void {
            this._tree.clear();

            const model = this._viewer.model;
            const rootId = model.getAbsoluteRootNode();
            const name = model.getNodeName(rootId);

            // add the top level root, and skip to 'id' for the first child
            this._tree.appendTopLevelElement(
                name,
                this._partId(rootId),
                "modelroot",
                model.getNodeChildren(rootId).length > 0,
                false,
                true,
            );
            this._tree.addChild(
                model.getNodeName(nodeId),
                this._partId(nodeId),
                this._partId(rootId),
                "part",
                true,
                Desktop.Tree.Model,
            );

            this._tree.expandInitialNodes(this._partId(rootId));

            this._refreshMarkupViews();
        }

        private _reset(): void {
            this._tree.clear();
            this._currentSheetId = null;
            this._onNewModel();
        }

        private _onNewModel(): void {
            const model = this._viewer.model;
            const rootId = model.getAbsoluteRootNode();
            const name = model.getNodeName(rootId);

            this.showTab();

            /* TODO: Clean this up: erwan currently makes a placeholder node for the root with
             * "No model structure present" text when structure is absent. In this case we do not want to operate under
             * the assumption we have loaded a model root (for further subtree loading)
             */
            this._startedWithoutModelStructure = !this.modelStructurePresent();

            this._lastModelRoot = this._tree.appendTopLevelElement(
                name,
                this._partId(rootId),
                "modelroot",
                model.getNodeChildren(rootId).length > 0,
            );

            if (!this._viewer.sheetManager.isDrawingSheetActive()) {
                this._tree.expandInitialNodes(this._partId(rootId));
            }

            this._refreshMarkupViews();
        }

        private _createMarkupViewFolderIfNecessary(): void {
            const $markupViewFolder = $("#markupviews");

            if ($markupViewFolder.length === 0)
                this._tree.appendTopLevelElement(
                    "Markup Views",
                    "markupviews",
                    "viewfolder",
                    false,
                );
        }

        private _createMeasurementFolderIfNecessary(): void {
            const $measurementsFolder = $(`#${this._measurementFolderId}`);

            if ($measurementsFolder.length === 0)
                this._tree.appendTopLevelElement(
                    "Measurements",
                    this._measurementFolderId,
                    "measurement",
                    false,
                );
        }

        private _parentChildrenLoaded(parent: NodeId): boolean {
            const parentIdString = this._partId(parent);
            return this._tree.childrenAreLoaded(parentIdString);
        }

        private _onSubtreeLoaded(nodeIds: NodeId[]): void {
            const model = this._viewer.model;

            for (let nodeId of nodeIds) {
                if (model.getOutOfHierarchy(nodeId)) {
                    continue;
                }

                let parentNodeId = model.getNodeParent(nodeId);

                if (parentNodeId === null) {
                    console.assert(this._lastModelRoot !== null);
                    this._lastModelRoot = this._tree._insertNodeAfter(
                        model.getNodeName(nodeId),
                        this._partId(nodeId),
                        "modelroot",
                        this._lastModelRoot!,
                        true,
                    );
                } else {
                    const initialParent = parentNodeId;
                    do {
                        if (this._parentChildrenLoaded(parentNodeId)) {
                            if (initialParent === parentNodeId) {
                                this._tree.addChild(
                                    model.getNodeName(nodeId),
                                    this._partId(nodeId),
                                    this._partId(parentNodeId),
                                    "assembly",
                                    true,
                                    Desktop.Tree.Model,
                                );
                            }
                            this._tree.preloadChildrenIfNecessary(this._partId(nodeId));
                            break;
                        }

                        nodeId = parentNodeId;
                        parentNodeId = model.getNodeParent(nodeId);
                    } while (parentNodeId !== null);
                }
            }

            if (this._startedWithoutModelStructure) {
                const treeRoot = this._tree.getRoot();
                if (treeRoot.firstChild !== null) {
                    treeRoot.removeChild(treeRoot.firstChild);
                }

                const visibilityRoot = this._tree.getPartVisibilityRoot();
                if (visibilityRoot.firstChild !== null) {
                    visibilityRoot.removeChild(visibilityRoot.firstChild);
                }
            }
        }

        private _onSubtreeDeleted(nodeIds: NodeId[]): void {
            for (const nodeId of nodeIds) {
                this._tree.deleteNode(this._partId(nodeId));
            }
        }

        private _buildTreePathForNode(nodeId: NodeId): NodeId[] {
            // build up the path from the root to the selected item in the tree
            const model = this._viewer.model;
            const parents: NodeId[] = [];

            let parentId = model.getNodeParent(nodeId);
            while (parentId !== null) {
                // if it's a drawing, prevent loading other items in the tree on selection
                if (
                    this._viewer.sheetManager.isDrawingSheetActive() &&
                    this._currentSheetId !== null &&
                    (parentId === this._currentSheetId || nodeId === this._currentSheetId)
                ) {
                    break;
                }
                parents.push(parentId);
                parentId = model.getNodeParent(parentId);
            }

            parents.reverse();

            return parents;
        }

        private _expandCorrectContainerForNodeId(nodeId: NodeId): void {
            // get all children of parent and figure out which container this node is in
            const model = this._viewer.model;
            const parentId = model.getNodeParent(nodeId);
            if (parentId === null) {
                return;
            }
            const nodes = model.getNodeChildren(parentId);

            const index = nodes.indexOf(nodeId);

            if (index >= 0) {
                const containerIndex = Math.floor(index / this._maxNodeChildrenSize);
                this._tree.expandChildren(this._containerId(parentId, containerIndex));
            }
        }

        private _expandPmiFolder(nodeId: NodeId): void {
            const model = this._viewer.model;
            const parentId = model.getNodeParent(nodeId);
            if (parentId === null) {
                return;
            }
            this._tree.expandChildren(this._pmiFolderId(parentId));
        }

        private _isInsideContainer(nodeId: NodeId): boolean {
            const parentId = this._viewer.model.getNodeParent(nodeId);
            if (parentId === null) {
                return false;
            }
            const container0HtmlId = this._containerId(parentId, 0);
            const containerElement = $(`#${container0HtmlId}`);
            return containerElement.length > 0;
        }

        private _isInsidePmiFolder(nodeId: NodeId): boolean {
            const parentId = this._viewer.model.getNodeParent(nodeId);
            if (parentId === null) {
                return false;
            }
            const folderId = this._pmiFolderId(parentId);
            const folderElement = $(`#${folderId}`);
            return folderElement.length > 0;
        }

        public _expandPart(nodeId: NodeId): void {
            if (this._viewer.model.isNodeLoaded(nodeId)) {
                const ancestorIds = this._buildTreePathForNode(nodeId);

                for (const ancestorId of ancestorIds) {
                    // If this node is in a container, we must first expand that container.
                    if (this._isInsideContainer(ancestorId)) {
                        this._expandCorrectContainerForNodeId(ancestorId);
                    }

                    const $node = $(`#${this._partId(ancestorId)}`);
                    const nodeIdAttr = $node.attr("id");
                    if (nodeIdAttr !== undefined) {
                        this._tree.expandChildren(nodeIdAttr);
                    }
                }

                if (this._isInsideContainer(nodeId)) {
                    this._expandCorrectContainerForNodeId(nodeId);
                }

                if (this._isInsidePmiFolder(nodeId)) {
                    this._expandPmiFolder(nodeId);
                }

                this._tree.selectItem(this._partId(nodeId), false);
            }
        }

        private _onPartSelection(events: Event.NodeSelectionEvent[]): void {
            if (!this._partSelectionEnabled) {
                return;
            }

            for (const event of events) {
                const nodeId = event.getSelection().getNodeId();

                if (nodeId === null) {
                    this._tree.selectItem(null, false);
                } else {
                    this._expandPart(nodeId);
                }
            }

            if (events.length === 0) {
                this._tree.updateSelection(null);
            }
        }

        private _createContainerNodes(partId: NodeId, childNodes: NodeId[]): void {
            let containerStartIndex = 1;
            let containerEndIndex = this._maxNodeChildrenSize;

            let containerCount = 0;

            while (true) {
                const rangeEnd = Math.min(containerEndIndex, childNodes.length);
                const name = `Child Nodes ${containerStartIndex} - ${rangeEnd}`;

                this._tree.addChild(
                    name,
                    this._containerId(partId, containerCount),
                    this._partId(partId),
                    "container",
                    true,
                    Desktop.Tree.Model,
                );

                containerStartIndex += this._maxNodeChildrenSize;
                ++containerCount;

                if (containerEndIndex >= childNodes.length) return;
                else containerEndIndex += this._maxNodeChildrenSize;
            }
        }

        private _loadAssemblyNodeChildren(nodeId: NodeId): void {
            const model = this._viewer.model;

            const children = model.getNodeChildren(nodeId);

            // If this node has a large amount of children, we need to create grouping nodes for it.
            if (children.length > this._maxNodeChildrenSize) {
                this._createContainerNodes(nodeId, children);
            } else {
                const partId = this._partId(nodeId);
                this._processNodeChildren(children, partId);
            }
        }

        private _loadContainerChildren(containerId: HtmlId): void {
            const model = this._viewer.model;
            const idParts = this._splitHtmlId(containerId);
            const containerData = this._splitContainerId(idParts[1]);

            // First get all the children for the parent of this container node.
            const children = model.getNodeChildren(parseInt(containerData[0], 10));

            // Next we need to slice the array to contain only the children for this particular container.
            const startIndex = this._maxNodeChildrenSize * parseInt(containerData[1], 10);
            const childrenSlice = children.slice(
                startIndex,
                startIndex + this._maxNodeChildrenSize,
            );
            this._processNodeChildren(childrenSlice, containerId);
        }

        private _processNodeChildren(children: NodeId[], parentId: HtmlId): void {
            const model = this._viewer.model;
            let pmiFolder: HTMLElement | null = null;

            for (const childId of children) {
                const name = model.getNodeName(childId);

                let currParentId = parentId;
                let itemType: Control.ItemType = "assembly";
                let ignoreNode: boolean = false;

                switch (model.getNodeType(childId)) {
                    case NodeType.Body:
                    case NodeType.BodyInstance:
                        itemType = "body";
                        break;

                    case NodeType.Pmi:
                        // put pmi's under pmi folder
                        if (pmiFolder === null) {
                            const parentNodeId = this._viewer.model.getNodeParent(childId);
                            if (parentNodeId !== null) {
                                pmiFolder = this._tree.addChild(
                                    "PMI",
                                    this._pmiFolderId(parentNodeId),
                                    parentId,
                                    "modelroot",
                                    true,
                                    Desktop.Tree.Model,
                                    true,
                                    true,
                                );
                            }
                        }
                        if (pmiFolder !== null) {
                            currParentId = pmiFolder.id;
                            itemType = "assembly";
                        }
                        break;
                    case NodeType.DrawingSheet:
                        if (!this._viewer.sheetManager.isDrawingSheetActive()) {
                            ignoreNode = true;
                        }
                        break;
                }

                if (!ignoreNode) {
                    this._tree.addChild(
                        name,
                        this._partId(childId),
                        currParentId,
                        itemType,
                        model.getNodeChildren(childId).length > 0,
                        Desktop.Tree.Model,
                    );
                }
            }

            if (children.length > 0) {
                this._updateVisibilityStateTimer.set(50, () => {
                    this._tree.getVisibilityControl().updateModelTreeVisibilityState();
                });
            }
        }

        private _loadNodeChildren(htmlId: HtmlId): void {
            const idParts = this._splitHtmlId(htmlId);

            const kind = idParts[idParts[0] === "" ? 1 : 0];

            switch (kind) {
                case "part":
                    const nodeId: NodeId = parseInt(idParts[1], 10);
                    this._loadAssemblyNodeChildren(nodeId);
                    break;

                case "container":
                    this._loadContainerChildren(htmlId);
                    break;

                case "markupviews":
                case "measurementitems":
                case "pmipart":
                    // do nothing
                    break;

                default:
                    console.assert(false);
                    break;
            }
        }

        private async _onTreeSelectItem(
            htmlId: HtmlId,
            selectionMode: SelectionMode = SelectionMode.Set,
        ): Promise<void> {
            // toggle recursive selection base on what is clicked
            const thisElement = document.getElementById(htmlId);
            if (thisElement === null) {
                return;
            }
            if (thisElement.tagName === "LI" && htmlId !== "markupviews") {
                thisElement.classList.add("selected");
            } else {
                const viewTree = document.getElementById("markupviews");
                if (viewTree !== null) {
                    viewTree.classList.remove("selected");
                }
            }

            // don't allow selection on pmi folder
            if (
                htmlId.lastIndexOf("pmi", 0) === 0 &&
                thisElement.classList.contains("ui-modeltree-item")
            ) {
                thisElement.classList.remove("selected");
            }

            const idParts = this._splitHtmlId(htmlId);
            switch (idParts[0]) {
                case "part":
                    this._viewer.selectPart(parseInt(idParts[1], 10), selectionMode);
                    break;

                case "markupview":
                    await this._viewer.markupManager.activateMarkupViewWithPromise(idParts[1]);
                    break;

                case "container":
                    this._onContainerClick(idParts[1]);
                    break;
            }
        }

        private _onContainerClick(_containerId: HtmlId): void {
            // behavior here to TBD, for now do nothing.
        }

        private _onNewView(view: Markup.MarkupView): void {
            this._createMarkupViewFolderIfNecessary();
            this._addMarkupView(view);
        }

        private _refreshMarkupViews(): void {
            const markupManager = this._viewer.markupManager;
            const viewKeys = markupManager.getMarkupViewKeys();

            for (const viewKey of viewKeys) {
                const view = markupManager.getMarkupView(viewKey);
                if (view !== null) {
                    this._addMarkupView(view);
                }
            }
        }

        private _addMarkupView(view: Markup.MarkupView): void {
            this._createMarkupViewFolderIfNecessary();
            const viewId = this._viewId(view.getUniqueId());
            this._tree.addChild(
                view.getName(),
                viewId,
                "markupviews",
                "view",
                false,
                Desktop.Tree.Model,
            );
        }

        private _onNewMeasurement(measurement: Markup.Measure.MeasureMarkup): void {
            this._createMeasurementFolderIfNecessary();

            const measurementId = this._measurementId(measurement._getId());
            this._tree.addChild(
                measurement.getName(),
                measurementId,
                this._measurementFolderId,
                "measurement",
                false,
                Desktop.Tree.Model,
            );
            this._updateMeasurementsFolderVisibility();
            this._tree.updateMeasurementVisibilityIcons();
        }

        private _onDeleteMeasurement(measurement: Markup.Measure.MeasureMarkup): void {
            const measurementId = this._measurementId(measurement._getId());
            this._tree.deleteNode(measurementId);
            this._tree.deleteNode(`visibility${ModelTree.separator}${measurementId}`);
            this._updateMeasurementsFolderVisibility();
        }

        private _updateMeasurementsFolderVisibility(): void {
            const measurements = this._viewer.measureManager.getAllMeasurements();

            const measurementItems = document.getElementById(this._measurementFolderId);
            if (measurementItems !== null) {
                measurementItems.style["display"] = measurements.length ? "inherit" : "none";
            }
            const measurementVisibilityItems = document.getElementById(
                `visibility${ModelTree.separator}${this._measurementFolderId}`,
            );
            if (measurementVisibilityItems !== null) {
                measurementVisibilityItems.style["display"] = measurements.length
                    ? "inherit"
                    : "none";
            }
        }

        private _measurementId(measurementGuid: Uuid): HtmlId {
            return `measurement${ModelTree.separator}${measurementGuid}`;
        }

        private _partId(nodeId: NodeId): HtmlId {
            return `part${ModelTree.separator}${nodeId}`;
        }

        private _pmiFolderId(nodeId: NodeId): HtmlId {
            return `pmipartfolder${ModelTree.separator}${nodeId}`;
        }

        private _viewId(viewGuid: Uuid): HtmlId {
            return `markupview${ModelTree.separator}${viewGuid}`;
        }

        private _containerId(partId: NodeId, containerIndex: number): HtmlId {
            console.assert(containerIndex >= 0);
            return `container${ModelTree.separator}${partId}-${containerIndex}`;
        }

        private _splitContainerId(htmlId: HtmlId): string[] {
            return this._splitHtmlIdParts(htmlId, "-");
        }

        public updateSelection(items: Selection.NodeSelectionItem[] | null): void {
            this._tree.updateSelection(items);
        }
    }
}
