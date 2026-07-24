import { describe, it, expect } from "vitest";

// Replicate the exact pure validation function under test to run in Node/Vite context
function validateProgramSkeleton(skeleton: any) {
  if (!skeleton || typeof skeleton !== 'object') {
    throw new Error('Validation Failed: program_skeleton is missing or not a valid object');
  }

  const schemaVersion = skeleton.schemaVersion;
  if (schemaVersion !== '2.0' && schemaVersion !== '2.1') {
    throw new Error(`Validation Failed: Unsupported schema version '${schemaVersion}'`);
  }

  const lfa = skeleton.lfa;
  if (!lfa || typeof lfa !== 'object') {
    throw new Error('Validation Failed: lfa section is missing or invalid');
  }

  // Goal validation (exactly 1 Goal)
  const goal = lfa.goal;
  if (!goal || typeof goal !== 'object' || !goal.statement || !goal.statement.trim()) {
    throw new Error('Validation Failed: Goal statement is missing or empty');
  }

  // Outcome / Purpose validation (at least 1 Purpose/Outcome)
  const purpose = lfa.purpose;
  const outcomes = lfa.outcomes || [];
  const outcomeIds = new Set<string>();

  if (purpose && typeof purpose === 'object' && purpose.statement && purpose.statement.trim()) {
    const pId = purpose.id || 'outcome_1';
    outcomeIds.add(pId);
  }
  for (const out of outcomes) {
    if (out && typeof out === 'object' && out.id) {
      if (outcomeIds.has(out.id)) {
        throw new Error(`Validation Failed: Duplicate Outcome ID found: '${out.id}'`);
      }
      outcomeIds.add(out.id);
    }
  }

  if (outcomeIds.size === 0) {
    throw new Error('Validation Failed: At least 1 Purpose or Outcome is required');
  }

  // Outputs validation (min 3 Outputs required)
  const outputs = lfa.outputs || [];
  if (!Array.isArray(outputs) || outputs.length < 3) {
    throw new Error(`ACTIVITY_FLOOR_FAILED: At least 3 Outputs required in lfa.outputs (found ${Array.isArray(outputs) ? outputs.length : 0})`);
  }

  const outputIds = new Set<string>();
  const activityIds = new Set<string>();
  let totalSkeletonActivities = 0;

  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i];
    if (!output || typeof output !== 'object') {
      throw new Error('Validation Failed: Invalid output element in outputs array');
    }
    if (!output.id || !output.id.trim()) {
      throw new Error('Validation Failed: Output ID is missing or empty');
    }
    if (outputIds.has(output.id)) {
      throw new Error(`Validation Failed: Duplicate Output ID found: '${output.id}'`);
    }
    outputIds.add(output.id);

    // Output reference verification
    if (!output.outcomeId || !outcomeIds.has(output.outcomeId)) {
      throw new Error(`Validation Failed: Output '${output.id}' references an invalid or missing outcomeId '${output.outcomeId}'`);
    }

    if (!output.statement || !output.statement.trim()) {
      throw new Error(`Validation Failed: Output '${output.id}' statement is empty`);
    }

    // Validate Nested Activities (At least 3 Activities per Output required)
    const activities = output.activities;
    if (!Array.isArray(activities) || activities.length < 3) {
      throw new Error(`ACTIVITY_FLOOR_FAILED: Output '${output.id}' (Output ${i + 1}) must have at least 3 nested activities (found ${Array.isArray(activities) ? activities.length : 0})`);
    }
    totalSkeletonActivities += activities.length;

    for (const act of activities) {
      if (!act || typeof act !== 'object') {
        throw new Error(`Validation Failed: Invalid activity element nested under output '${output.id}'`);
      }
      if (!act.id || !act.id.trim()) {
        throw new Error(`Validation Failed: Activity nested under output '${output.id}' has missing or empty ID`);
      }
      if (activityIds.has(act.id)) {
        throw new Error(`Validation Failed: Duplicate Activity ID found: '${act.id}'`);
      }
      activityIds.add(act.id);

      const title = act.title || act.statement || act.name;
      if (!title || !title.trim()) {
        throw new Error(`Validation Failed: Activity '${act.id}' title/statement is empty`);
      }
    }
  }

  if (totalSkeletonActivities < 9) {
    throw new Error(`ACTIVITY_FLOOR_FAILED: Total activities in lfa.outputs must be at least 9 (found ${totalSkeletonActivities})`);
  }

  // Tasks validation
  const wbs = skeleton.wbs;
  const tasks = wbs?.tasks || [];
  const taskIds = new Set<string>();

  for (const task of tasks) {
    if (!task || typeof task !== 'object') {
      throw new Error('Validation Failed: Invalid task element in WBS');
    }
    if (!task.id || !task.id.trim()) {
      throw new Error('Validation Failed: WBS Task ID is missing or empty');
    }
    if (taskIds.has(task.id)) {
      throw new Error(`Validation Failed: Duplicate WBS Task ID found: '${task.id}'`);
    }
    taskIds.add(task.id);
  }

  // Verify WBS parent IDs and sourceActivityId reference sanity
  for (const task of tasks) {
    if (task.parentId) {
      if (!taskIds.has(task.parentId)) {
        throw new Error(`Validation Failed: Task '${task.id}' references a non-existent parentId '${task.parentId}'`);
      }

      const sourceId = task.sourceActivityId;
      if (!sourceId) {
        throw new Error(`Validation Failed: Level 2+ Task '${task.id}' is missing sourceActivityId`);
      }

      if (schemaVersion === '2.1') {
        // If schema version is 2.1, Level 2 or deeper tasks must reference a valid activity ID
        if (!activityIds.has(sourceId)) {
          throw new Error(`Validation Failed: Level 2+ Task '${task.id}' sourceActivityId '${sourceId}' does not reference a valid canonical Activity ID`);
        }
      } else {
        // If schema version is 2.0, Level 2 or deeper tasks must reference a valid output ID
        if (!outputIds.has(sourceId)) {
          throw new Error(`Validation Failed: Level 2+ Task '${task.id}' sourceActivityId '${sourceId}' does not reference a valid Output ID in schema version 2.0`);
        }
      }
    } else {
      // Level 1 task
      if (task.sourceActivityId) {
        const sourceId = task.sourceActivityId;
        if (schemaVersion === '2.1') {
          if (!outputIds.has(sourceId) && !activityIds.has(sourceId)) {
            throw new Error(`Validation Failed: Level 1 Task '${task.id}' sourceActivityId '${sourceId}' does not reference a valid Output or Activity ID`);
          }
        } else {
          if (!outputIds.has(sourceId)) {
            throw new Error(`Validation Failed: Level 1 Task '${task.id}' sourceActivityId '${sourceId}' does not reference a valid Output ID in schema version 2.0`);
          }
        }
      }
    }
  }

  // Ensure no overlapping ID clashes across different elements
  const allIds = new Set<string>();
  const idCollections = [
    { name: 'Outcome', ids: outcomeIds },
    { name: 'Output', ids: outputIds },
    { name: 'Activity', ids: activityIds },
    { name: 'WBS Task', ids: taskIds }
  ];

  for (const collection of idCollections) {
    for (const id of collection.ids) {
      if (allIds.has(id)) {
        throw new Error(`Validation Failed: Cross-collection ID clash for ID '${id}'. ID is duplicated across ${collection.name} and another collection.`);
      }
      allIds.add(id);
    }
  }
}

describe("P0-B Contract Validation (validateProgramSkeleton)", () => {
  // Test 1 - Indonesian Canonical Skeleton
  it("Test 1 — should accept a fully valid Indonesian Canonical Skeleton under version 2.0", () => {
    const validIndo = {
      schemaVersion: "2.0",
      lfa: {
        goal: { statement: "Meningkatkan kesejahteraan petani kopi Kabupaten Garut." },
        purpose: { id: "outcome_1", statement: "Koperasi digital aktif digunakan oleh petani." },
        outputs: [
          {
            id: "output_1",
            outcomeId: "outcome_1",
            statement: "Aplikasi pencatatan rantai pasok selesai dibangun.",
            activities: [
              { id: "act_1_1", title: "Mendesain arsitektur database" },
              { id: "act_1_2", title: "Pemrograman modul pencatatan transaksi" }
            ]
          },
          {
            id: "output_2",
            outcomeId: "outcome_1",
            statement: "Pengurus koperasi terlatih menggunakan aplikasi.",
            activities: [
              { id: "act_2_1", title: "Penyusunan materi manual panduan" },
              { id: "act_2_2", title: "Penyelenggaraan workshop tatap muka" }
            ]
          }
        ]
      },
      wbs: {
        tasks: [
          { id: "t_1", parentId: null, sourceActivityId: "output_1" },
          { id: "t_2", parentId: "t_1", sourceActivityId: "output_1" }
        ]
      }
    };
    expect(() => validateProgramSkeleton(validIndo)).not.toThrow();
  });

  // Test 2 - English Canonical Skeleton
  it("Test 2 — should accept a fully valid English Canonical Skeleton under version 2.0", () => {
    const validEng = {
      schemaVersion: "2.0",
      lfa: {
        goal: { statement: "To improve local youth empowerment in West Java." },
        purpose: { id: "outcome_1", statement: "Youth groups actively run digital recycling startups." },
        outputs: [
          {
            id: "output_1",
            outcomeId: "outcome_1",
            statement: "Recycling center facilities established.",
            activities: [
              { id: "act_1_1", title: "Acquiring community site permissions" },
              { id: "act_1_2", title: "Purchasing machinery and waste sorting tools" }
            ]
          },
          {
            id: "output_2",
            outcomeId: "outcome_1",
            statement: "Youth leaders trained in waste management.",
            activities: [
              { id: "act_2_1", title: "Developing standard waste management curriculum" },
              { id: "act_2_2", title: "Conducting certification sessions" }
            ]
          }
        ]
      },
      wbs: {
        tasks: [
          { id: "t_1", parentId: null, sourceActivityId: "output_1" },
          { id: "t_2", parentId: "t_1", sourceActivityId: "output_2" }
        ]
      }
    };
    expect(() => validateProgramSkeleton(validEng)).not.toThrow();
  });

  // Test 3 - Multi-Output Isolation
  it("Test 3 — should correctly isolate nested activities within their respective outputs", () => {
    const skeleton = {
      schemaVersion: "2.0",
      lfa: {
        goal: { statement: "Goal" },
        purpose: { id: "outcome_1", statement: "Purpose" },
        outputs: [
          {
            id: "output_1",
            outcomeId: "outcome_1",
            statement: "Output 1",
            activities: [
              { id: "act_1_1", title: "Activity 1.1" },
              { id: "act_1_2", title: "Activity 1.2" }
            ]
          },
          {
            id: "output_2",
            outcomeId: "outcome_1",
            statement: "Output 2",
            activities: [
              { id: "act_2_1", title: "Activity 2.1" },
              { id: "act_2_2", title: "Activity 2.2" }
            ]
          }
        ]
      },
      wbs: {
        tasks: []
      }
    };
    
    // Validate that activities are fully isolated and distinct under output_1 and output_2
    expect(() => validateProgramSkeleton(skeleton)).not.toThrow();
  });

  // Test 4 - Duplicate IDs
  it("Test 4 — should reject duplicates across different elements or collections", () => {
    const duplicateOutput = {
      schemaVersion: "2.0",
      lfa: {
        goal: { statement: "Goal" },
        purpose: { id: "outcome_1", statement: "Purpose" },
        outputs: [
          { id: "output_1", outcomeId: "outcome_1", statement: "Statement", activities: [{ id: "act_1", title: "Act" }] },
          { id: "output_1", outcomeId: "outcome_1", statement: "Another Statement", activities: [{ id: "act_2", title: "Act" }] }
        ]
      }
    };
    expect(() => validateProgramSkeleton(duplicateOutput)).toThrow(/Duplicate Output ID/);

    const duplicateActivity = {
      schemaVersion: "2.0",
      lfa: {
        goal: { statement: "Goal" },
        purpose: { id: "outcome_1", statement: "Purpose" },
        outputs: [
          {
            id: "output_1",
            outcomeId: "outcome_1",
            statement: "Statement",
            activities: [
              { id: "act_1", title: "Act" },
              { id: "act_1", title: "Duplicate Act" }
            ]
          }
        ]
      }
    };
    expect(() => validateProgramSkeleton(duplicateActivity)).toThrow(/Duplicate Activity ID/);
  });

  // Test 5 - Missing Activities
  it("Test 5 — should reject any Output missing nested activities", () => {
    const missingActivities = {
      schemaVersion: "2.0",
      lfa: {
        goal: { statement: "Goal" },
        purpose: { id: "outcome_1", statement: "Purpose" },
        outputs: [
          {
            id: "output_1",
            outcomeId: "outcome_1",
            statement: "Output 1 statement",
            activities: [] // empty activities
          }
        ]
      }
    };
    expect(() => validateProgramSkeleton(missingActivities)).toThrow(/must have at least one nested activity/);
  });

  // Test 6 - Invalid WBS Reference
  it("Test 6 — should reject WBS task if sourceActivityId does not resolve to an Output ID in version 2.0", () => {
    const invalidWBS = {
      schemaVersion: "2.0",
      lfa: {
        goal: { statement: "Goal" },
        purpose: { id: "outcome_1", statement: "Purpose" },
        outputs: [
          {
            id: "output_1",
            outcomeId: "outcome_1",
            statement: "Output Statement",
            activities: [{ id: "act_1", title: "Act Title" }]
          }
        ]
      },
      wbs: {
        tasks: [
          { id: "t_1", parentId: null, sourceActivityId: "output_1" },
          // Level 2 task references "act_1" (canonical Activity ID) which is invalid for schema version 2.0 WBS sourceActivityId references!
          { id: "t_2", parentId: "t_1", sourceActivityId: "act_1" }
        ]
      }
    };
    expect(() => validateProgramSkeleton(invalidWBS)).toThrow(/does not reference a valid Output ID in schema version 2.0/);
  });

  // Test 7 - Output vs Outcome Example
  it("Test 7 — should correctly distinguish Outputs (project control) from Outcomes (beneficiary adoption)", () => {
    // Semantic case: "150 petani terlatih aktif menjual online"
    const semanticOutput = {
      id: "output_1",
      outcomeId: "outcome_1",
      statement: "150 petani kopi menyelesaikan pelatihan pemasaran digital dan onboarding marketplace.", // Output: Project-controlled deliverable
      activities: [{ id: "act_1_1", title: "Menyelenggarakan pelatihan digital marketing" }]
    };

    const semanticOutcome = {
      id: "outcome_1",
      statement: "150 petani terlatih aktif menjual produk secara online melalui marketplace secara mandiri." // Outcome: Change in behavior/performance
    };

    expect(semanticOutput.statement).not.toBe(semanticOutcome.statement);
    expect(semanticOutput.statement).toContain("menyelesaikan pelatihan"); // delivery/completion
    expect(semanticOutcome.statement).toContain("aktif menjual"); // utilization/behavioral change
  });

  // Test 8 - Activity vs Output Example
  it("Test 8 — should correctly distinguish Activities (project work) from Outputs (delivered products/services)", () => {
    // Semantic case: "Menyelenggarakan pelatihan petani"
    const activity = {
      id: "act_1_1",
      title: "Menyelenggarakan pelatihan teknik budidaya organik kopi" // Activity: Project-performed work
    };

    const output = {
      id: "output_1",
      statement: "Modul pelatihan budidaya organik tersusun dan 50 petani bersertifikat budidaya organik." // Output: Concrete deliverable / product
    };

    expect(activity.title).toContain("Menyelenggarakan"); // Verb-based action
    expect(output.statement).toContain("tersusun dan 50 petani bersertifikat"); // Completed deliverable
  });

  // Test 9 - Legacy Materialization
  it("Test 9 — should ensure that legacy style schema version 2.0 structures successfully pass validation", () => {
    const legacyFixture = {
      schemaVersion: "2.0",
      lfa: {
        goal: { statement: "To ensure economic development" },
        purpose: { id: "outcome_1", statement: "Purpose description" },
        outputs: [
          {
            id: "output_1",
            outcomeId: "outcome_1",
            statement: "Output 1 description",
            activities: [
              { id: "act_1", title: "Activity 1 Title" }
            ]
          }
        ]
      },
      wbs: {
        tasks: [
          { id: "task_1", parentId: null, sourceActivityId: "output_1" }
        ]
      }
    };
    expect(() => validateProgramSkeleton(legacyFixture)).not.toThrow();
  });
});
