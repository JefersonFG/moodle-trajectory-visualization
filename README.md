# Moodle trajectory visualizer

Last module of the moodle trajectory generator project, this module will take student data as inputs in a json format, with the following specification:

```json
{
    "name": "Nome exemplo",
    "final_grade": 70,
    "forum_interactions": 20,
    "total_moodle_interactions": 50,
    "grades": {
        "Tarefa 1": 70,
        ...
    },
    "interactions": [
            {
                "Hora": "01/01/2000 08:00",
                "Contexto do Evento": "Curso exemplo",
                "Componente": "Sistema",
                "Nome do evento": "Curso visto"
            },
            ...
		]
}
```

With this data it will generate a graph visualization of the student trajectory throughout the course, using the student interactions with moodle as the nodes. The metadata highlighted in the json is also shown highlighted in the graph view, so it is easy for the user to see how well the student went on the course.

# Usage

At its core the system is a html page with a stylesheet and a script, so opening the html file on your browser should be sufficient to use it.
