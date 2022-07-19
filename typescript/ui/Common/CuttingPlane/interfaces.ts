/// <reference path="../../js/hoops_web_viewer.d.ts"/>

namespace Communicator.Ui.CuttingPlane {
    export const enum Status {
        Hidden,
        Visible,
        Inverted,
    }

    export class Info {
        public plane: Plane | null = null;
        public referenceGeometry: Point3[] | null = null;
        public status: Status = Status.Hidden;
        public updateReferenceGeometry: boolean = false;
    }

    export namespace ControllerUtils {
        export interface IController {
            init: () => Promise<void>;
            update: () => Promise<void>;
            refresh: () => Promise<void>;
            clear: () => Promise<void>;
        }

        export type EventType = "init" | "update" | "refresh" | "clear";
        export type StateName =
            | "not initialized"
            | "outdated"
            | "updating"
            | "up to date"
            | "update triggered";

        export interface ControllerState {
            name: StateName;
            controller: IController;
        }

        export type ControllerStateReducer = (
            state: ControllerState,
            event: EventType,
        ) => ControllerState;
    }
}
