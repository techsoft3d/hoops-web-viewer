/// <reference path="ViewTree.ts"/>
/// <reference path="../../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui {
    export type RelationshipTypeName = string;
    export type RelationshipName = string;
    export interface RelationshipInfo {
        name: string;
        nodeId: BimId;
        processed: boolean;
    }

    export class RelationshipsTree extends ViewTree {
        public static readonly RelationshipPrefix = "relships";
        public static readonly RelationshipTypePrefix = "relshipsType";
        public static readonly RelationshipPartPrefix = "relshipsPart";

        private static _idCount: number = 0;

        private static _nameIdMap = new Map<HtmlId, RelationshipTypeName | RelationshipName>();
        private static _idNameMap = new Map<RelationshipTypeName | RelationshipName, HtmlId>();

        private _currentNodeId: NodeId = 0; // Needed to know the context // SCA : 0? SGE:-1?
        private _currentBimNodeId: BimId = "0"; // SCA : 0? SGE:-1?

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
                firstModelLoaded: onNewModel,
                modelSwitched: onNewModel,
                subtreeLoaded: onNewModel,
                selectionArray: async (events: Event.NodeSelectionEvent[]) => {
                    await this._onTreeSelectItem(events);
                },
            });

            this._tree.registerCallback("loadChildren", (htmlId: HtmlId) => {
                this._loadNodeChildren(htmlId);
            });

            this._tree.registerCallback("selectItem", async (htmlId: HtmlId) => {
                await this._onclickItemButton(htmlId);
            });

            this._tree.registerCallback("clickItemButton", async (htmlId: HtmlId) => {
                await this._onSelectRelationships(htmlId);
            });
        }

        private async _onTreeSelectItem(events: Event.NodeSelectionEvent[]): Promise<void> {
            for (const event of events) {
                const nodeId = event.getSelection().getNodeId();
                if (nodeId === null) {
                    this._tree.selectItem(null, false);
                } else {
                    const bimId = this._viewer.model.getBimIdFromNode(nodeId);
                    if (bimId !== null) {
                        this._currentNodeId = nodeId;
                        this._currentBimNodeId = bimId;
                        this._update();
                    }
                }
            }
        }

        private _translateTypeRelationshipToString(type: RelationshipType): string {
            let typeString: string = "Type Unknown";
            if (type !== RelationshipType.Undefined) typeString = RelationshipType[type];
            return typeString;
        }

        private _translateStringTypeToRelationshipType(typeString: string): RelationshipType {
            let type: RelationshipType = RelationshipType.Undefined;

            switch (typeString) {
                case "ContainedInSpatialStructure":
                    type = RelationshipType.ContainedInSpatialStructure;
                    break;
                case "FillsElement":
                    type = RelationshipType.FillsElement;
                    break;
                case "Aggregates":
                    type = RelationshipType.Aggregates;
                    break;
                case "VoidsElement":
                    type = RelationshipType.VoidsElement;
                    break;
                case "SpaceBoundary":
                    type = RelationshipType.SpaceBoundary;
                    break;
                case "ConnectsPathElements":
                    type = RelationshipType.ConnectsPathElements;
                    break;
                default:
                    type = RelationshipType.Undefined;
            }
            return type;
        }

        // const idParts = this._splitHtmlId(htmlId);

        //  switch (idParts[0]) {
        //      case "Relationpart":
        //          this._selectRelationPart(htmlId, selectionMode);
        //          break;
        //      case "relation":
        //          this._selectRelation(htmlId, selectionMode);
        //          break;
        //}

        // const idParts = this._splitHtmlId(htmlId);
        // switch (idParts[0]) {
        //     case "part":
        //         this.createMock(parseInt(idParts[1], 10));
        //         break;
        // }
        //}

        private static _createIdNode(nodeid: BimId): HtmlId {
            return `${RelationshipsTree.RelationshipPartPrefix}${
                RelationshipsTree.separator
            }${nodeid}${RelationshipsTree.separator}${++this._idCount}`;
        }

        private static _createIdType(): HtmlId {
            return `${RelationshipsTree.RelationshipTypePrefix}${
                RelationshipsTree.separator
            }${++this._idCount}`;
        }

        /**
         * Takes a relation [[HtmlId]] and returns the name of the corresponding relation.
         * @param relationId
         */
        public static getRelationshipTypeName(
            relationshipTypeId: HtmlId,
        ): RelationshipTypeName | null {
            return this._idNameMap.get(relationshipTypeId) || null;
        }

        /**
         * Takes a relationName and returns a corresponding relation [[HtmlId]].
         * @param relationName
         */
        public static getRelationshipTypeId(
            relationshipTypeName: RelationshipTypeName,
        ): HtmlId | null {
            return this._nameIdMap.get(relationshipTypeName) || null;
        }

        private _onNewModel(): void {
            const model = this._viewer.model;

            this._tree.clear();
            this._currentNodeId = model.getAbsoluteRootNode();
            this._currentBimNodeId = this._currentNodeId.toString();
        }

        private _update(): void {
            this._tree.clear();
            const relationshipTypes = this._viewer.model.getRelationshipTypesFromBimId(
                this._currentNodeId,
                this._currentBimNodeId,
            );
            for (const iterType of relationshipTypes) {
                const relationshipHtmlId = RelationshipsTree._createIdType();
                const typeString = this._translateTypeRelationshipToString(iterType);
                RelationshipsTree._idNameMap.set(relationshipHtmlId, typeString);
                RelationshipsTree._nameIdMap.set(typeString, relationshipHtmlId);
                this._tree.appendTopLevelElement(
                    typeString,
                    relationshipHtmlId,
                    "assembly",
                    true,
                    false,
                );
            }
        }

        private _loadNodeChildren(htmlId: HtmlId): void {
            const typeName = RelationshipsTree.getRelationshipTypeName(htmlId);
            if (typeName === null) {
                return;
            }

            const typeHtmlId = RelationshipsTree.getRelationshipTypeId(typeName);
            if (typeHtmlId === null) {
                return;
            }
            this._addRelationships(typeHtmlId, typeName);
        }

        private _addRelationships(parentHtmlId: HtmlId, typeName: string): void {
            const type = this._translateStringTypeToRelationshipType(typeName);
            const relationships = this._viewer.model.getBimIdConnectedElements(
                this._currentNodeId,
                this._currentBimNodeId,
                type,
            );
            for (const iterRelating of relationships.relatings) {
                const iterBimId: BimId = iterRelating;
                let displayName =
                    '<button class="ui-model-tree-relationships-button" type="button" id="buttonRight"><b>←</b></button>';
                const relationHtmlId = RelationshipsTree._createIdNode(iterRelating);
                const bimInfo = this._viewer.model.getBimInfoFromBimId(
                    this._currentNodeId,
                    iterBimId,
                );
                RelationshipsTree._idNameMap.set(relationHtmlId, bimInfo.name);
                RelationshipsTree._idNameMap.set(bimInfo.name, relationHtmlId);
                displayName = displayName.concat(" ");
                displayName = displayName.concat(bimInfo.name);
                this._tree.addChild(
                    displayName,
                    relationHtmlId,
                    parentHtmlId,
                    "assembly",
                    false,
                    Desktop.Tree.Relationships,
                    bimInfo.connected,
                );
            }
            for (const iterRelated of relationships.relateds) {
                const iterBimId: BimId = iterRelated;
                let displayName =
                    '<button class="ui-model-tree-relationships-button" type="button" id="buttonRight"><b>→</b> </button>';
                const relationHtmlId = RelationshipsTree._createIdNode(iterRelated);
                const bimInfo = this._viewer.model.getBimInfoFromBimId(
                    this._currentNodeId,
                    iterBimId,
                );
                RelationshipsTree._idNameMap.set(relationHtmlId, bimInfo.name);
                RelationshipsTree._idNameMap.set(bimInfo.name, relationHtmlId);
                displayName = displayName.concat(" ");
                displayName = displayName.concat(bimInfo.name);
                this._tree.addChild(
                    displayName,
                    relationHtmlId,
                    parentHtmlId,
                    "assembly",
                    false,
                    Desktop.Tree.Relationships,
                    bimInfo.connected,
                );
            }
        }

        private async _onclickItemButton(htmlId: HtmlId): Promise<void> {
            const thisElement = document.getElementById(htmlId);
            if (thisElement === null) {
                return;
            }
            const idParts = this._splitHtmlId(htmlId);
            if (idParts.length > 0) {
                const htmlId = this._splitHtmlIdParts(idParts[0], RelationshipsTree.separator);
                if (htmlId[0] === RelationshipsTree.RelationshipPartPrefix) {
                    const nodeId = this._viewer.model.getNodeIdFromBimId(
                        this._currentNodeId,
                        htmlId[1],
                    );
                    if (nodeId !== null) {
                        this._viewer.model.resetModelHighlight();
                        this._viewer.model.setNodesHighlighted([nodeId], true);
                    }
                }
            }
        }

        private async _onSelectRelationships(htmlId: HtmlId): Promise<void> {
            const idParts = this._splitHtmlId(htmlId);
            if (idParts.length > 0) {
                const htmlId = this._splitHtmlIdParts(idParts[0], RelationshipsTree.separator);
                if (htmlId[0] === RelationshipsTree.RelationshipPartPrefix) {
                    const nodeId = this._viewer.model.getNodeIdFromBimId(
                        this._currentNodeId,
                        htmlId[1],
                    );
                    this._viewer.selectPart(nodeId, SelectionMode.Set);
                }
            }
        }
    }
}
