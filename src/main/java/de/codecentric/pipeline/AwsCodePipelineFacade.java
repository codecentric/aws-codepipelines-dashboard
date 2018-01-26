package de.codecentric.pipeline;

import com.amazonaws.services.codepipeline.AWSCodePipeline;
import com.amazonaws.services.codepipeline.model.*;
import org.springframework.stereotype.Component;

@Component
public class AwsCodePipelineFacade {
    private final AWSCodePipeline client;

    public AwsCodePipelineFacade (AWSCodePipeline awsCodePipeline) {
        this.client = awsCodePipeline;
    }

    public ListPipelinesResult getPipelineResults() {
        return client.listPipelines(new ListPipelinesRequest());
    }

    public GetPipelineStateResult getPipelineStatus(String pipelineName) {
        return client.getPipelineState(new GetPipelineStateRequest().withName(pipelineName));
    }

    public String getLatestCommitMessage(String pipelineName) {
        String latestPipelineExecutionId = getLatestPipelineExecutionId(pipelineName);
        GetPipelineExecutionResult pipelineExecution = getPipelineExecutionSummary(pipelineName, latestPipelineExecutionId);
        return getLatestRevisionSummary(pipelineExecution);
    }

    private String getLatestPipelineExecutionId(String name) {
        ListPipelineExecutionsResult pipelineExecutionsResult = getLatestPipelineExecutionResult(name);
        return pipelineExecutionsResult.getPipelineExecutionSummaries().get(0).getPipelineExecutionId();
    }

    private String getLatestRevisionSummary(GetPipelineExecutionResult pipelineExecution) {
        return pipelineExecution.getPipelineExecution()
                .getArtifactRevisions()
                .get(0)
                .getRevisionSummary();
    }

    private GetPipelineExecutionResult getPipelineExecutionSummary(String name, String latestPipelineExecutionId) {
        return client.getPipelineExecution(
                new GetPipelineExecutionRequest()
                        .withPipelineExecutionId(latestPipelineExecutionId).withPipelineName(name));
    }

    private ListPipelineExecutionsResult getLatestPipelineExecutionResult(String name) {
        return client.listPipelineExecutions(
                new ListPipelineExecutionsRequest().withPipelineName(name).withMaxResults(1));
    }

}
