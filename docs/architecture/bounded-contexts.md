# Bounded contexts

| Context       | Responsibility                                       | Excludes                        |
| ------------- | ---------------------------------------------------- | ------------------------------- |
| Work tracking | normalized items and provider transitions            | GitHub-specific GraphQL shapes  |
| Workflow      | stages, allowed transitions, success/failure routing | UI column layout                |
| Skills        | manifests, capabilities, provenance, precedence      | embedded instruction bodies     |
| Execution     | coordination, events, terminal classification        | provider implementation details |
| Workspace     | isolated path lifecycle and preservation policy      | target business logic           |
| Agent runtime | structured analysis invocation and progress          | Codex-specific event shapes     |
| Persistence   | durable execution/event records                      | orchestration decisions         |
| Desktop       | process lifecycle, IPC, OS paths                     | application use cases           |
| Renderer      | presentation and user intent                         | Node, Git, SQLite, credentials  |

Dependencies point inward: infrastructure implements application ports, and application policy depends on the domain. Cross-context communication uses typed values rather than shared mutable state.
