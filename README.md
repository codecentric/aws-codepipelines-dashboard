# AWS Codepipelines Dashboard

This is a spring boot app which serves a dashboard to see, the status
of your AWS Codepipelines.

It uses the AWS Java client to fetch data from AWS. Please follow the
policy instructions below to provide access. This means that the computer
running the spring boot app must have network access to AWS.

You can also run the application on your local computer. For example 
by running `mvn spring-boot:run` from the command line. There is also
a Dockerfile included to run the application in the cloud.

## Getting started with Docker
With the following command, you can run this application in a docker container:
```
docker run -p8080:8080 -v`echo $HOME/.aws`:/home/app/.aws:ro --name dashboard  codecentric/aws-codepipelines-dashboard
```
After start, you can reach the application via
```http://localhost:8080/```

This configuration assumes that you've already an AWS account with a running
AWS CLI on your development host.  If you're having trouble with that, see below.

## Instructions for setting up AWS permission for Development

You have to give/ensure the user mentioned in $HOME/.aws/credentials
a policy. The steps are:

1) choose IAM
1) use "Policies" in navigation
1) search for "AWSCodePipelineFullAccess"
1) select Attach entities, select "Attach"
1) get your user
1) click "Attach policy"

Check policies with this CLI command:

```
aws iam list-attached-user-policies --user-name <USERNAME>
```

Verify that the following entry is listed:
```
{
    "PolicyName": "AWSCodePipelineFullAccess", 
    "PolicyArn": "arn:aws:iam::aws:policy/AWSCodePipelineFullAccess"
}
```


## Instructions for setting up a Production Deployment
### Notes ###
* The application only has access to CodePipeline in the region that the EB is deployed to
* If this data is sensitive, you might want to restrict access in the Security Group that gets created by Elastic Beanstalk (the wizard seems to always create a Security Group)
* Choose *Generic*->*Docker* for the Platform
* You will also need GitHub connectivity as well as CodeBuild, CodePipeline, and ElasticBeanstalk roles for this (the last 3 can be generated by AWS)

### Setup ###
1. Set up EC2 Role
2. (Optional) Set up the Security Groups
3. Create the Elastic Beanstalk Environment with the EC2 role as the Instance Profile for the VM and Security Group, if created
4. Create a CodeBuild with buildspec.yml to build the Java artifacts  (use the Amazon managed Ubuntu Java Runtime, you shouldn't need a VPC or artifacts)
5. Create a CodeBuild with eb_docker_build.yml to containerize the Java artifacts (use the Amazon managed Ubuntu Docker Runtime, ensure you specify the eb_docker_buildspec.yml, you shouldn't need a VPC or artifacts)
6. Create a CodePipeline with:
  1. GitHub repo as the Source stage (you can use any version of the repo and any branch you see fit, as long as the necesssary files exist for CodeBuild to function)
  2. The Java CodeBuild as the first part of the Build stage, with output artifacts tagged something like "_JavaArtifacts_"
  3. The Containerize CodeBuild as the second part of the Build stage, with the input artifacts as the output artifats of the Java build (in this example, _JavaArtifacts_) and the output artifacts tagged as something like "_EBApp_"
  4. (Optional) Set up a Human approval step before deployment if uptime is critical
  5. Set up a Deploy stage to your Elastic Beanstlak environment from Step 3 with the Input artifacts as the output from the Contaizer step (in this example, _EBApp_)
7. Release the Change to trigger a new build and deployment