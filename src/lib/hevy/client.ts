import { getRuntimeConfig } from "@/lib/config";
import {
  HevyExerciseTemplate,
  HevyRoutine,
  HevyRoutinePayload,
  HevyWorkout,
  HevyWorkoutEvent,
} from "./types";

const HEVY_BASE_URL = "https://api.hevyapp.com";

export class HevyClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getRuntimeConfig().hevyApiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error(
        "Missing Hevy API Key. Please add HEVY_API_KEY in Settings or .env.local."
      );
    }

    const url = `${HEVY_BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `Hevy API error (${res.status} ${res.statusText}) on ${endpoint}: ${errText}`
      );
    }

    return res.json() as Promise<T>;
  }

  async getWorkoutsCount(): Promise<number> {
    const data = await this.request<{ workout_count: number }>(
      "/v1/workouts/count"
    );
    return data.workout_count ?? 0;
  }

  async getWorkoutsPage(
    page = 1,
    pageSize = 10
  ): Promise<{ page: number; page_count: number; workouts: HevyWorkout[] }> {
    return this.request(
      `/v1/workouts?page=${page}&pageSize=${Math.min(pageSize, 10)}`
    );
  }

  async getAllWorkouts(maxPages = 15): Promise<HevyWorkout[]> {
    const workouts: HevyWorkout[] = [];
    let page = 1;
    let pageCount = 1;

    while (page <= pageCount && page <= maxPages) {
      const res = await this.getWorkoutsPage(page, 10);
      workouts.push(...(res.workouts || []));
      pageCount = res.page_count || 1;
      page++;
    }

    return workouts;
  }

  async getWorkoutEvents(
    sinceIso: string,
    page = 1,
    pageSize = 10
  ): Promise<{
    page: number;
    page_count: number;
    events: HevyWorkoutEvent[];
  }> {
    const encodedSince = encodeURIComponent(sinceIso);
    return this.request(
      `/v1/workouts/events?page=${page}&pageSize=${Math.min(
        pageSize,
        10
      )}&since=${encodedSince}`
    );
  }

  async getRoutinesPage(
    page = 1,
    pageSize = 10
  ): Promise<{ page: number; page_count: number; routines: HevyRoutine[] }> {
    return this.request(
      `/v1/routines?page=${page}&pageSize=${Math.min(pageSize, 10)}`
    );
  }

  async getAllRoutines(maxPages = 10): Promise<HevyRoutine[]> {
    const routines: HevyRoutine[] = [];
    let page = 1;
    let pageCount = 1;

    while (page <= pageCount && page <= maxPages) {
      const res = await this.getRoutinesPage(page, 10);
      routines.push(...(res.routines || []));
      pageCount = res.page_count || 1;
      page++;
    }

    return routines;
  }

  async getExerciseTemplatesPage(
    page = 1,
    pageSize = 100
  ): Promise<{
    page: number;
    page_count: number;
    exercise_templates: HevyExerciseTemplate[];
  }> {
    return this.request(
      `/v1/exercise_templates?page=${page}&pageSize=${Math.min(pageSize, 100)}`
    );
  }

  async getAllExerciseTemplates(
    maxPages = 10
  ): Promise<HevyExerciseTemplate[]> {
    const templates: HevyExerciseTemplate[] = [];
    let page = 1;
    let pageCount = 1;

    while (page <= pageCount && page <= maxPages) {
      const res = await this.getExerciseTemplatesPage(page, 100);
      templates.push(...(res.exercise_templates || []));
      pageCount = res.page_count || 1;
      page++;
    }

    return templates;
  }

  async createRoutine(
    payload: HevyRoutinePayload
  ): Promise<{ routine: HevyRoutine[] | HevyRoutine }> {
    return this.request("/v1/routines", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateRoutine(
    routineId: string,
    payload: HevyRoutinePayload
  ): Promise<{ routine: HevyRoutine[] | HevyRoutine }> {
    // Note: PUT /v1/routines/{routineId} does not accept folder_id
    const { folder_id: _ignored, ...routineWithoutFolder } = payload.routine;
    return this.request(`/v1/routines/${routineId}`, {
      method: "PUT",
      body: JSON.stringify({ routine: routineWithoutFolder }),
    });
  }
}
