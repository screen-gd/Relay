# Interactions and motion

Motion is fast and happens once, when something changes. Durations come from Quartz: `--dur-press` 60ms, `--dur-fast` 120ms, `--dur-base` 160ms, `--dur-slow` 180ms, all on `--ease-step`.

| Moment                                   | Motion                                                               |
| ---------------------------------------- | -------------------------------------------------------------------- |
| Hover on a row, nav item or ghost button | background and text color, 120ms                                     |
| Button press                             | scale to 0.98, 60ms                                                  |
| Menu, select list, popover               | fade and scale from the trigger (`animate-pop`), 160ms in, 120ms out |
| Dialog                                   | the same pop, 180ms; backdrop fades                                  |
| Sheet                                    | slides 16px from its edge with a fade, 180ms                         |
| Sidebar fold                             | width eases between 244px and 52px, 180ms                            |
| Sidebar group fold                       | height collapse, caret rotates                                       |
| Tab or view switch                       | the new panel rises 4px and fades in (`animate-rise`)                |
| Dashboard numbers                        | count up once, 400ms                                                 |

## Never

Pulse, ping, bounce, shimmer, glow or anything that loops. A running state is the small turning arc in a loading button or status. Reduced motion collapses every duration to zero.
