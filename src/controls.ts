import * as THREE from "three";
import { NavigationMaps } from "./simulation/navigation-map/navigation-maps";

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

export function getAgentSpeed(): number {
	var agentSpeed = 1.0;
	const agentSpeedElement = document.getElementById("agentSpeed") as HTMLInputElement;
	if (agentSpeedElement !== null) {
		agentSpeed = parseFloat(agentSpeedElement.value);
	}
	return agentSpeed
}

export function setupNavigationMapsDebug(navigationMaps: NavigationMaps) {
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