import {
	CreateScheduledTaskParams,
	RuntimeGenerator,
	ScheduledTask,
	Scheduler,
	SchedulerCommands,
	SchedulerGenerator,
	SchedulerYields,
} from './runtime-types';

class TimerScheduler implements Scheduler {
	private ticks: number;
	constructor(private task: ScheduledTask) {
		this.ticks = task.ticks;
		if (this.ticks === 0) {
			this.ticks = 1;
		}
	}

	*tick(): SchedulerGenerator {
		for (let tick = 1; tick <= this.ticks; tick++) {
			yield { command: SchedulerCommands.NO_OP };
		}
		yield {
			command: SchedulerCommands.SPAWN,
			generatorRecipe: this.task.generatorRecipe,
			flowName: this.task.name,
		};
	}
}

class IntervalScheduler implements Scheduler {
	private ticks: number;
	constructor(private task: ScheduledTask) {
		this.ticks = task.ticks;
		if (this.ticks === 0) {
			this.ticks = 1;
		}
	}

	*tick(): SchedulerGenerator {
		let spawnCount = 0;
		for (let tick = 1; tick <= Infinity; tick++) {
			if (tick % this.ticks === 0) {
				spawnCount++;
				yield {
					command: SchedulerCommands.SPAWN,
					generatorRecipe: this.task.generatorRecipe,
					flowName: `${this.task.name} #${spawnCount}`,
				};
				continue;
			}
			yield { command: SchedulerCommands.NO_OP };
		}
	}
}

export class ScheduledTaskManager {
	private sequenceNumber = 0;
	private completedTasks: ScheduledTask[] = [];
	private taskSchedulerMap = new Map<
		string,
		{ schedulerGenerator: SchedulerGenerator; task: ScheduledTask }
	>();

	createScheduledTask(params: CreateScheduledTaskParams) {
		const id = (++this.sequenceNumber).toString();
		const task: ScheduledTask = {
			id,
			...params,
		};
		const scheduler =
			task.type === 'timer' ? new TimerScheduler(task) : new IntervalScheduler(task);
		const schedulerGenerator = scheduler.tick();
		this.taskSchedulerMap.set(id, { schedulerGenerator, task });

		return task;
	}

	deleteTask(id: string) {
		const value = this.taskSchedulerMap.get(id);
		if (!value) {
			throw new Error(`Can't delete task. Task not found: ${id}`);
		}
		this.completedTasks.push(value.task);
		this.taskSchedulerMap.delete(id);
	}

	getActive() {
		return Array.from(this.taskSchedulerMap, ([_, value]) => value);
	}

	list() {
		return {
			active: this.getActive().map((value) => value.task),
			completed: this.completedTasks,
		};
	}
}
