class RangeSlider {
	constructor(
		containerId,
		minId,
		maxId,
		rangeId,
		minLabelId,
		maxLabelId,
		options = {}
	) {
		this.container = document.querySelector(containerId);
		this.rangeMin = document.getElementById(minId);
		this.rangeMax = document.getElementById(maxId);
		this.sliderRange = document.getElementById(rangeId);
		this.minLabel = document.getElementById(minLabelId);
		this.maxLabel = document.getElementById(maxLabelId);

		// Configuration options
		this.options = {
			minGap: 10,
			currency: "$",
			updateDelay: 50,
			padding: { mobile: 10, desktop: 15 },
			mobileBreakpoint: 576,
			...options,
		};

		// Callbacks
		this.onUpdate = options.onUpdate || null;
		this.onChange = options.onChange || null;

		// State tracking
		this.isUpdating = false;
		this.updateTimeout = null;

		if (this.rangeMin && this.rangeMax) {
			this.init();
		}
	}

	init() {
		// Input events for real-time updates
		this.rangeMin.addEventListener("input", () => this.handleInput());
		this.rangeMax.addEventListener("input", () => this.handleInput());

		// Change events for final value updates (when user stops dragging)
		this.rangeMin.addEventListener("change", () => this.handleChange());
		this.rangeMax.addEventListener("change", () => this.handleChange());

		// Handle window resize
		window.addEventListener("resize", () => this.debounceUpdate());

		// Initialize display
		this.updateRange();
	}

	handleInput() {
		this.updateRange();
		if (this.onUpdate) {
			this.onUpdate(this.getValues());
		}
	}

	handleChange() {
		if (this.onChange) {
			this.onChange(this.getValues());
		}
	}

	debounceUpdate() {
		if (this.updateTimeout) {
			clearTimeout(this.updateTimeout);
		}
		this.updateTimeout = setTimeout(() => {
			this.updateRange();
		}, 100);
	}
	reset() {
		if (this.rangeMin && this.rangeMax) {
			this.rangeMin.value = this.rangeMin.min;
			this.rangeMax.value = this.rangeMax.max;
			this.updateRange();
		}
	}
	getValues() {
		return {
			min: parseInt(this.rangeMin.value),
			max: parseInt(this.rangeMax.value),
		};
	}

	setValues(min, max) {
		if (this.rangeMin && this.rangeMax) {
			this.rangeMin.value = min;
			this.rangeMax.value = max;
			this.updateRange();
		}
	}

	updateRange() {
		if (this.isUpdating) return;
		this.isUpdating = true;

		let min = parseInt(this.rangeMin.value);
		let max = parseInt(this.rangeMax.value);
		const minRange = parseInt(this.rangeMin.min);
		const maxRange = parseInt(this.rangeMax.max);

		// Prevent overlap with configurable gap
		if (min > max - this.options.minGap) {
			if (this.rangeMin === document.activeElement) {
				min = Math.max(minRange, max - this.options.minGap);
				this.rangeMin.value = min;
			} else {
				max = Math.min(maxRange, min + this.options.minGap);
				this.rangeMax.value = max;
			}
		}

		// Use requestAnimationFrame for smoother updates
		requestAnimationFrame(() => {
			this.updateVisuals(min, max, minRange, maxRange);
			this.isUpdating = false;
		});
	}

	updateVisuals(min, max, minRange, maxRange) {
		// Check if container is visible and has dimensions
		if (!this.container || !this.isElementVisible(this.container)) {
			// Retry after a short delay if container isn't ready
			setTimeout(() => {
				if (this.isElementVisible(this.container)) {
					this.updateVisuals(min, max, minRange, maxRange);
				}
			}, this.options.updateDelay);
			return;
		}

		const containerWidth = this.container.clientWidth;
		if (containerWidth === 0) return;

		const isMobile = window.innerWidth <= this.options.mobileBreakpoint;
		const padding = this.options.padding[isMobile ? "mobile" : "desktop"];
		const trackWidth = containerWidth - padding * 2;

		if (trackWidth <= 0) return;

		// Calculate percentages
		const range = maxRange - minRange;
		const minPercent = (min - minRange) / range;
		const maxPercent = (max - minRange) / range;

		// Calculate positions
		const minPos = padding + minPercent * trackWidth;
		const maxPos = padding + maxPercent * trackWidth;

		// Update the range bar
		if (this.sliderRange) {
			this.sliderRange.style.left = minPos + "px";
			this.sliderRange.style.width = Math.max(0, maxPos - minPos) + "px";
		}

		// Update labels
		this.updateLabels(min, max, containerWidth, minPos, maxPos);
	}

	updateLabels(min, max, containerWidth, minPos, maxPos) {
		if (!this.minLabel || !this.maxLabel) return;

		// Update label text
		this.minLabel.textContent = this.options.currency + min;
		this.maxLabel.textContent = this.options.currency + max;

		// Calculate label positions with collision avoidance
		const labelWidth = 50; // Approximate label width
		const minLabelPos = Math.max(
			0,
			Math.min(containerWidth - labelWidth, minPos - labelWidth / 2)
		);
		let maxLabelPos = Math.max(
			labelWidth,
			Math.min(containerWidth - labelWidth, maxPos - labelWidth / 2)
		);

		// Prevent label overlap
		if (maxLabelPos - minLabelPos < labelWidth + 10) {
			maxLabelPos = minLabelPos + labelWidth + 10;
			if (maxLabelPos > containerWidth - labelWidth) {
				maxLabelPos = containerWidth - labelWidth;
				// If we can't fit both labels, prioritize the max label
				const adjustedMinPos = maxLabelPos - labelWidth - 10;
				if (adjustedMinPos >= 0) {
					this.minLabel.style.left = adjustedMinPos + "px";
				} else {
					this.minLabel.style.display = "none";
				}
				this.maxLabel.style.left = maxLabelPos + "px";
				this.maxLabel.style.display = "block";
			} else {
				this.minLabel.style.left = minLabelPos + "px";
				this.maxLabel.style.left = maxLabelPos + "px";
				this.minLabel.style.display = "block";
				this.maxLabel.style.display = "block";
			}
		} else {
			this.minLabel.style.left = minLabelPos + "px";
			this.maxLabel.style.left = maxLabelPos + "px";
			this.minLabel.style.display = "block";
			this.maxLabel.style.display = "block";
		}
	}

	isElementVisible(element) {
		if (!element) return false;
		const style = window.getComputedStyle(element);
		return (
			style.display !== "none" &&
			style.visibility !== "hidden" &&
			element.offsetWidth > 0 &&
			element.offsetHeight > 0
		);
	}

	refresh() {
		this.updateRange();
	}
	destroy() {
		if (this.updateTimeout) {
			clearTimeout(this.updateTimeout);
		}

		if (this.rangeMin) {
			this.rangeMin.removeEventListener("input", this.handleInput);
			this.rangeMin.removeEventListener("change", this.handleChange);
		}

		if (this.rangeMax) {
			this.rangeMax.removeEventListener("input", this.handleInput);
			this.rangeMax.removeEventListener("change", this.handleChange);
		}

		window.removeEventListener("resize", this.debounceUpdate);
	}
}

export default RangeSlider;
