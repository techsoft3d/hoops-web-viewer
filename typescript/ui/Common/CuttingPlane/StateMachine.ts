/// <reference path="./interfaces.ts"/>

namespace Communicator.Ui.CuttingPlane.ControllerUtils {
    /**
     * @class StateMachine Helper Class to create a Controller StateMachine given a Controller
     */
    export class StateMachine extends Util.StateMachine<ControllerState, EventType> {
        constructor(controller: IController) {
            super({ name: "not initialized", controller }, defaultReducer);
        }
    }

    /**
     * The default reducer of the Controller.
     *
     * The default behavior is to begin as 'not initialized'
     *  - If it receives an init action
     *    - it set its state to 'updating'
     *    - it initializes the controller
     *    - If an update action is received during the initialization it sets its states to 'update triggered'.
     *    - when the initialization is done
     *      - if the current state is 'updating' it is set it to 'outdated'
     *      - if the current state is 'update triggered' it calls the default reducer with the action 'update'
     *
     *  - If it receives an update action
     *    - if the current state is 'not initialized' it throws an error
     *    - if the current state is 'update triggered' it does nothing
     *    - if the current state is 'updating' it set the state to 'update triggered' and stops
     *    - it set its state to 'updating'
     *    - it updates the controller
     *    - If an update action is received during the initialization it sets its states to 'update triggered'.
     *    - when the initialization is done
     *      - if the current state is 'updating' it is set it to 'up to date'
     *      - if the current state is 'update triggered' it calls the default reducer with the action 'update'
     *
     *  - If it receives a clear action
     *    - if the current state is 'not initialized' it throws an error
     *    - it set its state to 'updating'
     *    - it clears the controller
     *    - If an update action is received during the initialization it sets its states to 'update triggered'.
     *    - when the initialization is done
     *      - if the current state is 'updating' it is set it to 'up to date'
     *      - if the current state is 'update triggered' it calls the default reducer with the action 'update'
     *
     * @note COM-3280 showed that several calls to setVisibility will trigger calls of
     * Communicator.Ui.CuttingPlane.Controller._updateBoundingBox and it interferes with the model visibility
     * and creates bugs.
     * To avoid collisions between the successive setVisibility and the updating of the Controller the actions
     * are delayed using @function delayCall.
     *
     * @see delayCall
     *
     * {@link https://techsoft3d.atlassian.net/browse/COM-3280}
     *
     * @param  {ControllerState} state the current state of the controller's state machine
     * @param  {Util.StateMachine.Action<EventType>} action the action that triggered the transition
     * @param  {EventType} action.name the name of the action
     * @param  {undefined} action.payload the payload of the action
     *
     * @note The action's payload is always undefined as the Controller does not use it
     *
     * @returns State
     */
    export function defaultReducer(
        state: ControllerState,
        { name, payload }: Util.StateMachine.Action<EventType>,
    ): ControllerState {
        const isUpdateDiscarded = (state: ControllerState) => state.name === "update triggered";

        switch (name) {
            case "init":
                Util.delayCall(async () => {
                    // it is set to updating to postpone upgrade requests
                    state.name = "updating";
                    await state.controller.init();

                    // if the update is discarded (an update request is pending)
                    // we trigger the update
                    if (isUpdateDiscarded(state)) {
                        defaultReducer(state, { name: "update", payload });
                        return;
                    }

                    state.name = "outdated";
                });
                break;

            case "update":
                if (state.name === "not initialized") {
                    throw new Error(
                        "CuttingPlane.Controller.StateMachine has not been initialized",
                    );
                }

                if (isUpdateDiscarded(state)) {
                    break;
                } else if (state.name === "updating") {
                    state.name = "update triggered";
                    break;
                }

                Util.delayCall(async () => {
                    state.name = "updating";
                    await state.controller.update();
                    if (isUpdateDiscarded(state)) {
                        defaultReducer(state, { name: "update", payload });
                        return;
                    }

                    state.name = "up to date";
                });
                break;

            case "refresh":
                if (state.name === "not initialized") {
                    throw new Error(
                        "CuttingPlane.Controller.StateMachine has not been initialized",
                    );
                }

                Util.delayCall(async () => {
                    state.name = "updating";
                    await state.controller.refresh();
                    if (isUpdateDiscarded(state)) {
                        defaultReducer(state, { name: "update", payload });
                        return;
                    }

                    state.name = "up to date";
                });
                break;

            case "clear":
                if (state.name === "not initialized") {
                    throw new Error(
                        "CuttingPlane.Controller.StateMachine has not been initialized",
                    );
                }

                Util.delayCall(async () => {
                    state.name = "updating";
                    await state.controller.clear();
                    if (isUpdateDiscarded(state)) {
                        defaultReducer(state, { name: "update", payload });
                        return;
                    }

                    state.name = "up to date";
                });
                break;
        }

        return state;
    }
}
