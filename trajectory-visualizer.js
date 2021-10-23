// Constants for the json elements
JSON_NAME = "name"
JSON_FINAL_GRADE = "final_grade"
JSON_NUM_FORUM_INTERACTIONS = "forum_interactions"
JSON_NUM_TOTAL_INTERACTIONS = "total_moodle_interactions"
JSON_GRADES = "grades"
JSON_INTERACTIONS = "interactions"

JSON_INTERACTION_HOUR = "Hora"
JSON_INTERACTION_EVENT_CONTEXT = "Contexto do Evento"
JSON_INTERACTION_COMPONENT = "Componente"
JSON_INTERACTION_EVENT_NAME = "Nome do evento"

// Constants for UI values
TOOLTIP_HORIZONTAL_OFFSET = 50
TOOLTIP_VERTICAL_OFFSET = -200

// Event categories for classification in the trajectory
// The idea is that each category is represented differently to ease evaluation of the trajectory
// The different representation could be a different shape or color
const forumCategory = {
    eventList: ["Fórum"],
    shape: d3.symbolCircle,
    size: 1500
};

const taskCategory = {
    eventList: ["Tarefa", "Envio de arquivos", "Comentário sobre o envio", "Questionário", "Pasta"],
    shape: d3.symbolSquare,
    size: 1500
};

const contentCategory = {
    eventList: ["Arquivo", "URL", "Página"],
    shape: d3.symbolTriangle,
    size: 1000
};

const videocallCategory = {
    eventList: ["Webconferência Mconf"],
    shape: d3.symbolStar,
    size: 1000
};

const otherCategory = {
    eventList: ["Relatório de usuário", "Relatório geral", "Sistema"],
    shape: d3.symbolDiamond,
    size: 1000
};

const eventCategories = [
    forumCategory,
    taskCategory,
    contentCategory,
    videocallCategory,
    otherCategory
];

// Events indicating that the student has posted content to moodle, indicating more active interactions
activeInteractionEvents = [
    "Post criado",
    "Post atualizado",
    "Algum conteúdo foi publicado",
    "Tarefa enviada",
    "Comentário criado",
    "Submissão criada",
    "Um envio foi submetido",
    "Um arquivo foi enviado",
    "Tentativa do questionário iniciada",
    "Tentativa do questionário entregue",
    "O usuário salvou um envio"
];

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
    // If the student didn't interact with moodle just return, no preparation to do
    if (!(JSON_INTERACTIONS in studentData)) {
        return studentData;
    }
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
    d3.selectAll("svg > *").remove();

    // Checks if there are interactions to show, if not returns
    if (!(JSON_INTERACTIONS in contents)) {
        return;
    }

    // Draw graph of interactions
    const dag = d3.dagStratify()(contents[JSON_INTERACTIONS]);
    const nodeRadius = 20;
    const layout = d3
        .sugiyama() // base layout
        .nodeSize((node) => [(node ? 3.6 : 0.25) * nodeRadius, 3 * nodeRadius]); // set node size instead of constraining to fit
    const { width, height } = layout(dag);

    // --------------------------------
    // Rendering
    // --------------------------------
    const svgSelection = d3.select("svg");
    svgSelection.attr("viewBox", [0, 0, height, width].join(" "));

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
        .attr("stroke", "black");

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
    
    const scrollableDiv = document.getElementById('scrollable-div');

    nodes.on('mouseover', function(e, d) {
        div.transition()
            .duration(50)
            .style("opacity", 1);
        div.html(getTooltipText(d.data))
            .style("left", (scrollableDiv.offsetLeft + d3.pointer(e, scrollableDiv)[0] + TOOLTIP_HORIZONTAL_OFFSET) + "px")
            .style("top", (scrollableDiv.offsetTop + d3.pointer(e, scrollableDiv)[1] + TOOLTIP_VERTICAL_OFFSET) + "px");
    })
    .on('mouseout', function(_, _) {
        div.transition()
            .duration(50)
            .style("opacity", 0);
    });

    // Plot node shapes
    function drawNodeShape(nodeCategory) {
        // Method for generating the symbol to display for the node
        var symbolGenerator = d3.symbol().type(nodeCategory.shape).size(nodeCategory.size);
        var pathData = symbolGenerator();

        // Filters for components present in the event list for each category
        nodes
            .filter((d) => nodeCategory.eventList.includes(d.data[JSON_INTERACTION_COMPONENT]))
            .append('path')
            .attr('d', pathData)
            .attr('fill', (d) => getNodeColor(d.data));
    }
    eventCategories.forEach(drawNodeShape);

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

// Converts node data into a presentable form for the tooltip
function getTooltipText(nodeData) {
    const hour = "<p><b>" + JSON_INTERACTION_HOUR + ":</b> " + nodeData[JSON_INTERACTION_HOUR] + "</p>";
    const event_context = "<p><b>" + JSON_INTERACTION_EVENT_CONTEXT + ":</b> " + nodeData[JSON_INTERACTION_EVENT_CONTEXT] + "</p>";
    const component = "<p><b>" + JSON_INTERACTION_COMPONENT + ":</b> " + nodeData[JSON_INTERACTION_COMPONENT] + "</p>";
    const event_name = "<p><b>" + JSON_INTERACTION_EVENT_NAME + ":</b> " + nodeData[JSON_INTERACTION_EVENT_NAME] + "</p>";
    return hour + event_context + component + event_name;
}

// Returns the color of the node according to if the event indicates that the student has added content to the platform
// Such as uploading an activity or posting on the forum
function getNodeColor(node) {
    if (activeInteractionEvents.includes(node[JSON_INTERACTION_EVENT_NAME])) {
        return "green";
    } else {
        return "purple";
    }
}

// Sets the event listener for the user picking the json file with the user data
document.getElementById('file-input')
    .addEventListener('change', readSingleFile, false);
