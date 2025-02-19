class FrameTransform {
    static transform(point, origin, rotation) {
        // Translate to origin's frame
        const relX = point.x - origin.x;
        const relY = point.y - origin.y;
        
        // Convert rotation to radians
        const rotRad = (rotation || 0) * Math.PI/180;
        const cos = Math.cos(-rotRad);
        const sin = Math.sin(-rotRad);
        
        // Apply rotation matrix
        return {
            x: relX * cos - relY * sin,
            y: relX * sin + relY * cos
        };
    }
}

class FrameVisualizer {
    constructor() {
        // Basic setup
        this.width = 800;
        this.height = 600;
        this.svg = d3.select("#visualization")
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .style("border", "1px solid #ccc")
            .style("cursor", "grab");

        // Create a group for zoom
        this.zoomGroup = this.svg.append("g");

        // Create main coordinate system group inside zoom group
        this.fieldGroup = this.zoomGroup.append("g")
            .attr("transform", `translate(${this.width/2},${this.height/2}) scale(-1,-1)`);

                    // Add vector visibility state
        this.vectorVisibility = {
            field: true,
            robot: true,
            camera: true
        };

        this.setupZoom();
        this.createFieldGrid();
        this.createAprilTag();
        this.createRobot();
        this.setupControls();
        this.updateVectorReadouts();
        this.setupVectorToggles();
    }

    setupZoom() {
        // Create zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 2])
            .on("zoom", (event) => {
                this.zoomGroup.attr("transform", event.transform);
                
                // Update zoom controls
                document.getElementById("zoomLevel").value = event.transform.k;
                document.getElementById("zoomLevelNum").value = event.transform.k.toFixed(1);
            });

        // Apply zoom behavior to SVG
        this.svg.call(this.zoom)
            .on("mousedown.zoom", function() {
                d3.select(this).style("cursor", "grabbing");
            })
            .on("mouseup.zoom", function() {
                d3.select(this).style("cursor", "grab");
            });
    }

    createFieldGrid() {
        // Grid lines
        for (let i = -200; i <= 200; i += 50) {
            // Vertical lines (parallel to X axis)
            this.fieldGroup.append("line")
                .attr("class", "grid-line")
                .attr("x1", i)
                .attr("y1", -200)
                .attr("x2", i)
                .attr("y2", 200);

            // Horizontal lines (parallel to Y axis)
            this.fieldGroup.append("line")
                .attr("class", "grid-line")
                .attr("x1", -200)
                .attr("y1", i)
                .attr("x2", 200)
                .attr("y2", i);

            // Coordinate labels every 100 units
            if (i % 100 === 0 && i !== 0) {
                // X axis labels
                this.fieldGroup.append("text")
                    .attr("class", "field-label")
                    .attr("transform", `translate(-20, ${i}) rotate(180)`)
                    .style("text-anchor", "middle")
                    .text(i);

                // Y axis labels
                this.fieldGroup.append("text")
                    .attr("class", "field-label")
                    .attr("transform", `translate(${i}, -20) rotate(180)`)
                    .style("text-anchor", "middle")
                    .text(i);
            }
        }

        // Main axes
        // X axis (vertical)
        this.fieldGroup.append("line")
            .attr("class", "axis")
            .style("stroke", "#000")
            .attr("x1", 0)
            .attr("y1", -200)
            .attr("x2", 0)
            .attr("y2", 200);

        // Y axis (horizontal)
        this.fieldGroup.append("line")
            .attr("class", "axis")
            .style("stroke", "#000")
            .attr("x1", -200)
            .attr("y1", 0)
            .attr("x2", 200)
            .attr("y2", 0);

        // Axis labels
        this.fieldGroup.append("text")
            .attr("class", "field-label")
            .attr("transform", "translate(0, 230) rotate(180)")
            .style("text-anchor", "middle")
            .text("+X");

        this.fieldGroup.append("text")
            .attr("class", "field-label")
            .attr("transform", "translate(230, 0) rotate(180)")
            .style("text-anchor", "middle")
            .text("+Y");
    }

    createAprilTag() {
        this.tagGroup = this.fieldGroup.append("g");
        
        const tagSize = 40;  // Size of the tag
        const gridSize = 8;  // 8x8 grid (6x6 inner + border)
        const cellSize = tagSize / gridSize;
        
        // Create the base square
        this.tagGroup.append("rect")
            .attr("class", "tag-border")
            .attr("x", -tagSize/2)
            .attr("y", -tagSize/2)
            .attr("width", tagSize)
            .attr("height", tagSize);

        // Create white background
        this.tagGroup.append("rect")
            .attr("class", "tag-background")
            .attr("x", -tagSize/2)
            .attr("y", -tagSize/2)
            .attr("width", tagSize)
            .attr("height", tagSize)
            .attr("fill", "white");

        // Create QR code pattern
        const qrPattern = this.tagGroup.append("g")
            .attr("class", "tag-qr");

        // Create an 8x8 grid of cells
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                // Skip the border cells (first/last row/column)
                if (i === 0 || i === gridSize-1 || j === 0 || j === gridSize-1) {
                    qrPattern.append("rect")
                        .attr("x", -tagSize/2 + i * cellSize)
                        .attr("y", -tagSize/2 + j * cellSize)
                        .attr("width", cellSize)
                        .attr("height", cellSize)
                        .attr("class", "tag-cell-white");
                    continue;
                }
                
                // Skip center cells to create the distinctive AprilTag pattern
                // Adjust for the border offset
                if ((i === 3 || i === 4) && (j === 3 || j === 4)) continue;
                
                // Fill 75% of the inner cells
                if (Math.random() < 0.75) {
                    qrPattern.append("rect")
                        .attr("x", -tagSize/2 + i * cellSize)
                        .attr("y", -tagSize/2 + j * cellSize)
                        .attr("width", cellSize)
                        .attr("height", cellSize)
                        .attr("class", "tag-cell");
                }
            }
        }

        // Add center marker
        this.createCenterMarker(this.tagGroup, "tag-center");

        // Add orientation indicator
        this.tagGroup.append("line")
            .attr("class", "tag-direction")
            .attr("x1", 0)
            .attr("y1", tagSize/2)
            .attr("x2", 0)
            .attr("y2", tagSize/2 + 10);

        // Set initial position
        this.updateTagTransform();
    }

    createRobot() {
        this.robotGroup = this.fieldGroup.append("g");
        
        // Robot body (80x60 rectangle)
        this.robotGroup.append("rect")
            .attr("class", "robot-body")
            .attr("x", -30)
            .attr("y", -30)
            .attr("width", 60)
            .attr("height", 60);

        // Forward direction indicator
        this.robotGroup.append("line")
            .attr("class", "robot-body")
            .attr("x1", 0)
            .attr("y1", 30)
            .attr("x2", 0)
            .attr("y2", 50);

        // Robot center marker
        this.createCenterMarker(this.robotGroup, "robot-center");

        // Create camera group inside robot group
        this.cameraGroup = this.robotGroup.append("g");
        
        // Camera icon
        this.createCameraIcon(this.cameraGroup);

        // Camera center marker
        this.createCenterMarker(this.cameraGroup, "camera-center");

        // draw initial vectors
        this.drawVectors();
    }

    createCenterMarker(group, className) {
        // Crosshair style center marker
        const size = 6;
        
        // Vertical line
        group.append("line")
            .attr("class", className)
            .attr("x1", 0)
            .attr("y1", -size)
            .attr("x2", 0)
            .attr("y2", size);
        
        // Horizontal line
        group.append("line")
            .attr("class", className)
            .attr("x1", -size)
            .attr("y1", 0)
            .attr("x2", size)
            .attr("y2", 0);
        
        // Center dot
        group.append("circle")
            .attr("class", className)
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 1.5);
    }

    createCameraIcon(group) {
        // Camera body
        group.append("path")
            .attr("class", "camera-body")
            .attr("d", `
                M -15,-10
                h 30
                v 20
                h -30
                Z
                M -5,-15
                h 10
                l 5,5
                h -20
                Z
            `);

        // Lens
        group.append("circle")
            .attr("class", "camera-lens")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 6);

        group.append("circle")
            .attr("class", "camera-lens")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 3);

        // Forward direction indicator
        group.append("line")
            .attr("class", "camera-direction")
            .attr("x1", 0)
            .attr("y1", 10)
            .attr("x2", 0)
            .attr("y2", 20);
    }

    setupControls() {
        // Robot controls
        const robotControls = ['robotX', 'robotY', 'robotRotation'];
        robotControls.forEach(this.setupControl.bind(this));

        // Camera controls
        const cameraControls = ['cameraX', 'cameraY'];
        cameraControls.forEach(this.setupControl.bind(this));

        // AprilTag controls
        const tagControls = ['tagX', 'tagY', 'tagRotation'];
        tagControls.forEach(this.setupControl.bind(this));

        // Zoom controls
        const zoomSlider = document.getElementById("zoomLevel");
        const zoomInput = document.getElementById("zoomLevelNum");
        const resetButton = document.getElementById("resetView");

        const updateZoom = (scale) => {
            scale = Math.min(2, Math.max(0.1, scale));
            const transform = d3.zoomIdentity
                .translate(this.width/2, this.height/2)
                .scale(scale)
                .translate(-this.width/2, -this.height/2);
            
            this.svg.call(this.zoom.transform, transform);
        };

        zoomSlider.addEventListener('input', () => {
            const scale = parseFloat(zoomSlider.value);
            zoomInput.value = scale.toFixed(1);
            updateZoom(scale);
        });

        zoomInput.addEventListener('input', () => {
            const scale = parseFloat(zoomInput.value);
            if (!isNaN(scale)) {
                zoomSlider.value = scale;
                updateZoom(scale);
            }
        });

        resetButton.addEventListener('click', () => {
            this.svg.call(this.zoom.transform, d3.zoomIdentity);
            zoomSlider.value = 1;
            zoomInput.value = 1;
        });
    }

    setupControl(controlId) {
        const slider = document.getElementById(controlId);
        const numInput = document.getElementById(controlId + 'Num');
        
        const updateValue = () => {
            const value = slider.value;
            numInput.value = value;
            this.updateTransforms();
        };

        slider.addEventListener('input', updateValue);
        numInput.addEventListener('input', () => {
            slider.value = numInput.value;
            updateValue();
        });
    }

    updateTransforms() {
        // Get robot position and rotation
        const robotX = document.getElementById('robotX').value;
        const robotY = document.getElementById('robotY').value;
        const robotRotation = document.getElementById('robotRotation').value;

        // Update robot transform
        this.robotGroup.attr("transform", 
            `translate(${robotY},${robotX}) rotate(${robotRotation})`
        );

        // Get camera offset
        const cameraX = document.getElementById('cameraX').value;
        const cameraY = document.getElementById('cameraY').value;

        // Update camera position relative to robot
        this.cameraGroup.attr("transform", 
            `translate(${cameraY},${cameraX})`
        );

        // Get tag position and rotation
        const tagX = document.getElementById('tagX').value;
        const tagY = document.getElementById('tagY').value;
        const tagRotation = document.getElementById('tagRotation').value;

        // Update tag transform
        this.tagGroup.attr("transform", 
            `translate(${tagY},${tagX}) rotate(${tagRotation})`
        );

        // Draw vectors and update readouts
        this.drawVectors();
        this.updateVectorReadouts();
    }

    updateVectorReadouts() {
        const getMagnitude = (x, y) => Math.sqrt(x * x + y * y);

        // Get all positions and angles
        const tagX = parseFloat(document.getElementById('tagX').value);
        const tagY = parseFloat(document.getElementById('tagY').value);
        const robotX = parseFloat(document.getElementById('robotX').value);
        const robotY = parseFloat(document.getElementById('robotY').value);
        const robotRot = parseFloat(document.getElementById('robotRotation').value);
        const cameraX = parseFloat(document.getElementById('cameraX').value);
        const cameraY = parseFloat(document.getElementById('cameraY').value);

        // Field vector calculations (in field frame)
        const fieldMag = getMagnitude(tagX, tagY);
        const fieldAngle = this.getAngle(tagY, tagX);
        
        document.getElementById('fieldMagnitude').value = fieldMag.toFixed(1);
        document.getElementById('fieldXComp').value = tagX.toFixed(1);
        document.getElementById('fieldYComp').value = tagY.toFixed(1);
        document.getElementById('fieldAngleRead').value = fieldAngle.toFixed(1);

        // Robot vector calculations (in robot frame)
        const robotFrame = FrameTransform.transform(
            {x: tagX, y: tagY}, 
            {x: robotX, y: robotY}, 
            -robotRot
        );
        const robotMag = getMagnitude(robotFrame.x, robotFrame.y);
        const robotAngle = this.getAngle(robotFrame.y, robotFrame.x);
        
        document.getElementById('robotMagnitude').value = robotMag.toFixed(1);
        document.getElementById('robotXComp').value = robotFrame.x.toFixed(1);
        document.getElementById('robotYComp').value = robotFrame.y.toFixed(1);
        document.getElementById('robotAngleRead').value = robotAngle.toFixed(1);

        // Camera vector calculations (in camera frame)
        // First transform tag to robot frame
        const tagInRobotFrame = FrameTransform.transform(
            {x: tagX, y: tagY},
            {x: robotX, y: robotY},
            -robotRot
        );
        
        // Then simply subtract camera offset since camera frame shares robot's orientation
        const cameraFrame = {
            x: tagInRobotFrame.x - cameraX,
            y: tagInRobotFrame.y - cameraY
        };
        
        const cameraMag = getMagnitude(cameraFrame.x, cameraFrame.y);
        const cameraAngle = this.getAngle(cameraFrame.y, cameraFrame.x);
        
        document.getElementById('cameraMagnitude').value = cameraMag.toFixed(1);
        document.getElementById('cameraXComp').value = cameraFrame.x.toFixed(1);
        document.getElementById('cameraYComp').value = cameraFrame.y.toFixed(1);
        document.getElementById('cameraAngleRead').value = cameraAngle.toFixed(1);
    }

    updateTagTransform() {
        const x = document.getElementById('tagX')?.value || 100;
        const y = document.getElementById('tagY')?.value || 100;
        const rotation = document.getElementById('tagRotation')?.value || 180;

        this.tagGroup.attr("transform", 
            `translate(${y},${x}) rotate(${rotation})`
        );
    }

    setupVectorToggles() {
        // Setup event listeners for vector visibility toggles
        ['field', 'robot', 'camera'].forEach(vectorType => {
            const checkbox = document.getElementById(`${vectorType}VectorVisible`);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.vectorVisibility[vectorType] = checkbox.checked;
                    this.drawVectors();
                });
            }
        });
    }

    drawVectors() {
        // Remove existing vectors and labels
        this.fieldGroup.selectAll(".vector, .vector-label, .angle-arc").remove();
        
        // Get positions and setup
        const tagX = parseFloat(document.getElementById('tagX').value);
        const tagY = parseFloat(document.getElementById('tagY').value);
        const robotX = parseFloat(document.getElementById('robotX').value);
        const robotY = parseFloat(document.getElementById('robotY').value);
        const robotRot = parseFloat(document.getElementById('robotRotation').value);
        const cameraX = parseFloat(document.getElementById('cameraX').value);
        const cameraY = parseFloat(document.getElementById('cameraY').value);
        const rotRad = robotRot * Math.PI/180;

        const getAngle = (x, y) => {
            // Swap x and y to measure from X-axis instead of Y-axis
            let angle = Math.atan2(x, y) * 180 / Math.PI;
            // Normalize to [-180, 180]
            return ((angle + 180) % 360) - 180;
        };

        // Create arc generator
        const createArc = (startAngle, endAngle, radius = 30) => {
            // Determine shortest arc path
            let delta = ((endAngle - startAngle + 180) % 360) - 180;
            let actualEndAngle = startAngle + delta;
            
            return d3.arc()
                .innerRadius(radius - 5)
                .outerRadius(radius)
                .startAngle(0)  // Always start from X-axis
                .endAngle(-actualEndAngle * Math.PI / 180);  // Negative angle for correct direction
        };

        // Draw arc with label
        const drawAngleArc = (x, y, angle, className, frameRotation = 0) => {
            const arcPath = createArc(0, angle);  // Start from X-axis
            
            this.fieldGroup.append("path")
                .attr("class", `angle-arc ${className}`)
                .attr("d", arcPath())
                .attr("transform", `translate(${x},${y}) scale(-1,-1) rotate(${frameRotation})`);
        };

        // Field space vector
        if (this.vectorVisibility.field) {
            const fieldAngle = getAngle(tagY, tagX);
            this.fieldGroup.append("line")
                .attr("class", "vector field-vector")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", tagY)
                .attr("y2", tagX);
            
            drawAngleArc(0, 0, fieldAngle, "field-arc");
            const fieldLabel = `(${tagX.toFixed(1)}, ${tagY.toFixed(1)})\n@ ${fieldAngle.toFixed(1)}\u00B0`;
            this.addVectorLabel(0, 0, tagY, tagX, fieldLabel, "field-vector-label");
        }

        // Robot space vector
        if (this.vectorVisibility.robot) {
            this.fieldGroup.append("line")
                .attr("class", "vector robot-vector")
                .attr("x1", robotY)
                .attr("y1", robotX)
                .attr("x2", tagY)
                .attr("y2", tagX);

            const robotMag = this.getMagnitude(tagX-robotX, tagY-robotY);
            const robotRelX = (tagX - robotX) * Math.cos(-rotRad) + (tagY - robotY) * Math.sin(-rotRad);
            const robotRelY = -(tagX - robotX) * Math.sin(-rotRad) + (tagY - robotY) * Math.cos(-rotRad);
            const robotAngle = this.getAngle(robotRelY, robotRelX);
            drawAngleArc(robotY, robotX, robotAngle, "robot-arc", robotRot);
            const robotLabel = `(${robotRelX.toFixed(1)}, ${robotRelY.toFixed(1)})\n@ ${robotAngle.toFixed(1)}\u00B0`;
            this.addVectorLabel(robotY, robotX, tagY, tagX, robotLabel, "robot-vector-label");
        }

        // Camera space vector
        if (this.vectorVisibility.camera) {
            const cameraGlobalX = robotX + (cameraX * Math.cos(robotRot * Math.PI/180) + cameraY * Math.sin(robotRot * Math.PI/180));
            const cameraGlobalY = robotY + (-cameraX * Math.sin(robotRot * Math.PI/180) + cameraY * Math.cos(robotRot * Math.PI/180));
            
            this.fieldGroup.append("line")
                .attr("class", "vector camera-vector")
                .attr("x1", cameraGlobalY)
                .attr("y1", cameraGlobalX)
                .attr("x2", tagY)
                .attr("y2", tagX);

            // First transform tag to robot frame
            const tagInRobotFrame = FrameTransform.transform(
                {x: tagX, y: tagY},
                {x: robotX, y: robotY},
                -robotRot
            );
            
            // Then subtract camera offset since camera frame shares robot's orientation
            const cameraFrame = FrameTransform.transform(
                {x: tagInRobotFrame.x, y: tagInRobotFrame.y},
                {x: cameraX, y: cameraY},
                0
            );
            
            const cameraAngle = getAngle(cameraFrame.y, cameraFrame.x);
            drawAngleArc(cameraGlobalY, cameraGlobalX, cameraAngle, "camera-arc", robotRot);
            const cameraLabel = `(${cameraFrame.x.toFixed(1)}, ${cameraFrame.y.toFixed(1)})\n@ ${cameraAngle.toFixed(1)}\u00B0`;
            this.addVectorLabel(cameraGlobalY, cameraGlobalX, tagY, tagX, cameraLabel, "camera-vector-label");
        }
    }

    addVectorLabel(x1, y1, x2, y2, text, className) {
        // Position label at midpoint of vector
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        // Add offset to prevent overlap with vector
        const offset = 15;
        
        this.fieldGroup.append("text")
            .attr("class", `vector-label ${className}`)
            .attr("x", midX + offset)
            .attr("y", midY)
            .attr("transform", `rotate(180, ${midX}, ${midY - offset})`) // Flip text right-side up
            .style("text-anchor", "left")
            .text(text);
    }

    getAngle(x, y) {
        // Swap x and y to measure from X-axis instead of Y-axis
        let angle = Math.atan2(x, y) * 180 / Math.PI;
        // Normalize to [-180, 180]
        return ((angle + 180) % 360) - 180;
    }

    getMagnitude(x, y) {
        return Math.sqrt(x * x + y * y);
    }
}

// Initialize when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new FrameVisualizer();
}); 