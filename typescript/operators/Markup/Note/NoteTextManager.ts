/// <reference path="../../../Core/UUID.ts"/>

namespace Communicator.Markup.Note {
    export class NoteTextManager extends MarkupTypeManager {
        private static _globalPinSphereMeshData: MeshData | null = null;
        private static _globalPinStemMeshData: MeshData | null = null;

        private _pinSphereMeshId: MeshId | null = null;
        private _pinStemMeshId: MeshId | null = null;

        private _viewer: WebViewer;

        private _noteTextElement: NoteTextElement;
        private _noteTextList: NoteText[] = [];
        private _activeItemHandle: string | null = null;
        private _activeItem: NoteText | null = null;

        private _explodeActive = false;
        private _isolateActive = false;

        //pin properties
        private _stemLength: number = 2;
        private _sphereIterations: number = 2;

        public constructor(viewer: WebViewer) {
            super();

            this._viewer = viewer;

            this._noteTextElement = new NoteTextElement();
            this._noteTextElement.setPositionOffset(new Point2(12, -24));

            const callbacks = {
                sceneReady: async () => {
                    await this._init();
                },
            };

            this._viewer.setCallbacks(callbacks);
        }

        private async _init(): Promise<void> {
            if (NoteTextManager._globalPinSphereMeshData === null) {
                NoteTextManager._globalPinSphereMeshData = this._createPinSphereMeshData();
            }

            if (NoteTextManager._globalPinStemMeshData === null) {
                NoteTextManager._globalPinStemMeshData = this._createPinStemMeshData();
            }

            const model = this._viewer.model;
            const pinSphereMeshIdPromise = model.createMesh(
                NoteTextManager._globalPinSphereMeshData,
            );
            const pinStemMeshIdPromise = model.createMesh(NoteTextManager._globalPinStemMeshData);

            const meshIds = await Promise.all([pinSphereMeshIdPromise, pinStemMeshIdPromise]);
            this._pinSphereMeshId = meshIds[0];
            this._pinStemMeshId = meshIds[1];
        }

        private _createPinStemMeshData(): MeshData {
            const meshData = new MeshData();
            meshData.addPolyline([0, 0, 0, this._stemLength, 0, 0]);
            return meshData;
        }

        private _createPinSphereMeshData(): MeshData {
            const t = (1.0 + Math.sqrt(5.0)) / 2.0;

            const ratio = Math.sqrt(10 + 2 * Math.sqrt(5)) / (4 * t);
            const a = ratio / 2.0;
            const b = ratio / (2.0 * t);

            // calculate starting vertices
            const points: Point3[] = [];

            points[0] = new Point3(-b, a, 0);
            points[1] = new Point3(b, a, 0);
            points[2] = new Point3(-b, -a, 0);
            points[3] = new Point3(b, -a, 0);

            points[4] = new Point3(0, -b, a);
            points[5] = new Point3(0, b, a);
            points[6] = new Point3(0, -b, -a);
            points[7] = new Point3(0, b, -a);

            points[8] = new Point3(a, 0, -b);
            points[9] = new Point3(a, 0, b);
            points[10] = new Point3(-a, 0, -b);
            points[11] = new Point3(-a, 0, b);

            for (const point of points) {
                point.normalize();
            }

            // add starting faces
            let faces = [
                [0, 11, 5],
                [0, 5, 1],
                [0, 1, 7],
                [0, 7, 10],
                [0, 10, 11],

                [1, 5, 9],
                [5, 11, 4],
                [11, 10, 2],
                [10, 7, 6],
                [7, 1, 8],

                [3, 9, 4],
                [3, 4, 2],
                [3, 2, 6],
                [3, 6, 8],
                [3, 8, 9],

                [4, 9, 5],
                [2, 4, 11],
                [6, 2, 10],
                [8, 6, 7],
                [9, 8, 1],
            ];

            // refine sphere
            let count = 12;
            for (let i = 0; i < this._sphereIterations; i++) {
                const faces2: number[][] = [];
                faces.map((face) => {
                    // TODO: every edge has two triangles, need to cache to prevent duplicate point creation

                    const p0 = points[face[0]];
                    const p1 = points[face[1]];
                    const p2 = points[face[2]];

                    points[count++] = new Point3(p0.x + p1.x, p0.y + p1.y, p0.z + p1.z)
                        .scale(0.5)
                        .normalize();
                    points[count++] = new Point3(p1.x + p2.x, p1.y + p2.y, p1.z + p2.z)
                        .scale(0.5)
                        .normalize();
                    points[count++] = new Point3(p2.x + p0.x, p2.y + p0.y, p2.z + p0.z)
                        .scale(0.5)
                        .normalize();

                    faces2.push([face[0], count - 3, count - 1]);
                    faces2.push([count - 3, count - 2, count - 1]);
                    faces2.push([count - 3, face[1], count - 2]);
                    faces2.push([count - 2, face[2], count - 1]);
                });
                faces = faces2;
            }

            const vertexData = [];
            const normalData = [];
            for (const face of faces) {
                for (let i = 0; i < 3; i++) {
                    const index = face[i];
                    const point = points[index];

                    vertexData.push(point.x + this._stemLength + 1);
                    vertexData.push(point.y);
                    vertexData.push(point.z);

                    // By construction, the normal of the point *is* the point's normal.
                    const normal = point.normalize();
                    normalData.push(normal.x);
                    normalData.push(normal.y);
                    normalData.push(normal.z);
                }
            }

            // add mesh
            const meshData = new MeshData();
            meshData.addFaces(vertexData, normalData);
            meshData.setFaceWinding(FaceWinding.CounterClockwise);

            return meshData;
        }

        /**
         * Retrieves the mesh id of the stem of the note pin, if there is one
         * @returns MeshId of the note pin stem, or null if there is none
         */
        public getPinStemMeshId(): MeshId | null {
            return this._pinStemMeshId;
        }

        /**
         * Retrieves the mesh id of the spherical head of the note pin, if there is one
         * @returns MeshId of the note pin sphere, or null if there is none
         */
        public getPinSphereMeshId(): MeshId | null {
            return this._pinSphereMeshId;
        }

        /**
         * Retrieves the note text element
         * @returns note text element
         */
        public getNoteTextElement(): NoteTextElement {
            return this._noteTextElement;
        }

        /**
         * Sets the note text element
         * @param noteTextElement
         */
        public setNoteTextElement(noteTextElement: NoteTextElement): void {
            this._noteTextElement.hide();
            this._noteTextElement = noteTextElement;
        }

        /**
         * Gets an array of all NoteText items that have been added to the manager
         * @returns array of all NoteText items
         */
        public getNoteTextList(): NoteText[] {
            return this._noteTextList;
        }

        /**
         * Adds a note and makes it active
         * @param note NoteText to be added to the manager
         */
        public addNote(note: NoteText): void {
            this._noteTextList.push(note);
            this._activeItem = note;
        }

        /**
         * Removes a note from the manager
         * @param note NoteText to be removed from the manager
         */
        public removeNote(note: NoteText): void {
            const index = this._noteTextList.indexOf(note);
            this._noteTextList.splice(index, 1);
        }

        /**
         * Updates note pin visibility based on manager state (namely the current explode state)
         */
        public async updatePinVisibility(): Promise<void> {
            if (this._noteTextList.length > 0) {
                const instanceIds: NodeId[] = [];
                for (const noteText of this._noteTextList) {
                    const sphereInstanceId = noteText.getSphereInstanceId();
                    const stemInstanceId = noteText.getStemInstanceId();

                    if (sphereInstanceId !== undefined) {
                        instanceIds.push(sphereInstanceId);
                    }
                    if (stemInstanceId !== undefined) {
                        instanceIds.push(stemInstanceId);
                    }
                }

                const p = this._viewer.model.setNodesVisibility(instanceIds, !this._explodeActive);

                if (this._explodeActive) {
                    this._noteTextElement.hide();
                }

                return p;
            }
        }

        /**
         * Sets manager explode state based on explosion magnitude. Active explosion hides note pins
         * @param magnitude Explosion magnitude
         */
        public explode(magnitude: number): Promise<void> {
            this._explodeActive = magnitude > 0;
            return this.updatePinVisibility();
        }

        /**
         * Gets managers explosion state. Active explosion hides note pins
         */
        public getExplodeActive(): boolean {
            return this._explodeActive;
        }

        /**
         * Sets whether an isolate is currently active or not
         * @param isolateActive
         */
        public setIsolateActive(isolateActive: boolean): void {
            this._isolateActive = isolateActive;
        }

        /**
         * Gets whether an isolate is currently active or not
         * @returns isolate status
         */
        public getIsolateActive(): boolean {
            return this._isolateActive;
        }

        /**
         * Get the currently active note text
         * @returns Currently active note text
         */
        public getActiveItem(): NoteText | null {
            return this._activeItem;
        }

        /**
         * Sets a new currently active note text
         * @param activeItem note text to be marked as currently active
         */
        public setActiveItem(activeItem: NoteText | null): void {
            this._activeItem = activeItem;
        }

        /**
         * Get the active handle string, such as the one returned by [[MarkupManager.registerMarkup]]
         * @returns Active handle string
         */
        public getActiveItemHandle(): string | null {
            return this._activeItemHandle;
        }

        /**
         * Set the active handle string, should be provided by [[MarkupManager.registerMarkup]]
         * @param activeItemHandle Active handle string
         */
        public setActiveItemHandle(activeItemHandle: string | null): void {
            this._activeItemHandle = activeItemHandle;
        }

        /**
         * Attempts to set the active note to the one associated with the
         * pins elected by the provided [[SelectionItem]]
         * @param selection SelectionItem to attempt to find note from
         */
        public selectPin(selection: Selection.SelectionItem): boolean {
            if (this._activeItem) {
                this._activeItem.hide();
            }

            const nodeId = selection.getNodeId();
            if (nodeId !== null) {
                const noteText = this._getNoteTextFromNodeId(nodeId);
                if (noteText !== null) {
                    noteText.restore() as Unreferenced;
                    return true;
                }
            }
            return false;
        }

        /**
         * Checks if a nodeId is part of a note pin
         * @param nodeId NodeId to be checked
         */
        public checkPinInstance(nodeId: NodeId): boolean {
            return this._getNoteTextFromNodeId(nodeId) !== null;
        }

        private _getNoteTextFromNodeId(nodeId: NodeId): NoteText | null {
            for (const noteText of this._noteTextList) {
                if (
                    noteText.getSphereInstanceId() === nodeId ||
                    noteText.getStemInstanceId() === nodeId
                ) {
                    return noteText;
                }
            }
            return null;
        }

        /**
         * Checks if a UUID is associated with any existing notes
         * @param id UUID to check
         */
        public findById(id: Uuid): boolean {
            for (const noteText of this._noteTextList) {
                if (id === noteText.getUniqueId()) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Loads notes from an iterable of JSON data like that returned by [[exportMarkup]]
         * @param notes JSON note data iterable
         */
        public loadData(notes: any): Promise<boolean[]> {
            const ps: Promise<boolean>[] = [];

            for (const note of notes) {
                const p = NoteText.fromJson(note, this._viewer, this).then((result) => {
                    return result !== null;
                });
                ps.push(p);
            }

            return Promise.all(ps);
        }

        /**
         * Exports note texts to an array of JSON Objects that can be restored via [[loadData]]
         * @returns Array of JSON objects representing notes
         */
        public exportMarkup(): Object[] {
            const markup = [];

            for (const note of this._noteTextList) {
                markup.push(note.toJson());
            }

            return markup;
        }
    }
}
