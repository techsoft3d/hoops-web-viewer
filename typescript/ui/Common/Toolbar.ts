/// <reference path="../js/hoops_web_viewer.d.ts"/>
namespace Communicator.Ui {
    export class Toolbar {
        private readonly _viewer: WebViewer;
        private readonly _noteTextManager: Markup.Note.NoteTextManager;
        private readonly _cuttingPlaneController: CuttingPlaneController;
        private readonly _viewerSettings: Desktop.ViewerSettings;

        private readonly _toolbarSelector: string = "#toolBar";
        private readonly _screenElementSelector: string = "#content";

        private readonly _cuttingPlaneXSelector: string = "#cuttingplane-x";
        private readonly _cuttingPlaneYSelector: string = "#cuttingplane-y";
        private readonly _cuttingPlaneZSelector: string = "#cuttingplane-z";
        private readonly _cuttingPlaneFaceSelector: string = "#cuttingplane-face";
        private readonly _cuttingPlaneVisibilitySelector: string = "#cuttingplane-section";
        private readonly _cuttingPlaneGroupToggle: string = "#cuttingplane-toggle";
        private readonly _cuttingPlaneResetSelector: string = "#cuttingplane-reset";

        private readonly _selectedClass: string = "selected";
        private readonly _disabledClass: string = "disabled";
        private readonly _invertedClass: string = "inverted";

        private readonly _submenuHeightOffset: number = 10;
        private readonly _viewOrientationDuration: number = 500;
        private _activeSubmenu: HTMLElement | null = null;

        private readonly _actionsNullary = new Map<string, () => void>();
        private readonly _actionsBoolean = new Map<string, (arg: boolean) => void>();

        private _isInitialized: boolean = false;
        private readonly _screenConfiguration: ScreenConfiguration;

        constructor(
            viewer: WebViewer,
            cuttingPlaneController: CuttingPlaneController,
            screenConfiguration: ScreenConfiguration = ScreenConfiguration.Desktop,
        ) {
            this._viewer = viewer;
            this._noteTextManager = this._viewer.noteTextManager;

            this._screenConfiguration = screenConfiguration;

            this._cuttingPlaneController = cuttingPlaneController;
            this._viewerSettings = new Desktop.ViewerSettings(viewer);

            this._viewer.setCallbacks({
                selectionArray: (events: Event.NodeSelectionEvent[]) => {
                    if (events.length > 0) {
                        const selection = events[events.length - 1];
                        const selectionItem = selection.getSelection();
                        if (selectionItem !== null && selectionItem.isFaceSelection()) {
                            $(this._cuttingPlaneFaceSelector).removeClass(this._disabledClass);
                            $("#view-face").removeClass(this._disabledClass);
                        }
                    } else {
                        $(this._cuttingPlaneFaceSelector).addClass(this._disabledClass);
                        $("#view-face").addClass(this._disabledClass);
                    }
                },
                cuttingSectionsLoaded: () => {
                    return this._cuttingPlaneController.onSectionsChanged().then(() => {
                        this._updateCuttingPlaneIcons();
                    });
                },
            });
        }

        public init(): void {
            if (this._isInitialized) return;

            this._initIcons();

            this._removeNonApplicableIcons();

            $(".hoops-tool").on("click", (event) => {
                event.preventDefault();
                this._processButtonClick(event);
                return false;
            });

            $(".submenu-icon").on("click", (event) => {
                event.preventDefault();
                this._submenuIconClick(event.target);
                return false;
            });

            $(this._toolbarSelector).on("touchmove", (event) => {
                if (event.originalEvent) event.originalEvent.preventDefault();
            });

            $(this._toolbarSelector).on("mouseenter", () => {
                this._mouseEnter();
            });

            $(this._toolbarSelector).on("mouseleave", () => {
                this._mouseLeave();
            });

            $(".tool-icon, .submenu-icon").on("mouseenter", (event) => {
                this._mouseEnterItem(event);
            });

            $(".tool-icon, .submenu-icon").on("mouseleave", (event) => {
                this._mouseLeaveItem(event);
            });

            $(window).on("resize", () => {
                this.reposition();
            });

            $(this._toolbarSelector).on("click", () => {
                if (this._activeSubmenu !== null) {
                    this._hideActiveSubmenu();
                }
            });

            $(".toolbar-cp-plane").on("click", async (event) => {
                await this._cuttingPlaneButtonClick(event);
            });

            this._viewer.setCallbacks({
                modelSwitched: () => {
                    this._hideActiveSubmenu();
                },
            });

            this._initSliders();
            this._initActions();
            this._initSnapshot();

            this.updateEdgeFaceButton();

            this.reposition();
            this.show();

            this._isInitialized = true;
        }

        /** @hidden */
        public _getViewerSettings(): Desktop.ViewerSettings {
            return this._viewerSettings;
        }

        public disableSubmenuItem(item: Object | string): void {
            if (typeof item === "string") {
                $(`#submenus .toolbar-${item}`).addClass(this._disabledClass);
            } else if (typeof item === "object") {
                $.each(item, (_key, value) => {
                    $(`#submenus .toolbar-${value}`).addClass(this._disabledClass);
                });
            }
        }

        public enableSubmenuItem(item: Object | string): void {
            if (typeof item === "string") {
                $(`#submenus .toolbar-${item}`).removeClass(this._disabledClass);
            } else if (typeof item === "object") {
                $.each(item, (_key, value) => {
                    $(`#submenus .toolbar-${value}`).removeClass(this._disabledClass);
                });
            }
        }

        public setCorrespondingButtonForSubmenuItem(value: string): void {
            const $item = $(`#submenus .toolbar-${value}`);
            this._activateSubmenuItem($item);
        }

        private _mouseEnterItem(event: JQuery.MouseEnterEvent): void {
            const $target = $(event.target);

            if (!$target.hasClass(this._disabledClass)) $target.addClass("hover");
        }

        private _mouseLeaveItem(event: JQuery.MouseLeaveEvent): void {
            $(event.target).removeClass("hover");
        }

        public show(): void {
            $(this._toolbarSelector).show();
        }

        public hide(): void {
            $(this._toolbarSelector).hide();
        }

        private _initSliders(): void {
            $("#explosion-slider").slider({
                orientation: "vertical",
                min: 0,
                max: 200,
                value: 0,
                slide: async (_event: Event, ui: JQueryUI.SliderUIParams) => {
                    await this._onExplosionSlider((ui.value || 0) / 100);
                },
            });
        }

        private _mouseEnter(): void {
            if (this._activeSubmenu === null) {
                const $tools = $(this._toolbarSelector).find(".toolbar-tools");
                $tools.stop();

                $tools.css({
                    opacity: 1.0,
                });
            }
        }

        private _mouseLeave(): void {
            if (this._activeSubmenu === null) {
                $(".toolbar-tools").animate(
                    {
                        opacity: 0.6,
                    },
                    500,
                    () => {
                        // Animation complete.
                    },
                );
            }
        }

        public reposition(): void {
            const $toolbar = $(this._toolbarSelector);
            const $screen = $(this._screenElementSelector);

            if ($toolbar !== undefined && $screen !== undefined) {
                const screenWidth = $screen.width();
                const toolbarWidth = $toolbar.width();

                if (toolbarWidth !== undefined && screenWidth !== undefined) {
                    const canvasCenterX = screenWidth / 2;
                    const toolbarX = canvasCenterX - toolbarWidth / 2;

                    $toolbar.css({
                        left: `${toolbarX}px`,
                        bottom: "15px",
                    });
                }
            }
        }

        private _processButtonClick(event: JQuery.ClickEvent | null): void {
            if (this._activeSubmenu !== null) {
                this._hideActiveSubmenu();
            } else {
                if (event !== null) {
                    const target = event.target;
                    const $tool = $(target).closest(".hoops-tool");

                    if ($tool.hasClass("toolbar-radio")) {
                        if ($tool.hasClass("active-tool")) {
                            this._showSubmenu(target);
                        } else {
                            $(this._toolbarSelector)
                                .find(".active-tool")
                                .removeClass("active-tool");
                            $tool.addClass("active-tool");
                            this._performNullaryAction($tool.data("operatorclass"));
                        }
                    } else if ($tool.hasClass("toolbar-menu")) {
                        this._showSubmenu(target);
                    } else if ($tool.hasClass("toolbar-menu-toggle")) {
                        this._toggleMenuTool($tool);
                    } else {
                        this._performNullaryAction($tool.data("operatorclass"));
                    }
                }
            }
        }

        private _toggleMenuTool($tool: JQuery<EventTarget>): void {
            const $toggleMenu = $(`#${$tool.data("submenu")}`);

            if ($toggleMenu.is(":visible")) {
                $toggleMenu.hide();
                this._performBooleanAction($tool.data("operatorclass"), false);
            } else {
                this._alignMenuToTool($toggleMenu, $tool);
                this._performBooleanAction($tool.data("operatorclass"), true);
            }
        }

        private _startModal(): void {
            $("body").append("<div id='toolbar-modal' class='toolbar-modal-overlay'></div>");

            $("#toolbar-modal").on("click", () => {
                this._hideActiveSubmenu();
            });
        }

        private _alignMenuToTool($submenu: JQuery, $tool: JQuery<EventTarget>): void {
            const position = $tool.position();

            let leftPositionOffset = position.left;
            if (this._screenConfiguration === ScreenConfiguration.Mobile) {
                // constant scale transform from Toolbar.css
                const mobileScale = 1.74;
                leftPositionOffset = leftPositionOffset / mobileScale;
            }
            const submenuWidth = $submenu.width();
            const submenuHeight = $submenu.height();
            if (submenuWidth !== undefined && submenuHeight !== undefined) {
                const leftpos = leftPositionOffset - submenuWidth / 2 + 20;
                const topPos = -(this._submenuHeightOffset + submenuHeight);

                $submenu.css({
                    display: "block",
                    left: `${leftpos}px`,
                    top: `${topPos}px`,
                });
            }
        }

        private _showSubmenu(item: EventTarget): void {
            this._hideActiveSubmenu();

            const $tool = $(item).closest(".hoops-tool");
            const submenuId = $tool.data("submenu");

            if (!!submenuId) {
                const $submenu = $(`${this._toolbarSelector} #submenus #${submenuId}`);

                if (!$submenu.hasClass(this._disabledClass)) {
                    this._alignMenuToTool($submenu, $tool);
                    this._activeSubmenu = $submenu[0];
                    this._startModal();

                    $(this._toolbarSelector).find(".toolbar-tools").css({
                        opacity: 0.3,
                    });
                }
            }
        }

        private _hideActiveSubmenu(): void {
            $("#toolbar-modal").remove();

            if (this._activeSubmenu !== null) {
                $(this._activeSubmenu).hide();

                $(this._toolbarSelector).find(".toolbar-tools").css({
                    opacity: 1.0,
                });
            }

            this._activeSubmenu = null;
        }

        private _activateSubmenuItem(submenuItem: JQuery<Element>): string {
            const $submenu = submenuItem.closest(".toolbar-submenu");
            const action = submenuItem.data("operatorclass");
            if (typeof action !== "string") {
                throw new CommunicatorError("Invalid submenuItem.");
            }

            const $tool = $(`#${$submenu.data("button")}`);

            const $icon = $tool.find(".tool-icon");

            if ($icon.length) {
                $icon.removeClass($tool.data("operatorclass").toString());
                $icon.addClass(action);

                $tool.data("operatorclass", action);

                const title = submenuItem.attr("title");
                if (title !== undefined) {
                    $tool.attr("title", title);
                }
            }

            return action;
        }

        private _submenuIconClick(item: Element): void {
            const $selection = $(item);

            if ($selection.hasClass(this._disabledClass)) return;

            const action = this._activateSubmenuItem($selection);

            this._hideActiveSubmenu();
            this._performNullaryAction(action);
        }

        private _initIcons(): void {
            $(this._toolbarSelector)
                .find(".hoops-tool")
                .each(function (this: any) {
                    const $element = $(this);

                    $element.find(".tool-icon").addClass($element.data("operatorclass").toString());
                });

            $(this._toolbarSelector)
                .find(".submenu-icon")
                .each(function (this: any) {
                    const $element = $(this);

                    $element.addClass($element.data("operatorclass").toString());
                });
        }

        private _removeNonApplicableIcons(): void {
            if (this._screenConfiguration === ScreenConfiguration.Mobile) {
                $("#snapshot-button").remove();
            }
        }

        public setSubmenuEnabled(buttonId: HtmlId, enabled: boolean): void {
            const $button = $(`#${buttonId}`);
            const $submenu = $(`#${$button.data("submenu")}`);

            if (enabled) {
                $button.find(".smarrow").show();
                $submenu.removeClass(this._disabledClass);
            } else {
                $button.find(".smarrow").hide();
                $submenu.addClass(this._disabledClass);
            }
        }

        private _performNullaryAction(action: string): void {
            const func = this._actionsNullary.get(action);
            if (func) {
                func();
            }
        }

        private _performBooleanAction(action: string, arg: boolean): void {
            const func = this._actionsBoolean.get(action);
            if (func) {
                func(arg);
            }
        }

        private _renderModeClick(action: string): void {
            const view = this._viewer.view;
            switch (action) {
                case "toolbar-shaded":
                    view.setDrawMode(DrawMode.Shaded);
                    break;

                case "toolbar-wireframe":
                    view.setDrawMode(DrawMode.Wireframe);
                    break;

                case "toolbar-hidden-line":
                    view.setDrawMode(DrawMode.HiddenLine);
                    break;

                case "toolbar-xray":
                    view.setDrawMode(DrawMode.XRay);
                    break;

                default:
                case "toolbar-wireframeshaded":
                    view.setDrawMode(DrawMode.WireframeOnShaded);
                    break;
            }
        }

        private _initSnapshot(): void {
            $("#snapshot-dialog-cancel-button")
                .button()
                .on("click", () => {
                    $("#snapshot-dialog").hide();
                });
        }

        public async _doSnapshot(): Promise<void> {
            const canvasSize = this._viewer.view.getCanvasSize();
            const windowAspect = canvasSize.x / canvasSize.y;

            let renderHeight = 480;
            let renderWidth = windowAspect * renderHeight;

            const $screen = $("#content");
            const windowWidth = $screen.width();
            const windowHeight = $screen.height();

            //Using a percentage of the window size since allows the user to resize the image
            const percentageOfWindow = 0.7;

            if (windowHeight !== undefined && windowWidth !== undefined) {
                renderHeight = windowHeight * percentageOfWindow;
                renderWidth = windowWidth * percentageOfWindow;

                const dialogWidth = renderWidth + 40;

                const config = new SnapshotConfig(canvasSize.x, canvasSize.y);
                const image = await this._viewer.takeSnapshot(config);

                const xpos = (windowWidth - renderWidth) / 2;
                const $dialog: JQuery = $("#snapshot-dialog");

                $("#snapshot-dialog-image")
                    .attr("src", image.src)
                    .attr("width", dialogWidth)
                    .attr("height", renderHeight + 40);

                $dialog.css({
                    top: "45px",
                    left: `${xpos}px`,
                });

                $dialog.show();
            }
        }

        private _setRedlineOperator(operatorId: OperatorId): void {
            this._viewer.operatorManager.set(operatorId, 1);
        }

        private _initActions(): void {
            const view = this._viewer.view;
            const operatorManager = this._viewer.operatorManager;

            this._actionsNullary.set("toolbar-home", () => {
                this._viewer.reset() as Unreferenced;

                if (!this._viewer.sheetManager.isDrawingSheetActive()) {
                    this._noteTextManager.setIsolateActive(false);
                    this._noteTextManager.updatePinVisibility() as Unreferenced;
                    const handleOperator = operatorManager.getOperator(OperatorId.Handle);
                    if (handleOperator !== null && handleOperator.removeHandles) {
                        handleOperator.removeHandles() as Unreferenced;
                    }
                }
            });

            this._actionsNullary.set("toolbar-redline-circle", () => {
                this._setRedlineOperator(OperatorId.RedlineCircle);
            });
            this._actionsNullary.set("toolbar-redline-freehand", () => {
                this._setRedlineOperator(OperatorId.RedlinePolyline);
            });
            this._actionsNullary.set("toolbar-redline-rectangle", () => {
                this._setRedlineOperator(OperatorId.RedlineRectangle);
            });
            this._actionsNullary.set("toolbar-redline-note", () => {
                this._setRedlineOperator(OperatorId.RedlineText);
            });

            this._actionsNullary.set("toolbar-note", () => {
                operatorManager.set(OperatorId.Note, 1);
            });
            this._actionsNullary.set("toolbar-select", () => {
                operatorManager.set(OperatorId.Select, 1);
            });
            this._actionsNullary.set("toolbar-area-select", () => {
                operatorManager.set(OperatorId.AreaSelect, 1);
            });

            this._actionsNullary.set("toolbar-orbit", () => {
                operatorManager.set(OperatorId.Navigate, 0);
            });
            this._actionsNullary.set("toolbar-turntable", () => {
                operatorManager.set(OperatorId.Turntable, 0);
            });
            this._actionsNullary.set("toolbar-walk", () => {
                operatorManager.set(OperatorId.WalkMode, 0);
            });
            this._actionsNullary.set("toolbar-face", async () => {
                await this._orientToFace();
            });

            this._actionsNullary.set("toolbar-measure-point", () => {
                operatorManager.set(OperatorId.MeasurePointPointDistance, 1);
            });
            this._actionsNullary.set("toolbar-measure-edge", () => {
                operatorManager.set(OperatorId.MeasureEdgeLength, 1);
            });
            this._actionsNullary.set("toolbar-measure-distance", () => {
                operatorManager.set(OperatorId.MeasureFaceFaceDistance, 1);
            });
            this._actionsNullary.set("toolbar-measure-angle", () => {
                operatorManager.set(OperatorId.MeasureFaceFaceAngle, 1);
            });

            this._actionsNullary.set("toolbar-cuttingplane", () => {
                return;
            });
            this._actionsBoolean.set("toolbar-explode", async (visibility: boolean) => {
                await this._explosionButtonClick(visibility);
            });

            this._actionsNullary.set("toolbar-settings", async () => {
                await this._settingsButtonClick();
            });

            this._actionsNullary.set("toolbar-wireframeshaded", () => {
                this._renderModeClick("toolbar-wireframeshaded");
            });
            this._actionsNullary.set("toolbar-shaded", () => {
                this._renderModeClick("toolbar-shaded");
            });
            this._actionsNullary.set("toolbar-wireframe", () => {
                this._renderModeClick("toolbar-wireframe");
            });
            this._actionsNullary.set("toolbar-hidden-line", () => {
                this._renderModeClick("toolbar-hidden-line");
            });
            this._actionsNullary.set("toolbar-xray", () => {
                this._renderModeClick("toolbar-xray");
            });

            this._actionsNullary.set("toolbar-front", async () => {
                await view.setViewOrientation(ViewOrientation.Front, this._viewOrientationDuration);
            });
            this._actionsNullary.set("toolbar-back", async () => {
                await view.setViewOrientation(ViewOrientation.Back, this._viewOrientationDuration);
            });
            this._actionsNullary.set("toolbar-left", async () => {
                await view.setViewOrientation(ViewOrientation.Left, this._viewOrientationDuration);
            });
            this._actionsNullary.set("toolbar-right", async () => {
                await view.setViewOrientation(ViewOrientation.Right, this._viewOrientationDuration);
            });
            this._actionsNullary.set("toolbar-bottom", async () => {
                await view.setViewOrientation(
                    ViewOrientation.Bottom,
                    this._viewOrientationDuration,
                );
            });
            this._actionsNullary.set("toolbar-top", async () => {
                await view.setViewOrientation(ViewOrientation.Top, this._viewOrientationDuration);
            });
            this._actionsNullary.set("toolbar-iso", async () => {
                await view.setViewOrientation(ViewOrientation.Iso, this._viewOrientationDuration);
            });

            this._actionsNullary.set("toolbar-ortho", () => {
                view.setProjectionMode(Projection.Orthographic);
            });
            this._actionsNullary.set("toolbar-persp", () => {
                view.setProjectionMode(Projection.Perspective);
            });

            this._actionsNullary.set("toolbar-snapshot", async () => {
                await this._doSnapshot();
            });
        }

        private _onExplosionSlider(value: number): Promise<void> {
            return this._viewer.explodeManager.setMagnitude(value);
        }

        private _explosionButtonClick(visibility: boolean): Promise<void> {
            const explodeManager = this._viewer.explodeManager;

            if (visibility && !explodeManager.getActive()) {
                return explodeManager.start();
            }

            return Promise.resolve();
        }

        private _settingsButtonClick(): Promise<void> {
            return this._viewerSettings.show();
        }

        public updateEdgeFaceButton(): void {
            const view = this._viewer.view;

            const edgeVisibility = view.getLineVisibility();
            const faceVisibility = view.getFaceVisibility();

            if (edgeVisibility && faceVisibility)
                this.setCorrespondingButtonForSubmenuItem("wireframeshaded");
            else if (!edgeVisibility && faceVisibility)
                this.setCorrespondingButtonForSubmenuItem("shaded");
            else this.setCorrespondingButtonForSubmenuItem("wireframe");
        }

        private _cuttingPlaneButtonClick(event: JQuery.ClickEvent): Promise<void> {
            const $element = $(event.target).closest(".toolbar-cp-plane");
            const planeAction: string = $element.data("plane");

            let p: Promise<void>;

            const axis = this._getAxis(planeAction);
            if (axis !== null) {
                p = this._cuttingPlaneController.toggle(axis);
            } else if (planeAction === "section") {
                p = this._cuttingPlaneController.toggleReferenceGeometry();
            } else if (planeAction === "toggle") {
                p = this._cuttingPlaneController.toggleCuttingMode();
            } else if (planeAction === "reset") {
                p = this._cuttingPlaneController.resetCuttingPlanes();
            } else {
                p = Promise.resolve();
            }

            return p.then(() => {
                this._updateCuttingPlaneIcons();
            });
        }

        private _getAxis(planeAxis: string): CuttingSectionIndex | null {
            switch (planeAxis) {
                case "x":
                    return CuttingSectionIndex.X;
                case "y":
                    return CuttingSectionIndex.Y;
                case "z":
                    return CuttingSectionIndex.Z;
                case "face":
                    return CuttingSectionIndex.Face;
                default:
                    return null;
            }
        }

        private _updateCuttingPlaneIcons(): void {
            const geometryEnabled = this._cuttingPlaneController.getReferenceGeometryEnabled();
            const individualCuttingSection = this._cuttingPlaneController.getIndividualCuttingSectionEnabled();
            const count = this._cuttingPlaneController.getCount();

            this._updateCuttingPlaneIcon(CuttingSectionIndex.X, this._cuttingPlaneXSelector);
            this._updateCuttingPlaneIcon(CuttingSectionIndex.Y, this._cuttingPlaneYSelector);
            this._updateCuttingPlaneIcon(CuttingSectionIndex.Z, this._cuttingPlaneZSelector);
            this._updateCuttingPlaneIcon(CuttingSectionIndex.Face, this._cuttingPlaneFaceSelector);

            if (individualCuttingSection) {
                $(this._cuttingPlaneGroupToggle).removeClass(this._selectedClass);
            } else {
                $(this._cuttingPlaneGroupToggle).addClass(this._selectedClass);
            }

            if (count > 0) {
                if (geometryEnabled) {
                    $(this._cuttingPlaneVisibilitySelector).removeClass(this._selectedClass);
                } else {
                    $(this._cuttingPlaneVisibilitySelector).addClass(this._selectedClass);
                }

                $(this._cuttingPlaneVisibilitySelector).removeClass(this._disabledClass);
                $(this._cuttingPlaneResetSelector).removeClass(this._disabledClass);
            } else {
                $(this._cuttingPlaneVisibilitySelector).addClass(this._disabledClass);
                $(this._cuttingPlaneResetSelector).addClass(this._disabledClass);
            }

            if (count > 1) {
                $(this._cuttingPlaneGroupToggle).removeClass(this._disabledClass);
            } else {
                $(this._cuttingPlaneGroupToggle).addClass(this._disabledClass);
            }
        }

        private _updateCuttingPlaneIcon(
            sectionIndex: CuttingSectionIndex,
            cuttingPlaneSelector: string,
        ) {
            const $cuttingPlaneButton = $(cuttingPlaneSelector);
            $cuttingPlaneButton.removeClass(this._selectedClass);
            $cuttingPlaneButton.removeClass(this._invertedClass);

            const planeInfo = this._cuttingPlaneController.getPlaneInfo(sectionIndex);
            if (planeInfo !== undefined) {
                if (planeInfo.status === CuttingPlaneStatus.Visible) {
                    $cuttingPlaneButton.addClass(this._selectedClass);
                } else if (planeInfo.status === CuttingPlaneStatus.Inverted) {
                    $cuttingPlaneButton.addClass(this._invertedClass);
                }
            }
        }

        private _orientToFace(): Promise<void> {
            const selectionItem = this._viewer.selectionManager.getLast();

            if (selectionItem !== null && selectionItem.isFaceSelection()) {
                const view = this._viewer.view;

                const normal = selectionItem.getFaceEntity().getNormal();
                const position = selectionItem.getPosition();

                const camera = view.getCamera();

                let up = Point3.cross(normal, new Point3(0, 1, 0));
                if (up.length() < 0.001) {
                    up = Point3.cross(normal, new Point3(1, 0, 0));
                }

                const zoomDelta = camera.getPosition().subtract(camera.getTarget()).length();

                camera.setTarget(position);
                camera.setPosition(Point3.add(position, Point3.scale(normal, zoomDelta)));
                camera.setUp(up);

                return view.fitBounding(
                    selectionItem.getFaceEntity().getBounding(),
                    DefaultTransitionDuration,
                    camera,
                );
            }

            return Promise.resolve();
        }
    }
}
