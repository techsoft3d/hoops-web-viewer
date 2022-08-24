/// <reference path="../../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui {
    function isIfcType(s: string): boolean {
        return s.substr(0, 3) === "IFC";
    }

    // A simple class for use in the TypesTree container map so we can keep track of which UUID maps
    // to which container
    class ContainerMapElement {
        public genericType: GenericType;
        public index: number;

        constructor(genericType: GenericType, index: number) {
            this.genericType = genericType;
            this.index = index;
        }
    }

    export class TypesTree extends ViewTree {
        // Assigned on modelStructureReady
        private _ifcNodesMap!: Map<GenericType, Set<NodeId>>;

        // Maps container UUIDs their contained elements for types that require containers
        private _containerMap: Map<Uuid, ContainerMapElement>;

        constructor(viewer: WebViewer, elementId: HtmlId, iScroll: IScroll | null) {
            super(viewer, elementId, iScroll);
            this._containerMap = new Map();
            this._initEvents();
        }

        private _initEvents(): void {
            const onNewModel = () => {
                return this._onNewModel();
            };

            this._viewer.setCallbacks({
                modelStructureReady: onNewModel,
                modelLoaded: onNewModel,
                selectionArray: (events: Event.NodeSelectionEvent[]) => {
                    if (this._ifcNodesMap.size > 0) {
                        this._tree.updateSelection(events);
                    }
                },
                visibilityChanged: () => {
                    this._tree.updateTypesVisibilityIcons();
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
            const partId = idParts[1];
            if (isIfcType(partId)) {
                this._selectIfcComponent(partId, selectionMode);
            } else {
                this._viewer.selectPart(parseInt(partId, 10), selectionMode);
            }
        }

        private _loadNodeChildren(parentHtmlId: HtmlId): void {
            const idParts = this._splitHtmlId(parentHtmlId);
            const nodeKind = idParts[0];
            switch (nodeKind) {
                case "typespart":
                    // this is the bottom level. Nothing to do
                    return;
                case "types":
                    this._loadGenericTypeChildren(parentHtmlId);
                    break;
                case "container":
                    this._loadContainerChildren(parentHtmlId);
                    break;
            }
        }

        private _loadGenericTypeChildren(parentHtmlId: HtmlId): void {
            const idParts = this._splitHtmlId(parentHtmlId);
            const genericType = idParts[1];

            const nodeIds = this._ifcNodesMap.get(genericType);
            if (nodeIds === undefined) {
                return;
            }

            if (nodeIds.size > this._maxNodeChildrenSize) {
                // If there's too many nodes to load at once just create some containers for them
                this._createContainerNodes(parentHtmlId, genericType);
                return;
            }

            nodeIds.forEach((nodeId) => {
                this._addChildPart(nodeId, parentHtmlId);
            });
        }

        private _loadContainerChildren(parentHtmlId: HtmlId): void {
            const containerUuid = this._splitHtmlId(parentHtmlId)[1];
            const containerMapElement = this._containerMap.get(containerUuid);
            if (containerMapElement === undefined) {
                return;
            }
            const genericType = containerMapElement.genericType;
            const containerIndex = containerMapElement.index;

            const allNodeIds = this._ifcNodesMap.get(genericType);
            if (allNodeIds === undefined) {
                return;
            }

            const nodeIdStartIndex = containerIndex * this._maxNodeChildrenSize;
            const partiallyFilled = allNodeIds.size - nodeIdStartIndex < this._maxNodeChildrenSize;
            const nodeIdEndIndex = partiallyFilled
                ? allNodeIds.size
                : nodeIdStartIndex + this._maxNodeChildrenSize;
            const containerNodeIds = Util.setToArray(allNodeIds).slice(
                nodeIdStartIndex,
                nodeIdEndIndex,
            );
            for (const nodeId of containerNodeIds) {
                this._addChildPart(nodeId, parentHtmlId);
            }
        }

        private _addChildPart(nodeId: NodeId, parentHtmlId: HtmlId) {
            const childHtmlId = TypesTree.getComponentPartId(nodeId);
            const name = this._viewer.model.getNodeName(nodeId);
            this._tree.addChild(name, childHtmlId, parentHtmlId, "part", false, Desktop.Tree.Types);
        }

        private _createContainerNodes(parentHtmlId: HtmlId, genericType: GenericType): void {
            const nodeIds = this._ifcNodesMap.get(genericType);
            if (nodeIds === undefined) {
                console.assert(
                    false,
                    "Tried to create a container for nodes of a non-existent GenericType",
                );
                return;
            }

            for (
                let startNode = 0;
                startNode < nodeIds.size;
                startNode += this._maxNodeChildrenSize
            ) {
                const partiallyFilled = startNode + this._maxNodeChildrenSize > nodeIds.size;
                const endNode = partiallyFilled
                    ? nodeIds.size - 1
                    : startNode + this._maxNodeChildrenSize - 1;

                const containerName = `Child nodes ${startNode} - ${endNode}`;
                const containerIndex = startNode / this._maxNodeChildrenSize;
                const containerUuid = UUID.create();
                this._tree.addChild(
                    containerName,
                    TypesTree.getContainerId(containerUuid),
                    parentHtmlId,
                    "container",
                    true,
                    Desktop.Tree.Types,
                );

                const containerMapElement = new ContainerMapElement(genericType, containerIndex);
                this._containerMap.set(containerUuid, containerMapElement);
            }
        }

        private _selectIfcComponent(genericType: string, selectionMode: SelectionMode): void {
            this._viewer.selectionManager.selectType(genericType, selectionMode);
        }

        private async _onNewModel(): Promise<void> {
            const model = this._viewer.model;

            this._tree.clear();

            this._ifcNodesMap = model.getGenericTypeIdMap();
            this._ifcNodesMap.forEach((_, genericType) => {
                const parentHtmlId = TypesTree.getGenericTypeId(genericType);
                const itemType: Control.ItemType = "assembly";
                const hasChildren = true;
                const loadChildren = false;
                this._tree.appendTopLevelElement(
                    genericType,
                    parentHtmlId,
                    itemType,
                    hasChildren,
                    loadChildren,
                );
            });

            if (this._ifcNodesMap.size === 0) {
                this.hideTab();
            } else {
                this.showTab();
            }
        }

        public static getComponentPartId(id: NodeId): HtmlId {
            return `typespart${ViewTree.separator}${id}`;
        }

        public static getGenericTypeId(genericType: GenericType): HtmlId {
            return `types${ViewTree.separator}${genericType}`;
        }

        private static getContainerId(uuid: Uuid): HtmlId {
            return `container${ModelTree.separator}${uuid}`;
        }
    }
}
