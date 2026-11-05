import * as THREE from "three";
import { Simulation } from "../simulation/simulation";

export type Destination = {
    x: number;
    // Distance from the terrain's bottom edge (Y increases upward).
    y: number;
    weight: number;
};

export type Terrain = {
    url: string;
    destinations: Destination[];
};

export async function loadPreset(name: string, renderer: THREE.WebGLRenderer) {
    const terrain: Terrain = presets[name];

    const terrainTexture = await new THREE.TextureLoader().loadAsync(
        "assets/" + terrain.url,
    );
    terrainTexture.generateMipmaps = false;
    terrainTexture.colorSpace = THREE.SRGBColorSpace;

    const simulation = new Simulation(
        renderer,
        terrainTexture,
        terrain.destinations,
        8,
    );

    return { terrainTexture, simulation: simulation };
}

export const presets: Record<string, Terrain> = {
    bell: {
        url: "bell.png",
        destinations: [
            { x: 100, y: 412, weight: 2 },
            { x: 400, y: 112, weight: 12 },
        ],
    },
    a: {
        url: "a.png",
        destinations: [
            { x: 100, y: 130, weight: 10 },
            { x: 500, y: 140, weight: 10 },
        ],
    },
    "2": {
        url: "2.png",
        destinations: [
            { x: 200, y: 330, weight: 12 },
            { x: 650, y: 336, weight: 12 },
            { x: 501, y: 100, weight: 12 },
        ],
    },
    "5": {
        url: "5.png",
        destinations: [
            { x: 300, y: 721, weight: 10 },
            { x: 650, y: 728, weight: 19 },
            { x: 501, y: 292, weight: 12 },
        ],
    },
};
