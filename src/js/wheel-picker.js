// Wheel Picker for Date/Time Selection
class WheelPicker {
    constructor(canvasId, valueId, type) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.valueElement = document.getElementById(valueId);
        this.type = type;

        // Set max values
        this.maxValues = {
            days: 30,
            hours: 23,
            minutes: 59
        };

        this.value = 0;
        this.rotation = 0;
        this.isDragging = false;
        this.lastAngle = 0;

        this.init();
    }

    init() {
        this.draw();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const wheelElement = this.canvas.parentElement;

        // Mouse drag
        wheelElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', () => this.onMouseUp());

        // Mouse wheel
        wheelElement.addEventListener('wheel', (e) => this.onWheel(e));

        // Touch support
        wheelElement.addEventListener('touchstart', (e) => this.onTouchStart(e));
        document.addEventListener('touchmove', (e) => this.onTouchMove(e));
        document.addEventListener('touchend', () => this.onMouseUp());
    }

    onMouseDown(e) {
        this.isDragging = true;
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        this.lastAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

        let deltaAngle = currentAngle - this.lastAngle;

        // Handle angle wrap-around
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

        this.rotation += deltaAngle;
        this.lastAngle = currentAngle;

        this.updateValue();
        this.draw();
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        this.changeValue(delta);
    }

    onTouchStart(e) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        this.lastAngle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
        this.isDragging = true;
    }

    onTouchMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const currentAngle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);

        let deltaAngle = currentAngle - this.lastAngle;

        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

        this.rotation += deltaAngle;
        this.lastAngle = currentAngle;

        this.updateValue();
        this.draw();
    }

    changeValue(delta) {
        this.value += delta;
        const maxValue = this.maxValues[this.type];

        if (this.value < 0) this.value = 0;
        if (this.value > maxValue) this.value = maxValue;

        this.rotation = (this.value / maxValue) * Math.PI * 2;
        this.valueElement.textContent = this.value;
        this.draw();
    }

    updateValue() {
        const maxValue = this.maxValues[this.type];
        // Normalize rotation to 0-2π
        let normalizedRotation = this.rotation % (Math.PI * 2);
        if (normalizedRotation < 0) normalizedRotation += Math.PI * 2;

        this.value = Math.round((normalizedRotation / (Math.PI * 2)) * maxValue);
        if (this.value < 0) this.value = 0;
        if (this.value > maxValue) this.value = maxValue;

        this.valueElement.textContent = this.value;
    }

    draw() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = 50;

        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw outer circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 204, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw progress arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, this.rotation - Math.PI / 2);
        ctx.strokeStyle = '#FFCC00';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw indicator dot
        const indicatorX = centerX + Math.cos(this.rotation - Math.PI / 2) * radius;
        const indicatorY = centerY + Math.sin(this.rotation - Math.PI / 2) * radius;

        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFCC00';
        ctx.shadowColor = 'rgba(255, 204, 0, 0.6)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw center dot
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 204, 0, 0.5)';
        ctx.fill();
    }

    getValue() {
        return this.value;
    }

    setValue(value) {
        const maxValue = this.maxValues[this.type];
        this.value = Math.max(0, Math.min(value, maxValue));
        this.rotation = (this.value / maxValue) * Math.PI * 2;
        this.valueElement.textContent = this.value;
        this.draw();
    }

    reset() {
        this.value = 0;
        this.rotation = 0;
        this.valueElement.textContent = '0';
        this.draw();
    }
}

// Wheel Picker Manager
class WheelPickerManager {
    constructor() {
        this.wheels = {
            days: null,
            hours: null,
            minutes: null
        };
        this.currentDate = null;
    }

    init() {
        // Initialize wheels after DOM is ready
        setTimeout(() => {
            this.wheels.days = new WheelPicker('days-canvas', 'days-value', 'days');
            this.wheels.hours = new WheelPicker('hours-canvas', 'hours-value', 'hours');
            this.wheels.minutes = new WheelPicker('minutes-canvas', 'minutes-value', 'minutes');

            this.setupModalListeners();
        }, 100);
    }

    setupModalListeners() {
        document.getElementById('open-wheel-picker').addEventListener('click', () => {
            this.open();
        });

        document.getElementById('close-wheel-picker').addEventListener('click', () => {
            this.close();
        });

        document.getElementById('cancel-wheel-picker').addEventListener('click', () => {
            this.close();
        });

        document.getElementById('apply-wheel-picker').addEventListener('click', () => {
            this.apply();
        });

        // Update preview when wheels change
        const updatePreview = () => {
            this.updatePreview();
        };

        document.getElementById('days-wheel').addEventListener('wheel', updatePreview);
        document.getElementById('hours-wheel').addEventListener('wheel', updatePreview);
        document.getElementById('minutes-wheel').addEventListener('wheel', updatePreview);

        document.addEventListener('mouseup', updatePreview);
    }

    open() {
        document.getElementById('wheel-picker-modal').classList.remove('hidden');
        this.reset();
    }

    close() {
        document.getElementById('wheel-picker-modal').classList.add('hidden');
    }

    apply() {
        const days = this.wheels.days.getValue();
        const hours = this.wheels.hours.getValue();
        const minutes = this.wheels.minutes.getValue();

        const now = new Date();
        this.currentDate = new Date(
            now.getTime() +
            (days * 24 * 60 * 60 * 1000) +
            (hours * 60 * 60 * 1000) +
            (minutes * 60 * 1000)
        );

        // Format date for input
        const dateInput = document.getElementById('quick-date');
        if (days === 0 && hours === 0 && minutes === 0) {
            dateInput.value = 'ahora';
        } else if (days === 1 && hours === 0 && minutes === 0) {
            dateInput.value = 'mañana';
        } else {
            const parts = [];
            if (days > 0) parts.push(`${days}d`);
            if (hours > 0) parts.push(`${hours}h`);
            if (minutes > 0) parts.push(`${minutes}m`);
            dateInput.value = parts.join(' ');
        }

        this.close();
    }

    reset() {
        this.wheels.days.reset();
        this.wheels.hours.reset();
        this.wheels.minutes.reset();
        this.updatePreview();
    }

    updatePreview() {
        const days = this.wheels.days.getValue();
        const hours = this.wheels.hours.getValue();
        const minutes = this.wheels.minutes.getValue();

        if (days === 0 && hours === 0 && minutes === 0) {
            document.getElementById('wheel-preview').textContent = 'Ahora';
            return;
        }

        const now = new Date();
        const targetDate = new Date(
            now.getTime() +
            (days * 24 * 60 * 60 * 1000) +
            (hours * 60 * 60 * 1000) +
            (minutes * 60 * 1000)
        );

        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        document.getElementById('wheel-preview').textContent = targetDate.toLocaleDateString('es-ES', options);
    }

    getDate() {
        return this.currentDate;
    }
}

// Export
const wheelPickerManager = new WheelPickerManager();
