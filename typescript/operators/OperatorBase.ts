/// <reference path="../Core/View.ts"/>
/// <reference path="../Math/Point2.ts"/>

/// <reference path="Operator.ts"/>

namespace Communicator.Operator {
    /** @hidden */
    export class ButtonModifier {
        private _button: Button;
        private _modifier: KeyModifiers;

        public constructor(button: Button, modifier: KeyModifiers) {
            this._button = button;
            this._modifier = modifier;
        }

        public getButton(): Button {
            return this._button;
        }

        public getModifier(): KeyModifiers {
            return this._modifier;
        }
    }

    /** @hidden */
    export class OperatorBase implements Operator {
        /** @hidden */
        protected _viewer: WebViewer;

        /** @hidden */
        protected _ptFirst = Point2.zero();
        /** @hidden */
        protected _ptPrevious = Point2.zero();
        /** @hidden */
        protected _ptCurrent = Point2.zero();

        /** @hidden */
        protected _dragging: boolean = false;
        /** @hidden */
        protected _dragCount: number = 0;

        /** @hidden */
        protected _primaryTouchId: number | null = null;

        /** @hidden */
        protected _mapping: ButtonModifier[] = [];
        /** @hidden */
        protected _buttonModifierActive: boolean = false;

        /** @hidden */
        protected _doubleClickInterval: number = 200;

        /** @hidden */
        protected _firstMouseDownTime: number | null = null;

        /** @hidden */
        protected _isDoubleClick: boolean = false;

        /** @hidden */
        public constructor(viewer: WebViewer) {
            this._viewer = viewer;
        }

        /** @hidden */
        public onDoubleClick(_event: Event.MouseInputEvent): void {
            // do nothing
        }

        /** @hidden */
        public onMouseDown(event: Event.MouseInputEvent): void {
            if (!this._firstMouseDownTime) {
                this._firstMouseDownTime = Date.now();
                this._isDoubleClick = false;
            } else {
                if (Date.now() - this._firstMouseDownTime < this._doubleClickInterval) {
                    this._isDoubleClick = true;
                    this._firstMouseDownTime = null;
                } else {
                    this._firstMouseDownTime = Date.now();
                }
            }

            if (this._isDoubleClick) {
                this.onDoubleClick(event);
            } else {
                this._buttonModifierActive = this.checkMapping(event);
                if (this._buttonModifierActive) {
                    const coords = event.getPosition();

                    this._ptFirst.assign(coords);
                    this._ptPrevious.assign(coords);
                    this._ptCurrent.assign(coords);
                }
                this._dragging = true;
            }
        }

        /** @hidden */
        public onMouseMove(event: Event.MouseInputEvent): void {
            if (this.isActive()) {
                this._ptPrevious.assign(this._ptCurrent);
                this._ptCurrent.assign(event.getPosition());
                if (this._dragging) {
                    if (!this._ptCurrent.equals(this._ptPrevious)) {
                        ++this._dragCount;

                        if (this._dragCount === 1) {
                            this._viewer.trigger("beginInteraction");
                        }
                    }
                }
            }
        }

        /** @hidden */
        public onMouseUp(_event: Event.MouseInputEvent): void {
            if (this._buttonModifierActive) {
                this.stopInteraction();
            }
            this._dragging = false;
            this._dragCount = 0;
        }

        /** @hidden */
        public stopInteraction(): void {
            this._viewer.trigger("endInteraction");
            this._dragging = false;
            this._dragCount = 0;
            this._buttonModifierActive = false;
        }

        /** @hidden */
        public isDragging(): boolean {
            return this._dragging;
        }

        /** @hidden */
        public isActive(): boolean {
            return (
                (this._buttonModifierActive || this._primaryTouchId !== null) &&
                !this._isDoubleClick &&
                !this._viewer.getContextMenuStatus()
            );
        }

        /** @hidden */
        public onTouchStart(event: Event.TouchInputEvent): void {
            if (this._primaryTouchId === null) {
                this._primaryTouchId = event.getId();

                const position = event.getPosition();
                const emulatedMouseEvent = new Event.MouseInputEvent(
                    position.x,
                    position.y,
                    Button.None,
                    event.getButtons(),
                    KeyModifiers.None,
                    MouseInputType.Down,
                );

                this.onMouseDown(emulatedMouseEvent);
            }
            event.setHandled(this.setHandled());
        }

        /** @hidden */
        public async onTouchMove(event: Event.TouchInputEvent): Promise<void> {
            if (this._primaryTouchId === event.getId()) {
                const position = event.getPosition();
                const emulatedMouseEvent = new Event.MouseInputEvent(
                    position.x,
                    position.y,
                    Button.None,
                    event.getButtons(),
                    KeyModifiers.None,
                    MouseInputType.Move,
                );
                // We await here because children classes can override this method
                // and return a Promise
                await this.onMouseMove(emulatedMouseEvent);
            }
            event.setHandled(this.setHandled());
            return Promise.resolve();
        }

        /** @hidden */
        public onTouchEnd(event: Event.TouchInputEvent): void {
            if (this._primaryTouchId === event.getId()) {
                const position = event.getPosition();
                const emulatedMouseEvent = new Event.MouseInputEvent(
                    position.x,
                    position.y,
                    Button.None,
                    event.getButtons(),
                    KeyModifiers.None,
                    MouseInputType.Up,
                );
                this.onMouseUp(emulatedMouseEvent);

                this._primaryTouchId = null;
            }
            event.setHandled(this.setHandled());
        }

        /**
         * Adds a button and key modifier mapping for the operator. If no mapping is provided, all combinations are considered valid.
         * All mappings require a mouse button, but a key modifier is optional.
         * @param button
         * @param modifier
         */
        public addMapping(button: Button, modifier: KeyModifiers = KeyModifiers.None): void {
            this._mapping.push(new ButtonModifier(button, modifier));
        }

        /**
         * Clears any button and key modifier mappings for the operator.
         */
        public clearMapping(): void {
            this._mapping = [];
        }

        /**
         * Sets the button and key modifier mapping for the operator.
         * @param button
         * @param modifier
         */
        public setMapping(button: Button, modifier: KeyModifiers = KeyModifiers.None): void {
            this._mapping = [];
            this._mapping.push(new ButtonModifier(button, modifier));
        }

        /** @hidden */
        public checkMapping(event: Event.MouseInputEvent): boolean {
            if (this._mapping.length === 0) {
                return true;
            }

            for (const m of this._mapping) {
                if (
                    m.getButton() === event.getButton() &&
                    m.getModifier() === event.getModifiers()
                ) {
                    return true;
                }
            }

            return false;
        }

        /** @hidden */
        public setHandled(): boolean {
            return false;
        }

        /** @hidden */
        public onDeactivate(): void | Promise<void> {
            const p = this.stopInteraction();
            this._primaryTouchId = null;
            return p;
        }
    }
}
