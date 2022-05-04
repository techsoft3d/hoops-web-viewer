namespace Communicator {
    /** @hidden */
    export class RedlineOperator extends Operator.OperatorBase {
        protected _viewer: WebViewer;
        private _activeRedlineItem: Markup.Redline.RedlineItem | null = null;
        private _newRedlineItem: Markup.Redline.RedlineItem | null = null;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            super(viewer);
            this._viewer = viewer;
        }

        // Interface method for derived operators to implement
        /** @hidden */
        public createRedlineItem(position: Point2): Markup.Redline.RedlineItem | null {
            position as Unreferenced;
            return null;
        }

        // Interface method for derived operators to implement
        /** @hidden */
        public updateRedlineItem(position: Point2): void {
            position as Unreferenced;
        }

        // Interface method for derived operators to implement
        /** @hidden */
        public finalizeRedlineItem(position: Point2): Markup.Redline.RedlineItem | null {
            position as Unreferenced;
            return null;
        }

        // Default behavior for redline operators

        /** @hidden */
        public onMouseDown(event: Event.MouseInputEvent): void {
            super.onMouseDown(event);

            if (this.isActive()) {
                if (event.getButton() === Button.Left || this._primaryTouchId !== null) {
                    this._redlineOperatorStart();
                }
                event.setHandled(true);
            }
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            super.onMouseMove(event);

            if (this.isActive()) {
                this._redlineOperatorMove();
                event.setHandled(true);
            }
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            if (this.isActive()) {
                if (event.getButton() === Button.Left || this._primaryTouchId !== null) {
                    this._redlineOperatorEnd();
                }
                event.setHandled(true);
            }

            super.onMouseUp(event);
        }

        /** @hidden */
        public onMousewheel(event: Event.MouseWheelInputEvent): void {
            event.setHandled(true);
        }

        /** @hidden */
        public setDraggingEnabled(dragging: boolean): void {
            this._dragging = dragging;
        }

        /** @hidden */
        public setHandled(): boolean {
            return true;
        }

        private _isRedlineItem(markup: Markup.MarkupItem) {
            return Object.getPrototypeOf(markup) instanceof Markup.Redline.RedlineItem;
        }

        /** @hidden */
        public onKeyUp(event: Event.KeyInputEvent): void {
            const keyCode = event.getKeyCode();

            if (keyCode === KeyCode.Backspace || keyCode === KeyCode.Delete) {
                const markupManager = this._viewer.markupManager;
                const selectedMarkup = markupManager.getSelectedMarkup();
                const activeView = markupManager.getActiveMarkupView();

                if (
                    selectedMarkup !== null &&
                    this._isRedlineItem(selectedMarkup) &&
                    activeView !== null
                ) {
                    activeView.removeMarkup(selectedMarkup);
                    markupManager.selectMarkup(null);
                }
            }
        }

        private _removeRedlineTextIfInvalid(markupItem: Markup.MarkupItem): void {
            const redlineText = markupItem as Markup.Redline.RedlineText;
            if (!redlineText.isValid()) {
                const activeView = this._viewer.markupManager.getActiveMarkupView();
                if (activeView !== null) {
                    activeView.removeMarkup(redlineText);
                    this._viewer.trigger(
                        "redlineDeleted",
                        redlineText as Markup.Redline.RedlineItem,
                    );
                }
                redlineText.remove();
            }
        }

        // Generic behavior to handle dragging of redline

        private _redlineOperatorStart(): void {
            const markup = this._viewer.markupManager;
            const pickedMarkup = markup.pickMarkupItem(this._ptFirst);
            const previouslySelectedMarkup = markup.getSelectedMarkup();

            if (!pickedMarkup) {
                if (previouslySelectedMarkup != null) {
                    previouslySelectedMarkup.onDeselect();
                }
                markup.selectMarkup(null);

                // If selected markup was redline, check that it is still valid
                if (this._markupIsTextArea(previouslySelectedMarkup)) {
                    this._removeRedlineTextIfInvalid(previouslySelectedMarkup!);
                }
                // Otherwise create new redline item
                else {
                    this._newRedlineItem = this.createRedlineItem(this._ptFirst);
                }
            } else {
                // Start dragging element
                this._activeRedlineItem = pickedMarkup as Markup.Redline.RedlineItem;
                if (this._dragging && this._activeRedlineItem.onDragStart(this._ptFirst))
                    markup.refreshMarkup();
            }
        }

        private _redlineOperatorMove(): void {
            if (this._activeRedlineItem) {
                if (this._dragging && this._activeRedlineItem.onDragMove(this._ptCurrent))
                    this._viewer.markupManager.refreshMarkup();
            } else {
                this.updateRedlineItem(this._ptCurrent);
            }
        }

        private _redlineOperatorEnd(): void {
            const markup = this._viewer.markupManager;

            if (this._activeRedlineItem) {
                // No drag, perform selection on active item
                if (this._ptFirst.equals(this._ptCurrent)) {
                    markup.selectMarkup(this._activeRedlineItem);
                }
                // We were dragging
                else {
                    this._viewer.trigger("redlineUpdated", this._activeRedlineItem);
                    if (this._dragging && this._activeRedlineItem.onDragEnd(this._ptCurrent))
                        markup.refreshMarkup();
                }
            }
            // We were creating a new redline item
            else if (this._newRedlineItem) {
                const newMarkup = this.finalizeRedlineItem(this._ptCurrent);
                // If a new item was created then we need to ensure that it is attached to an active view
                if (newMarkup) this._attachNewMarkupToView(newMarkup) as Internal.UnusedPromise;
            }

            this._activeRedlineItem = null;
            this._newRedlineItem = null;
        }

        private async _attachNewMarkupToView(newMarkup: Markup.Redline.RedlineItem): Promise<void> {
            const viewer = this._viewer;
            const model = viewer.model;
            const markup = viewer.markupManager;

            let activeView = markup.getActiveMarkupView();
            let viewCreated = false;
            if (activeView === null) {
                const rootNode = model.getAbsoluteRootNode();
                const visibilityState = await model.getVisibilityState(rootNode);
                const colors = await model.getNodeColorMap(
                    model.getAbsoluteRootNode(),
                    ElementType.Faces,
                );
                const uniqueId = markup.createMarkupView(
                    undefined,
                    false,
                    visibilityState,
                    colors,
                    null,
                );

                activeView = markup.getMarkupView(uniqueId);
                viewCreated = true;
            }

            if (activeView !== null) {
                activeView.addMarkupItem(newMarkup);
                markup.selectMarkup(newMarkup);
            }

            if (viewCreated && activeView !== null) {
                this._viewer.trigger("viewCreated", activeView);
            }
            this._viewer.trigger("redlineCreated", newMarkup);
        }

        private _markupIsTextArea(markupItem: Markup.MarkupItem | null): boolean {
            if (markupItem)
                return markupItem.getClassName() === Markup.Redline.RedlineText.className;
            else return false;
        }
    }
}
