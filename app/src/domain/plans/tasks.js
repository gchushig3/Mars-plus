// AI-assisted (Claude). Reviewed by the MARS+ team.
// Mission plans and the walking legs each plan needs: Landing -> (observation) -> (sampling) -> Landing.

/** @returns {{id:string,tasks:string[],scienceValue:number}[]} */
export function planCatalog(params) {
  return params.plans;
}

export function taskMinutes(params, task) {
  return params.tasks[task].minutes;
}

export function stopOfTask(params, task) {
  return params.tasks[task].stop;
}

/** Ordered leg ids for a plan, matching the official route ids (e.g. "landing_observation"). */
export function legsOfPlan(params, plan) {
  const stops = plan.tasks.map((t) => stopOfTask(params, t));
  const seq = ['landing', ...stops, 'landing'];
  const legs = [];
  for (let i = 1; i < seq.length; i++) legs.push(`${seq[i - 1]}_${seq[i]}`);
  return legs;
}
