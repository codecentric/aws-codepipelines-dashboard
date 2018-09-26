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

    function parsePipelineState(stageState, commitMessage) {
        const currentRevision = stageState.actionStates[0].currentRevision || {};
        const latestExecution = stageState.actionStates[0].latestExecution || {};
        const status = latestExecution.status || '';
        const errorDetails = latestExecution.errorDetails || {};
        return {
            name: stageState.stageName,
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
                stages.push(parsePipelineState(response.stageStates[i], response.commitMessage));
            }
            return stages;
        });
    }

    return {
        getPipelines: getPipelines,
        getPipelineDetails: getPipelineDetails,
    };
};

