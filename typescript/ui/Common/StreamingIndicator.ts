/// <reference path="../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui {
    export class StreamingIndicator {
        private readonly _viewer: WebViewer;
        private readonly _container: HTMLDivElement;
        private readonly _bottomLeftOffset = new Point2(10, 10);
        private readonly _opacity = 0.5;

        private _spinnerImageUrl = "css/images/spinner.gif";
        private readonly _spinnerSize = new Point2(31, 31);

        constructor(elementId: HtmlId, viewer: WebViewer) {
            this._viewer = viewer;

            this._container = document.getElementById(elementId) as HTMLDivElement;
            this._initContainer();

            this._viewer.setCallbacks({
                streamingActivated: () => {
                    this._onStreamingActivated();
                },
                streamingDeactivated: () => {
                    this._onStreamingDeactivated();
                },
                _shutdownBegin: () => {
                    this._onStreamingDeactivated();
                },
            });
        }

        public show(): void {
            this._container.style.display = "block";
        }

        public hide(): void {
            this._container.style.display = "none";
        }

        public setBottomLeftOffset(point: Point2): void {
            this._bottomLeftOffset.assign(point);

            this._container.style.left = `${this._bottomLeftOffset.x}px`;
            this._container.style.bottom = `${this._bottomLeftOffset.y}px`;
        }

        public getBottomLeftOffset(): Point2 {
            return this._bottomLeftOffset.copy();
        }

        public setSpinnerImage(spinnerUrl: string, size: Point2): void {
            this._spinnerImageUrl = spinnerUrl;
            this._spinnerSize.assign(size);

            this._container.style.backgroundImage = `url(${this._spinnerImageUrl})`;
            this._container.style.width = `${this._spinnerSize.x}px`;
            this._container.style.height = `${this._spinnerSize.y}"px`;
        }

        private _initContainer(): void {
            this._container.style.position = "absolute";

            this._container.style.width = `${this._spinnerSize.x}px`;
            this._container.style.height = `${this._spinnerSize.y}px`;

            this._container.style.left = `${this._bottomLeftOffset.x}px`;
            this._container.style.bottom = `${this._bottomLeftOffset.y}px`;

            this._container.style.backgroundImage = `url(${this._spinnerImageUrl})`;
            this._container.style.opacity = `${this._opacity}`;
        }

        private _onStreamingActivated(): void {
            this.show();
        }

        private _onStreamingDeactivated(): void {
            this.hide();
        }
    }
}
