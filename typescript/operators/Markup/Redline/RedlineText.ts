/// <reference path="../../../Markup/Redline/RedlineItem.ts"/>
/// <reference path="RedlineTextElement.ts"/>

namespace Communicator.Markup.Redline {
    /** @hidden */
    export class RedlineText extends RedlineItem {
        private _uniqueId: Uuid = UUID.create();

        private _position: Point3 = Point3.zero();
        private _size: Point2 = new Point2(100, 100);
        private _text: string;

        private _redlineTextElement: RedlineTextElement;
        private _redlineElementId: string | null = null;

        public static className = "Communicator.Markup.Redline.RedlineText";
        private static defaultText = "Type Here...";

        private _previousDragPlanePosition: Point3 = Point3.zero();

        private _callbacks: CallbackMap | null;

        public constructor(viewer: WebViewer, text: string = RedlineText.defaultText) {
            super(viewer);

            this._text = text;

            const sizeUpdateFunc = (size: Point2) => {
                this.setSize(size);
            };

            const textUpdateFunc = (newText: string) => {
                this.setText(newText);
            };

            this._redlineTextElement = new RedlineTextElement(sizeUpdateFunc, textUpdateFunc);

            this._redlineTextElement.setText(this._text);

            this._callbacks = {
                selectionArray: () => {
                    this.onDeselect();
                },
            };
            this._viewer.setCallbacks(this._callbacks);
        }

        public setPosition(point: Point3): void {
            this._position.assign(point);
        }

        public getPosition(): Point3 {
            return this._position.copy();
        }

        public setSize(size: Point2): void {
            this._size.assign(size);
            this._redlineTextElement.setSize(size);
            this._viewer.trigger("redlineUpdated", this);
        }

        public getSize(): Point2 {
            return this._size.copy();
        }

        public setText(text: string): void {
            this._text = text;
            this._redlineTextElement.setText(text);
            this._viewer.trigger("redlineUpdated", this);
        }

        public getText(): string {
            return this._text;
        }

        public draw(): void {
            const screenPos = Point2.fromPoint3(this._viewer.view.projectPoint(this._position));

            this._redlineTextElement.setPosition(screenPos);

            if (this._redlineElementId === null) {
                this._redlineElementId = this._viewer.markupManager.addMarkupElement(
                    this._redlineTextElement.getTextArea(),
                );
            }
        }

        public hit(point: Point2): boolean {
            return this.hitWithTolerance(point, 0);
        }

        public hitWithTolerance(point: Point2, pickTolerance: number): boolean {
            const element = this._redlineTextElement.getTextArea();
            const screenPos = new Point2(
                parseFloat(element.style.left || "0"),
                parseFloat(element.style.top || "0"),
            );
            const size = new Point2(
                parseFloat(element.style.width || "0"),
                parseFloat(element.style.height || "0"),
            );

            return Util.isPointInRect2d(point, screenPos, size, pickTolerance);
        }

        public getClassName(): string {
            return RedlineText.className;
        }

        public onSelect(): void {
            this._redlineTextElement.setBorderWidth(4);
            this._redlineTextElement.focus();
        }

        public onDeselect(): void {
            this._redlineTextElement.setBorderWidth(2);
            this._redlineTextElement.blur();
        }

        public isValid(): boolean {
            return this._text.length > 0;
        }

        public remove(): void {
            if (this._redlineElementId) {
                this._viewer.markupManager.removeMarkupElement(this._redlineElementId);
                this._redlineElementId = null;
            }

            if (this._callbacks !== null) {
                this._viewer.unsetCallbacks(this._callbacks);
                this._callbacks = null;
            }

            super.remove();
        }

        // drag methods and drop methods

        public onDragStart(position: Point2): boolean {
            const view = this._viewer.view;
            const cameraPoint = view.getCamera().getCameraPlaneIntersectionPoint(position, view);
            if (cameraPoint !== null) {
                this._previousDragPlanePosition.assign(cameraPoint);
            }
            return false;
        }

        public onDragMove(position: Point2): boolean {
            const view = this._viewer.view;
            const cameraPoint = view.getCamera().getCameraPlaneIntersectionPoint(position, view);
            if (cameraPoint !== null) {
                const delta = Point3.subtract(cameraPoint, this._previousDragPlanePosition);

                const textPos = this.getPosition();
                textPos.add(delta);
                this.setPosition(textPos);

                this._previousDragPlanePosition.assign(cameraPoint);
            }
            return true;
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
                position: this._position.toJson(),
                size: this._size.toJson(),
                text: this._text,
            };
        }

        /** @deprecated Use [[toJson]] instead. */
        public forJson(): Object {
            return this.toJson();
        }

        /**
         * Creates a new [[RedlineText]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        public static fromJson(objData: any, viewer: WebViewer): RedlineText {
            const obj = objData as ReturnType<RedlineText["_toJson"]>;

            const redlineText = new RedlineText(viewer, obj.text);

            redlineText._uniqueId = obj.uniqueId;
            redlineText.setPosition(Point3.fromJson(obj.position));
            redlineText.setSize(Point2.fromJson(obj.size));

            return redlineText;
        }

        /** @deprecated Use [[fromJson]] instead. */
        public static construct(obj: any, viewer: WebViewer): RedlineText {
            return RedlineText.fromJson(obj, viewer);
        }
    }
}
