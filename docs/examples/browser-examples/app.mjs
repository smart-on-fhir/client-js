
/** @param {string} id */
export function createRenderer(id) {
    const output = id ? document.getElementById(id) : document.body;
    return function(data) {
        // @ts-ignore
        output.innerText = data && typeof data === "object" ? JSON.stringify(data, null, 4) : String(data);
    };
}
  
export class App
{
    constructor(client) {
        this.client = client;
    }

    fetchCurrentPatient() {
        var render = createRenderer("patient");
        render("Loading...");
        return this.client.patient.read().then(render, render);
    }

    fetchCurrentEncounter() {
        var render = createRenderer("encounter");
        render("Loading...");
        return this.client.encounter.read().then(render, render);
    }

    fetchCurrentUser() {
        var render = createRenderer("user");
        render("Loading...");
        return this.client.user.read().then(render, render);
    }

    request(requestOptions, fhirOptions) {
        var render = createRenderer("output");
        render("Loading...");
        return this.client.request(requestOptions, fhirOptions).then(render, render);
    }

    renderContext() {
        return Promise.all([
            this.fetchCurrentPatient(),
            this.fetchCurrentUser(),
            this.fetchCurrentEncounter()
        ]);
    }

    setLabel(containerId, label) {
        // @ts-ignore
        document.getElementById(containerId).previousElementSibling.innerText = label;
    }
}
