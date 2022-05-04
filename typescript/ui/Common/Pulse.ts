namespace Example {
    const enum Direction {
        OneToTwo,
        TwoToOne,
    }

    class PulseInfo {
        public id: number;
        public direction = Direction.OneToTwo;

        public color1: Communicator.Color;
        public color2: Communicator.Color;

        public progress = 0;
        public duration: number;

        constructor(
            id: number,
            color1: Communicator.Color,
            color2: Communicator.Color,
            duration: number,
        ) {
            this.id = id;
            this.color1 = color1.copy();
            this.color2 = color2.copy();
            this.duration = duration;
        }
    }

    interface PulseInfoMap {
        [handle: string]: PulseInfo | undefined;
    }

    export class PulseManager {
        private _viewer: Communicator.WebViewer;

        private _previousTime?: number;

        private _pulseInfoMap: PulseInfoMap = {};

        private _defaultColor1 = Communicator.Color.red();
        private _defaultColor2 = new Communicator.Color(175, 0, 0);
        private _defaultPulseTime = 1000;

        constructor(viewer: Communicator.WebViewer) {
            this._viewer = viewer;
        }

        public start() {
            setTimeout(() => {
                this.update();
            }, 30);
        }

        public deletePulse(id: number) {
            if (this._pulseInfoMap.hasOwnProperty(id.toString())) {
                this._viewer.model.unsetNodesFaceColor([id]);
                delete this._pulseInfoMap[id];
            }
        }

        public add(
            id: number,
            color1: Communicator.Color,
            color2: Communicator.Color,
            duration: number,
        ) {
            this.deletePulse(id);

            const pulseInfo = new PulseInfo(id, color1, color2, duration);
            this._pulseInfoMap[id] = pulseInfo;
        }

        public update() {
            if (this._previousTime == null) {
                this._previousTime = Date.now();
            }

            const currentTime = Date.now();
            const timeDelta = currentTime - this._previousTime;
            const colorMap: Communicator.IdColorMap = {};
            let itemsPresent = false;

            for (const key of Object.keys(this._pulseInfoMap)) {
                const pulseInfo = this._pulseInfoMap[key]!;
                itemsPresent = true;

                pulseInfo.progress = Math.min(pulseInfo.progress + timeDelta, pulseInfo.duration);

                const t = pulseInfo.progress / pulseInfo.duration;

                let a: Communicator.Color | undefined;
                let b: Communicator.Color | undefined;

                if (pulseInfo.direction === Direction.OneToTwo) {
                    a = pulseInfo.color1;
                    b = pulseInfo.color2;
                } else {
                    a = pulseInfo.color2;
                    b = pulseInfo.color1;
                }

                const interpolatedColor = new Communicator.Color(
                    a.r + (b.r - a.r) * t,
                    a.g + (b.g - a.g) * t,
                    a.b + (b.b - a.b) * t,
                );

                colorMap[pulseInfo.id] = interpolatedColor;

                if (pulseInfo.progress >= pulseInfo.duration) {
                    pulseInfo.direction =
                        pulseInfo.direction === Direction.OneToTwo
                            ? Direction.TwoToOne
                            : Direction.OneToTwo;
                    pulseInfo.progress = 0;
                }
            }

            if (itemsPresent) {
                this._viewer.model.setNodesColors(colorMap);
                this._viewer.redraw();
            }

            this._previousTime = currentTime;

            this.start();
        }

        public getDefaultColor1(): Communicator.Color {
            return this._defaultColor1.copy();
        }

        public getDefaultColor2(): Communicator.Color {
            return this._defaultColor2.copy();
        }

        public getDefaultPulseTime(): number {
            return this._defaultPulseTime;
        }
    }
}
