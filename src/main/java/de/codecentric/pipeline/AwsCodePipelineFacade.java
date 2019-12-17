package de.codecentric.pipeline;

import com.amazonaws.services.codepipeline.AWSCodePipeline;
import com.amazonaws.services.codepipeline.model.*;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AwsCodePipelineFacade {
    private final AWSCodePipeline client;

    public AwsCodePipelineFacade(AWSCodePipeline awsCodePipeline) {
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
        if (latestPipelineExecutionId != null) {
            GetPipelineExecutionResult pipelineExecution = getPipelineExecutionSummary(pipelineName, latestPipelineExecutionId);
            return getLatestRevisionSummary(pipelineExecution);
        }
        return "";
    }

    private String getLatestPipelineExecutionId(String name) {
        ListPipelineExecutionsResult pipelineExecutionsResult = getLatestPipelineExecutionResult(name);
        if (pipelineExecutionsResult != null) {
            List<PipelineExecutionSummary> summaries = pipelineExecutionsResult.getPipelineExecutionSummaries();
            if (summaries != null && summaries.size() > 0) {
                return summaries.get(0).getPipelineExecutionId();
            }
        }
        return null;
    }

    private String getLatestRevisionSummary(GetPipelineExecutionResult pipelineExecution) {
        List<ArtifactRevision> revisions = pipelineExecution.getPipelineExecution()
                .getArtifactRevisions();
        if (revisions.size() > 0) {
            return revisions.get(0).getRevisionSummary();
        }
        return "";
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
