/// <reference path="UiDialog.ts"/>

namespace Communicator.Ui {
    export class TimeoutWarningDialog extends UiDialog {
        private readonly _viewer: WebViewer;

        constructor(containerId: HtmlId, viewer: WebViewer) {
            super(containerId);

            this._viewer = viewer;

            this._viewer.setCallbacks({
                timeoutWarning: () => {
                    this._onTimeoutWarning();
                },

                timeout: () => {
                    this._onTimeout();
                },
            });

            this.setTitle("Timeout Warning");
        }

        private _onTimeoutWarning(): void {
            this.setText("Your session will expire soon. Press Ok to stay connected.");
            this.show();
        }

        protected _onOkButtonClick(): void {
            this._viewer.resetClientTimeout();
            super._onOkButtonClick();
        }

        private _onTimeout(): void {
            this.setText("Your session has been disconnected due to inactivity.");
            this.show();
        }
    }
}
