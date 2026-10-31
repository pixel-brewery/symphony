export // Workflows opt into managed local CI by declaring this workflow_dispatch input and
// requesting the Symphony runner labels when it is true; "Run locally" sends it as true.
const LOCAL_CI_DISPATCH_INPUT = 'symphony_local';
