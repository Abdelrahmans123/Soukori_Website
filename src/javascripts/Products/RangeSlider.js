class RangeSlider {
    constructor(containerId, minId, maxId, rangeId, minLabelId, maxLabelId) {
        this.container = document.querySelector(containerId);
        this.rangeMin = document.getElementById(minId);
        this.rangeMax = document.getElementById(maxId);
        this.sliderRange = document.getElementById(rangeId);
        this.minLabel = document.getElementById(minLabelId);
        this.maxLabel = document.getElementById(maxLabelId);

        if (this.rangeMin && this.rangeMax) {
            this.init();
        }
    }

    init() {
        this.rangeMin.addEventListener("input", () => this.updateRange());
        this.rangeMax.addEventListener("input", () => this.updateRange());
        this.updateRange();
    }

    updateRange() {
        let min = parseInt(this.rangeMin.value);
        let max = parseInt(this.rangeMax.value);

        // Prevent overlap
        if (min > max - 10) {
            if (this.rangeMin === document.activeElement) {
                min = max - 10;
                this.rangeMin.value = min;
            } else {
                max = min + 10;
                this.rangeMax.value = max;
            }
        }

        // Use setTimeout to ensure offcanvas is fully rendered
        setTimeout(() => {
            if (!this.container || this.container.clientWidth === 0) {
                return;
            }

            const containerWidth = this.container.clientWidth;
            const isMobile = window.innerWidth <= 576;
            const padding = isMobile ? 10 : 15;
            const trackWidth = containerWidth - padding * 2;

            if (trackWidth <= 0) {
                return;
            }

            // Calculate percentages
            const minPercent =
                (min - parseInt(this.rangeMin.min)) /
                (parseInt(this.rangeMin.max) - parseInt(this.rangeMin.min));
            const maxPercent =
                (max - parseInt(this.rangeMax.min)) /
                (parseInt(this.rangeMax.max) - parseInt(this.rangeMax.min));

            // Calculate positions
            const minPos = padding + minPercent * trackWidth;
            const maxPos = padding + maxPercent * trackWidth;

            // Update the range bar
            if (this.sliderRange) {
                this.sliderRange.style.left = minPos + "px";
                this.sliderRange.style.width =
                    Math.max(0, maxPos - minPos) + "px";
            }

            // Update labels
            if (this.minLabel && this.maxLabel) {
                this.minLabel.textContent = "$" + min;
                this.maxLabel.textContent = "$" + max;

                // Position labels with bounds checking
                const minLabelPos = Math.max(
                    0,
                    Math.min(containerWidth - 50, minPos)
                );
                const maxLabelPos = Math.max(
                    50,
                    Math.min(containerWidth - 50, maxPos)
                );

                this.minLabel.style.left = minLabelPos + "px";
                this.maxLabel.style.left = maxLabelPos + "px";
            }
        }, 50);
    }
}
export default RangeSlider;
