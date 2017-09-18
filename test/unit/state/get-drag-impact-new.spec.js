// @flow
// eslint-disable-next-line no-duplicate-imports
import getDragImpact from '../../../src/state/get-drag-impact/';
import noImpact from '../../../src/state/no-impact';
import { add, patch, subtract } from '../../../src/state/position';
import { vertical, horizontal } from '../../../src/state/axis';
import {
  getPreset,
  updateDroppableScroll,
  disableDroppable,
} from '../../utils/dimension';
import type {
  Axis,
  DroppableId,
  DraggableDimension,
  DroppableDimension,
  DroppableDimensionMap,
  DragImpact,
  Position,
} from '../../../src/types';

describe('get drag impact', () => {
  [vertical, horizontal].forEach((axis: Axis) => {
    describe(`on ${axis.direction} axis`, () => {
      const {
        home,
        inHome1,
        inHome2,
        inHome3,
        inHome4,
        foreign,
        inForeign1,
        inForeign2,
        inForeign3,
        inForeign4,
        emptyForeign,
        droppables,
        draggables,
      } = getPreset(axis);

      it('should return no impact when not dragging over anything', () => {
        // dragging up above the list
        const farAway: Position = {
          x: 1000,
          y: 1000,
        };

        const impact: DragImpact = getDragImpact({
          pageCenter: farAway,
          draggable: inHome1,
          draggables,
          droppables,
        });

        expect(impact).toEqual(noImpact);
      });

      describe('moving over home list', () => {
        it('should return no impact when home is disabled', () => {
          const disabled: DroppableDimension = disableDroppable(home);
          const withDisabled: DroppableDimensionMap = {
            ...droppables,
            [disabled.id]: disabled,
          };
          // choosing the center of inHome2 which should have an impact
          const pageCenter: Position = inHome2.page.withoutMargin.center;

          const impact: DragImpact = getDragImpact({
            pageCenter,
            draggable: inHome1,
            draggables,
            droppables: withDisabled,
          });

          expect(impact).toEqual(noImpact);
        });

        // moving inHome1 no where
        describe('moving over original position', () => {
          it('should return no impact', () => {
            const pageCenter: Position = inHome1.page.withoutMargin.center;
            const expected: DragImpact = {
              movement: {
                amount: patch(axis.line, inHome1.page.withMargin[axis.size]),
                draggables: [],
                isBeyondStartPosition: false,
              },
              direction: axis.direction,
              destination: {
                droppableId: home.id,
                index: 0,
              },
            };

            const impact: DragImpact = getDragImpact({
              pageCenter,
              draggable: inHome1,
              draggables,
              droppables,
            });

            expect(impact).toEqual(expected);
          });
        });

        // moving inHome1 forward towards but not past inHome2
        describe('have not moved enough to impact others', () => {
          it('should return no impact', () => {
            const pageCenter: Position = patch(
              axis.line,
              // up to the line but not over it
              inHome2.page.withoutMargin[axis.start],
              // no movement on cross axis
              inHome1.page.withoutMargin.center[axis.crossLine],
            );
            const expected: DragImpact = {
              movement: {
                amount: patch(axis.line, inHome1.page.withMargin[axis.size]),
                draggables: [],
                isBeyondStartPosition: true,
              },
              direction: axis.direction,
              destination: {
                droppableId: home.id,
                index: 0,
              },
            };

            const impact: DragImpact = getDragImpact({
              pageCenter,
              draggable: inHome1,
              draggables,
              droppables,
            });

            expect(impact).toEqual(expected);
          });
        });

        // moving inHome2 forwards past inHome4
        describe('moving beyond start position', () => {
          const pageCenter: Position = patch(
            axis.line,
            inHome4.page.withoutMargin[axis.start] + 1,
            // no change
            inHome2.page.withoutMargin.center[axis.crossLine],
          );
          const expected: DragImpact = {
            movement: {
              amount: patch(axis.line, inHome2.page.withMargin[axis.size]),
              // ordered by closest to current location
              draggables: [inHome4.id, inHome3.id],
              isBeyondStartPosition: true,
            },
            direction: axis.direction,
            destination: {
              droppableId: home.id,
              // is now after inHome4
              index: 3,
            },
          };

          const impact: DragImpact = getDragImpact({
            pageCenter,
            draggable: inHome2,
            draggables,
            droppables,
          });

          expect(impact).toEqual(expected);
        });

        // moving inHome3 back past inHome1
        describe('moving back past start position', () => {
          it('should move into the correct position', () => {
            const pageCenter: Position = patch(
              axis.line,
              inHome1.page.withoutMargin[axis.end] - 1,
              // no change
              inHome3.page.withoutMargin.center[axis.crossLine],
            );

            const expected: DragImpact = {
              movement: {
                amount: patch(axis.line, inHome3.page.withMargin[axis.size]),
                // ordered by closest to current location
                draggables: [inHome1.id, inHome2.id],
                isBeyondStartPosition: false,
              },
              direction: axis.direction,
              destination: {
                droppableId: home.id,
                // is now before inHome1
                index: 0,
              },
            };

            const impact: DragImpact = getDragImpact({
              pageCenter,
              draggable: inHome3,
              draggables,
              droppables,
            });

            expect(impact).toEqual(expected);
          });
        });

        describe('home droppable scroll has changed during a drag', () => {
          // moving inHome1 past inHome2 by scrolling the dimension
          describe('moving beyond start position with own scroll', () => {
            it('should move past other draggables', () => {
              // the middle of the target edge
              const startOfInHome2: Position = patch(
                axis.line,
                inHome2.page.withoutMargin[axis.start],
                inHome2.page.withoutMargin.center[axis.crossLine],
              );
              const distanceNeeded: Position = add(
                subtract(startOfInHome2, inHome1.page.withoutMargin.center),
                // need to move over the edge
                patch(axis.line, 1),
              );
              const homeWithScroll: DroppableDimension = updateDroppableScroll(
                home, distanceNeeded
              );
              const updatedDroppables: DroppableDimensionMap = {
                ...droppables,
                [home.id]: homeWithScroll,
              };
              // no changes in current page center from original
              const pageCenter: Position = inHome1.page.withoutMargin.center;
              const expected: DragImpact = {
                movement: {
                  amount: patch(axis.line, inHome1.page.withMargin[axis.size]),
                  // ordered by closest to current location
                  draggables: [inHome2.id],
                  isBeyondStartPosition: true,
                },
                direction: axis.direction,
                destination: {
                  droppableId: home.id,
                  // is now after inHome2
                  index: 1,
                },
              };

              const impact: DragImpact = getDragImpact({
                pageCenter,
                draggable: inHome1,
                draggables,
                droppables: updatedDroppables,
              });

              expect(impact).toEqual(expected);
            });
          });

          // moving inHome4 back past inHome2
          describe('moving back past start position with own scroll', () => {
            it('should move back past inHome2', () => {
              // the middle of the target edge
              const endOfInHome2: Position = patch(
                axis.line,
                inHome2.page.withoutMargin[axis.end],
                inHome2.page.withoutMargin.center[axis.crossLine],
              );
              const distanceNeeded: Position = add(
                subtract(endOfInHome2, inHome4.page.withoutMargin.center),
                // need to move over the edge
                patch(axis.line, -1),
              );
              const homeWithScroll: DroppableDimension = updateDroppableScroll(
                home, distanceNeeded
              );
              const updatedDroppables: DroppableDimensionMap = {
                ...droppables,
                [home.id]: homeWithScroll,
              };
              // no changes in current page center from original
              const pageCenter: Position = inHome4.page.withoutMargin.center;
              const expected: DragImpact = {
                movement: {
                  amount: patch(axis.line, inHome4.page.withMargin[axis.size]),
                // ordered by closest to current location
                  draggables: [inHome2.id, inHome3.id],
                  isBeyondStartPosition: false,
                },
                direction: axis.direction,
                destination: {
                  droppableId: home.id,
                // is now before inHome2
                  index: 1,
                },
              };

              const impact: DragImpact = getDragImpact({
                pageCenter,
                draggable: inHome4,
                draggables,
                droppables: updatedDroppables,
              });

              expect(impact).toEqual(expected);
            });
          });
        });
      });

      describe('moving into foreign list', () => {
        it('should return no impact when list is disabled', () => {
          const disabled: DroppableDimension = disableDroppable(foreign);
          const withDisabled: DroppableDimensionMap = {
            ...droppables,
            [foreign.id]: disabled,
          };
          // choosing the center of inForeign1 which should have an impact
          const pageCenter: Position = inForeign1.page.withoutMargin.center;

          const impact: DragImpact = getDragImpact({
            pageCenter,
            draggable: inHome1,
            draggables,
            droppables: withDisabled,
          });

          expect(impact).toEqual(noImpact);
        });

        // moving inHome1 above inForeign1
        describe('moving into the start of a populated droppable', () => {
          it('should move everything in the foreign list forward', () => {
            const pageCenter: Position = patch(
              axis.line,
              inForeign1.page.withoutMargin[axis.start] + 1,
              inForeign1.page.withoutMargin.center[axis.crossLine],
            );
            const expected: DragImpact = {
              movement: {
                amount: patch(axis.line, inHome1.page.withMargin[axis.size]),
                // ordered by closest to current location
                draggables: [inForeign1.id, inForeign2.id, inForeign3.id, inForeign4.id],
                isBeyondStartPosition: false,
              },
              direction: axis.direction,
              destination: {
                // now in a different droppable
                droppableId: foreign.id,
                // is now before inForeign1
                index: 0,
              },
            };

            const impact: DragImpact = getDragImpact({
              pageCenter,
              draggable: inHome1,
              draggables,
              droppables,
            });

            expect(impact).toEqual(expected);
          });
        });

        // moving inHome1 just after the start of inForeign2
        describe('moving into the middle of a populated droppable', () => {
          it('should move everything after inHome2 forward', () => {
            const pageCenter: Position = patch(
              axis.line,
              inForeign2.page.withoutMargin[axis.start] + 1,
              inForeign2.page.withoutMargin.center[axis.crossLine],
            );
            const expected: DragImpact = {
              movement: {
                amount: patch(axis.line, inHome1.page.withMargin[axis.size]),
                // ordered by closest to current location
                draggables: [inForeign2.id, inForeign3.id, inForeign4.id],
                isBeyondStartPosition: false,
              },
              direction: axis.direction,
              destination: {
                // now in a different droppable
                droppableId: foreign.id,
                // is now after inForeign1
                index: 1,
              },
            };

            const impact: DragImpact = getDragImpact({
              pageCenter,
              draggable: inHome1,
              draggables,
              droppables,
            });

            expect(impact).toEqual(expected);
          });
        });

        // moving inHome1 after inForeign4
        describe('moving into the end of a populated dropppable', () => {
          it('should not displace anything', () => {
            const pageCenter: Position = patch(
              axis.line,
              inForeign4.page.withoutMargin[axis.end],
              inForeign4.page.withoutMargin.center[axis.crossLine],
            );
            const expected: DragImpact = {
              movement: {
                amount: patch(axis.line, inHome1.page.withMargin[axis.size]),
                // nothing is moved - moving to the end of the list
                draggables: [],
                isBeyondStartPosition: false,
              },
              direction: axis.direction,
              destination: {
                // now in a different droppable
                droppableId: foreign.id,
                // is now after inForeign1
                index: 4,
              },
            };

            const impact: DragImpact = getDragImpact({
              pageCenter,
              draggable: inHome1,
              draggables,
              droppables,
            });

            expect(impact).toEqual(expected);
          });
        });

        describe('moving to an empty droppable', () => {
          it('should not displace anything an move into the first position', () => {
            // over the center of the empty droppable
            const pageCenter: Position = emptyForeign.page.withoutMargin.center;
            const expected: DragImpact = {
              movement: {
                amount: patch(axis.line, inHome1.page.withMargin[axis.size]),
                draggables: [],
                isBeyondStartPosition: false,
              },
              direction: axis.direction,
              destination: {
                // now in a different droppable
                droppableId: emptyForeign.id,
                // first item in the empty list
                index: 0,
              },
            };

            const impact: DragImpact = getDragImpact({
              pageCenter,
              draggable: inHome1,
              draggables,
              droppables,
            });

            expect(impact).toEqual(expected);
          });
        });

        describe('home droppable is updated during a drag', () => {
          it('should impact the drag impact', () => {
            // Moving inHome1 just above inForeign2
            // Usually this would move inForeign2 and the ones after it forward.
            // However, the home has scrolled so that now it will go before inForeign3

            // Distance needed for impact to change
            const distanceNeeded: number = inForeign3.page.withoutMargin[axis.start] -
                inForeign2.page.withoutMargin[axis.start];
            const scroll: Position = patch(
              axis.line,
              distanceNeeded,
            );
            const withUpdatedScroll: DroppableDimension = updateDroppableScroll(foreign, scroll);
            const withUpdatedDimension: DroppableDimensionMap = {
              ...droppables,
              [foreign.id]: withUpdatedScroll,
            };
            // usually would be going before inForeign2
            const pageCenter: Position = patch(
              axis.line,
              inForeign2.page.withoutMargin[axis.start],
              inForeign2.page.withoutMargin.center[axis.crossLine],
            );
            // due to scroll expecting to be pulled up before inForeign1
            const expected: DragImpact = {
              movement: {
                amount: patch(axis.line, inHome1.page.withMargin[axis.size]),
                draggables: [inForeign3.id, inForeign4.id],
                isBeyondStartPosition: false,
              },
              direction: axis.direction,
              destination: {
                droppableId: foreign.id,
                index: 2,
              },
            };

            console.log('executing');
            const impact: DragImpact = getDragImpact({
              pageCenter,
              draggable: inHome1,
              draggables,
              droppables: withUpdatedDimension,
            });

            expect(impact).toEqual(expected);

            // Validation
            // without the scroll would have been in a different position

            const withoutScrollExpectation: DragImpact = {
              movement: {
                amount: patch(axis.line, inHome1.page.withMargin[axis.size]),
                draggables: [inForeign2.id, inForeign3.id, inForeign4.id],
                isBeyondStartPosition: false,
              },
              direction: axis.direction,
              destination: {
                droppableId: foreign.id,
                // first item in the empty list
                index: 1,
              },
            };

            const withoutScrollImpact: DragImpact = getDragImpact({
              pageCenter,
              draggable: inHome1,
              draggables,
              droppables,
            });

            expect(withoutScrollImpact).toEqual(withoutScrollExpectation);
          });
        });

        describe('destination droppable scroll is updated during a drag', () => {
          // moving inHome1 into the inForeign3
          // except for the foreign droppable scroll it would have gone into inForeign2

          // validating that without the scroll the drag would have had a different impact
        });
      });
    });
  });
});
