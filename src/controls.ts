import * as THREE from "three";

import { NavigationMaps } from "./simulation/navigation-map/navigation-maps";
import type { SimulationPlayback } from "./simulation/playback";

export function bindSimulationPlayback(playback: SimulationPlayback): void {
	const toggle = document.getElementById("toggleSimulation");
	const step = document.getElementById("stepSimulation");
	if (!(toggle instanceof HTMLButtonElement) || !(step instanceof HTMLButtonElement)) {
		throw new Error("Simulation playback controls not found");
	}

	const updateControls = (): void => {
		toggle.textContent = playback.paused ? "Продолжить" : "Пауза";
		step.disabled = !playback.paused;
	};

	toggle.addEventListener("click", () => {
		if (playback.paused) {
			playback.resume();
		} else {
			playback.pause();
		}
		updateControls();
	});

	step.addEventListener("click", () => playback.step());
	updateControls();
}

export function bindInputPair(idPrefix: string, onInput?: (value: number) => void) {
	const range = document.getElementById(idPrefix + 'Range') as HTMLInputElement;
	const number = document.getElementById(idPrefix + 'Number') as HTMLInputElement;

	const updateValue = (): void => {
		if (number.validity.valid && Number.isFinite(number.valueAsNumber)) {
			onInput?.(number.valueAsNumber);
		}
	};

	range.addEventListener('input', () => {
		number.value = range.value;
		updateValue();
	});

	number.addEventListener('input', () => {
		range.value = number.value;
		updateValue();
	});

	number.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			number.blur();
		}
	});

	updateValue();
}

export function bindVisibilityToggle(id: string, object: THREE.Object3D): void {
	const toggle = document.getElementById(id);
	if (!(toggle instanceof HTMLInputElement)) {
		throw new Error(`Visibility toggle #${id} not found`);
	}

	object.visible = toggle.checked;
	toggle.addEventListener("change", () => {
		object.visible = toggle.checked;
	});
}

export function bindNavigationMapsDebug(navigationMaps: NavigationMaps) {
	const hideNavigationMapButton = document.getElementById("hideNavigationMap");
	if (hideNavigationMapButton instanceof HTMLInputElement) {
		navigationMaps.mesh.visible = !hideNavigationMapButton.checked;
	}

	const selectedNavigationMapButton = document.querySelector('input[name="navigationMap"]:checked');
	if (selectedNavigationMapButton instanceof HTMLInputElement && selectedNavigationMapButton.value !== "none") {
		navigationMaps.setDisplayedDestination(parseInt(selectedNavigationMapButton.value));
	}

	const navigationMapButtons = document.querySelectorAll('input[name="navigationMap"]');
	navigationMapButtons.forEach(button => {
		button.addEventListener("change", (event) => {
			const target = event.target as HTMLInputElement;
			if (target.checked) {
				if (target.value === "none") {
					navigationMaps.mesh.visible = false;
				} else {
					navigationMaps.mesh.visible = true;
					navigationMaps.setDisplayedDestination(parseInt(target.value));
				}
			}
		});
	});
}
