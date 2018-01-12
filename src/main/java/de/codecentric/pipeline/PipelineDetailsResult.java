package de.codecentric.pipeline;

import com.amazonaws.services.codepipeline.model.StageState;
import lombok.Getter;

import java.util.List;

@Getter
public class PipelineDetailsResult {

    private final List<StageState> stageStates;
    private final String commitMessage;

    PipelineDetailsResult(List<StageState> stageStates, String commitMessage) {
        this.stageStates = stageStates;
        this.commitMessage = commitMessage;
    }

}
