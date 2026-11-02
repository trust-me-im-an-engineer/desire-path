export type Destination = {
	x: number;
	y: number;
	weight: number;
}

export type Terrain = {
	url: string;
	destinations: Destination[];
}

export const presets: Record<string, Terrain> = {
	"bell": {
		url: "bell.png",
		destinations: [
			{ x: 100, y: 100, weight: 2 },
			{ x: 400, y: 400, weight: 12 },
		],
	},
	"a": {
		url: "a.png",
		destinations: [
			{ x: 100, y: 270, weight: 10 },
			{ x: 500, y: 260, weight: 10 },
		]
	},
	"2": {
		url: "2.png",
		destinations: [
			{ x: 200, y: 270, weight: 12 },
			{ x: 650, y: 264, weight: 12 },
			{ x: 501, y: 500, weight: 12 },
		],
	},
	"5": {
		url: "5.png",
		destinations: [
			{ x: 300, y: 271, weight: 10 },
			{ x: 650, y: 264, weight: 19 },
			{ x: 501, y: 700, weight: 12 },
		],
	}
}