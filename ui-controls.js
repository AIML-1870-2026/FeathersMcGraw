/* ============================================
   Stellar Web - UI Controls
   ============================================ */

// Slider definitions
const sliderDefs = [
    {
        id: 'connectivityRadius',
        label: 'Connectivity Radius',
        min: 50,
        max: 300,
        step: 5,
        default: config.connectivityRadius,
        onChange: (val) => { config.connectivityRadius = val; }
    },
    {
        id: 'nodeCount',
        label: 'Number of Nodes',
        min: 20,
        max: 200,
        step: 5,
        default: config.nodeCount,
        onChange: (val) => { updateNodeCount(val); }
    },
    {
        id: 'nodeSpeed',
        label: 'Node Speed',
        min: 0.1,
        max: 3.0,
        step: 0.1,
        default: config.nodeSpeed,
        onChange: (val) => { config.nodeSpeed = val; }
    },
    {
        id: 'edgeOpacity',
        label: 'Edge Opacity',
        min: 0.1,
        max: 1.0,
        step: 0.05,
        default: config.edgeOpacity,
        onChange: (val) => { config.edgeOpacity = val; }
    },
    {
        id: 'edgeThickness',
        label: 'Edge Thickness',
        min: 0.5,
        max: 5.0,
        step: 0.25,
        default: config.edgeThickness,
        onChange: (val) => { config.edgeThickness = val; }
    },
    {
        id: 'nodeSize',
        label: 'Node Size',
        min: 1,
        max: 8,
        step: 0.5,
        default: config.nodeSize,
        onChange: (val) => { config.nodeSize = val; }
    }
];

// Create a single slider group
function createSlider(def) {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const label = document.createElement('label');
    label.innerHTML = `${def.label} <span id="${def.id}-value">${def.default}</span>`;

    const input = document.createElement('input');
    input.type = 'range';
    input.id = def.id;
    input.min = def.min;
    input.max = def.max;
    input.step = def.step;
    input.value = def.default;

    // Update handler
    input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById(`${def.id}-value`).textContent = val;
        def.onChange(val);
    });

    group.appendChild(label);
    group.appendChild(input);

    return group;
}

// Initialize all sliders
function initControls() {
    const container = document.getElementById('sliders-container');

    sliderDefs.forEach(def => {
        container.appendChild(createSlider(def));
    });
}

// Update statistics display
function updateStats() {
    const statsDiv = document.getElementById('stats');
    statsDiv.innerHTML = `
        <div>Edges: <span>${stats.edgeCount}</span></div>
        <div>Avg Connections: <span>${stats.avgConnections}</span></div>
        <div>Network Density: <span>${stats.density}%</span></div>
    `;
}

// Toggle panel visibility
function initPanelToggle() {
    const panel = document.getElementById('controls');
    const toggle = document.getElementById('panel-toggle');

    toggle.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
    });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initControls();
    initPanelToggle();

    // Update stats every 500ms
    setInterval(updateStats, 500);
});
