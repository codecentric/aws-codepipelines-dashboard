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
AWS CLI on your development host.

## Instructions for setting up AWS

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
