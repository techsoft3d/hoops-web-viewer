/// <reference path="../Desktop/ModelBrowser.ts"/>

namespace Communicator.Ui.Desktop {
    enum ModelType {
        Generic,
        Bim,
        Drawing,
    }

    export interface UiConfig {
        /** The ID of the div element to use for the UI. */
        containerId?: HtmlId;
        /** Specifies what UI style to use. Default value is [[ScreenConfiguration.Desktop]] */
        screenConfiguration?: ScreenConfiguration;
        /** Specifies whether the model browser is shown. Default is true. */
        showModelBrowser?: boolean;
        /** Specifies whether the toolbar is shown. Default is true. */
        showToolbar?: boolean;
    }
    export class DesktopUi {
        private static _defaultBackgroundColor = Color.white();
        private static _defaultPartSelectionColor = Color.createFromFloat(0, 0.8, 0);
        private static _defaultPartSelectionOutlineColor = Color.createFromFloat(0, 0.8, 0);
        private static _defaultXRayColor = Color.createFromFloat(0, 0.9, 0);

        private _viewer: WebViewer;

        private _modelBrowser: ModelBrowser | null = null;
        private _toolbar: Toolbar | null = null;
        private _contextMenu: RightClickContextMenu;
        private _isolateZoomHelper: IsolateZoomHelper;
        private _cuttingPlaneController: CuttingPlane.Controller;
        private _colorPicker: ColorPicker;

        /** The `ModelType` derived from the current model. */
        private _modelType = ModelType.Generic;
        /** The `ModelType` for which the UI is configured. */
        private _uiModelType: ModelType | null = null;

        private _suppressMissingModelDialog = false;

        private readonly _params: UiConfig;

        private _getWithDefault<T>(maybeValue: T | undefined, defaultValue: T): T {
            if (maybeValue === undefined) {
                return defaultValue;
            }
            return maybeValue;
        }

        /**
         * Creates a new Web Viewer instance. You must pass in a **containerId** key with the ID of an element.
         * The system will create any required elements inside the supplied container.
         *
         * @param inputParams object containing key-value pairs for UI options.
         */
        constructor(viewer: WebViewer, inputParams: UiConfig) {
            this._viewer = viewer;

            this._params = { ...inputParams };

            if (this._params.containerId === undefined) {
                throw new ParseError(`Must supply 'containerId'.`);
            }

            this._colorPicker = new ColorPicker(this._viewer, this._params.containerId);

            const screenConfiguration = this._getWithDefault(
                this._params.screenConfiguration,
                ScreenConfiguration.Desktop,
            );
            const showModelBrowser = this._getWithDefault(this._params.showModelBrowser, true);
            const showToolbar = this._getWithDefault(this._params.showToolbar, true);

            // mobile options
            if (screenConfiguration === ScreenConfiguration.Mobile) {
                const view = this._viewer.view;
                const axisTriad = view.getAxisTriad();
                const navCube = view.getNavCube();

                axisTriad.setAnchor(OverlayAnchor.UpperRightCorner) as Unreferenced;
                navCube.setAnchor(OverlayAnchor.UpperLeftCorner) as Unreferenced;
                $("body").addClass("mobile");

                const handleOperator = this._viewer.operatorManager.getOperator(OperatorId.Handle);
                if (handleOperator) {
                    handleOperator.setHandleSize(3);
                }
            }

            this._cuttingPlaneController = new CuttingPlane.Controller(this._viewer);
            this._isolateZoomHelper = new IsolateZoomHelper(this._viewer);

            if (showToolbar) {
                this._toolbar = new Toolbar(
                    this._viewer,
                    this._cuttingPlaneController,
                    screenConfiguration,
                );
                this._toolbar.init();
            }

            const content = document.getElementById("content") as HTMLDivElement;

            // prevent default right click menu
            content.oncontextmenu = () => {
                return false;
            };

            if (showModelBrowser) {
                const modelBrowserDiv = document.createElement("div");
                modelBrowserDiv.id = "modelBrowserWindow";
                content.appendChild(modelBrowserDiv);

                this._modelBrowser = new ModelBrowser(
                    modelBrowserDiv.id,
                    content.id,
                    this._viewer,
                    this._isolateZoomHelper,
                    this._colorPicker,
                    this._cuttingPlaneController,
                );
            }

            new PropertyWindow(this._viewer);
            const streamingIndicatorDiv = document.createElement("div");
            streamingIndicatorDiv.id = "streamingIndicator";
            content.appendChild(streamingIndicatorDiv);

            if (this._viewer.getRendererType() === RendererType.Client) {
                new StreamingIndicator(streamingIndicatorDiv.id, this._viewer);
            }

            this._contextMenu = new RightClickContextMenu(
                content.id,
                this._viewer,
                this._isolateZoomHelper,
                this._colorPicker,
            );

            new TimeoutWarningDialog(content.id, this._viewer);

            this._viewer.setCallbacks({
                sceneReady: () => {
                    this._onSceneReady();
                },

                firstModelLoaded: (rootIds) => {
                    this._modelType = this._determineModelType(rootIds);
                    this._configureUi(this._modelType);
                },
                modelSwitched: (clearOnly) => {
                    if (clearOnly) {
                        this._modelType = ModelType.Generic;
                        this._configureUi(this._modelType);
                    }
                },
                sheetActivated: () => {
                    this._configureUi(ModelType.Drawing);
                },
                sheetDeactivated: () => {
                    this._configureUi(this._modelType);
                },

                modelLoadFailure: (modelName: string, reason: string) => {
                    // prevent redundant error dialog when first model is missing
                    if (this._suppressMissingModelDialog) {
                        return;
                    }

                    const errorDialog = new UiDialog("content");
                    errorDialog.setTitle("Model Load Error");

                    let text = "Unable to load ";
                    if (modelName) {
                        text += `'${modelName}'`;
                    } else {
                        text += "model";
                    }
                    text += `: ${reason}`;

                    errorDialog.setText(text);
                    errorDialog.show();
                },
                modelLoadBegin: () => {
                    this._suppressMissingModelDialog = false;
                },
                missingModel: (modelPath: string) => {
                    if (!this._suppressMissingModelDialog) {
                        this._suppressMissingModelDialog = true;

                        const errorDialog = new UiDialog("content");
                        errorDialog.setTitle("Missing Model Error");

                        let text = "Unable to load ";
                        text += `'${modelPath}'`;

                        errorDialog.setText(text);
                        errorDialog.show();
                    }
                },
                webGlContextLost: () => {
                    const errorDialog = new UiDialog("content");
                    errorDialog.setTitle("Fatal Error");
                    errorDialog.setText("WebGL context lost. Rendering cannot continue.");
                    errorDialog.show();
                },
                XHRonloadend: (_e: ProgressEvent, status: number, uri: string) => {
                    if (status === 404) {
                        const errorDialog = new UiDialog("content");
                        errorDialog.setTitle("404 Error");
                        errorDialog.setText(`Unable to load ${uri}`);
                        errorDialog.show();
                    }
                },

                incrementalSelectionBatchBegin: () => {
                    this.freezeModelBrowser(true);
                    this.enableModelBrowserPartSelection(false);
                },
                incrementalSelectionBatchEnd: () => {
                    this.freezeModelBrowser(false);
                    this.enableModelBrowserPartSelection(true);
                },
                incrementalSelectionEnd: () => {
                    if (this._modelBrowser !== null) {
                        this._modelBrowser.updateSelection(null);
                    }
                },
            });
        }

        private _determineModelType(rootIds: NodeId[]): ModelType {
            let modelType = ModelType.Generic;

            if (this._viewer.sheetManager.isDrawingSheetActive()) {
                modelType = ModelType.Drawing;
            } else if (this._isBim(rootIds)) {
                modelType = ModelType.Bim;
            }
            return modelType;
        }

        private _isBim(rootIds: NodeId[]): boolean {
            if (rootIds.length > 0) {
                const id = rootIds[0];
                const fileType = this._viewer.model.getModelFileTypeFromNode(id);
                if (fileType === FileType.Ifc || fileType === FileType.Revit) {
                    return true;
                }
            }
            return false;
        }

        private _configureUi(modelType: ModelType): void {
            if (this._uiModelType === modelType) {
                return;
            }
            this._uiModelType = modelType;

            const axisTriad = this._viewer.view.getAxisTriad();
            const navCube = this._viewer.view.getNavCube();

            if (modelType === ModelType.Drawing) {
                axisTriad.disable();
                navCube.disable();
                this._viewer.view.setDrawMode(DrawMode.WireframeOnShaded);
            } else {
                axisTriad.enable();

                if (modelType === ModelType.Bim) {
                    this._viewer.view.setBackfacesVisible(true);
                } else {
                    navCube.enable();
                }
            }

            this._configureToolbar(modelType);
            this._configureModelBrowser(modelType);
        }

        private _configureToolbar(modelType: ModelType): void {
            if (this._toolbar === null) {
                return;
            }

            if (modelType === ModelType.Drawing) {
                $("#cuttingplane-button").hide();
                $("#cuttingplane-submenu").hide();
                $("#explode-button").hide();
                $("#explode-slider").hide();
                $("#explode-submenu").hide();
                $("#view-button").hide();
                $("#view-submenu").hide();
                $("#camera-button").hide();
                $("#camera-submenu").hide();
                $("#tool_separator_4").hide();
                $("#tool_separator_1").hide();
                $("#edgeface-button").hide();
                $("#edgeface-submenu").hide();
            } else {
                $("#cuttingplane-button").show();
                $("#explode-button").show();
                $("#view-button").show();
                $("#camera-button").show();
                $("#tool_separator_4").show();
                $("#tool_separator_1").show();
                $("#edgeface-button").show();
            }

            this._toolbar.reposition();
        }

        private _configureModelBrowser(modelType: ModelType): void {
            if (this._modelBrowser === null) {
                return;
            }

            if (modelType === ModelType.Drawing) {
                $(".ui-modeltree").addClass("drawing");
            } else {
                $(".ui-modeltree").removeClass("drawing");
            }
        }

        private _onSceneReady(): void {
            const selectionManager = this._viewer.selectionManager;
            selectionManager.setNodeSelectionColor(DesktopUi._defaultPartSelectionColor);
            selectionManager.setNodeSelectionOutlineColor(
                DesktopUi._defaultPartSelectionOutlineColor,
            );

            const view = this._viewer.view;

            view.setXRayColor(ElementType.Faces, DesktopUi._defaultXRayColor) as Unreferenced;
            view.setXRayColor(ElementType.Lines, DesktopUi._defaultXRayColor) as Unreferenced;
            view.setXRayColor(ElementType.Points, DesktopUi._defaultXRayColor) as Unreferenced;
            view.setBackgroundColor(
                DesktopUi._defaultBackgroundColor,
                DesktopUi._defaultBackgroundColor,
            );
        }

        public setDeselectOnIsolate(deselect: boolean): void {
            this._isolateZoomHelper.setDeselectOnIsolate(deselect);
        }

        /* UI API functions */
        public freezeModelBrowser(freeze: boolean): void {
            if (this._modelBrowser !== null) {
                this._modelBrowser.freeze(freeze);
            }
        }

        public enableModelBrowserPartSelection(enable: boolean): void {
            if (this._modelBrowser !== null) {
                this._modelBrowser.enablePartSelection(enable);
            }
        }

        /** @hidden */
        public _getContextMenu(): RightClickContextMenu {
            return this._contextMenu;
        }

        /** @hidden */
        public _getModelBrowser(): ModelBrowser | null {
            return this._modelBrowser;
        }

        /** @hidden */
        public _getToolbar(): Toolbar | null {
            return this._toolbar;
        }
    }
}
