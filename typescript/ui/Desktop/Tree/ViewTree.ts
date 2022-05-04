/// <reference path="../../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui {
    export type TreeCallbackName =
        | "addChild"
        | "loadChildren"
        | "collapse"
        | "context"
        | "expand"
        | "selectItem"
        | "clickItemButton";

    export class ViewTree {
        protected readonly _tree: Control.TreeControl;
        protected readonly _viewer: WebViewer;
        protected readonly _internalId: HtmlId;

        public static readonly separator = "_";
        public static readonly visibilityPrefix = "visibility";

        protected readonly _maxNodeChildrenSize = 300;

        constructor(viewer: WebViewer, elementId: HtmlId, iScroll: IScroll | null) {
            this._tree = new Control.TreeControl(elementId, viewer, ViewTree.separator, iScroll);
            this._internalId = `${elementId}Id`;
            this._viewer = viewer;
        }

        public getElementId(): HtmlId {
            return this._tree.getElementId();
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

        public registerCallback(name: TreeCallbackName, func: Function): void {
            this._tree.registerCallback(name, func);
        }

        protected _splitHtmlId(htmlId: HtmlId): [string, string] {
            return this._splitHtmlIdParts(htmlId, ViewTree.separator);
        }

        protected _splitHtmlIdParts(htmlId: HtmlId, separator: string): [string, string] {
            const splitPos = htmlId.lastIndexOf(separator);

            if (splitPos === -1) {
                return ["", htmlId];
            }

            return [htmlId.substring(0, splitPos), htmlId.substring(splitPos + separator.length)];
        }

        protected hideTab(): void {
            $(`#${this.getElementId()}Tab`).hide();
        }

        protected showTab(): void {
            $(`#${this.getElementId()}Tab`).show();
        }

        /** @hidden */
        public _getTreeControl(): Control.TreeControl {
            return this._tree;
        }
    }
}
