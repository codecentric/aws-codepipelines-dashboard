// Create a default AjaxSequencer and pass it to PipelineService.
let ajaxSequencer = AjaxSequencer($);
let pipelineService = PipelineService($, ajaxSequencer);

/**
 * @component <the-page-header> - pretty much static. Take the <title> text and insert it into the header.
 */
Vue.component("ThePageHeader", {
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
 * @component <the-pipeline-grid> - contains a list of <pipeline> components.
 */
const ThePipelineGrid = Vue.component("ThePipelineGrid", {
  props: ["pipelines"],
  template: `
    <div class="card-deck">
        <pipeline v-for="pipeline in pipelines" v-bind:pipeline="pipeline" :key="pipeline.name"/>
    </div>
  `
});

/**
 * @component <filtered-pipeline-grid> - contains a filtered list of <pipeline> components based on the specified URL.
 */
const FilteredPipelineGrid = Vue.component("FilteredPipelineGrid", {
  props: ["filteredPipelines"],
  template: `
    <div class="card-deck">
        <pipeline v-for="pipeline in filteredPipelines" v-bind:pipeline="pipeline" :key="pipeline.name"/>
    </div>
  `
});

/**
 * @component <pipeline> - contains a <pipeline-card-body> component and implements a click handler to navigate.
 *
 * Clicking of the body navigates to a card detail route.
 */
Vue.component("pipeline", {
  props: ["pipeline"], // attribute of tag
  template: `
    <pipeline-card-body v-bind:pipeline="pipeline" has-close="false" v-on:click="clickHandler"/>
  `,
  methods: {
    clickHandler: function() {
      router.push('/card/' + this.pipeline.name);
    }
  }
});

/**
 * @component <pipeline-card-body> - contains a <pipeline-header> component and a list of <pipeline-stage> components.
 * @property has-close="true" => display the Close button.
 *    emits a 'click' event when clicked on.
 */
Vue.component("PipelineCardBody", {
  props: ["pipeline", "has-close"], // attribute of tag
  template: `
    <div v-bind:class="['card', 'bg-light', 'mb-4']" style="min-width: 350px" v-on:click="$emit('click', $event)">
      <div class="card-body">
        <button type="button" class="close" v-bind:class="showCloseButton">
          <span class="card-close-button">&times;</span>
        </button>
        <pipeline-header v-bind:pipeline="pipeline" v-bind:states="pipeline.states"/>
      </div>
      <ul class="list-group list-group-flush">
         <li v-for="state in pipeline.states">
             <pipeline-state v-bind:state="state"/>
         </li>
      </ul>
    </div>
  `,
  computed: {
    showCloseButton: function() {
      return (this.hasClose === "true") ? '' : 'd-none';
    }
  }
});

/**
 * @component <pipeline-header> - contains information about the entire Pipeline.
 */
Vue.component("PipelineHeader", {
  props: ["pipeline", "states"], // attribute of tag
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
      startDate: "-"
    };
  },
  watch: {
    states: function(states) {
      this.getPipelineDetails(this.states || []);
    }
  },
  mounted() {
    this.getPipelineDetails(this.states || []);
  },
  methods: {
    getPipelineDetails: function (states) {
      let min = (states.length) ? states[0].lastStatusChange : 0;
      let max = Math.max.apply(Math, states.map((state) => state.lastStatusChange));
      this.duration = moment.duration(max - min).humanize();
      this.startDate = moment(min).fromNow();
    }
  }
});

/**
 * @component <pipeline-state> - contains the State name, and a list of <pipeline-stage> components.
 */
Vue.component("PipelineState", {
  props: ["state"],
  template: `
    <div class="panel panel-default border rounded">
      <small class="panel-heading mx-3">{{ state.name }}</small>
      <div class="panel-body">
        <ul class="list-group list-group-flush">
            <li v-for="stage in state.stages">
                <pipeline-stage v-bind:stage="stage"/>
            </li>
        </ul>
        </div>
      </div>
    </div>
  `
});

/**
 * @component <pipeline-stage> - contains name, revision and last execution time/date.
 */
Vue.component("PipelineStage", {
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
      if (this.stage.lastStatusChange == null) {
        return "";
      }
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
 * @component <pipeline-card> - contains a <pipeline-header> component and ... additional information.
 */
const PipelineCard = Vue.component("PipelineCard", {
  props: ["cardlines"],
  template: `
    <div class="card-deck">
      <pipeline-card-body v-for="pipeline in cardlines" v-bind:pipeline="pipeline" :key="pipeline.name" has-close="true" v-on:click="navBack"/>
    </div>
  `,
  methods: {
    navBack: function(evt) {
      // Only navigate back if the Close button was clicked on, not anywhere in the card.
      if ($(evt.target).is('.card-close-button')) {
        router.back();
      }
    }
  }
});

// If refreshInterval is set to zero, no refreshing takes place.
// refreshInterval is set to zero with "?static" or "?refresh=0" search params.
// refreshInterval is set to 60 seconds for "?refresh" or "?refresh=" search params.
// refreshInterval is set to NN seconds for "?refresh=NN", where NN is some number of seconds.
const queryParams = window.location.search.substr(1).split('&').map((elem) => elem.split('=')).reduce((p,c) => { p[c[0]] = c[1]; return p; }, {});
queryParams.refresh = (typeof queryParams.refresh === 'undefined') ? 60 : queryParams.refresh;
const refreshInterval = (queryParams.hasOwnProperty('static')) ? 0 : (1000 * queryParams.refresh);

let refreshId;

// Dummy object in case elements are set during routing, before the app object is created below.
let app = {};
// List of pipelines for the Grid view
let gridPipelines = [];
// List of pipelines for the filtered view
let filteredGridPipelines = [];
// List of (one) pipeline for the Card view.
let cardPipelines = [];

// 2. Define some routes
// Each route should map to a component. The "component" can
// either be an actual component constructor created via
// `Vue.extend()`, or just a component options object.
// We'll talk about nested routes later.
const routes = [
  { path: '/', component: ThePipelineGrid, props: { pipelines: gridPipelines } },
  { path: '/filtered/:nameExpression', component: FilteredPipelineGrid, props: { filteredPipelines: filteredGridPipelines } },
  { path: '/card/:pipelineName', component: PipelineCard, props: { cardlines: cardPipelines } }
];

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
const router = new VueRouter({
  routes // short for `routes: routes`
});

// Before each route, clear the ajaxSequencer in case we have a backlog of Ajax calls outstanding.
// We're switching routes, so we don't care about them anymore.
router.beforeEach((to, from, next) => {
  ajaxSequencer.clear();
  next();
});

// After each route, figure out what needs to be refreshed and how to go about doing it.
// For now, we re-fetch all pipelines when showing the grid, but we reload the entire page
// when showing an individual card.
router.afterEach((to, from) => {
  // Cancel any interval from the previous route.
  window.clearInterval(refreshId);

  // Show the loading indicator (even if just briefly).
  app.loading = true;

  let refreshFunc = window.location.reload;
  let refreshArgs = null;

  if (to.path === '/') {
    fetchAllPipelines();
    refreshFunc = fetchAllPipelines;
  } else if (to.path.match('^/filtered/')) {
    fetchFilteredPipelines(to.params.nameExpression);
    refreshFunc = fetchFilteredPipelines;
    refreshArgs = to.params.nameExpression;
  } else if (to.path.match('^/card/')) {
    fetchCardPipeline(to.params.pipelineName);
    refreshFunc = fetchCardPipeline;
    refreshArgs = to.params.pipelineName;
  }

  if (refreshInterval) {
    refreshId = window.setInterval(refreshFunc, refreshInterval, refreshArgs);
  }
});

function fetchCardPipeline(pipelineName) {
  // Show the loading indicator each time we refresh this card view.
  app.loading = true;
  pipelineService.getPipelineDetails(pipelineName)
    .done((pipeline) => app.cardlines.splice(0, app.cardlines.length, pipeline))
    .always(() => app.loading = false);
}

function replacePipelines(currentPipelines, names) {
  // Find all current app.pipeline elements that have names in the returned (names) array,
  // and use this list as the initial set of pipeline objects to display.
  // Filter out (undefined) elements. Happens when app.pipelines doesn't have an entry for (name). Initial condition.
  let pipelines = names.map((name) => currentPipelines[currentPipelines.findIndex((item) => item.name === name)])
.filter((item) => !!item);

  for (let i = 0; i < names.length; i++) {
    // Fetch each pipeline.
    pipelineService.getPipelineDetails(names[i]).done((pipeline) => {
      // We've got something to display, so stop the loading indicator. Doesn't matter if this is set to false many times.
      app.loading = false;

    // Find the index of the element in the array, that has this name.
    let pipelineIndex = pipelines.findIndex((item) => item.name === pipeline.name);

    if (pipelineIndex >= 0) {
      // If found, replace the found item with the newly returned pipeline details.
      pipelines[pipelineIndex] = pipeline
    } else {
      // Otherwise, push it. Either starting with an empty array, or a new pipeline has been added.
      pipelines.push(pipeline);
    }

    // Sort the pipelines each time new details arrive.
    pipelines = pipelines.sort(function(a, b) {
      // Useful for testing. Randomize the order every time.
      // return Math.random() - Math.random();
      return b.lastStatusChange - a.lastStatusChange;
    });

    // Replace the contents of app.pipelines with these new (sorted) pipelines.
    currentPipelines.splice(0, currentPipelines.length, ...pipelines);
  });
  }
}

function fetchAllPipelines() {
  // Navigating to the initial path. Fetch all pipeline data.
  pipelineService.getPipelines().done((names) => {
    replacePipelines(app.pipelines, names);
  });
}

function fetchFilteredPipelines(nameExpression) {
  // Fetch filtered pipeline data
  pipelineService.getPipelines().done((names) => {
    var regex = new RegExp(nameExpression);
    filteredNames = names.filter((name) => regex.test(name));
    replacePipelines(app.filteredPipelines, filteredNames);
  });
}

// Finally, create the Vue object.
app = new Vue({
  el: "#app",
  router: router,
  data: {
    pipelines: gridPipelines,
    filteredPipelines: filteredGridPipelines,
    cardlines: cardPipelines,
    loading: true
  },
  methods: {}
});
