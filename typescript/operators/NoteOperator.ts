/// <reference path="../Core/View.ts"/>
/// <reference path="../Math/Point2.ts"/>
/// <reference path="OperatorBase.ts"/>

namespace Communicator.Operator {
    export class NoteOperator extends OperatorBase {
        private _insertNoteButton = Button.Left;
        private _callbackFlag = false;
        private _noteTextManager: Markup.Note.NoteTextManager;

        /** @hidden */
        public constructor(viewer: WebViewer, noteTextManager: Markup.Note.NoteTextManager) {
            super(viewer);
            this._noteTextManager = noteTextManager;
        }

        /** @hidden */
        public onMouseDown(event: Event.MouseInputEvent): void {
            super.onMouseDown(event);

            if (this.isActive()) {
                if (!this._callbackFlag) {
                    this._viewer.setCallbacks({
                        explode: async (magnitude: number) => {
                            await this._noteTextManager.explode(magnitude);
                        },
                    });
                    this._callbackFlag = true;
                }

                this._dragging = false;
            }
        }

        /** @hidden */
        public onMouseUp(event: Event.MouseInputEvent): void {
            if (this.isActive()) {
                const pickConfig = new PickConfig(SelectionMask.Face);
                if (
                    (this._ptFirst.equals(this._ptCurrent) &&
                        event.getButton() === this._insertNoteButton) ||
                    this._primaryTouchId !== null
                ) {
                    const p = this._viewer.view
                        .pickFromPoint(event.getPosition(), pickConfig)
                        .then((selection) => {
                            if (
                                !this._noteTextManager.selectPin(selection) &&
                                !this._noteTextManager.getExplodeActive() &&
                                !this._noteTextManager.getIsolateActive() &&
                                selection.overlayIndex() === 0
                            ) {
                                if (selection.isFaceSelection()) {
                                    new Markup.Note.NoteText(
                                        this._viewer,
                                        this._noteTextManager,
                                        selection.getPosition(),
                                        selection.getFaceEntity().getNormal(),
                                        selection.getNodeId(),
                                    );
                                }
                                event.setHandled(true);
                            }
                        });
                    p as Internal.UnusedPromise; // XXX: Throwing away promise.
                }
            }

            super.onMouseUp(event);
        }

        /**
         * @returns a NoteTextElement that can be used to configure the NoteText HTML container.
         */
        public getNoteTextElement(): Markup.Note.NoteTextElement {
            return this._noteTextManager.getNoteTextElement();
        }

        /**
         * @param noteTextElement
         */
        public setNoteTextElement(noteTextElement: Markup.Note.NoteTextElement): void {
            this._noteTextManager.setNoteTextElement(noteTextElement);
        }

        /**
         * Returns true if the nodeId is the id of a note pin instance.
         * @param nodeId
         */
        public checkPinInstance(nodeId: NodeId): boolean {
            return this._noteTextManager.checkPinInstance(nodeId) !== null;
        }
    }
}
