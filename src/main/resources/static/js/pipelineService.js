let PipelineService = function (jquery, as) {

    // If no AjaxSequencer was passed in, use the jQuery instance directly.
    as = as || jquery;

    function getPipelines() {
        return as.get('/pipelines').then((response) => response.map((elem) => elem.name));
    }

    function parsePipelineActionState(actionState) {
        const currentRevision = actionState.currentRevision || {};
        const latestExecution = actionState.latestExecution || {};
        const status = latestExecution.status || '';
        const errorDetails = latestExecution.errorDetails || {};
        return {
            name: actionState.actionName,
            revisionId: currentRevision.revisionId,
            latestStatus: status.toLowerCase(),
            lastStatusChange: latestExecution.lastStatusChange,
            externalExecutionUrl: latestExecution.externalExecutionUrl,
            errorDetails: errorDetails.message
        };
    }

    function getPipelineDetails(pipelineName) {
        let stages = [];
        return as.get("/pipeline/" + pipelineName).then(function(response) {
            let pipelineDetails = {
                name: pipelineName,
                commitMessage: response.commitMessage,
                lastStatusChange: 0,
                states: []
            };

            for (let i = 0; i < response.stageStates.length; i++) {
                const stageState = response.stageStates[i];
                let stages = [];
                for (let j=0; j < stageState.actionStates.length; j++) {
                    let actionState = stageState.actionStates[j];
                    stages.push(parsePipelineActionState(actionState));
                }
                const statusChanges = stages.map((stage) => stage.lastStatusChange || 0);
                const lastStatusChange = Math.max.apply(Math, statusChanges);

                pipelineDetails.states.push({
                    name: stageState.stageName,
                    lastStatusChange: lastStatusChange,
                    stages: stages
                });
            }

            const pipelineStatusChanges = pipelineDetails.states.map((state) => state.lastStatusChange);
            pipelineDetails.lastStatusChange = Math.max.apply(Math, pipelineStatusChanges);
            return pipelineDetails;
        });
    }

    return {
        getPipelines: getPipelines,
        getPipelineDetails: getPipelineDetails,
    };
};

