export class SimulationPlayback {
	public paused = false;
	private pendingSteps = 0;

	pause(): void {
		this.paused = true;
	}

	resume(): void {
		this.paused = false;
		this.pendingSteps = 0;
	}

	step(): void {
		if (this.paused) {
			this.pendingSteps++;
		}
	}

	// Consume at most one queued tick per rendered frame.
	shouldAdvance(): boolean {
		if (!this.paused) {
			return true;
		}
		if (this.pendingSteps > 0) {
			this.pendingSteps--;
			return true;
		}
		return false;
	}
}
