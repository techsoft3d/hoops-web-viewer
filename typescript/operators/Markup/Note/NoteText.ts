namespace Communicator.Markup.Note {
    /** @hidden */
    export class NoteText extends MarkupItem {
        public static className = "Communicator.Markup.Note.NoteText";

        private _viewer: WebViewer;
        private _noteTextManager: NoteTextManager;
        private _uniqueId: Uuid = UUID.create();

        private _noteElementId: string | null = null;

        private _sphereInstanceId?: NodeId;
        private _stemInstanceId?: NodeId;

        private _position: Point3 = Point3.zero();
        private _selectionPosition: Point3;
        private _selectionNormal: Point3;
        private _partId: PartId;

        private _pinBoundingBox?: Box;

        private _text: string = "";
        private _color: Color = Color.white();
        private _sphereRadius: number = 0.03;

        private _deleted = false;
        private _active = false;

        private _callbacks: CallbackMap | null = null;

        public constructor(
            viewer: WebViewer,
            noteTextManager: NoteTextManager,
            selectionPosition: Point3,
            selectionNormal: Point3,
            partId: PartId,
        ) {
            super();

            this._viewer = viewer;
            this._noteTextManager = noteTextManager;
            this._selectionPosition = selectionPosition;
            this._selectionNormal = selectionNormal;
            this._partId = partId;

            this._noteTextManager.addNote(this);

            this._init() as Internal.UnusedPromise;
        }

        private async _init(): Promise<void> {
            const matrix = this._createPinTransformationMatrix(
                this._selectionPosition,
                this._selectionNormal,
            );

            const [stemInstanceId, sphereInstanceId] = await Promise.all([
                this._createPinStemInstance(matrix),
                this._createPinSphereInstance(matrix),
            ]);

            this._stemInstanceId = stemInstanceId;
            this._sphereInstanceId = sphereInstanceId;

            await this._restore(false);

            this._callbacks = {
                visibilityChanged: () => {
                    this._matchPartVisibility();
                },
            };
            this._viewer.setCallbacks(this._callbacks);

            this._viewer.trigger("noteTextCreated", this);
        }

        private _matchPartVisibility(): void {
            if (this._sphereInstanceId === undefined || this._stemInstanceId === undefined) {
                return;
            }

            const model = this._viewer.model;
            const partVisibility = model.getNodeVisibility(this._partId);
            const pinVisibility = model.getNodeVisibility(this._sphereInstanceId);

            // match pin visibility to associated part visibility
            if (partVisibility !== pinVisibility && !this._noteTextManager.getExplodeActive()) {
                model.setNodesVisibility(
                    [this._stemInstanceId, this._sphereInstanceId],
                    partVisibility,
                ) as Internal.UnusedPromise;
            }

            // hide note text window if the associated part is hidden
            const activeItem = this._noteTextManager.getActiveItem();
            if (
                activeItem !== null &&
                activeItem.getStemInstanceId() === this._stemInstanceId &&
                !partVisibility
            ) {
                this.hide();
            }
        }

        public async updatePosition(): Promise<void> {
            if (this._sphereInstanceId === undefined) {
                return;
            }
            const box = await this._viewer.model.getNodeRealBounding(this._sphereInstanceId);
            this._pinBoundingBox = box;
            this._position = this._pinBoundingBox.center();
            this.setText(this._text);
        }

        private async _restore(triggerEvent: boolean): Promise<void> {
            this._noteTextManager.setActiveItemHandle(
                this._viewer.markupManager.registerMarkup(this),
            );
            this._noteTextManager.setActiveItem(this);

            this._show(triggerEvent);

            this._updateColor();
            await this.draw();
        }

        public async restore(): Promise<void> {
            return this._restore(true);
        }

        public setText(text: string): void {
            this._text = text;
            this._noteTextManager.getNoteTextElement().setText(text);
        }

        public saveTextValue(): void {
            this._text = this._noteTextManager.getNoteTextElement().getText();
        }

        public async draw(): Promise<void> {
            if (this._deleted || !this._active) {
                return;
            }

            this._behindView = false;

            await this.updatePosition();

            const screenPos = this._viewer.view.projectPoint(this._position);
            if (screenPos.z <= 0.0) {
                this._behindView = true;
            }

            if (this._behindView) {
                if (
                    this._noteElementId !== null &&
                    document.getElementById(this._noteElementId) !== null
                ) {
                    this._viewer.markupManager.removeMarkupElement(this._noteElementId);
                    this._noteElementId = null;
                }
            } else {
                const screenPos2 = new Point2(screenPos.x, screenPos.y);
                const noteTextElement = this._noteTextManager.getNoteTextElement();
                noteTextElement.setPosition(screenPos2);

                if (this._noteElementId === null) {
                    this._noteElementId = this._viewer.markupManager.addMarkupElement(
                        noteTextElement.getHtmlContainer(),
                    );
                }
            }
        }

        public hit(point: Point2): boolean {
            return this.hitWithTolerance(point, 0);
        }

        public hitWithTolerance(point: Point2, pickTolerance: number): boolean {
            if (!this._active) return false;

            const noteTextElement = this._noteTextManager.getNoteTextElement();
            const screenPos = noteTextElement.getPosition();
            const size = noteTextElement.getSize();

            return Util.isPointInRect2d(point, screenPos, size, pickTolerance);
        }

        public getClassName(): string {
            return NoteText.className;
        }

        public getUniqueId(): Uuid {
            return this._uniqueId;
        }

        public getSphereInstanceId(): NodeId | undefined {
            return this._sphereInstanceId;
        }

        public getStemInstanceId(): NodeId | undefined {
            return this._stemInstanceId;
        }

        public onSelect(): void {
            this._noteTextManager.getNoteTextElement().focus();
        }

        public onDeselect(): void {
            this._noteTextManager.getNoteTextElement().blur();
        }

        public hide(): void {
            const element = this._noteTextManager.getNoteTextElement();
            element.hide();
            this.setText(element.getText());

            this._noteTextManager.setActiveItem(null);
            this._active = false;

            this._viewer.trigger("noteTextHidden", this);
        }

        private _show(triggerEvent: boolean): void {
            this._noteTextManager.getNoteTextElement().show(this);
            this._active = true;

            if (triggerEvent) {
                this._viewer.trigger("noteTextShown", this);
            }
        }

        public show(): void {
            this._show(true);
        }

        public async remove(): Promise<void> {
            if (this.getRemoved() === true) {
                // This is already removed. Nothing to do
                return;
            }

            if (this._callbacks !== null) {
                this._viewer.unsetCallbacks(this._callbacks);
                this._callbacks = null;
            }

            const model = this._viewer.model;
            const ps: Promise<void>[] = [];

            // delete pin instance
            if (this._stemInstanceId !== undefined) {
                ps.push(model.deleteMeshInstances([this._stemInstanceId]));
            }

            // TODO: figure out why this throws an error
            if (this._sphereInstanceId !== undefined) {
                ps.push(model.deleteMeshInstances([this._sphereInstanceId]));
            }

            this.hide();

            this._noteTextManager.removeNote(this);

            this._deleted = true;

            await Util.waitForAll(ps);

            super.remove();
        }

        public getRemoved(): boolean {
            return this._deleted;
        }

        public setColor(color: Color): DeprecatedPromise {
            this._color = color;
            this._updateColor();
            return Promise.resolve();
        }

        public getColor(): Color {
            return this._color;
        }

        public getPartId(): PartId {
            return this._partId;
        }

        private _updateColor(): void {
            if (this._sphereInstanceId !== undefined) {
                this._viewer.model.setNodesFaceColor([this._sphereInstanceId], this._color);
            }
        }

        // pin methods
        private _createPinTransformationMatrix(selectionPosition: Point3, normal: Point3): Matrix {
            // rotate
            let i = 0;
            let min = normal.x;
            if (Math.abs(normal.y) < Math.abs(min)) {
                min = normal.y;
                i = 1;
            }
            if (Math.abs(normal.z) < Math.abs(min)) {
                i = 2;
            }

            const x = [0, 0, 0];
            x[i] = 1;
            const point = Point3.createFromArray(x);

            const tangent0 = Point3.cross(normal, point).normalize();
            const tangent1 = Point3.cross(normal, tangent0);

            let matrix = new Matrix();

            // prettier-ignore
            matrix.m = [
                normal.x, normal.y, normal.z, 0,
                tangent0.x, tangent0.y, tangent0.z, 0,
                tangent1.x, tangent1.y, tangent1.z, 0,
                0, 0, 0, 1];

            matrix = Matrix.multiply(
                matrix,
                new Matrix().setScaleComponent(
                    this._sphereRadius,
                    this._sphereRadius,
                    this._sphereRadius,
                ),
            );

            matrix.setTranslationComponent(
                selectionPosition.x,
                selectionPosition.y,
                selectionPosition.z,
            );

            return matrix;
        }

        private async _createPinStemInstance(matrix: Matrix): Promise<NodeId> {
            const pinStemMeshId = this._noteTextManager.getPinStemMeshId();
            if (pinStemMeshId === null) {
                throw new CommunicatorError("stem mesh hasn't been created yet");
            }

            const meshInstanceData = new MeshInstanceData(
                pinStemMeshId,
                matrix,
                "pin-stem-instance",
                undefined,
                Color.black(),
            );

            meshInstanceData.setOpacity(1);

            const instanceFlags =
                MeshInstanceCreationFlags.SuppressCameraScale |
                MeshInstanceCreationFlags.DoNotCut |
                MeshInstanceCreationFlags.DoNotExplode |
                MeshInstanceCreationFlags.DoNotXRay |
                MeshInstanceCreationFlags.ExcludeBounding |
                MeshInstanceCreationFlags.OverrideSceneVisibility |
                MeshInstanceCreationFlags.AlwaysDraw;
            meshInstanceData.setCreationFlags(instanceFlags);

            const model = this._viewer.model;
            return model.createMeshInstance(meshInstanceData, undefined, true, true);
        }

        private async _createPinSphereInstance(matrix: Matrix): Promise<NodeId> {
            const pinSphereMeshId = this._noteTextManager.getPinSphereMeshId();
            if (pinSphereMeshId === null) {
                throw new CommunicatorError("sphere mesh hasn't been created yet");
            }

            const meshInstanceData = new MeshInstanceData(
                pinSphereMeshId,
                matrix,
                "pin-sphere-instance",
                Color.white(),
                undefined,
            );

            meshInstanceData.setOpacity(1);
            const instanceFlags =
                MeshInstanceCreationFlags.SuppressCameraScale |
                MeshInstanceCreationFlags.DoNotCut |
                MeshInstanceCreationFlags.DoNotExplode |
                MeshInstanceCreationFlags.DoNotXRay |
                MeshInstanceCreationFlags.ExcludeBounding |
                MeshInstanceCreationFlags.OverrideSceneVisibility |
                MeshInstanceCreationFlags.AlwaysDraw;
            meshInstanceData.setCreationFlags(instanceFlags);

            const model = this._viewer.model;
            return model.createMeshInstance(meshInstanceData, undefined, true, true);
        }

        // Serialization methods

        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        public toJson(): Object {
            return this._toJson();
        }

        private _toJson() {
            return {
                uniqueId: this._uniqueId,
                className: this.getClassName(),
                selectionPosition: this._selectionPosition.toJson(),
                selectionNormal: this._selectionNormal.toJson(),
                text: this._text,
                color: this._color,
                partId: this._partId,
            };
        }

        /** @deprecated Use [[toJson]] instead. */
        public forJson(): Object {
            return this.toJson();
        }

        private static _fromJson(
            objData: any,
            viewer: WebViewer,
            noteTextManager: NoteTextManager,
        ): NoteText | null {
            const obj = objData as ReturnType<NoteText["_toJson"]>;

            if (!noteTextManager.findById(obj.uniqueId)) {
                const selectionPosition = Point3.fromJson(obj.selectionPosition);
                const selectionNormal = Point3.fromJson(obj.selectionNormal);
                const partId = obj.partId;
                const noteText = new NoteText(
                    viewer,
                    noteTextManager,
                    selectionPosition,
                    selectionNormal,
                    partId,
                );

                noteText._uniqueId = obj.uniqueId;
                noteText.setText(obj.text);
                noteText.setColor(Color.fromJson(obj.color));

                return noteText;
            }
            return null;
        }

        /**
         * Creates a new [[NoteText]] from an object given by [[toJson]].
         * @param An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static async fromJson(
            obj: any,
            viewer: WebViewer,
            noteTextManager: NoteTextManager,
        ): Promise<NoteText | null> {
            const result = NoteText._fromJson(obj, viewer, noteTextManager);
            return result;
        }
    }
}
