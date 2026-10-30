export type Destination = {
	x: number;
	y: number;
	weight: number;
}

export type Terrain = {
	name: string;
	url: string;
	destinations: Destination[];
}

export const presets: Terrain[] = [
	{
		name: "2",
		url: "2.png",
		destinations: [
			{ x: 200, y: 270, weight: 12 },
			{ x: 650, y: 264, weight: 12 },
			{ x: 501, y: 500, weight: 12 },
		],
	},
	{
		name: "5",
		url: "5.png",
		destinations: [
			{ x: 300, y: 270, weight: 12 },
			{ x: 650, y: 264, weight: 19 },
			{ x: 501, y: 700, weight: 12 },
		],
	}
]