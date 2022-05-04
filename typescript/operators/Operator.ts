/// <reference path="../Event/MouseInputEvent.ts"/>
/// <reference path="../Event/TouchInputEvent.ts"/>
/// <reference path="../Event/KeyInputEvent.ts"/>

/**
 * Operators provide hooks into various events provided by the web browser and perform well defined actions based on user input. An example of using an Operator can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/operators/operators.html).
 * @preferred
 */
namespace Communicator.Operator {
    export interface Operator {
        readonly onMouseDown?: (event: Event.MouseInputEvent) => void | Promise<void>;
        readonly onMouseMove?: (event: Event.MouseInputEvent) => void | Promise<void>;
        readonly onMouseUp?: (event: Event.MouseInputEvent) => void | Promise<void>;
        readonly onMousewheel?: (event: Event.MouseWheelInputEvent) => void | Promise<void>;

        readonly onTouchStart?: (event: Event.TouchInputEvent) => void | Promise<void>;
        readonly onTouchMove?: (event: Event.TouchInputEvent) => void | Promise<void>;
        readonly onTouchEnd?: (event: Event.TouchInputEvent) => void | Promise<void>;

        readonly onKeyDown?: (event: Event.KeyInputEvent) => void | Promise<void>;
        readonly onKeyUp?: (event: Event.KeyInputEvent) => void | Promise<void>;

        readonly onDeactivate?: () => void | Promise<void>;
        readonly onActivate?: () => void | Promise<void>;
        readonly onViewOrientationChange?: () => void | Promise<void>;

        /**
         * Stops an operator from interacting with the scene.
         */
        readonly stopInteraction?: () => void | Promise<void>;
    }
}
