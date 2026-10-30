#!/usr/bin/env bash
set -euo pipefail


# ─────────────────────────────────────────────────────────────
# Treena Cloud — Full AWS Deployment Script
#
# Usage:  bash deploy-cloud.sh
# Env:    AWS_REGION (default: us-east-1)
#
# Idempotent — safe to re-run. Skips resources that already exist.
# ─────────────────────────────────────────────────────────────

REGION="${AWS_REGION:-us-east-1}"
CLUSTER="treena-cloud"
BRIDGE_REPO="treena-bridge-cloud"
API_REPO="treena-cloud-api"
BRIDGE_TASK_FAMILY="treena-bridge-cloud"
API_TASK_FAMILY="treena-cloud-api"
API_SERVICE_NAME="treena-cloud-api"
CONTAINER_NAME="treena-bridge"
LOG_GROUP="/ecs/treena-bridge-cloud"
BRIDGE_SG_NAME="treena-bridge-sg"
API_SG_NAME="treena-cloud-api-sg"
EXEC_ROLE="treena-bridge-execution-role"
TASK_ROLE="treena-bridge-task-role"
API_ROLE="treena-cloud-api-role"
DYNAMO_TABLE="treena-user-tokens"
DYNAMO_MACHINES_TABLE="treena-user-machines"
DYNAMO_REPOS_TABLE="treena-user-repos"

# Find project root (script lives at server/cloud/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$SERVER_DIR")"

log()  { echo -e "\n\033[1;32m[treena]\033[0m $*" >&2; }
warn() { echo -e "\n\033[1;33m[treena]\033[0m $*" >&2; }
err()  { echo -e "\n\033[1;31m[treena]\033[0m $*" >&2; exit 1; }

# ── Step 0: Prerequisites ──────────────────────────────────

log "Checking prerequisites..."

# On Windows/Git Bash, add common install paths
export PATH="$PATH:/c/Program Files/Amazon/AWSCLIV2:/c/Program Files/Docker/Docker/resources/bin"

# Resolve actual aws binary path (before defining wrapper that shadows the name)
AWS_BIN=$(command -v aws.exe 2>/dev/null || command -v aws 2>/dev/null || true)
[ -z "$AWS_BIN" ] && err "AWS CLI not found. Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"

# Check for docker or docker.exe
(command -v docker >/dev/null 2>&1 || command -v docker.exe >/dev/null 2>&1) \
  || err "Docker not found. Install Docker Desktop first."

# Wrap aws CLI to prevent Git Bash MSYS path mangling (e.g. /ecs/... → C:/Program Files/Git/ecs/...)
# Pipe through tr to strip Windows \r (CRLF) from aws.exe output; pipefail preserves exit code
aws() { MSYS_NO_PATHCONV=1 "$AWS_BIN" "$@" | tr -d '\r'; }

AWS_ERR=$(mktemp)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "$REGION" 2>"$AWS_ERR") \
  || { cat "$AWS_ERR" >&2; rm -f "$AWS_ERR"; err "AWS CLI not configured. Run: aws configure"; }
rm -f "$AWS_ERR"

log "Account: $ACCOUNT_ID | Region: $REGION"

ECR_BASE="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
ECS_TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

# ── Step 1: ECR Repositories ───────────────────────────────

create_ecr_repo() {
  local name=$1
  if aws ecr describe-repositories --repository-names "$name" --region "$REGION" >/dev/null 2>&1; then
    log "ECR repo '$name' already exists"
  else
    aws ecr create-repository --repository-name "$name" --region "$REGION" --output text >/dev/null
    log "Created ECR repo '$name'"
  fi
}

create_ecr_repo "$BRIDGE_REPO"
create_ecr_repo "$API_REPO"

# ── Step 2: ECS Cluster ────────────────────────────────────

if aws ecs describe-clusters --clusters "$CLUSTER" --region "$REGION" --query 'clusters[?status==`ACTIVE`].clusterName' --output text 2>/dev/null | grep -q "$CLUSTER"; then
  log "ECS cluster '$CLUSTER' already exists"
else
  aws ecs create-cluster --cluster-name "$CLUSTER" --region "$REGION" \
    --capacity-providers FARGATE FARGATE_SPOT \
    --default-capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=1 \
    --output text >/dev/null
  log "Created ECS cluster '$CLUSTER'"
fi

# ── Step 3: IAM Roles ──────────────────────────────────────

create_role() {
  local name=$1
  if aws iam get-role --role-name "$name" >/dev/null 2>&1; then
    log "IAM role '$name' already exists"
  else
    aws iam create-role --role-name "$name" \
      --assume-role-policy-document "$ECS_TRUST" --output text >/dev/null
    log "Created IAM role '$name'"
  fi
}

create_role "$EXEC_ROLE"
create_role "$TASK_ROLE"
create_role "$API_ROLE"

# Attach execution policy
aws iam attach-role-policy --role-name "$EXEC_ROLE" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true

# Task role: self-destroy
aws iam put-role-policy --role-name "$TASK_ROLE" --policy-name SelfDestroy \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [\"ecs:StopTask\", \"ecs:DescribeTasks\"],
      \"Resource\": \"*\",
      \"Condition\": {
        \"ArnEquals\": {
          \"ecs:cluster\": \"arn:aws:ecs:${REGION}:${ACCOUNT_ID}:cluster/${CLUSTER}\"
        }
      }
    }]
  }"
log "Configured task role policies"

# API role: manage tasks
aws iam put-role-policy --role-name "$API_ROLE" --policy-name ManageTasks \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [\"ecs:RunTask\", \"ecs:StopTask\", \"ecs:DescribeTasks\"],
        \"Resource\": \"*\"
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": \"ec2:DescribeNetworkInterfaces\",
        \"Resource\": \"*\"
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": \"iam:PassRole\",
        \"Resource\": [
          \"arn:aws:iam::${ACCOUNT_ID}:role/${EXEC_ROLE}\",
          \"arn:aws:iam::${ACCOUNT_ID}:role/${TASK_ROLE}\"
        ]
      }
    ]
  }"
log "Configured API role policies"

# ── Step 3b: DynamoDB Tables ───────────────────────────────

ensure_ddb_table() {
  local name=$1
  shift
  if aws dynamodb describe-table --table-name "$name" --region "$REGION" >/dev/null 2>&1; then
    log "DynamoDB table '$name' already exists"
  else
    aws dynamodb create-table --table-name "$name" --region "$REGION" \
      "$@" \
      --billing-mode PAY_PER_REQUEST \
      --output text >/dev/null
    log "Created DynamoDB table '$name' (pay-per-request)"
  fi
}

ensure_ddb_table "$DYNAMO_TABLE" \
  --attribute-definitions AttributeName=githubUserId,AttributeType=N \
  --key-schema AttributeName=githubUserId,KeyType=HASH

ensure_ddb_table "$DYNAMO_MACHINES_TABLE" \
  --attribute-definitions AttributeName=githubUserId,AttributeType=N \
  --key-schema AttributeName=githubUserId,KeyType=HASH

ensure_ddb_table "$DYNAMO_REPOS_TABLE" \
  --attribute-definitions AttributeName=githubUserId,AttributeType=N AttributeName=repoUrl,AttributeType=S \
  --key-schema AttributeName=githubUserId,KeyType=HASH AttributeName=repoUrl,KeyType=RANGE

# API role: DynamoDB access for tokens, machines, and repos
# (Policy name unchanged — put-role-policy replaces in place, no orphaned policies)
aws iam put-role-policy --role-name "$API_ROLE" --policy-name DynamoDbTokens \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [
        \"dynamodb:GetItem\",
        \"dynamodb:PutItem\",
        \"dynamodb:UpdateItem\",
        \"dynamodb:Query\"
      ],
      \"Resource\": [
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${DYNAMO_TABLE}\",
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${DYNAMO_MACHINES_TABLE}\",
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${DYNAMO_REPOS_TABLE}\"
      ]
    }]
  }"
log "Configured DynamoDB access for API role"

# ── Step 4: Networking ──────────────────────────────────────

VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text --region "$REGION")
[ "$VPC_ID" = "None" ] && err "No default VPC found in $REGION. Create one first."
log "Default VPC: $VPC_ID"

create_sg() {
  local name=$1 desc=$2 port=$3
  local sg_id
  sg_id=$(aws ec2 describe-security-groups --filters Name=group-name,Values="$name" Name=vpc-id,Values="$VPC_ID" \
    --query 'SecurityGroups[0].GroupId' --output text --region "$REGION" 2>/dev/null)
  if [ "$sg_id" != "None" ] && [ -n "$sg_id" ]; then
    log "Security group '$name' already exists: $sg_id"
    echo "$sg_id"
    return
  fi
  sg_id=$(aws ec2 create-security-group --group-name "$name" --description "$desc" \
    --vpc-id "$VPC_ID" --query 'GroupId' --output text --region "$REGION")
  aws ec2 authorize-security-group-ingress --group-id "$sg_id" \
    --protocol tcp --port "$port" --cidr 0.0.0.0/0 --region "$REGION" >/dev/null
  log "Created security group '$name': $sg_id (port $port)"
  echo "$sg_id"
}

ensure_sg_ingress_port() {
  local sg_id=$1 port=$2
  aws ec2 authorize-security-group-ingress --group-id "$sg_id" \
    --protocol tcp --port "$port" --cidr 0.0.0.0/0 --region "$REGION" \
    >/dev/null 2>&1 || true
}

BRIDGE_SG_ID=$(create_sg "$BRIDGE_SG_NAME" "Treena bridge WS port 3001" 3001)
API_SG_ID=$(create_sg "$API_SG_NAME" "Treena Cloud API port 8080" 8080)

# Ensure bridge SG allows browser preview ports in cloud sessions
for port in 3001 3000 5173 8080; do
  ensure_sg_ingress_port "$BRIDGE_SG_ID" "$port"
done

SUBNETS=$(aws ec2 describe-subnets \
  --filters Name=vpc-id,Values="$VPC_ID" Name=map-public-ip-on-launch,Values=true \
  --query 'Subnets[*].SubnetId' --output text --region "$REGION" | tr '\t' ',')
[ -z "$SUBNETS" ] && err "No public subnets found in VPC $VPC_ID"
log "Public subnets: $SUBNETS"

# ── Step 5: CloudWatch ──────────────────────────────────────

if aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" --region "$REGION" \
  --query 'logGroups[?logGroupName==`'"$LOG_GROUP"'`].logGroupName' --output text 2>/dev/null | grep -q "$LOG_GROUP"; then
  log "Log group '$LOG_GROUP' already exists"
else
  aws logs create-log-group --log-group-name "$LOG_GROUP" --region "$REGION"
  aws logs put-retention-policy --log-group-name "$LOG_GROUP" --retention-in-days 7 --region "$REGION"
  log "Created log group '$LOG_GROUP' (7-day retention)"
fi

# ── Step 6: Register Bridge Task Definition ─────────────────

log "Registering bridge task definition..."
BRIDGE_TD_JSON=$(cat "$SCRIPT_DIR/infra/task-definition-bridge.json" \
  | sed "s/ACCOUNT_ID/$ACCOUNT_ID/g" \
  | sed "s/REGION/$REGION/g")

aws ecs register-task-definition --cli-input-json "$BRIDGE_TD_JSON" \
  --region "$REGION" --output text >/dev/null
log "Registered task definition '$BRIDGE_TASK_FAMILY'"

# ── Step 7: Build & Push Docker Images ──────────────────────

log "Logging into ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ECR_BASE"

log "Building bridge container..."
docker build --network=host -f "$SERVER_DIR/Dockerfile.cloud" -t "$BRIDGE_REPO" "$SERVER_DIR"
docker tag "$BRIDGE_REPO:latest" "$ECR_BASE/$BRIDGE_REPO:latest"
docker push "$ECR_BASE/$BRIDGE_REPO:latest"
log "Pushed $ECR_BASE/$BRIDGE_REPO:latest"

log "Installing Cloud API dependencies..."
(cd "$SCRIPT_DIR" && npm install --silent)

log "Building Cloud API container..."
docker build --network=host -t "$API_REPO" "$SCRIPT_DIR"
docker tag "$API_REPO:latest" "$ECR_BASE/$API_REPO:latest"
docker push "$ECR_BASE/$API_REPO:latest"
log "Pushed $ECR_BASE/$API_REPO:latest"

# ── Step 8: Register API Task Definition ─────────────────────

log "Registering API task definition..."
aws ecs register-task-definition --region "$REGION" \
  --family "$API_TASK_FAMILY" \
  --requires-compatibilities FARGATE \
  --network-mode awsvpc \
  --cpu 256 --memory 512 \
  --execution-role-arn "arn:aws:iam::${ACCOUNT_ID}:role/${EXEC_ROLE}" \
  --task-role-arn "arn:aws:iam::${ACCOUNT_ID}:role/${API_ROLE}" \
  --container-definitions "[{
    \"name\": \"${API_TASK_FAMILY}\",
    \"image\": \"${ECR_BASE}/${API_REPO}:latest\",
    \"essential\": true,
    \"portMappings\": [{\"containerPort\": 8080}],
    \"environment\": [
      {\"name\": \"ECS_CLUSTER\", \"value\": \"${CLUSTER}\"},
      {\"name\": \"ECS_TASK_DEFINITION\", \"value\": \"${BRIDGE_TASK_FAMILY}\"},
      {\"name\": \"ECS_SUBNETS\", \"value\": \"${SUBNETS}\"},
      {\"name\": \"ECS_SECURITY_GROUP\", \"value\": \"${BRIDGE_SG_ID}\"},
      {\"name\": \"CONTAINER_NAME\", \"value\": \"${CONTAINER_NAME}\"},
      {\"name\": \"PORT\", \"value\": \"8080\"},
      {\"name\": \"WARM_POOL_MIN\", \"value\": \"1\"}
    ],
    \"logConfiguration\": {
      \"logDriver\": \"awslogs\",
      \"options\": {
        \"awslogs-group\": \"${LOG_GROUP}\",
        \"awslogs-region\": \"${REGION}\",
        \"awslogs-stream-prefix\": \"api\"
      }
    }
  }]" --output text >/dev/null
log "Registered API task definition"

# ── Step 9: Create/Update API Service ────────────────────────

API_SERVICE_EXISTS=$(aws ecs describe-services --cluster "$CLUSTER" --services "$API_SERVICE_NAME" \
  --region "$REGION" --query 'services[?status==`ACTIVE`].serviceName' --output text 2>/dev/null || echo "")

if [ "$API_SERVICE_EXISTS" = "$API_SERVICE_NAME" ]; then
  log "API service already exists — updating..."
  aws ecs update-service --cluster "$CLUSTER" --service "$API_SERVICE_NAME" \
    --task-definition "$API_TASK_FAMILY" --force-new-deployment \
    --region "$REGION" --output text >/dev/null
else
  log "Creating API service..."
  aws ecs create-service --region "$REGION" \
    --cluster "$CLUSTER" \
    --service-name "$API_SERVICE_NAME" \
    --task-definition "$API_TASK_FAMILY" \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${API_SG_ID}],assignPublicIp=ENABLED}" \
    --output text >/dev/null
fi

log "Waiting for API service to stabilize (this takes 1-2 minutes)..."
aws ecs wait services-stable --cluster "$CLUSTER" --services "$API_SERVICE_NAME" --region "$REGION"
log "API service is running"

# ── Step 10: Get API Public IP ───────────────────────────────

API_TASK_ARN=$(aws ecs list-tasks --cluster "$CLUSTER" --service-name "$API_SERVICE_NAME" \
  --query 'taskArns[0]' --output text --region "$REGION")

API_ENI=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$API_TASK_ARN" \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text --region "$REGION")

API_IP=$(aws ec2 describe-network-interfaces --network-interface-ids "$API_ENI" \
  --query 'NetworkInterfaces[0].Association.PublicIp' --output text --region "$REGION")

API_URL="http://${API_IP}:8080"
log "Cloud API running at: $API_URL"

# ── Step 11: Update .env ────────────────────────────────────

ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  if grep -q "EXPO_PUBLIC_CLOUD_API_URL" "$ENV_FILE"; then
    sed -i "s|EXPO_PUBLIC_CLOUD_API_URL=.*|EXPO_PUBLIC_CLOUD_API_URL=${API_URL}|" "$ENV_FILE"
  else
    echo "EXPO_PUBLIC_CLOUD_API_URL=${API_URL}" >> "$ENV_FILE"
  fi
else
  echo "EXPO_PUBLIC_CLOUD_API_URL=${API_URL}" > "$ENV_FILE"
fi
log "Updated $ENV_FILE with EXPO_PUBLIC_CLOUD_API_URL=$API_URL"

# ── Summary ──────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Treena Cloud — Deployment Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Account:        $ACCOUNT_ID"
echo "  Region:         $REGION"
echo "  ECS Cluster:    $CLUSTER"
echo "  VPC:            $VPC_ID"
echo ""
echo "  Bridge SG:      $BRIDGE_SG_ID  (ports 3001, 3000, 5173, 8080)"
echo "  API SG:         $API_SG_ID  (port 8080)"
echo "  Subnets:        $SUBNETS"
echo ""
echo "  Bridge Image:   $ECR_BASE/$BRIDGE_REPO:latest"
echo "  API Image:      $ECR_BASE/$API_REPO:latest"
echo ""
echo "  Cloud API:      $API_URL"
echo ""
echo "  .env updated:   EXPO_PUBLIC_CLOUD_API_URL=$API_URL"
echo ""
echo "  Test it:        curl $API_URL/health"
echo ""
echo "  Next steps:"
echo "    1. Run: npm run start:clean"
echo "    2. For production: add ALB + ACM cert for api.treena.app"
echo ""
echo "═══════════════════════════════════════════════════════════"
