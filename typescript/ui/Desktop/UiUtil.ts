namespace Communicator.Ui {
    /**
     * The default duration in milliseconds of UI transitions such as model tree
     * expansion or scrolling to selected nodes.
     */
    export let DefaultUiTransitionDuration = 400;

    export function colorFromRgbString(rgbStr: string): Color {
        const rgb = rgbStr.replace(/[^\d,]/g, "").split(",");
        return new Color(Number(rgb[0]), Number(rgb[1]), Number(rgb[2]));
    }

    export function rgbStringFromColor(color: Color | null | undefined): string {
        if (!color) {
            return "";
        }
        return `rgb(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)})`;
    }

    export function cssHexStringFromColor(color: Color): string {
        const hex = (n: number): string => {
            const s = n.toString(16);
            return s.length === 1 ? `0${s}` : s;
        };
        return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
    }

    export function getValueAsString(id: HtmlId): string {
        const value = $(id).val();
        if (typeof value === "string") {
            return value;
        }
        return "";
    }

    export function centerWindow(htmlId: HtmlId, canvasSize: Point2): void {
        const $window = $(`#${htmlId}`);

        const width = $window.width();
        const height = $window.height();

        if (width !== undefined && height !== undefined) {
            const leftPos = (canvasSize.x - width) / 2;
            const topPos = (canvasSize.y - height) / 2;

            $window.css({
                left: `${leftPos}px`,
                top: `${topPos}px`,
            });
        }
    }
}
