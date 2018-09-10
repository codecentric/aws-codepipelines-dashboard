let pipelineService = PipelineService($);

Vue.component("pipeline", {
  props: ["pipeline"], // attribute of tag
  template: `
    <div v-bind:class="['card', 'bg-light', 'mb-4']" style="min-width: 350px">
        <div class="card-body">
            <h5 class="card-title">{{ pipelineName }}</h5>
            <p class="card-text">
                <span class="text-muted mb-2">
                    Started {{ startDate }}
                    <span class="badge badge-secondary float-right">{{ duration }} min</span>
                </span><br />
                <small>{{ commitMessage }}</small>
            </p>
        </div>
        <ul class="list-group list-group-flush">
            <li v-for="item in stages" class="list-group-item">
                <stage v-bind:stage="item" />
            </li>
        </ul>
    </div>
    `,
  data: function() {
    return {
      stages: [],
      duration: 0,
      startDate: "-",
      commitMessage: ""
    };
  },
  methods: {
    getPipelineDetails: function(pipelineName) {
      let componentScope = this;
      pipelineService.getPipelineDetails(pipelineName, function(stages) {
        componentScope.stages = stages;
        let min = 0,
          max = 0;
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
        componentScope.startDate = moment(min).fromNow();
        componentScope.commitMessage = commitMessage;
      });
    }
  },
  mounted() {
    this.getPipelineDetails(this.pipeline);
    window.setInterval(() => this.getPipelineDetails(this.pipeline), 60000);
  },
  computed: {
    pipelineName: function() {
      return this.pipeline;
    },
    borderClass: function() {
      const isFailed =
        this.stages.findIndex(item => item.latestStatus === "failed") !== -1;
      const isBuilding =
        this.stages.findIndex(item => item.latestStatus === "inprogress") !==
        -1;
      if (isFailed) {
        return "border-danger";
      } else if (isBuilding) {
        return "border-info";
      } else {
        return "border-success";
      }
    }
  }
});

Vue.component("stage", {
  props: ["stage"],
  template: `
    <div v-bind:class="statusType">
        <div>{{ stage.name }}</div>
        <div>
            <span v-bind:class="badgeType">
                <a class="text-light" v-bind:href="this.stage.externalExecutionUrl">{{ latestExecutionDate }}</a>
            </span>
        </div>
    </div>
`,
  methods: {
    isActionRequired: function() {
      return this.stage.latestStatus === "inprogress" && this.stage.name === "Human";
    }
  },
  computed: {
    isSucceeded: function() {
      return this.stage.latestStatus === "succeeded";
    },
    isFailed: function() {
      return this.stage.latestStatus === "failed";
    },
    isInProgress: function() {
      return this.stage.latestStatus === "inprogress";
    },
    latestExecutionDate: function() {
      return moment(this.stage.lastStatusChange).fromNow();
    },
    statusType: function() {
      const classNames = "d-flex justify-content-between align-items-center";

      return classNames + (this.isActionRequired() ? " badge-info" : "");
    },
    badgeType: function() {
      switch (this.stage.latestStatus) {
        case "succeeded":
          return "badge badge-success";
        case "failed":
          return "badge badge-failed";
        case "inprogress":
          return "badge badge-info";
      }
    }
  }
});

let app = new Vue({
  el: "#app",
  data: {
    pipelines: []
  },
  methods: {}
});

pipelineService.getPipelines(function(names) {
  for (let i = 0; i < names.length; i++) {
    app.pipelines.push(names[i]);
  }
});
