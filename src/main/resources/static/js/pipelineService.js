let PipelineService = function (jquery, as) {

    // If no AjaxSequencer was passed in, use the jQuery instance directly.
    as = as || jquery;

    function getPipelines() {
        return as.get('/pipelines').then(function (response) {
            const listOfPipelineNames = [];
            for (let i = 0; i < response.length; i++) {
                listOfPipelineNames.push(response[i].name);
            }
            return listOfPipelineNames;
        });
    }

    function parsePipelineActionState(actionState, commitMessage) {
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
            errorDetails: errorDetails.message,
            commitMessage: commitMessage
        };
    }

    function getPipelineDetails(pipelineName) {
        let stages = [];
        return as.get("/pipeline/" + pipelineName).then(function(response) {
            for (let i = 0; i < response.stageStates.length; i++) {
                const stageState = response.stageStates[i];
                for (let j=0; j < stageState.actionStates.length; j++) {
                    let actionState = stageState.actionStates[j];
                    stages.push(parsePipelineActionState(actionState, response.commitMessage));
                }
            }
            return stages;
        });
    }

    return {
        getPipelines: getPipelines,
        getPipelineDetails: getPipelineDetails,
    };
};

