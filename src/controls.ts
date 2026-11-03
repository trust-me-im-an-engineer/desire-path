import { Playback } from "./playback";
import { NavigationMaps } from "./simulation/navigation-map/navigation-maps";
import { Simulation } from "./simulation/simulation";

interface Applyable {
    apply(): void;
}

export class Controls {
    public simulation: Simulation;

    private inputs: Array<Applyable>;

    constructor(simulation: Simulation) {
        this.simulation = simulation;

        this.inputs = [
            new InputPair("agentCount", (val) =>
                this.simulation.agents.setCount(val),
            ),
            new InputPair("agentSpeed", (val) =>
                this.simulation.agents.setSpeed(val),
            ),
            new InputPair("agentInertia", (val) =>
                this.simulation.agents.setSteeringStrength(val),
            ),
            new InputPair("agentSteeringExponent", (val) =>
                this.simulation.agents.setSteeringExponent(val),
            ),

            new VisibilityToggle("showTerrain", (checked) => {
                this.simulation.terrainMesh.visible = checked;
            }),
            new VisibilityToggle("showDestinations", (checked) => {
                this.simulation.destinations.group.visible = checked;
            }),
            new VisibilityToggle("showCoarseMap", (checked) => {
                this.simulation.coarseMap.mesh.visible = checked;
            }),
            new VisibilityToggle("showAgents", (checked) => {
                this.simulation.agents.mesh.visible = checked;
            }),

            new NavigationMapInput(() => {
                return this.simulation.navigationMaps;
            }),

            new PlaybackInput(() => {
                return this.simulation.playback;
            }),
        ];

        this.apply();
    }

    public apply(): void {
        for (const input of this.inputs) {
            input.apply();
        }
    }
}

type onInputPair = (value: number) => void;

class InputPair {
    private range: HTMLInputElement;
    private number: HTMLInputElement;
    private set: onInputPair;

    constructor(idPrefix: string, f: onInputPair) {
        this.range = document.getElementById(
            idPrefix + "Range",
        ) as HTMLInputElement;

        this.number = document.getElementById(
            idPrefix + "Number",
        ) as HTMLInputElement;

        this.set = f;

        this.range.addEventListener("input", () => {
            this.number.value = this.range.value;
            this.set(this.number.valueAsNumber);
        });

        this.number.addEventListener("input", () => {
            this.range.value = this.number.value;
            this.set(this.number.valueAsNumber);
        });

        this.number.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                this.number.blur();
            }
        });
    }

    public apply(): void {
        this.range.value = this.number.value;
        this.set(this.number.valueAsNumber);
    }
}

type onVisibilityToggle = (checked: boolean) => void;

class VisibilityToggle {
    private toggle: HTMLInputElement;
    private set: onVisibilityToggle;

    constructor(id: string, f: onVisibilityToggle) {
        this.toggle = document.getElementById(id) as HTMLInputElement;
        this.set = f;

        this.toggle.addEventListener("change", () => {
            this.apply();
        });
    }

    public apply(): void {
        this.set(this.toggle.checked);
    }
}

class NavigationMapInput {
    private fieldSet: HTMLFieldSetElement;
    private getter: () => NavigationMaps;

    constructor(getNavigationMaps: () => NavigationMaps) {
        this.fieldSet = document.getElementById(
            "navigation-maps",
        ) as HTMLFieldSetElement;

        this.getter = getNavigationMaps;

        this.fieldSet.addEventListener("change", (event) => {
            const target = event.target;

            if (!(target instanceof HTMLInputElement)) {
                return;
            }

            this.set(target);
        });
    }

    apply() {
        const selected = document.querySelector(
            'input[name="navigationMap"]:checked',
        ) as HTMLInputElement;

        this.set(selected);
    }

    private set(target: HTMLInputElement) {
        const navigationMaps = this.getter();

        if (target.value === "hide") {
            navigationMaps.mesh.visible = false;
        } else {
            navigationMaps.mesh.visible = true;
            navigationMaps.setDisplayedDestination(Number(target.value));
        }
    }
}

class PlaybackInput {
    private toggle: HTMLButtonElement;
    private step: HTMLButtonElement;
    private get: () => Playback;

    constructor(f: () => Playback) {
        this.toggle = document.getElementById(
            "playback-toggle",
        ) as HTMLButtonElement;

        this.step = document.getElementById(
            "playback-step",
        ) as HTMLButtonElement;

        this.get = f;

        this.toggle.addEventListener("click", () => {
            const playback = this.get();
            if (playback.paused) {
                playback.resume();
                this.toggle.textContent = "Пауза";
                this.step.disabled = true;
            } else {
                playback.pause();
                this.toggle.textContent = "Продолжить";
                this.step.disabled = false;
            }
        });

        this.step.addEventListener("click", () => {
            this.get().step();
        });
    }

    apply() {
        this.step.disabled = true;
        this.toggle.textContent = "Пауза";
    }
}
