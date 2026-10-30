# Treena Cloud — AWS Setup Guide

One-time setup for the ephemeral cloud execution infrastructure.

## Prerequisites

- AWS CLI configured with appropriate permissions
- Docker installed locally
- Replace `ACCOUNT_ID` and `REGION` in all commands below

## 1. ECR Repository

```bash
aws ecr create-repository --repository-name treena-bridge-cloud --region REGION
aws ecr create-repository --repository-name treena-cloud-api --region REGION
```

## 2. Build & Push Images

```bash
# Bridge container
cd server
aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com
docker build -f Dockerfile.cloud -t treena-bridge-cloud .
docker tag treena-bridge-cloud:latest ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/treena-bridge-cloud:latest
docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/treena-bridge-cloud:latest

# Cloud API
cd cloud
docker build -t treena-cloud-api .
docker tag treena-cloud-api:latest ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/treena-cloud-api:latest
docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/treena-cloud-api:latest
```

## 3. IAM Roles

### Execution Role (ECR pull + CloudWatch logs)

```bash
aws iam create-role --role-name treena-bridge-execution-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy --role-name treena-bridge-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### Task Role (self-destroy)

```bash
aws iam create-role --role-name treena-bridge-task-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam put-role-policy --role-name treena-bridge-task-role \
  --policy-name SelfDestroy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["ecs:StopTask", "ecs:DescribeTasks"],
      "Resource": "*",
      "Condition": {
        "ArnEquals": {
          "ecs:cluster": "arn:aws:ecs:REGION:ACCOUNT_ID:cluster/treena-cloud"
        }
      }
    }]
  }'
```

### API Service Role

```bash
aws iam create-role --role-name treena-cloud-api-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam put-role-policy --role-name treena-cloud-api-role \
  --policy-name ManageTasks \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ecs:RunTask",
          "ecs:StopTask",
          "ecs:DescribeTasks"
        ],
        "Resource": "*",
        "Condition": {
          "ArnEquals": {
            "ecs:cluster": "arn:aws:ecs:REGION:ACCOUNT_ID:cluster/treena-cloud"
          }
        }
      },
      {
        "Effect": "Allow",
        "Action": "ec2:DescribeNetworkInterfaces",
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": "iam:PassRole",
        "Resource": [
          "arn:aws:iam::ACCOUNT_ID:role/treena-bridge-execution-role",
          "arn:aws:iam::ACCOUNT_ID:role/treena-bridge-task-role"
        ]
      }
    ]
  }'
```

## 3.5 DynamoDB Tables

Three tables back the cloud API. `deploy-cloud.sh` creates them idempotently;
the commands below are the manual equivalents.

```bash
# Per-user AI CLI tokens (Claude Code OAuth, Codex API key)
aws dynamodb create-table --table-name treena-user-tokens --region REGION \
  --attribute-definitions AttributeName=githubUserId,AttributeType=N \
  --key-schema AttributeName=githubUserId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Per-user Fly machine + volume metadata
aws dynamodb create-table --table-name treena-user-machines --region REGION \
  --attribute-definitions AttributeName=githubUserId,AttributeType=N \
  --key-schema AttributeName=githubUserId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Per-(user, repo) setup state
aws dynamodb create-table --table-name treena-user-repos --region REGION \
  --attribute-definitions \
    AttributeName=githubUserId,AttributeType=N \
    AttributeName=repoUrl,AttributeType=S \
  --key-schema \
    AttributeName=githubUserId,KeyType=HASH \
    AttributeName=repoUrl,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
```

The IAM policy `DynamoDbTokens` on `treena-cloud-api-role` grants
GetItem/PutItem/UpdateItem/Query on all three tables (see `deploy-cloud.sh`).

## 4. ECS Cluster

```bash
aws ecs create-cluster --cluster-name treena-cloud --region REGION \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=1
```

## 5. Security Group

```bash
# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)

# Create security group for bridge containers
SG_ID=$(aws ec2 create-security-group \
  --group-name treena-bridge-sg \
  --description "Treena bridge container - WebSocket port" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 3001 --cidr 0.0.0.0/0

echo "Security Group: $SG_ID"
```

## 6. Get Public Subnet IDs

```bash
aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=$VPC_ID Name=map-public-ip-on-launch,Values=true \
  --query 'Subnets[*].SubnetId' --output text
```

## 7. CloudWatch Log Group

```bash
aws logs create-log-group --log-group-name /ecs/treena-bridge-cloud --region REGION
aws logs put-retention-policy --log-group-name /ecs/treena-bridge-cloud --retention-in-days 7
```

## 8. Register Task Definition

Edit `task-definition-bridge.json` — replace `ACCOUNT_ID` and `REGION`, then:

```bash
aws ecs register-task-definition --cli-input-json file://task-definition-bridge.json
```

## 9. Cloud API Environment Variables

Set these for the Cloud API ECS service (or local dev):

```
# Fargate runtime (deprecated — being torn down once Fly migration ships)
ECS_CLUSTER=treena-cloud
ECS_TASK_DEFINITION=treena-bridge-cloud
ECS_SUBNETS=subnet-xxx,subnet-yyy
ECS_SECURITY_GROUP=sg-xxx
CONTAINER_NAME=treena-bridge
PORT=8080

# DynamoDB tables (override only if you renamed)
DYNAMODB_TABLE=treena-user-tokens
DYNAMODB_MACHINES_TABLE=treena-user-machines
DYNAMODB_REPOS_TABLE=treena-user-repos

# Fly Machines runtime (post-migration)
FLY_API_TOKEN=fo1_...                           # org-scoped token, can manage all bridge machines
FLY_BRIDGE_APP=treena-bridge
FLY_BRIDGE_IMAGE=registry.fly.io/treena-bridge:latest
FLY_DEFAULT_REGION=iad
FLY_DEFAULT_VOLUME_GB=10
USE_FLY=true
```

For the Fly-hosted `treena-api` deployment, the AWS credentials need read/write
on all three DynamoDB tables. Create a dedicated IAM user (e.g., `treena-api-fly`)
with the `DynamoDbTokens` policy attached, and set `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY` / `AWS_REGION=us-east-1` as Fly secrets on `treena-api`.

## Cost Estimate

| Component | Monthly |
|-----------|---------|
| API service (0.25 vCPU, always-on) | ~$3.50 |
| ALB for API | ~$16 |
| Bridge containers (Fargate Spot) | ~$0.012/hr each |
| CloudWatch logs | ~$0.50 |
| **Baseline** | **~$20/month + usage** |

A 30-minute coding session costs approximately $0.006.
