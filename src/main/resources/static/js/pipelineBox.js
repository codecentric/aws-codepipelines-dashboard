let pipelineService = PipelineService($);

Vue.component('pipeline', {
    props: ['pipeline'], // attribute of tag
    template: `
<div class="pipeline"><b>{{ pipeline }}</b>
<stage v-for="item in stages" v-bind:stage="item"></stage>
<div class="dateinfo">Start: {{startDate}}<br />Duration: {{duration}} min <br/>{{commitMessage}}</div>
</div>`,
    data: function () {
        return {
            stages: [],
            duration: 0,
            startDate: "-",
            commitMessage: ""
        };
    },
    methods: {
        getPipelineDetails: function (pipelineName) {
            let componentScope = this;
            pipelineService.getPipelineDetails(pipelineName, function (stages) {
                componentScope.stages = stages;
                let min = 0, max = 0;
                let commitMessage = "";
                for (let i = 0; i < stages.length; i++) {
                    let lastUpdate = parseInt(stages[i].lastStatusChange);
                    if (min === 0) {
                        min = lastUpdate;
                    }
                    if (max === 0) {
                        max = lastUpdate;
                    }
                    if (lastUpdate > max) {
                        max = lastUpdate;
                    }
                    if (lastUpdate < min) {
                        min = lastUpdate;
                    }
                    if (commitMessage === "") {
                        commitMessage = stages[i].commitMessage;
                    }
                }
                componentScope.duration = ((max - min) / 60000).toFixed(1);
                componentScope.startDate = moment(min).format('DD.MM.YYYY HH:mm:ss');
                componentScope.commitMessage = commitMessage;
            });
        }
    },
    mounted() {
        this.getPipelineDetails(this.pipeline);
        window.setInterval(() => this.getPipelineDetails(this.pipeline), 60000);
    }
});

Vue.component('stage', {
    props: ['stage'],
    template: `
<div class="stage" v-bind:class="{ 'stat_succeeded': isSucceeded, 'stat_failed': isFailed, 'stat_inprogress': isInProgress }">
    <div class="stage_name"><b>{{ stage.name }}</b></div>
    <div class="stage_latestexecution"><a v-bind:href="this.stage.externalExecutionUrl">{{ latestExecutionDate }}</a></div>
</div>
`,
    methods: {},
    computed: {
        isSucceeded: function () {
            return this.stage.latestStatus === "succeeded";
        },
        isFailed: function () {
            return this.stage.latestStatus === "failed";
        },
        isInProgress: function () {
            return this.stage.latestStatus === "inprogress";
        },
        latestExecutionDate: function () {
            return moment(this.stage.lastStatusChange).format('DD.MM.YYYY HH:mm:ss');
        }
    }

});


let app = new Vue({
    el: '#app',
    data: {
        pipelines: []
    },
    methods: {}
});

pipelineService.getPipelines(function (names) {
    for (let i = 0; i < names.length; i++) {
        app.pipelines.push(names[i]);
    }
});
