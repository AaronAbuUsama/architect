// Every story module, in the order the Components view lists them. Storybook finds the same files by its glob
// (`.storybook/main.ts`); this list is for the story browser inside the Design artifact.
import * as CardDetail from "../components/CardDetail/CardDetail.stories.tsx";
import * as ChangedList from "../components/ChangedList/ChangedList.stories.tsx";
import * as ClimbChart from "../components/ClimbChart/ClimbChart.stories.tsx";
import * as ColumnHeader from "../components/ColumnHeader/ColumnHeader.stories.tsx";
import * as CoverageMatrix from "../components/CoverageMatrix/CoverageMatrix.stories.tsx";
import * as GoalOverview from "../components/GoalOverview/GoalOverview.stories.tsx";
import * as GoalScore from "../components/GoalScore/GoalScore.stories.tsx";
import * as Lane from "../components/Lane/Lane.stories.tsx";
import * as LaneEndState from "../components/LaneEndState/LaneEndState.stories.tsx";
import * as Activity from "../components/Activity/Activity.stories.tsx";
import * as FalloutDiagram from "../components/FalloutDiagram/FalloutDiagram.stories.tsx";
import * as StoryReplay from "../components/StoryReplay/StoryReplay.stories.tsx";
import * as EvalPage from "../components/CardDetail/EvalPage.stories.tsx";
import * as PageNotes from "../components/PageNotes/PageNotes.stories.tsx";
import * as OutputCard from "../components/OutputCard/OutputCard.stories.tsx";

export const modules = [OutputCard, ColumnHeader, Lane, LaneEndState, CardDetail, CoverageMatrix, ClimbChart, ChangedList, GoalScore, GoalOverview, FalloutDiagram, StoryReplay, EvalPage, Activity, PageNotes];
