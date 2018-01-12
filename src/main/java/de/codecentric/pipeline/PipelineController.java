package de.codecentric.pipeline;

import com.amazonaws.services.codepipeline.model.PipelineSummary;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Slf4j
public class PipelineController {

    @Autowired
    private PipelineService pipelineService;

    @RequestMapping("/pipelines")
    public List<PipelineSummary> handleIndex() {
        return pipelineService.getPipelines();
    }

    @RequestMapping("/pipeline/{name}")
    public PipelineDetailsResult handlePipeline(@PathVariable("name") String name) {
        try {
            return pipelineService.getPipelineDetails(name);
        } catch (PipelineServiceException e) {
            log.warn("Failed to get pipeline details for {}. Will return null response.", name, e);
            return null;
        }
    }
}
