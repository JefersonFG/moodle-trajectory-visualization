// Constants for the json elements
JSON_NAME = "name"
JSON_FINAL_GRADE = "final_grade"
JSON_NUM_FORUM_INTERACTIONS = "forum_interactions"
JSON_NUM_TOTAL_INTERACTIONS = "total_moodle_interactions"
JSON_GRADES = "grades"
JSON_INTERACTIONS = "interactions"

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
    let jsonData = JSON.parse(studentData)
    displayContents(jsonData)
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

    // Grades and interactions
    element = document.getElementById('student-grades');
    element.textContent = '-';
    if (JSON_GRADES in contents) {
        // element.textContent = JSON.stringify(contents[JSON_GRADES]);
        element.textContent = "";
        for (const [key, value] of Object.entries(contents[JSON_GRADES])) {
            element.innerHTML = element.innerHTML + (`<p><b>${key}:</b> ${value}</p>`);
        }
    }
    element = document.getElementById('student-interactions');
    element.textContent = '-';
    if (JSON_INTERACTIONS in contents) {
        element.textContent = JSON.stringify(contents[JSON_INTERACTIONS]);
    }
}

// Sets the event listener for the user picking the json file with the user data
document.getElementById('file-input')
    .addEventListener('change', readSingleFile, false);
