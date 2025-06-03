'use client';
import { useState, useEffect } from 'react';
import { PageControls } from '../shared/page-controls';
import { PageWrapper } from '../shared/page-wrapper';
import { SettingsCard } from '../shared/settings-card';
import { Select } from '../ui/select';
import { useUserData } from '@/context/userData';
import { IconButton } from '../ui/button';
import { Combobox } from '../ui/combobox';
import {
  SORT_CRITERIA,
  SORT_CRITERIA_DETAILS,
  SORT_DIRECTIONS,
} from '../../../../core/src/utils/constants';
import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  TouchSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDownAZ, ArrowUpAZ } from 'lucide-react';

export function SortingMenu() {
  return (
    <>
      <PageWrapper className="space-y-4 p-4 sm:p-8">
        <Content />
      </PageWrapper>
    </>
  );
}

function SortableItem({
  id,
  name,
  description,
  direction,
  onDirectionChange,
}: {
  id: string;
  name: string;
  description: string;
  direction: (typeof SORT_DIRECTIONS)[number];
  onDirectionChange: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="px-2.5 py-2 bg-[var(--background)] rounded-[--radius-md] border flex gap-3 relative">
        <div
          className="rounded-full w-6 h-auto bg-[--muted] md:bg-[--subtle] md:hover:bg-[--subtle-highlight] cursor-move"
          {...attributes}
          {...listeners}
        />
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <span className="font-mono text-base truncate">{name}</span>
          <span className="text-[--muted] text-sm truncate">{description}</span>
        </div>
        <IconButton
          size="sm"
          rounded
          icon={direction === 'asc' ? <ArrowUpAZ /> : <ArrowDownAZ />}
          intent="primary-subtle"
          onClick={onDirectionChange}
        />
      </div>
    </div>
  );
}

function Content() {
  const [currentSortType, setCurrentSortType] = useState('global');
  const { userData, setUserData } = useUserData();
  const [isDragging, setIsDragging] = useState(false);

  type SortCriteriaItem = {
    key: (typeof SORT_CRITERIA)[number];
    direction: (typeof SORT_DIRECTIONS)[number];
  };

  type SortCriteriaType = {
    global: SortCriteriaItem[];
    series: SortCriteriaItem[];
    movies: SortCriteriaItem[];
    cached: SortCriteriaItem[];
    uncached: SortCriteriaItem[];
  };

  // Initialize sortCriteria if it doesn't exist
  useEffect(() => {
    if (!userData.sortCriteria) {
      setUserData((prev) => ({
        ...prev,
        sortCriteria: {
          global: [],
          series: [],
          movies: [],
          cached: [],
          uncached: [],
          cachedMovies: [],
          uncachedMovies: [],
          cachedSeries: [],
          uncachedSeries: [],
        },
      }));
    }
  }, []);

  const currentSortCriteria = (userData.sortCriteria?.[
    currentSortType as keyof SortCriteriaType
  ] || []) as SortCriteriaItem[];

  const getSortCriteriaDetails = (key: (typeof SORT_CRITERIA)[number]) => {
    return SORT_CRITERIA_DETAILS[key];
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = currentSortCriteria.findIndex(
        (item) => `${item.key}-${item.direction}` === active.id
      );
      const newIndex = currentSortCriteria.findIndex(
        (item) => `${item.key}-${item.direction}` === over.id
      );

      const newSortCriteria = arrayMove(
        currentSortCriteria,
        oldIndex,
        newIndex
      );
      setUserData((prev) => ({
        ...prev,
        sortCriteria: {
          ...(prev.sortCriteria || {}),
          [currentSortType]: newSortCriteria,
        },
      }));
    }
    setIsDragging(false);
  }

  function handleDragStart() {
    setIsDragging(true);
  }

  useEffect(() => {
    function preventTouchMove(e: TouchEvent) {
      if (isDragging) {
        e.preventDefault();
      }
    }

    if (isDragging) {
      document.body.addEventListener('touchmove', preventTouchMove, {
        passive: false,
      });
    } else {
      document.body.removeEventListener('touchmove', preventTouchMove);
    }

    return () => {
      document.body.removeEventListener('touchmove', preventTouchMove);
    };
  }, [isDragging]);

  return (
    <>
      <div className="flex items-center w-full">
        <div>
          <h2>Sorting</h2>
          <p className="text-[--muted]">
            Configure how your content is sorted and organized.
          </p>
        </div>
        <div className="hidden lg:block lg:ml-auto">
          <PageControls />
        </div>
      </div>
      <div className="space-y-4">
        <SettingsCard>
          <Select
            label="Sort Order Type"
            options={[
              { label: 'Global', value: 'global' },
              { label: 'Series', value: 'series' },
              { label: 'Movies', value: 'movies' },
              { label: 'Cached', value: 'cached' },
              { label: 'Uncached', value: 'uncached' },
              { label: 'Cached Movies', value: 'cachedMovies' },
              { label: 'Uncached Movies', value: 'uncachedMovies' },
              { label: 'Cached Series', value: 'cachedSeries' },
              { label: 'Uncached Series', value: 'uncachedSeries' },
            ]}
            value={currentSortType}
            onValueChange={setCurrentSortType}
          />
          <Combobox
            label="Sort Criteria"
            multiple
            value={currentSortCriteria.map((item) => item.key)}
            emptyMessage="No sort criteria available"
            onValueChange={(value) => {
              const typedValue = value as (typeof SORT_CRITERIA)[number][];
              // Preserve existing directions for items that already exist
              const newCriteria: SortCriteriaItem[] = typedValue.map((key) => {
                const existingItem = currentSortCriteria.find(
                  (item) => item.key === key
                );
                return (
                  existingItem || {
                    key: key as (typeof SORT_CRITERIA)[number],
                    direction: getSortCriteriaDetails(key).defaultDirection,
                  }
                );
              });
              setUserData((prev) => ({
                ...prev,
                sortCriteria: {
                  ...(prev.sortCriteria || {}),
                  [currentSortType]: newCriteria,
                },
              }));
            }}
            options={SORT_CRITERIA.map((criteria) => ({
              label: getSortCriteriaDetails(criteria).name,
              textValue: getSortCriteriaDetails(criteria).name,
              value: criteria,
            }))}
          />
        </SettingsCard>

        {currentSortCriteria.length > 0 && (
          <SettingsCard
            title="Sort Order"
            description="Drag to reorder your sort criteria. Click the direction icon to toggle between ascending and descending."
          >
            <DndContext
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
              sensors={sensors}
            >
              <SortableContext
                items={currentSortCriteria.map(
                  (item) => `${item.key}-${item.direction}`
                )}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {currentSortCriteria.map((item) => (
                    <SortableItem
                      key={`${item.key}-${item.direction}`}
                      id={`${item.key}-${item.direction}`}
                      name={getSortCriteriaDetails(item.key).name}
                      description={
                        item.direction === 'asc'
                          ? `${getSortCriteriaDetails(item.key).description}, ${getSortCriteriaDetails(item.key).ascendingDescription}`
                          : `${getSortCriteriaDetails(item.key).description}, ${getSortCriteriaDetails(item.key).descendingDescription}`
                      }
                      direction={item.direction}
                      onDirectionChange={() => {
                        const newDirection =
                          item.direction === 'asc'
                            ? ('desc' as const)
                            : ('asc' as const);
                        setUserData((prev) => {
                          const prevCriteria =
                            prev.sortCriteria?.[
                              currentSortType as keyof SortCriteriaType
                            ] || [];
                          return {
                            ...prev,
                            sortCriteria: {
                              ...(prev.sortCriteria || {}),
                              [currentSortType]: prevCriteria.map(
                                (criteria: SortCriteriaItem) =>
                                  criteria.key === item.key
                                    ? { ...criteria, direction: newDirection }
                                    : criteria
                              ),
                            },
                          };
                        });
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </SettingsCard>
        )}
      </div>
    </>
  );
}
