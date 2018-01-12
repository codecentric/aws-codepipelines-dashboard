package de.codecentric.pipeline;

import com.amazonaws.services.codepipeline.model.ListPipelinesResult;
import com.amazonaws.services.codepipeline.model.PipelineSummary;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.runners.MockitoJUnitRunner;

import java.util.Collections;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class PipelineServiceGetPipelinesTest {

    @Mock
    private AwsCodePipelineFacade awsCodePipelineFacade;

    @InjectMocks
    private PipelineService pipelineService;

    @Mock
    private ListPipelinesResult listPipelinesResult;

    @Test
    public void getPipelines_uses_fixed_PipelinesRequest() {
        when(awsCodePipelineFacade.getPipelineResults()).thenReturn(listPipelinesResult);
        pipelineService.getPipelines();
        verify(awsCodePipelineFacade).getPipelineResults();
    }

    @Test
    public void getPipelines_returns_expected_list_of_PipelineSummaries() {
        List<PipelineSummary> summaries = Collections.singletonList(new PipelineSummary());
        when(awsCodePipelineFacade.getPipelineResults()).thenReturn(listPipelinesResult);
        when(listPipelinesResult.getPipelines()).thenReturn(summaries);
        List<PipelineSummary> actualResult = pipelineService.getPipelines();
        assertEquals(summaries, actualResult);
    }

}
