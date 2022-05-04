namespace Example {
    export class AnnotationMarkup extends Communicator.Markup.MarkupItem {
        protected _viewer: Communicator.WebViewer;

        private _leaderAnchor: Communicator.Point3;
        private _textBoxAnchor: Communicator.Point3;

        private _leaderLine = new Communicator.Markup.Shape.Line();
        private _textBox = new Communicator.Markup.Shape.TextBox();
        private _nodeId: number;
        private _showAsColor = false;

        public constructor(
            viewer: Communicator.WebViewer,
            nodeId: number,
            anchorPoint: Communicator.Point3,
            label: string,
        ) {
            super();

            this._nodeId = nodeId;

            this._viewer = viewer;
            this._leaderAnchor = anchorPoint.copy();
            this._textBoxAnchor = anchorPoint.copy();

            this._textBox.setTextString(label);
            this._textBox.getBoxPortion().setFillOpacity(1.0);
            this._textBox.getBoxPortion().setFillColor(Communicator.Color.white());
            this._textBox.getTextPortion().setFillColor(Communicator.Color.red());
            this._textBox.getTextPortion().setFontSize(16);
            this._leaderLine.setStartEndcapType(Communicator.Markup.Shape.EndcapType.Arrowhead);
        }

        public draw() {
            this._behindView = false;

            const leaderPoint3d: Communicator.Point3 = this._viewer.view.projectPoint(
                this._leaderAnchor,
            );
            const boxAnchor3d: Communicator.Point3 = this._viewer.view.projectPoint(
                this._textBoxAnchor,
            );

            if (leaderPoint3d.z <= 0.0) this._behindView = true;

            if (boxAnchor3d.z <= 0.0) this._behindView = true;

            const leaderPoint2d = Communicator.Point2.fromPoint3(leaderPoint3d);
            const boxAnchor2d = Communicator.Point2.fromPoint3(boxAnchor3d);

            this._leaderLine.set(leaderPoint2d, boxAnchor2d);
            this._textBox.setPosition(boxAnchor2d);

            const renderer = this._viewer.markupManager.getRenderer();

            renderer.drawLine(this._leaderLine);
            renderer.drawTextBox(this._textBox);
        }

        public hit(point: Communicator.Point2): boolean {
            const measurement = this._viewer.markupManager
                .getRenderer()
                .measureTextBox(this._textBox);

            const position = this._textBox.getPosition();

            if (point.x < position.x) return false;
            if (point.x > position.x + measurement.x) return false;
            if (point.y < position.y) return false;
            if (point.y > position.y + measurement.y) return false;

            return true;
        }

        public setShowAsColor(showAsColor: boolean) {
            this._showAsColor = showAsColor;
        }

        public getShowAsColor(): boolean {
            return this._showAsColor;
        }

        public getNodeId(): number {
            return this._nodeId;
        }

        public getLeaderLineAnchor(): Communicator.Point3 {
            return this._leaderAnchor.copy();
        }

        public getTextBoxAnchor(): Communicator.Point3 {
            return this._textBoxAnchor;
        }

        public setTextBoxAnchor(newAnchorPoint: Communicator.Point3) {
            this._textBoxAnchor.assign(newAnchorPoint);
        }

        public setLabel(label: string) {
            this._textBox.setTextString(label);
        }

        public getLabel(): string {
            return this._textBox.getTextString();
        }
    }

    interface AnnotationMap {
        [handle: string]: AnnotationMarkup | undefined;
    }

    export class AnnotationRegistry {
        private _viewer: Communicator.WebViewer;
        private _pulseManager: PulseManager;

        private _table: HTMLTableElement;
        private _annotationMap: AnnotationMap = {}; // TODO: Use a native JS Map object.

        public constructor(viewer: Communicator.WebViewer, pulseManager: PulseManager) {
            this._viewer = viewer;
            this._pulseManager = pulseManager;
            this._table = document.getElementById("AnnotationRegistry") as HTMLTableElement;
        }

        public getAnnotation(markupHandle: string): AnnotationMarkup | undefined {
            return this._annotationMap[markupHandle];
        }

        public export(): string {
            const result: Object[] = [];

            const keys = Object.keys(this._annotationMap);
            for (const key of keys) {
                const annotation = this._annotationMap[key]!;
                result.push({
                    name: annotation.getLabel(),
                    position: annotation.getLeaderLineAnchor().toJson(),
                    nodeId: annotation.getNodeId(),
                    showAsColor: annotation.getShowAsColor(),
                });
            }

            return JSON.stringify(result);
        }

        public addAnnotation(markupHandle: string, annotation: AnnotationMarkup) {
            this._annotationMap[markupHandle] = annotation;

            const tr = document.createElement("tr");
            tr.id = markupHandle;

            const idTd = document.createElement("td");
            idTd.id = `${markupHandle}-nodeId`;
            idTd.innerText = annotation.getNodeId().toString();
            tr.appendChild(idTd);

            const nametd = document.createElement("td");
            nametd.id = `${markupHandle}-name`;
            nametd.innerText = annotation.getLabel();
            tr.appendChild(nametd);

            const actionstd = document.createElement("td");

            const renameButton = document.createElement("button");
            renameButton.innerText = "Rename";
            renameButton.onclick = () => {
                this._renameAnnotation(markupHandle);
            };
            actionstd.appendChild(renameButton);

            const deleteButton = document.createElement("button");
            deleteButton.innerText = "Delete";
            deleteButton.onclick = () => {
                this._deleteAnnotation(markupHandle);
            };
            actionstd.appendChild(deleteButton);
            tr.appendChild(actionstd);

            const showAsColortd = document.createElement("td");
            const showAsColor = document.createElement("input");
            showAsColor.type = "checkbox";
            showAsColor.id = `${markupHandle}-showAsColor`;
            showAsColor.classList.add("showAsColor");
            showAsColortd.appendChild(showAsColor);

            showAsColor.onchange = (event: Event) => {
                this._onPulseChange(markupHandle, event.target as HTMLInputElement);
            };

            tr.appendChild(showAsColortd);

            this._table.appendChild(tr);
        }

        private _onPulseChange(markupHandle: string, target: HTMLInputElement) {
            const annotation = this.getAnnotation(markupHandle);
            if (annotation === undefined) {
                return;
            }
            annotation.setShowAsColor(target.checked);

            if (target.checked) {
                this._pulseManager.add(
                    annotation.getNodeId(),
                    this._pulseManager.getDefaultColor1(),
                    this._pulseManager.getDefaultColor2(),
                    this._pulseManager.getDefaultPulseTime(),
                );
            } else {
                this._pulseManager.deletePulse(annotation.getNodeId());
                this._viewer.redraw();
            }
        }

        private _renameAnnotation(markupHandle: string) {
            const annotation = this._annotationMap[markupHandle];
            if (annotation === undefined) {
                return;
            }

            const newMarkupName = prompt(
                `Enter a new name for ${annotation.getLabel()}`,
                annotation.getLabel(),
            );

            if (newMarkupName != null) {
                annotation.setLabel(newMarkupName);
                this._viewer.markupManager.refreshMarkup();
                const element = document.getElementById(`${markupHandle}-name`);
                if (element !== null) {
                    element.innerText = newMarkupName;
                }
            }
        }

        private _deleteAnnotation(markupHandle: string) {
            this._viewer.markupManager.unregisterMarkup(markupHandle);

            const annotation = this._annotationMap[markupHandle];
            if (annotation !== undefined) {
                this._pulseManager.deletePulse(annotation.getNodeId());
                delete this._annotationMap[markupHandle];
            }

            const element = document.getElementById(markupHandle);
            if (element !== null && element.parentElement !== null) {
                element.parentElement.removeChild(element);
            }
        }
    }

    export class AnnotationOperator implements Communicator.Operator.Operator {
        protected _viewer: Communicator.WebViewer;
        protected _annotationRegistry: AnnotationRegistry;

        private _previousAnchorPlaneDragPoint: Communicator.Point3 | null = null;
        private _activeMarkup: AnnotationMarkup | null = null;
        private _previousNodeId: number | null = null;

        public constructor(viewer: Communicator.WebViewer, annotationRegistry: AnnotationRegistry) {
            this._viewer = viewer;
            this._annotationRegistry = annotationRegistry;
        }

        public async onMouseDown(event: Communicator.Event.MouseInputEvent): Promise<void> {
            const selection = await this._viewer.view.pickFromPoint(
                event.getPosition(),
                new Communicator.PickConfig(Communicator.SelectionMask.All),
            );
            if (selection !== null && selection.overlayIndex() !== 0) return;

            const downPosition = event.getPosition();
            if (this._selectAnnotation(downPosition)) {
                event.setHandled(true);
            } else if (selection !== null && selection.isNodeEntitySelection()) {
                const nodeId = selection.getNodeId();
                const selectionPosition = selection.getPosition();

                const annotationMarkup = new AnnotationMarkup(
                    this._viewer,
                    nodeId,
                    selectionPosition,
                    `${this._viewer.model.getNodeName(nodeId)} Connector`,
                );
                const markupHandle = this._viewer.markupManager.registerMarkup(annotationMarkup);
                this._annotationRegistry.addAnnotation(markupHandle, annotationMarkup);
                this._startDraggingAnnotation(annotationMarkup, downPosition);
                event.setHandled(true);
            }
        }

        public async onMouseMove(event: Communicator.Event.MouseInputEvent): Promise<void> {
            if (this._activeMarkup !== null) {
                const currentAnchorPlaneDragPoint = this._getDragPointOnAnchorPlane(
                    event.getPosition(),
                );
                let dragDelta;
                if (
                    this._previousAnchorPlaneDragPoint !== null &&
                    currentAnchorPlaneDragPoint !== null
                ) {
                    dragDelta = Communicator.Point3.subtract(
                        currentAnchorPlaneDragPoint,
                        this._previousAnchorPlaneDragPoint,
                    );
                } else {
                    dragDelta = Communicator.Point3.zero();
                }

                const newAnchorPos = this._activeMarkup.getTextBoxAnchor().add(dragDelta);
                this._activeMarkup.setTextBoxAnchor(newAnchorPos);

                this._previousAnchorPlaneDragPoint = currentAnchorPlaneDragPoint;

                this._viewer.markupManager.refreshMarkup();

                event.setHandled(true);
            } else {
                const pickResult = await this._viewer.view.pickFromPoint(
                    event.getPosition(),
                    new Communicator.PickConfig(),
                );
                const selectedNodeId = pickResult.getNodeId();

                if (selectedNodeId !== this._previousNodeId) {
                    if (this._previousNodeId != null) {
                        this._viewer.model.setNodesHighlighted([this._previousNodeId], false);
                    }

                    if (selectedNodeId != null) {
                        this._viewer.model.setNodesHighlighted([selectedNodeId], true);
                    }
                }

                this._previousNodeId = selectedNodeId;
            }
        }

        public onMouseUp(_event: Communicator.Event.MouseInputEvent) {
            this._activeMarkup = null;
            this._previousAnchorPlaneDragPoint = null;
        }

        protected _startDraggingAnnotation(
            annotation: AnnotationMarkup,
            downPosition: Communicator.Point2,
        ) {
            this._activeMarkup = annotation;
            this._previousAnchorPlaneDragPoint = this._getDragPointOnAnchorPlane(downPosition);
        }

        protected _selectAnnotation(selectPoint: Communicator.Point2): boolean {
            const markup = this._viewer.markupManager.pickMarkupItem(selectPoint);

            if (markup) {
                //If we picked an annotation start dragging it
                this._activeMarkup = markup as AnnotationMarkup;
                this._previousAnchorPlaneDragPoint = this._getDragPointOnAnchorPlane(selectPoint);
                return true;
            } else {
                return false;
            }
        }

        public onDeactivate() {
            if (this._previousNodeId != null) {
                this._viewer.model.setNodesHighlighted([this._previousNodeId], false);
            }

            this._previousNodeId = null;
        }

        private _getDragPointOnAnchorPlane(
            screenPoint: Communicator.Point2,
        ): Communicator.Point3 | null {
            if (this._activeMarkup === null) {
                return null;
            }
            const anchor = this._activeMarkup.getLeaderLineAnchor();
            const camera = this._viewer.view.getCamera();
            const normal = Communicator.Point3.subtract(camera.getPosition(), anchor).normalize();

            const anchorPlane = Communicator.Plane.createFromPointAndNormal(anchor, normal);

            const raycast = this._viewer.view.raycastFromPoint(screenPoint);
            if (raycast === null) {
                return null;
            }

            const intersectionPoint = Communicator.Point3.zero();
            if (anchorPlane.intersectsRay(raycast, intersectionPoint)) {
                return intersectionPoint;
            } else {
                return null;
            }
        }
    }
}
