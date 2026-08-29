# desire path simulation

[Desire path phenomenon](https://en.wikipedia.org/wiki/Desire_path) simulation.

Agents spawn at points of interest and travel toward other points of interest. A cost map defines the terrain, where black represents impassable obstacle, white represents smooth road, and shades grey represent intermediate travel cost. As agents move they wear down grey areas, creating trails known as desire paths.

Simulation runs via WebGL through three.js.

An approximate navigation field textue is calculated for each point of interest. Closer areas are brighter and further are darker. Calculation takes into account obstacles defined by the cost map and the terrain wearness. Initial calculation uses dijkstra algorithm for presice navigation, each frame navigation field gets modified by GPU bidirectional relaxation to reflect new trails wearing down and old unused fading out.

Each agent has a wold position, a target interest point, a direction and a speed. At each step it probabilistically chooses a new direction based on its previous direction and rough course map weights, tending towards both straight and easy-to-walk paths.

World coordinates consist of width = texture aspect ratio and height = 1, for example width = 1.4 and height = 1.