/**
 * AWS ECS Fargate task management via SDK v3.
 */
import {
  ECSClient,
  RunTaskCommand,
  DescribeTasksCommand,
  StopTaskCommand,
} from "@aws-sdk/client-ecs";
import {
  EC2Client,
  DescribeNetworkInterfacesCommand,
} from "@aws-sdk/client-ec2";

const ecs = new ECSClient();
const ec2 = new EC2Client();

const CLUSTER = process.env.ECS_CLUSTER || "treena-cloud";
const TASK_DEFINITION = process.env.ECS_TASK_DEFINITION || "treena-bridge-cloud";
const SUBNETS = (process.env.ECS_SUBNETS || "").split(",").filter(Boolean);
const SECURITY_GROUP = process.env.ECS_SECURITY_GROUP || "";
const CONTAINER_NAME = process.env.CONTAINER_NAME || "treena-bridge";

/**
 * Launch a Fargate task for a cloud session.
 * @returns {Promise<string>} taskArn
 */
export async function launchTask({ sessionId, bridgeToken, githubToken, repoUrl, branch, claudeOauthToken, codexApiKey, claimToken }) {
  if (!SUBNETS.length) {
    throw new Error(
      "ECS_SUBNETS is empty — Cloud API must have subnet IDs (see deploy-cloud.sh)"
    );
  }

  const env = [
    { name: "BRIDGE_TOKEN", value: bridgeToken || "" },
    { name: "WORKSPACE_DIR", value: "/workspace" },
    { name: "PORT", value: "3001" },
    { name: "ECS_CLUSTER", value: CLUSTER },
  ];

  // Phase 3B: bridge needs the session ID to name its auto-save branch
  // (treena/<date>-<sessionId>) on container exit.
  if (sessionId) {
    env.push({ name: "TREENA_SESSION_ID", value: sessionId });
  }

  // Phase 2 (warm pool): when present, bridge enters PRE_CLAIM mode and refuses
  // WS until POST /claim arrives with this same token.
  if (claimToken) {
    env.push({ name: "CLAIM_TOKEN", value: claimToken });
  }

  if (githubToken) {
    env.push({ name: "GITHUB_TOKEN", value: githubToken });
  }
  if (repoUrl) {
    env.push({ name: "GITHUB_REPO_URL", value: repoUrl });
  }
  // Phase 3C resume: if set, bridge clones with `--branch <branch>` so the
  // workspace is restored from the auto-save branch, not main.
  if (branch) {
    env.push({ name: "GITHUB_BRANCH", value: branch });
  }
  if (claudeOauthToken) {
    env.push({ name: "CLAUDE_CODE_OAUTH_TOKEN", value: claudeOauthToken });
  }
  if (codexApiKey) {
    env.push({ name: "OPENAI_API_KEY", value: codexApiKey });
  }

  const result = await ecs.send(
    new RunTaskCommand({
      cluster: CLUSTER,
      taskDefinition: TASK_DEFINITION,
      // Do not set launchType together with capacityProviderStrategy (AWS rejects it).
      capacityProviderStrategy: [
        { capacityProvider: "FARGATE_SPOT", weight: 1 },
      ],
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: SUBNETS,
          securityGroups: SECURITY_GROUP ? [SECURITY_GROUP] : [],
          assignPublicIp: "ENABLED",
        },
      },
      overrides: {
        containerOverrides: [
          {
            name: CONTAINER_NAME,
            environment: env,
          },
        ],
      },
      count: 1,
    })
  );

  const task = result.tasks?.[0];
  if (!task?.taskArn) {
    const failure = result.failures?.[0];
    throw new Error(
      `RunTask failed: ${failure?.reason || "unknown"} (${failure?.detail || ""})`
    );
  }

  return task.taskArn;
}

/**
 * Describe a task and extract its status + public IP if available.
 * @returns {Promise<{status: string, publicIp: string|null, stoppedReason: string|null}>}
 */
export async function describeTask(taskArn) {
  const result = await ecs.send(
    new DescribeTasksCommand({
      cluster: CLUSTER,
      tasks: [taskArn],
    })
  );

  const task = result.tasks?.[0];
  if (!task) {
    return { status: "UNKNOWN", publicIp: null, stoppedReason: null };
  }

  let publicIp = null;

  if (task.lastStatus === "RUNNING") {
    // Extract ENI to get the public IP
    const eniAttachment = task.attachments?.find(
      (a) => a.type === "ElasticNetworkInterface"
    );
    const eniId = eniAttachment?.details?.find(
      (d) => d.name === "networkInterfaceId"
    )?.value;

    if (eniId) {
      try {
        const eniResult = await ec2.send(
          new DescribeNetworkInterfacesCommand({
            NetworkInterfaceIds: [eniId],
          })
        );
        publicIp =
          eniResult.NetworkInterfaces?.[0]?.Association?.PublicIp || null;
      } catch {
        // ENI might not have a public IP yet
      }
    }
  }

  return {
    status: task.lastStatus || "UNKNOWN",
    publicIp,
    stoppedReason: task.stoppedReason || null,
  };
}

/**
 * Stop an ECS task.
 */
export async function stopTask(taskArn, reason = "user-requested") {
  await ecs.send(
    new StopTaskCommand({
      cluster: CLUSTER,
      task: taskArn,
      reason,
    })
  );
}
