package de.codecentric.pipeline;

import com.amazonaws.services.codepipeline.model.AWSCodePipelineException;
import com.amazonaws.services.codepipeline.model.GetPipelineStateResult;
import com.amazonaws.services.codepipeline.model.PipelineSummary;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class PipelineService {
    @Autowired
    private AwsCodePipelineFacade awsCodePipelineFacade;

    private Map<String, PipelineDetailsResult> latestResult = new HashMap<>();

    public List<PipelineSummary> getPipelines() {
        return awsCodePipelineFacade.getPipelineResults().getPipelines();
    }

    public PipelineDetailsResult getPipelineDetails(String pipelineName) throws PipelineServiceException {
        try {
            GetPipelineStateResult result = awsCodePipelineFacade.getPipelineStatus(pipelineName);
            String commitMessage = awsCodePipelineFacade.getLatestCommitMessage(pipelineName);
            PipelineDetailsResult pipelineDetailsResult = new PipelineDetailsResult(result.getStageStates(), commitMessage);
            latestResult.put(pipelineName, pipelineDetailsResult);
            return pipelineDetailsResult;
        } catch (AWSCodePipelineException e) {
            if (latestResult.containsKey(pipelineName)) {
                log.warn("{} - Returning cached value for {}", e.getMessage(), pipelineName);
                return latestResult.get(pipelineName);
            }
            throw new PipelineServiceException("Failed to get details for " + pipelineName, e);
        }
    }

}
