// Create a default AjaxSequencer and pass it to PipelineService.
let ajaxSequencer = AjaxSequencer($);
let pipelineService = PipelineService($, ajaxSequencer);

/**
 * @component Page Header - pretty much static.
 */
const pageheader = Vue.component("pageheader", {
  template: `
            <nav class="navbar navbar-light bg-light mb-4 mt-4">
                <a class="navbar-brand mr-auto" href="#">Dashboard</a>

                <span class="navbar-text mr-2">
                    <span class="badge badge-success">succeeded</span>
                </span>

                <span class="navbar-text mr-2">
                    <span class="badge badge-info">in progress</span>
                </span>

                <span class="navbar-text mr-2">
                    <span class="badge badge-danger">failed</span>
                </span>
            </nav>
  `,
  mounted() {
    // Update the title of the dashboard in the nav bar, from the text of the "title" element.
    $('.navbar-brand').text($('title').text());
  }
});

/**
 * @component Grid of pipelines - contains a list of <pipeline> components.
 */
const pipelinegrid = Vue.component("pipelinegrid", {
  props: ["pipelines"],
  template: `
            <div class="card-deck">
                <pipeline v-for="item in pipelines" v-bind:pipeline="item" />
            </div>
  `,
  mounted() {
    pipelineService.getPipelines().done((names) => {
      // Empty out app.pipelines in case we're navigating back from a detail page.
      // app.pipelines.splice([]);
      console.log('pipeline start');
      const startTime = new Date();
      app.loading = true;

      let promises = [];
      let pipelines = [];
      for (let i = 0; i < names.length; i++) {
        // app.pipelines.push(names[i]);
        promises.push(function(name, stages, i) {
          let promise = pipelineService.getPipelineDetails(name);
          promise.done((pipeline) => pipelines[i] = { name: name, pipeline: pipeline });
          return promise;
        }(names[i], pipelines, i));
      }

      $.when.apply($, promises).done(() => {
        console.log('$.when', pipelines.length, pipelines);

        pipelines = pipelines.sort(function(a, b) {
          a = latestStageChangeTime(a.pipeline);
          b = latestStageChangeTime(b.pipeline);
          return b - a;
        });

        console.log('sorted', pipelines.length, pipelines);

        // Hack for now. Use the sorted names. Data will have to be re-fetched. Better to use existing stages data.
        app.pipelines.splice(0, app.pipelines.length, ...pipelines.map((pipeline) => pipeline.name));
        app.loading = false;

        const endTime = new Date();
        console.log('pipeline fetch took', moment.duration(endTime.getTime() - startTime.getTime()).humanize());

        function latestStageChangeTime(stages) {
          let statusChanges = stages.map((stage) => stage.lastStatusChange);
          let maxStatusChange = Math.max.apply(Math, statusChanges);
          return maxStatusChange;
        }
      });
    });
  }
});

/**
 * @component Pipeline - contains a <pipelineheader> component and a list of <stage> components.
 *
 * Clicking of the body navigates to a card detail route.
 */
const pipeline = Vue.component("pipeline", {
  props: ["pipeline"], // attribute of tag
  template: `
    <div v-bind:class="['card', 'bg-light', 'mb-4']" style="min-width: 350px" v-on:click="clickHandler">
        <div class="card-body">
          <pipelineheader v-bind:pipelineName="pipeline" v-bind:stages="stages"/>
       </div>
        <ul class="list-group list-group-flush">
            <li v-for="item in stages">
                <stage v-bind:stage="item"/>
            </li>
        </ul>
    </div>
    `,
  data: function() {
    return {
      stages: []
    };
  },
  methods: {
    clickHandler: function() {
      router.push('/card/' + this.pipelineName);
    },
    getPipelineDetails: function(pipelineName) {
      pipelineService.getPipelineDetails(pipelineName).done((stages) => this.stages = stages);
    }
  },
  mounted() {
    this.getPipelineDetails(this.pipeline);
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

/**
 * @component Pipeline Header - contains information about the entire Pipeline.
 */
const pipelineheader = Vue.component("pipelineheader", {
  props: ["pipelineName", "stages"], // attribute of tag
  template: `
        <span>
            <h5 class="card-title">{{ pipelineName }}</h5>
            <p class="card-text">
                <span class="text-muted mb-2">
                    Started {{ startDate }}
                    <span class="badge badge-secondary float-right">took {{ duration }}</span>
                </span><br />
                <small>{{ commitMessage }}</small>
            </p>
        </span>
    `,
  data: function() {
    return {
      duration: 0,
      startDate: "-",
      commitMessage: ""
    };
  },
  watch: {
    stages: function(stages) {
      this.getPipelineDetails(this.pipelineName, this.stages || []);
    }
  },
  methods: {
    getPipelineDetails: function(pipelineName, stages) {
      let componentScope = this;
      // Start off with the largest min value, unless there are no stages at all.
      // In that case, use zero so we end up with a zero-length duration: (max - min)
      let min = (stages.length) ? Number.MAX_VALUE : 0;
      // Start off with the lowest max value. Anything in a stage will be greater.
      let max = 0;
      let commitMessage = "";
      let skipRemainingStages = false;
      for (let i = 0; i < stages.length; i++) {
        let stage = stages[i];

        // Anything that needs to be processed for *all* stages needs to go at the top of the loop.
        if (!commitMessage) {
          commitMessage = stage.commitMessage;
        }

        // After this point, only duration calculations.
        //
        // We really only care about stages with "succeeded" status.
        // We want to compute the duration as the time from the time of the first stage, up to the time
        // of the first stage that hasn't "succeeded". Note that this could be the first stage, in which
        // case, it will be the only one processed and the duration will be zero.

        if (skipRemainingStages) {
          continue;
        }

        // At this point, we know we're not skipping remaining stages yet, but this stage could be the one
        // that causes all subsequent stages to be skipped. We don't skip this one since we want to include
        // it in the duration.
        skipRemainingStages = (stage.latestStatus !== "succeeded");

        let lastUpdate = parseInt(stage.lastStatusChange);
        if (lastUpdate > max) {
          max = lastUpdate;
        }
        if (lastUpdate < min) {
          min = lastUpdate;
        }
      }
      componentScope.duration = moment.duration(max - min).humanize();
      componentScope.startDate = moment(min).fromNow();
      componentScope.commitMessage = commitMessage;
    }
  }
});

/**
 * @component Stage - contains name, revision and last execution time/date.
 */
const stage = Vue.component("stage", {
  props: ["stage"],
  template: `
    <div class="list-group-item" v-bind:class="extraClass">
      <div class="d-flex align-items-center">
          <div class="flex-grow-1">{{ stage.name }}</div>
          <div class="pl-2 pr-2 small rounded border border-secondary" v-bind:class="showRevision">{{ revisionId }}</div>
          <div class="p-1">
              <span v-bind:class="badgeType">
                  <a class="text-light" v-bind:href="this.stage.externalExecutionUrl">{{ latestExecutionDate }}</a>
              </span>
          </div>
      </div>
      <div>{{ stage.errorDetails }}</div>
    </div>
`,
  methods: {
    isActionRequired: function() {
      for (let j=0; j < needsHumanInteraction.length; j++) {
        var needs = needsHumanInteraction[j];
        if (needs.status === this.stage.latestStatus && needs.stage === this.stage.name) {
          return true;
        }
      }
      return false;
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
    showRevision: function() {
      return (this.stage.revisionId) ? '' : 'd-none';
    },
    revisionId: function() {
      const revisionId = this.stage.revisionId || "";
      return revisionId.substr(0,7);
    },
    badgeType: function() {
      switch (this.stage.latestStatus) {
        case "succeeded":
          return "badge badge-success";
        case "failed":
          return "badge badge-danger";
        case "inprogress":
          return "badge badge-info";
      }
    },
    extraClass: function() {
      let extra = '';
      if (this.isActionRequired()) {
        extra = 'stage-needs-action';
      } else if (this.isFailed) {
        extra = 'stage-failed';
      }
      return extra;
    }
  }
});

/**
 * @component Pipeline Card - contains a <pipelineheader> component and ... additional information.
 */
const pipelinecard = Vue.component("pipelinecard", {
  props: ["pipelineName"],
  template: `
    <div v-bind:class="['card', 'bg-light', 'mb-4']" style="min-width: 350px">
        <div class="card-body">
          <button type="button" class="close" aria-label="Close" v-on:click="navBack">
            <span aria-hidden="true">&times;</span>
          </button>
          <pipelineheader v-bind:pipelineName="pipelineName" v-bind:stages="stages"/>
        </div>
        <ul class="list-group list-group-flush">
            <li v-for="item in stages">
                <stage v-bind:stage="item" />
            </li>
        </ul>
    </div>
  `,
  data: function() {
    return {
      stages: []
    };
  },
  methods: {
    navBack: function() {
      router.back();
    },
    getPipelineDetails: function(pipelineName) {
      pipelineService.getPipelineDetails(pipelineName).done((stages) => this.stages = stages);
    }
  },
  mounted() {
    this.getPipelineDetails(this.pipelineName);
  }
});

let pipelines = [];

// 2. Define some routes
// Each route should map to a component. The "component" can
// either be an actual component constructor created via
// `Vue.extend()`, or just a component options object.
// We'll talk about nested routes later.
const routes = [
  { path: '/', component: pipelinegrid, props: {pipelines: pipelines } },
  { path: '/card/:pipelineName', component: pipelinecard, props: true }
];

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
const router = new VueRouter({
  routes // short for `routes: routes`
});

router.beforeEach((to, from, next) => {
  ajaxSequencer.clear();
  next();
});

let app = new Vue({
  el: "#app",
  router: router,
  data: {
    pipelines: pipelines,
    loading: true
  },
  methods: {}
});

// Refresh every 60 seconds.
if (!window.location.search) {
  window.setInterval(() => router.go(0), 60000);
}
