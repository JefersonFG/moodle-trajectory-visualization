// Constants for the json elements
JSON_NAME = "name";
JSON_FINAL_GRADE = "final_grade";
JSON_NUM_FORUM_INTERACTIONS = "forum_interactions";
JSON_NUM_TOTAL_INTERACTIONS = "total_moodle_interactions";
JSON_GRADES = "grades";
JSON_INTERACTIONS = "interactions";

JSON_INTERACTION_HOUR = "Hora";
JSON_INTERACTION_EVENT_CONTEXT = "Contexto do Evento";
JSON_INTERACTION_COMPONENT = "Componente";
JSON_INTERACTION_EVENT_NAME = "Nome do evento";

// Constants for UI values
TOOLTIP_HORIZONTAL_OFFSET = -250;
TOOLTIP_VERTICAL_OFFSET = -200;

// Maximum number of students that the UI will show at the same time
MAX_STUDENTS_VISIBLE = 3;

// List of current shown students, to avoid duplicates on the UI and control number of simultaneous student trajectories being shown
currentStudentsShown = [];

// Event categories for classification in the trajectory
// The idea is that each category is represented differently to ease evaluation of the trajectory
// The different representation could be a different shape or color
const forumCategory = {
    eventList: ["Fórum"],
    shape: d3.symbolCircle,
    size: 1750
};

const taskCategory = {
    eventList: ["Tarefa", "Envio de arquivos", "Comentário sobre o envio", "Questionário", "Pasta"],
    shape: d3.symbolSquare,
    size: 1750
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
    eventList: ["Relatório do usuário", "Relatório geral", "Sistema"],
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
    "Algum conteúdo foi publicado.",
    "Comentário criado",
    "Submissão criada.",
    "Um envio foi submetido.",
    "Um arquivo foi enviado.",
    "Tentativa do questionário iniciada",
    "Tentativa do questionário entregue",
    "O usuário salvou um envio."
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
    // Parse input file
    let jsonData = JSON.parse(studentData);

    // Check first if a new student has been selected
    if (currentStudentsShown.includes(jsonData[JSON_NAME])) {
        console.log(`Student ${jsonData[JSON_NAME]} already shown on the UI`);
        return;
    }

    // Check if the student limit has been reached
    if (currentStudentsShown.length >= MAX_STUDENTS_VISIBLE) {
        window.alert("Número máximo de estudantes exibidos simultâneamente atingido, atualize a página para exibir novas trajetórias");
        return;
    }

    // Check if it is the first student being selected, if it is show the main headers
    if (currentStudentsShown.length === 0) {
        let mainHeaders = document.getElementsByClassName('main-header');
        for (let i = 0; i < mainHeaders.length; i++) {
            mainHeaders[i].style.display = 'block';
        }
    }

    // Load student data and show on the UI
    let updatedStudentData = prepareDataForDAG(jsonData);
    displayStudentData(updatedStudentData);
    
    // Save student name on list of students shown on the UI
    currentStudentsShown.push(jsonData[JSON_NAME]);
}

// The d3-dag library expect source data to have ids on each node, with the parentId field defining the connections between nodes
// Also adds the label for printing, which is In, with n being the number of the event starting on one
function prepareDataForDAG(studentData) {
    // If the student didn't interact with moodle just return, no preparation to do
    if (!(JSON_INTERACTIONS in studentData)) {
        return studentData;
    }
    let updatedInteractions = []
    let current_id = 0;
    Object.entries(studentData[JSON_INTERACTIONS]).forEach(([_, interaction]) => {
        let processedInteraction = {
            "label": "I" + (current_id + 1).toString(),
            "id": current_id.toString(), ...interaction
        };
        let parentId;
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
function displayStudentData(studentData) {
    // Student metadata
    // Returns the list of grades of the student, to identify them on the trajectory nodes
    let gradeList = displayStudentInfo(studentData);

    // Interactions
    displayStudentTrajectory(studentData, gradeList);
}

// Adds html elements for the student metadata and fill it with the given student data
function displayStudentInfo(studentData) {
    const studentInfoSectionDiv = document.getElementById('student-info-section-div');

    // Add a button for the collapsible layout
    const studentInfoButton = document.createElement('button');
    studentInfoButton.classList.add('student-info-button');
    // TODO: Identify the student
    studentInfoButton.innerText = 'Abrir informações do aluno';
    studentInfoSectionDiv.appendChild(studentInfoButton);

    // Set the event handler
    studentInfoButton.addEventListener("click", studentMetadataButtonEventHandler);

    // Add the div encompassing the collapsible layout
    const studentInfoDiv = document.createElement('div');
    studentInfoDiv.classList.add('student-info-div');
    studentInfoSectionDiv.appendChild(studentInfoDiv);

    // Add the student data inside the div
    const summaryHeader = document.createElement('h2');
    summaryHeader.innerText = 'Resumo';
    studentInfoDiv.appendChild(summaryHeader);

    // Student name
    const studentNameLabel = document.createElement('p');
    let studentName = '-';
    if (JSON_NAME in studentData) {
        studentName = studentData[JSON_NAME];
    }
    studentNameLabel.innerHTML = '<b>Nome do aluno:</b> ' + studentName;
    studentInfoDiv.appendChild(studentNameLabel);

    // Final grade
    const studentFinalGradeLabel = document.createElement('p');
    let studentFinalGrade = '-';
    if (JSON_FINAL_GRADE in studentData) {
        studentFinalGrade = studentData[JSON_FINAL_GRADE];
    }
    studentFinalGradeLabel.innerHTML = '<b>Nota final:</b> ' + studentFinalGrade;
    studentInfoDiv.appendChild(studentFinalGradeLabel);

    // Number of forum interactions
    const studentNumForumInteractionsLabel = document.createElement('p');
    let studentNumForumInteractions = '-';
    if (JSON_NUM_FORUM_INTERACTIONS in studentData) {
        studentNumForumInteractions = studentData[JSON_NUM_FORUM_INTERACTIONS];
    }
    studentNumForumInteractionsLabel.innerHTML = '<b>Número de interações nos fóruns da disciplina:</b> ' + studentNumForumInteractions;
    studentInfoDiv.appendChild(studentNumForumInteractionsLabel);

    // Total number of interactions with moodle
    const studentTotalInteractionsLabel = document.createElement('p');
    let studentTotalInteractions = '-';
    if (JSON_NUM_TOTAL_INTERACTIONS in studentData) {
        studentTotalInteractions = studentData[JSON_NUM_TOTAL_INTERACTIONS];
    }
    studentTotalInteractionsLabel.innerHTML = '<b>Número total de interações com o moodle:</b> ' + studentTotalInteractions;
    studentInfoDiv.appendChild(studentTotalInteractionsLabel);

    // Show student grades
    const gradesHeader = document.createElement('h2');
    gradesHeader.innerText = 'Notas do aluno';
    studentInfoDiv.appendChild(gradesHeader);

    const studentGrades = document.createElement('p');
    studentGrades.innerHTML = '-';

    // Saves a list of grades for the student, so nodes related to the grading activity can be identified
    let gradeList = {};
    let gradeCount = 0;

    let gradeTitle;
    if (JSON_GRADES in studentData) {
        studentGrades.innerHTML = '';
        for ([gradeTitle, gradeValue] of Object.entries(studentData[JSON_GRADES])) {
            // TODO: Move this to cleaning module
            // Trim title
            if (gradeTitle.endsWith("(Real)")) {
                const index = gradeTitle.indexOf("(Real)");
                gradeTitle = gradeTitle.substring(0, index);
            }
            // Remove unicode character U+00A0 c2 a0 NO-BREAK SPACE and replace with regular space
            gradeTitle = gradeTitle.replace('\u00a0', ' ');
            gradeTitle = gradeTitle.trim();
            gradeList[gradeTitle] = `N${gradeCount}`;
            studentGrades.innerHTML = studentGrades.innerHTML + (`<p><b>N${gradeCount} - ${gradeTitle}:</b> ${gradeValue}</p>`);
            gradeCount++;
        }
    }
    studentInfoDiv.appendChild(studentGrades);
    return gradeList;
}

// Event handler for the student metadata button
function studentMetadataButtonEventHandler() {
    this.classList.toggle("active");
    const content = this.nextElementSibling;
    if (content.style.maxHeight){
        content.style.maxHeight = null;
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
    }
}

function displayStudentTrajectory(studentData, gradeList) {
    // Based on examples on:
    // https://observablehq.com/@erikbrinkman/d3-dag-sugiyama
    // https://observablehq.com/@erikbrinkman/d3-dag-topological

    // TODO: Create div and svg dynamically for each student, append to body

    // Clean canvas first
    d3.selectAll("svg > *").remove();

    // Checks if there are interactions to show, if not returns
    if (!(JSON_INTERACTIONS in studentData)) {
        const txt = document.createElementNS("http://www.w3.org/2000/svg", 'text');
        txt.setAttributeNS(null, 'x', 10);
        txt.setAttributeNS(null, 'y', 50);
        txt.setAttributeNS(null, 'font-size', 18);
        txt.innerHTML = "Estudante não interagiu com o moodle";
        document.getElementById("graph-canvas").appendChild(txt);
        return;
    }

    // Draw graph of interactions
    const dag = d3.dagStratify()(studentData[JSON_INTERACTIONS]);
    const nodeRadius = 20;
    const layout = d3
        .sugiyama() // base layout
        .nodeSize((node) => [(node ? 3.6 : 0.25) * nodeRadius, 3 * nodeRadius]); // set node size instead of constraining to fit
    const { width, height } = layout(dag);

    // --------------------------------
    // Rendering
    // --------------------------------
    const svgSelection = d3.select("#graph-canvas");
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
    const div = d3.select("body").append("div")
        .attr("class", "tooltip-node")
        .style("opacity", 0);

    const trajectoryDiv = document.getElementById('trajectory-div');

    nodes.on('mouseover', function(e, d) {
        div.transition()
            .duration(50)
            .style("opacity", 1);
        div.html(getTooltipText(d.data))
            .style("left", getTooltipLeftPosition(e, trajectoryDiv) + "px")
            .style("top", getTooltipTopPosition(e, trajectoryDiv) + "px");
    })
    .on('mouseout', function() {
        div.transition()
            .duration(50)
            .style("opacity", 0);
    });

    // Plot node shapes
    function drawNodeShape(nodeCategory) {
        // Method for generating the symbol to display for the node
        const symbolGenerator = d3.symbol().type(nodeCategory.shape).size(nodeCategory.size);
        const pathData = symbolGenerator();

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
        .text((d) => getNodeText(d.data, gradeList))
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

// Left position of the tooltip, taking the current pointer position (based on event), parent div position and screen limits into account
function getTooltipLeftPosition(e, trajectoryDiv) {
    return Math.max(trajectoryDiv.offsetLeft + d3.pointer(e, trajectoryDiv)[0] + TOOLTIP_HORIZONTAL_OFFSET, 0);
}

// Top position of the tooltip, taking the current pointer position (based on event), parent div position and screen limits into account
function getTooltipTopPosition(e, trajectoryDiv) {
    return Math.max(trajectoryDiv.offsetTop + d3.pointer(e, trajectoryDiv)[1] + TOOLTIP_VERTICAL_OFFSET, 0);
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

// Returns the appropriate text to display inside the node
// Checks the grade list to see if the node is related to a grading activity and indicates on the text
function getNodeText(node, gradeList) {
    let nodeText = node.label;
    const currentEventContext = node[JSON_INTERACTION_EVENT_CONTEXT];
    if (currentEventContext in gradeList) {
        nodeText = `${nodeText} - ${gradeList[currentEventContext]}`;
    }
    return nodeText;
}

// Sets the event listener for the user picking the json file with the user data
document.getElementById('file-input')
    .addEventListener('change', readSingleFile, false);

// Sets the event listener for the collapsible student info layout
const coll = document.getElementsByClassName("student-info-button");
let i;

for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", studentMetadataButtonEventHandler);
}
