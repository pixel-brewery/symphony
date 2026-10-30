# Employee activity and visual gestures

The actual state and work remain visible as text and actions. The atlas state is
only a pose; it cannot change a CLI process, work phase, assignment or result.

| Actual evidence                                             | Atlas pose                       | Playback / action                                                               |
| ----------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| Idle                                                        | `idle` / sixteen look directions | Quiet breathing; look towards pointer                                           |
| Queued                                                      | `waiting`                        | Patient loop; show queued ticket                                                |
| Working: analysis, diagnosis, review, verification or tests | `review`                         | Inspection loop; open actual work                                               |
| Working: implementation, solution or repair                 | `running`                        | Focused active processing, no foot-running                                      |
| Needs input                                                 | `waiting`                        | Asking loop; existing answer/review action                                      |
| Paused                                                      | `idle`                           | Static; show pause cause and resume action                                      |
| Blocked                                                     | `failed`                         | Static; show blocker and next possible action                                   |
| Failed                                                      | `failed`                         | Static; show actual error and retry/recovery action                             |
| Completed                                                   | `jumping`                        | Three finite cycles, then calm idle with gaze/greeting; result text remains     |
| Stale / connection lost                                     | `idle`                           | Static; label last known data                                                   |
| Pointer enters an idle employee                             | `waving`                         | Three finite cycles, then return to idle / gaze                                 |
| Directional gesture artwork                                 | `running-left` / `running-right` | Reserved poses; employee free placement is not exposed in the current landscape |

Multiple assignments are resolved from the existing provider-neutral activity
projection. Choose the role of a currently working assignment, never a queued or
historical role. New custom workflow roles use generic work unless their declared
role supplies real review evidence. Mobile receives the same bounded active role.

An atlas has nine distinct states plus sixteen looks. Additional domain statuses
reuse the closest honest pose with their own text; new states do not imply inventing
new atlas rows. Do not label employees “pets” or add unimplemented free conversation.

A custom single PNG retains the simple CSS work/completion treatment and a finite
greeting tilt. It has no generated pose sequence or sixteen-direction gaze until
its own atlas is created and integrated through this workflow.
