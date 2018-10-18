// Create a default AjaxSequencer and pass it to PipelineService.
let ajaxSequencer = AjaxSequencer($);
let pipelineService = PipelineService($, ajaxSequencer);

/**
 * Templates shared by more than one component.
 */
const pipelineHeaderTemplate = `<pipelineheader v-bind:pipeline="pipeline" v-bind:stages="pipeline.stages"/>`;
const pipelineStageTemplate =`
    <ul class="list-group list-group-flush">
       <li v-for="state in pipeline.states">
           <state v-bind:state="state"/>
       </li>
    </ul>`;

/**
 * @component Page Header - pretty much static. Take the <title> text and insert it into the header.
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
                <pipeline v-for="pipeline in pipelines" v-bind:pipeline="pipeline" />
            </div>
  `,
  mounted() {
    pipelineService.getPipelines().done((names) => {
      // Show the loading indicator.
      app.loading = true;

      let promises = [];
      let pipelines = [];

      for (let i = 0; i < names.length; i++) {
        // Fetch the details for each pipeline. Do this in a closure so we can track each promise.
        promises.push(function(name, stages, i) {
          let promise = pipelineService.getPipelineDetails(name);
          promise.done((pipeline) => pipelines[i] = pipeline);
          return promise;
        }(names[i], pipelines, i));
      }

      // When all promises have completed, sort them with most recently changes first.
      $.when.apply($, promises).done(() => {

        // Sort the array of piplines.
        pipelines = pipelines.sort(function(a, b) {
          const aTime = latestStageChangeTime(a.stages);
          const bTime = latestStageChangeTime(b.stages);
          return bTime - aTime;
        });

        // Replace the contents of app.pipelines with these new (sorted) pipelines.
        app.pipelines.splice(0, app.pipelines.length, ...pipelines);

        function latestStageChangeTime(stages) {
          const statusChanges = stages.map((stage) => stage.lastStatusChange || 0);
          const maxStatusChange = Math.max.apply(Math, statusChanges);
          return maxStatusChange;
        }
      }).always(() => app.loading = false);
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
        <div class="card-body">${ pipelineHeaderTemplate }</div>
        ${ pipelineStageTemplate}
    </div>
    `,
  methods: {
    clickHandler: function() {
      router.push('/card/' + this.pipeline.name);
    }
  }
});

/**
 * @component Pipeline Header - contains information about the entire Pipeline.
 */
const pipelineheader = Vue.component("pipelineheader", {
  props: ["pipeline", "stages"], // attribute of tag
  template: `
        <span>
            <h5 class="card-title">{{ pipeline.name }}</h5>
            <p class="card-text">
                <span class="text-muted mb-2">
                    Started {{ startDate }}
                    <span class="badge badge-secondary float-right">took {{ duration }}</span>
                </span><br />
                <small>{{ pipeline.commitMessage }}</small>
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
      this.getPipelineDetails(this.stages || []);
    }
  },
  mounted() {
    this.getPipelineDetails(this.stages || []);
  },
  methods: {
    getPipelineDetails: function(stages) {
      let componentScope = this;
      // Start off with the largest min value, unless there are no stages at all.
      // In that case, use zero so we end up with a zero-length duration: (max - min)
      let min = (stages.length) ? Number.MAX_VALUE : 0;
      // Start off with the lowest max value. Anything in a stage will be greater.
      let max = 0;
      let skipRemainingStages = false;
      for (let i = 0; i < stages.length; i++) {
        let stage = stages[i];

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
    }
  }
});

/**
 * @component State - contains the State name, and a list of Stage components.
 */
const state = Vue.component("state", {
  props: ["state"],
  template: `
    <div class="panel panel-default border rounded">
      <small class="panel-heading mx-3">{{ state.name }}</small>
      <div class="panel-body">
        <ul class="list-group list-group-flush">
            <li v-for="stage in state.stages">
                <stage v-bind:stage="stage"/>
            </li>
        </ul>
        </div>
      </div>
    </div>
  `
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
        if (this.matchesStage(needs, this.stage.name) && this.matchesStatus(needs, this.stage.latestStatus)) {
          return true;
        }
      }
      return false;
    },
    matchesStage: function(needs, name) {
      return name.toLowerCase().indexOf(needs.stage.toLowerCase()) >= 0;
    },
    matchesStatus: function(needs, status) {
      return status.indexOf(needs.status) >= 0;
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
          ${ pipelineHeaderTemplate }
        </div>
        ${ pipelineStageTemplate }
    </div>
  `,
  data: function() {
    return {
      pipeline: {}
    };
  },
  methods: {
    navBack: function() {
      router.back();
    },
    getPipelineDetails: function(pipelineName) {
      pipelineService.getPipelineDetails(pipelineName)
        .done((pipeline) => this.pipeline = pipeline)
        .always(() => app.loading = false);
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

// Refresh every 60 seconds, unless "?static" is part of the URL.
const refresh = ! window.location.search.substr(1).split("&").map((elem) => elem === "static").reduce((a,b) => a || b);
if (refresh) {
  window.setInterval(() => router.go(0), 60000);
}
