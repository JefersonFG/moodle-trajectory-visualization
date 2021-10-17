// Constants for the json elements
JSON_NAME = "name"
JSON_FINAL_GRADE = "final_grade"
JSON_NUM_FORUM_INTERACTIONS = "forum_interactions"
JSON_NUM_TOTAL_INTERACTIONS = "total_moodle_interactions"
JSON_GRADES = "grades"
JSON_INTERACTIONS = "interactions"

TOOLTIP_HORIZONTAL_OFFSET = 50
TOOLTIP_VERTICAL_OFFSET = -50

// Reads the json file to load student data into memory and calls the function to process the data
function readSingleFile(filePath) {
    const file = filePath.target.files[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        let content = e.target.result;
        processStudentData(content);
    };
    reader.readAsText(file);
}

// Main entrypoint for processing user data once picked by the user on the UI
function processStudentData(studentData) {
    let jsonData = JSON.parse(studentData);
    updatedStudentData = prepareDataForDAG(jsonData);
    displayContents(updatedStudentData);
}

// The d3-dag library expect source data to have ids on each node, with the parentId field defining the connections between nodes
// Also adds the label for printing, which is In, with n being the number of the event starting on one
function prepareDataForDAG(studentData) {
    updatedInteractions = []
    current_id = 0;
    Object.entries(studentData[JSON_INTERACTIONS]).forEach(([_, interaction]) => {
        processedInteraction = {"label": "I" + (current_id + 1).toString(), "id": current_id.toString(), ...interaction};
        if (current_id > 0) {
            parentId = current_id - 1
            processedInteraction = {...processedInteraction, "parentIds": [parentId.toString()]};
        }
        updatedInteractions.push(processedInteraction);
        current_id++;
    });
    studentData[JSON_INTERACTIONS] = updatedInteractions;
    return studentData;
}

// Displays the contents of the json file on the UI
function displayContents(contents) {
    // Student metadata
    let element = document.getElementById('student-name');
    element.textContent = '-';
    if (JSON_NAME in contents) {
        element.textContent = contents[JSON_NAME];
    }
    element = document.getElementById('student-final-grade');
    element.textContent = '-';
    if (JSON_FINAL_GRADE in contents) {
        element.textContent = contents[JSON_FINAL_GRADE];
    }
    element = document.getElementById('student-num-forum-interactions');
    element.textContent = '-';
    if (JSON_NUM_FORUM_INTERACTIONS in contents) {
        element.textContent = contents[JSON_NUM_FORUM_INTERACTIONS];
    }
    element = document.getElementById('student-total-interactions');
    element.textContent = '-';
    if (JSON_NUM_TOTAL_INTERACTIONS in contents) {
        element.textContent = contents[JSON_NUM_TOTAL_INTERACTIONS];
    }

    // Grades
    element = document.getElementById('student-grades');
    element.textContent = '-';
    if (JSON_GRADES in contents) {
        // element.textContent = JSON.stringify(contents[JSON_GRADES]);
        element.textContent = "";
        for (const [key, value] of Object.entries(contents[JSON_GRADES])) {
            element.innerHTML = element.innerHTML + (`<p><b>${key}:</b> ${value}</p>`);
        }
    }

    // Interactions

    // Based on examples on:
    // https://observablehq.com/@erikbrinkman/d3-dag-sugiyama
    // https://observablehq.com/@erikbrinkman/d3-dag-topological

    // Clean canvas first
    element = document.getElementById('graph-canvas');
    element.textContent = '';

    // Draw graph of interactions
    const dag = d3.dagStratify()(contents[JSON_INTERACTIONS]);
    const nodeRadius = 20;
    const layout = d3
        .sugiyama() // base layout
        .nodeSize((node) => [(node ? 3.6 : 0.25) * nodeRadius, 3 * nodeRadius]); // set node size instead of constraining to fit
    const { width, height } = layout(dag);

    // --------------------------------
    // This code only handles rendering
    // --------------------------------
    const svgSelection = d3.select("svg");
    svgSelection.attr("viewBox", [0, 0, height, width].join(" "));
    const defs = svgSelection.append("defs"); // For gradients

    const steps = dag.size();
    const interp = d3.interpolateRainbow;
    const colorMap = new Map();
    for (const [i, node] of dag.idescendants().entries()) {
        colorMap.set(node.data.id, interp(i / steps));
    }

    // How to draw edges
    const line = d3
        .line()
        .curve(d3.curveMonotoneX)
        .x((d) => d.y)
        .y((d) => d.x);

    // Plot edges
    svgSelection
        .append("g")
        .selectAll("path")
        .data(dag.links())
        .enter()
        .append("path")
        .attr("d", ({ points }) => line(points))
        .attr("fill", "none")
        .attr("stroke-width", 1)
        .attr("stroke", ({ source, target }) => {
        // encodeURIComponents for spaces, hope id doesn't have a `--` in it
        const gradId = encodeURIComponent(`${source.data.id}--${target.data.id}`);
        const grad = defs
            .append("linearGradient")
            .attr("id", gradId)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", source.y)
            .attr("x2", target.y)
            .attr("y1", source.x)
            .attr("y2", target.x);
        grad
            .append("stop")
            .attr("offset", "0%")
            .attr("stop-color", colorMap.get(source.data.id));
        grad
            .append("stop")
            .attr("offset", "100%")
            .attr("stop-color", colorMap.get(target.data.id));
        return `url(#${gradId})`;
        });

    // Select nodes
    const nodes = svgSelection
        .append("g")
        .selectAll("g")
        .data(dag.descendants())
        .enter()
        .append("g")
        .attr("transform", ({ x, y }) => `translate(${y}, ${x})`);
    
    // Show event details of each node on mouse hover
    var div = d3.select("body").append("div")
        .attr("class", "tooltip-node")
        .style("opacity", 0);

    nodes.on('mouseover', function(event, d) {
        div.transition()
            .duration(50)
            .style("opacity", 1);
        div.html(JSON.stringify(d.data))
            .style("left", (element.getBoundingClientRect().left + d3.pointer(event)[0] + TOOLTIP_HORIZONTAL_OFFSET) + "px")
            .style("top", (element.getBoundingClientRect().top + d3.pointer(event)[1] + TOOLTIP_VERTICAL_OFFSET) + "px");
    })
    .on('mouseout', function(_, _) {
        div.transition()
            .duration(50)
            .style("opacity", 0);
    });

    // Plot node circles
    nodes
        .append("circle")
        .attr("r", nodeRadius)
        .attr("fill", (n) => colorMap.get(n.data.id));

    // Add text to nodes
    nodes
        .append("text")
        .text((d) => d.data.label)
        .attr("font-size", "10")
        .attr("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("fill", "white");
}

// Sets the event listener for the user picking the json file with the user data
document.getElementById('file-input')
    .addEventListener('change', readSingleFile, false);
