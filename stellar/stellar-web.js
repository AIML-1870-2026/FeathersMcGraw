/* ============================================
   Stellar Web - Particle System
   ============================================ */

// Configuration (will be modified by UI controls)
const config = {
    nodeCount: 100,
    connectivityRadius: 150,
    nodeSpeed: 1.0,
    edgeOpacity: 0.6,
    edgeThickness: 1.5,
    nodeSize: 3,
    zDepth: 400
};

// Canvas setup
const canvas = document.getElementById('stellar-canvas');
const ctx = canvas.getContext('2d');

// Particle array
let nodes = [];

// Mouse state
const mouse = { x: -1000, y: -1000, active: false, radius: 120, strength: 0.8 };

// Statistics
const stats = {
    edgeCount: 0,
    avgConnections: 0,
    density: 0
};

// Resize canvas to fill viewport
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Node class
class Node {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.z = Math.random() * config.zDepth;

        // Random velocity
        const angle = Math.random() * Math.PI * 2;
        const angleZ = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.7;

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.vz = Math.cos(angleZ) * speed * 0.5;

        // Color hue (blue-purple range)
        this.hue = 200 + Math.random() * 60;
    }

    update() {
        // Mouse repulsion
        if (mouse.active) {
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < mouse.radius && dist > 0) {
                const force = (1 - dist / mouse.radius) * mouse.strength;
                this.vx += (dx / dist) * force;
                this.vy += (dy / dist) * force;
            }
        }

        // Dampen velocity to prevent runaway speeds
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const maxSpeed = 3.0;
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }

        // Apply velocity with speed multiplier
        this.x += this.vx * config.nodeSpeed;
        this.y += this.vy * config.nodeSpeed;
        this.z += this.vz * config.nodeSpeed;

        // Wrap around boundaries
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
        if (this.z < 0) this.z = config.zDepth;
        if (this.z > config.zDepth) this.z = 0;
    }

    // Get depth-based scale (0.4 to 1.0)
    getDepthScale() {
        return 0.4 + (this.z / config.zDepth) * 0.6;
    }

    // Get depth-based opacity
    getDepthOpacity() {
        return 0.3 + (this.z / config.zDepth) * 0.7;
    }

    draw() {
        const scale = this.getDepthScale();
        const opacity = this.getDepthOpacity();
        const size = config.nodeSize * scale;

        // Glow effect
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, size * 3
        );
        gradient.addColorStop(0, `hsla(${this.hue}, 80%, 70%, ${opacity})`);
        gradient.addColorStop(0.5, `hsla(${this.hue}, 70%, 60%, ${opacity * 0.3})`);
        gradient.addColorStop(1, `hsla(${this.hue}, 60%, 50%, 0)`);

        ctx.beginPath();
        ctx.arc(this.x, this.y, size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 60%, 85%, ${opacity})`;
        ctx.fill();
    }
}

// Distance squared between two nodes (avoids sqrt)
function distanceSquared(n1, n2) {
    const dx = n1.x - n2.x;
    const dy = n1.y - n2.y;
    const dz = n1.z - n2.z;
    return dx * dx + dy * dy + dz * dz;
}

// Initialize nodes
function initNodes() {
    nodes = [];
    for (let i = 0; i < config.nodeCount; i++) {
        nodes.push(new Node());
    }
}

// Update node count dynamically
function updateNodeCount(newCount) {
    while (nodes.length < newCount) {
        nodes.push(new Node());
    }
    while (nodes.length > newCount) {
        nodes.pop();
    }
    config.nodeCount = newCount;
}

// Draw edges between nearby nodes
function drawEdges() {
    const radiusSq = config.connectivityRadius * config.connectivityRadius;
    let edgeCount = 0;
    const connectionCounts = new Array(nodes.length).fill(0);

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const distSq = distanceSquared(nodes[i], nodes[j]);

            if (distSq < radiusSq) {
                const dist = Math.sqrt(distSq);
                const ratio = 1 - (dist / config.connectivityRadius);

                // Average depth for edge opacity
                const avgDepthOpacity = (nodes[i].getDepthOpacity() + nodes[j].getDepthOpacity()) / 2;
                const opacity = ratio * config.edgeOpacity * avgDepthOpacity;

                // Average hue for edge color
                const avgHue = (nodes[i].hue + nodes[j].hue) / 2;

                ctx.beginPath();
                ctx.moveTo(nodes[i].x, nodes[i].y);
                ctx.lineTo(nodes[j].x, nodes[j].y);
                ctx.strokeStyle = `hsla(${avgHue}, 70%, 60%, ${opacity})`;
                ctx.lineWidth = config.edgeThickness * ratio;
                ctx.stroke();

                edgeCount++;
                connectionCounts[i]++;
                connectionCounts[j]++;
            }
        }
    }

    // Update statistics
    stats.edgeCount = edgeCount;
    stats.avgConnections = nodes.length > 0
        ? (connectionCounts.reduce((a, b) => a + b, 0) / nodes.length).toFixed(1)
        : 0;
    const maxEdges = (nodes.length * (nodes.length - 1)) / 2;
    stats.density = maxEdges > 0 ? (edgeCount / maxEdges * 100).toFixed(1) : 0;
}

// Main animation loop
function animate() {
    // Clear canvas with dark background
    ctx.fillStyle = 'rgba(10, 10, 20, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and sort nodes by depth (draw far nodes first)
    nodes.forEach(node => node.update());
    nodes.sort((a, b) => a.z - b.z);

    // Draw edges first
    drawEdges();

    // Draw nodes on top
    nodes.forEach(node => node.draw());

    requestAnimationFrame(animate);
}

// Initialize on load
window.addEventListener('load', () => {
    resizeCanvas();
    initNodes();
    animate();
});

// Handle window resize
window.addEventListener('resize', resizeCanvas);

// Mouse tracking
canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
});

canvas.addEventListener('mouseleave', () => {
    mouse.active = false;
});
