/// <reference path="ViewTree.ts"/>
/// <reference path="../../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui {
    export class LayersTree extends ViewTree {
        // prefix for top level layer names
        public static readonly layerPrefix = "layer";

        // prefix for parts that are in a layer
        public static readonly layerPartPrefix = "layerpart";

        // prefix for layerpart containers
        public static readonly layerPartContainerPrefix = "layerpartcontainer";

        private _layerNames: string[] = [];
        private _layerParts = new Set<NodeId>();

        private static _idCount: number = 0;
        private static _layerIdMap = new Map<HtmlId, LayerName>();
        private static _idLayerMap = new Map<LayerName, HtmlId>();
        private static _layerPartIdMap = new Map<HtmlId, number>();
        private static _idLayerPartMap = new Map<number, HtmlId>();
        private static _layerContainersMap = new Map<HtmlId, HtmlId[]>(); // Map Layer HTML IDs to it's contained containers

        constructor(viewer: WebViewer, elementId: HtmlId, iScroll: IScroll | null) {
            super(viewer, elementId, iScroll);
            this._initEvents();
        }

        private _initEvents(): void {
            const onNewModel = () => {
                this._onNewModel();
            };

            this._viewer.setCallbacks({
                firstModelLoaded: onNewModel,
                modelSwitched: onNewModel,
                subtreeLoaded: onNewModel,
                selectionArray: (events: Event.NodeSelectionEvent[]) => {
                    this._tree.updateSelection(events);

                    // Expand layers tree to reveal parts
                    for (const event of events) {
                        const nodeId = event.getSelection().getNodeId();
                        if (nodeId !== null) {
                            // By default we have a selection filter that will not allow us to select bodies
                            // so we should also check the children of all of the selected nodes in the case that
                            // they are product occurrences (which do not have layers themselves).
                            const childNodes = this._viewer.model.getNodeChildren(nodeId);
                            for (const childNode of childNodes) {
                                this._expandPart(childNode);
                            }

                            this._expandPart(nodeId);
                        }
                    }
                },
                visibilityChanged: () => {
                    this._tree.updateLayersVisibilityIcons();
                },
            });

            this._tree.registerCallback(
                "selectItem",
                (htmlId: HtmlId, selectionMode: SelectionMode) => {
                    this._onTreeSelectItem(htmlId, selectionMode);
                },
            );

            this._tree.registerCallback("loadChildren", (htmlId: HtmlId) => {
                this._loadNodeChildren(htmlId);
            });
        }

        private _onTreeSelectItem(
            htmlId: HtmlId,
            selectionMode: SelectionMode = SelectionMode.Set,
        ): void {
            const thisElement = document.getElementById(htmlId);
            if (thisElement === null) {
                return;
            }

            const idParts = this._splitHtmlId(htmlId);
            switch (idParts[0]) {
                case "layerpart":
                    this._selectLayerPart(htmlId, selectionMode);
                    break;
                case "layer":
                    this._selectLayer(htmlId, selectionMode);
                    break;
            }
        }

        private _selectLayerPart(layerPartId: HtmlId, selectionMode: SelectionMode): void {
            const partId = LayersTree.getPartId(layerPartId);
            if (partId !== null) {
                this._viewer.selectPart(partId, selectionMode);
            }
        }

        private _selectLayer(layerId: HtmlId, selectionMode: SelectionMode): void {
            const layerName = LayersTree.getLayerName(layerId);
            if (layerName !== null) {
                this._viewer.selectionManager.selectLayer(layerName, selectionMode);
            }
        }

        private _onNewModel(): void {
            const model = this._viewer.model;

            this._tree.clear();
            this._layerParts.clear();

            this._layerNames = model.getUniqueLayerNames().sort();

            this._layerNames.filter((layerName) => {
                const layerHtmlId = LayersTree._createLayerId();
                LayersTree._layerIdMap.set(layerHtmlId, layerName);
                LayersTree._idLayerMap.set(layerName, layerHtmlId);

                const layerIds = model.getLayerIdsFromName(layerName);
                if (layerIds !== null && layerIds.length > 0) {
                    this._tree.appendTopLevelElement(
                        layerName,
                        layerHtmlId,
                        "assembly",
                        true,
                        false,
                    );
                    return true;
                } else {
                    return false;
                }
            });

            if (this._layerNames.length > 0) {
                this.showTab();
            } else {
                this.hideTab();
            }
        }

        private _loadNodeChildren(htmlId: HtmlId): void {
            const layerName = LayersTree.getLayerName(htmlId);
            if (layerName === null) {
                return;
            }

            const layerHtmlId = LayersTree.getLayerId(layerName);
            if (layerHtmlId === null) {
                return;
            }

            const nodeIds = this._viewer.model.getNodesFromLayerName(layerName, true);
            if (nodeIds === null) {
                return;
            }

            if (nodeIds.length < this._maxNodeChildrenSize) {
                this._addLayerParts(layerHtmlId, nodeIds);
            } else {
                this._addLayerPartContainers(layerHtmlId, nodeIds);
            }
        }

        private _addLayerParts(parentHtmlId: HtmlId, nodeIds: NodeId[]): void {
            const model = this._viewer.model;
            const isDrawing = model.isDrawing();
            nodeIds.forEach((nodeId) => {
                const nodeType = model.getNodeType(nodeId);
                const fileType = model.getModelFileTypeFromNode(nodeId);
 
                /*
                 * Don't add BodyInstance nodes for BIM models.
                 *
                 * Drawing files (both 2D and 3D) should use the BodyInstance nodes, 
                 * as each BodyInstance might be in a different layer.
                 * 
                 * isDrawing will be false for 3D DWG files, so also check that the file
                 * is not a DWG file before substituting the BodyInstance for the parent.
                 */
                if (!isDrawing && fileType !== FileType.Dwg && nodeType === NodeType.BodyInstance) {
                    const parentId = model.getNodeParent(nodeId);
                    if (parentId !== null) {
                        nodeId = parentId;
                    }
                }

                const name = model.getNodeName(nodeId);
                const partHtmlId = LayersTree._createPartId(nodeId);
                LayersTree._layerPartIdMap.set(partHtmlId, nodeId);
                LayersTree._idLayerPartMap.set(nodeId, partHtmlId);

                if (!this._layerParts.has(nodeId)) {
                    this._layerParts.add(nodeId);
                    this._tree.addChild(
                        name,
                        partHtmlId,
                        parentHtmlId,
                        "assembly",
                        false,
                        Desktop.Tree.Layers,
                    );
                }
            });
        }

        private _addLayerPartContainers(parentHtmlId: HtmlId, nodeIds: NodeId[]): void {
            const containerCount = Math.ceil(nodeIds.length / this._maxNodeChildrenSize);
            const containerIds = [];
            for (let i = 0; i < containerCount; ++i) {
                const startIndex = i * this._maxNodeChildrenSize;
                const rangeEnd = Math.min(startIndex + this._maxNodeChildrenSize, nodeIds.length);
                const name = `Child Nodes ${startIndex} - ${rangeEnd}`;

                const containerId = LayersTree._createContainerId();
                containerIds.push(containerId);
                this._tree.addChild(
                    name,
                    containerId,
                    parentHtmlId,
                    "container",
                    true,
                    Desktop.Tree.Layers,
                );

                this._addLayerParts(containerId, nodeIds.slice(startIndex, rangeEnd));
            }
            LayersTree._layerContainersMap.set(parentHtmlId, containerIds);
        }

        public _expandPart(nodeId: NodeId): void {
            if (this._viewer.model.isNodeLoaded(nodeId)) {
                const layerId = this._viewer.model.getNodeLayerId(nodeId);
                if (layerId === null) {
                    return;
                }
                const layerName = this._viewer.model.getLayerName(layerId);
                if (layerName === null) {
                    return;
                }
                const layerHtmlId = LayersTree.getLayerId(layerName);
                if (layerHtmlId === null) {
                    return;
                }

                const layerNodes = this._viewer.model.getNodesFromLayerName(layerName, true);
                if (layerNodes === null) {
                    return;
                }

                let containerHtmlId = null;
                if (layerNodes.length >= this._maxNodeChildrenSize) {
                    // We should have containers under this layer. We need to find which container we need to expand
                    const nodeIndex = layerNodes.indexOf(nodeId);
                    const containerIndex = Math.floor(nodeIndex / this._maxNodeChildrenSize);
                    const containerIdArray = LayersTree._layerContainersMap.get(layerHtmlId);
                    if (
                        containerIdArray !== undefined &&
                        containerIndex < containerIdArray.length
                    ) {
                        containerHtmlId = containerIdArray[containerIndex];
                    }
                }

                this._tree.expandChildren(layerHtmlId);
                if (containerHtmlId !== null) {
                    this._tree.expandChildren(containerHtmlId);
                }
            }
        }

        private static _createLayerId(): HtmlId {
            return `${LayersTree.layerPrefix}${LayersTree.separator}${++this._idCount}`;
        }

        private static _createContainerId(): HtmlId {
            const prefix = LayersTree.layerPartContainerPrefix;
            return `${prefix}${LayersTree.separator}${++this._idCount}`;
        }

        private static _createPartId(nodeId: NodeId): HtmlId {
            return `${LayersTree.layerPartPrefix}${LayersTree.separator}${nodeId}`;
        }

        /**
         * Takes a layer [[HtmlId]] and returns the name of the corresponding layer.
         * @param layerId
         */
        public static getLayerName(layerId: HtmlId): LayerName | null {
            return this._layerIdMap.get(layerId) || null;
        }

        /**
         * Takes a layerName and returns a corresponding layer [[HtmlId]].
         * @param layerName
         */
        public static getLayerId(layerName: LayerName): HtmlId | null {
            return this._idLayerMap.get(layerName) || null;
        }

        /**
         * Takes a layerPart [[HtmlId]] and returns the corresponding [[NodeId]].
         * @param layerPartId
         */
        public static getPartId(layerPartId: HtmlId): NodeId | null {
            return this._layerPartIdMap.get(layerPartId) || null;
        }

        /**
         * Takes a [[NodeId]] and returns the corresponding layerPart [[HtmlId]].
         * @param nodeId
         */
        public static getLayerPartId(nodeId: NodeId): HtmlId | null {
            return this._idLayerPartMap.get(nodeId) || null;
        }
    }
}
