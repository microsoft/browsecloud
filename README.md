**BrowseCloud - Public Demo**

[Try out BrowseCloud with a demonstration model trained on the English dictionary here.](https://aka.ms/browsecloud-demo)

**BrowseCloud - Microsoft Internal**

[If you're a Microsoft full-time employee, try out our full site.](https://aka.ms/browsecloud)

It supports creating custom visualizations with your own data set and correlate metadata with topics. This site also has a Gallery of models and visualizations with data such as the Microsoft employee engagement survey, called MSPoll, and feedback on the Windows Engineering System.

# BrowseCloud [![Build Status](https://dev.azure.com/ms/browsecloud/_apis/build/status/microsoft.browsecloud?branchName=master)](https://dev.azure.com/ms/browsecloud/_build/latest?definitionId=161&branchName=master)
![alt text](https://github.com/microsoft/browsecloud/blob/master/Images/browsecloud-screenshot.png "A screenshot of the BrowseCloud visualization of feedback on the Windows & Devices Group Engineering Systems in 2018.")

It's a laborious task to collect and synthesize the perspectives of customers.
There's an immense amount of customer data from a variety of digital channels: survey data, StackOverflow, Reddit, email, etc.
Even for internal tools teams at Microsoft, there are at least 10,000 user feedback documents generated per quarter.

To help solve this problem, BrowseCloud is an application that summarizes feedback data via smart word clouds, called counting grids.
On a word cloud, the size of the text simply scales with the frequency of the word.
Text is scattered randomly on word clouds. In BrowseCloud, we have a word cloud where the position of the word matters.
As the user scans along the visualization, themes smoothly transition between each other.


## Features
- Add your custom text data set to the site. &ast;
- Visualize the text data by inspecting the largest words in clusters around the screen.
- Drop a pin by clicking on the visualization to view a ranked list of verbatims (shown on the far right-hand side of the screen) related to the micro-topic you pinned!
- Search for a word to narrow down the visualization and ranked list further.
- Correlate topics with positive or negative sentiment on the screen by looking at the color of the the words in a region, after applying the sentiment analysis job. &ast;
- Correlate your own custom metadata with topic. We support numeric data, nominal data with two categories, and ordinal data. &ast;
- Download the relevant verbatims into Excel!

&ast; <sub><sup>These features are not supported in the demo application. They are in the full version.</sup></sub>

## Getting Started
Our documentation is available on this repository's [wiki](https://github.com/microsoft/browsecloud/wiki).

# Build and Test
We have Azure Pipelines set up on the pull request workflow for pre-check-in validation. The pipeline will also deploy the demo site on merge with master.

Note that it is not required that you use the service to get up and running with the app.
You can quickly visualize your data by using the Python command line application to train your data,
and copying the resulting model files to the `/browsecloud-client/src/assets/demo` folder.
You can then run the demo client app by following the client setup steps and running `npm run start:demo`.

## Client

The client is a simple Angular CLI generated application.

- Ensure you have Node v12 or greater and NPM installed.
- change directories to `/browsecloud-client`.
- run `npm install` and then `npm start`.
- open http://localhost:4200 in your browser.

At this point the client should load in your browser for local development.
You will need to adjust some of the values in `src/environments/environment/ts` in order to login with your AAD app and point the app to the correct service URL.
For more information on how to create an AAD app,
visit the [azure docs](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal).

If instead you want to build to host on your own webserver, you can run `npm run build` or `npm run build:prod`. You can then host these files in a simple Azure App Service or elsewhere.

There are currently no tests, but we would love it if someone would contribute some 😉

## Service

The service is an ASP.NET Core application that has many Azure dependencies. We will first get these dependencies setup.

- Visit the Azure Portal and choose to create a new resource of type "Template Deployment".
On the next page, select "Build your own template in the editor", and upload the template file `/deployment/az-service-template.json`.
On the next page, fill in the resource and resource group names. Purchase this resource group.
- Create an AAD app for the service. For more information on how to create an AAD app,
visit the [azure docs](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal).
- Perform some setup tasks on these resources.
  - Visit the newly created Azure KeyVault, and add yourself to access the secrets in the "Access policies" pane.
  - In the KeyVault's "Secrets" pane, you will find some secret names have been generated.
  Populate these secrets with a secret for your AAD app, your Document DB secret,
  and your Redis connection string (all generated by the template file). After setting up the Azure Batch infrastructure for training the models,
  you can populate the rest of the secrets.
  - On the newly created Cosmos Document DB account, create two new containers named "BatchJob" and "Document".
- Download and install Visual Studio 2017 with the "ASP.NET and web development" workload.
- In `/BrowseCloud.Service/BrowseCloud.Service/appsettings.json`, Configure your development environment using the information from the services you just created.
- You can then build and run using Visual Studio's built in build and run feature.

This can be built and deployed to the Azure App Service generated in the steps above for everyday use.
The easiest method is to right click on the BrowseCloud.Service project and "Publish", but we should recommend a CICD pipeline of some type.
We have our Azure DevOps build pipelines checked in as yaml files which you are free to use.

There are currently no tests, but we would love it if someone would contribute some 😉

## Trainer Jobs

TODO

# Contributing
This project welcomes contributions and suggestions. Most contributions require you to
agree to a Contributor License Agreement (CLA) declaring that you have the right to,
and actually do, grant us the rights to use your contribution. For details, visit
https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need
to provide a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the
instructions provided by the bot. You will only need to do this once across all repositories using our CLA.

## Feedback
Your pull request will now go through extensive checks by the subject matter experts on our team.
Please be patient; we have hundreds of pull requests across all of our repositories.
Update your pull request according to feedback until it is approved by one of the team members.

## Code of conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/)
or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

# Privacy Notice

There are also some features in the software that may enable you and Microsoft to collect data from users of your applications.
If you use these features, you must comply with applicable law, including providing appropriate notices to users of your applications together
with a copy of Microsoft's privacy statement. Our privacy statement is located at https://go.microsoft.com/fwlink/?LinkID=824704. 
You can learn more about data collection and use in the help documentation and our privacy statement. Your use of the software operates as your consent to these practices.

# Reporting Security Issues
Security issues and bugs should be reported privately, via email, to the Microsoft Security
Response Center (MSRC) at [secure@microsoft.com](mailto:secure@microsoft.com). You should
receive a response within 24 hours. If for some reason you do not, please follow up via
email to ensure we received your original message. Further information, including the
[MSRC PGP](https://technet.microsoft.com/en-us/security/dn606155) key, can be found in
the [Security TechCenter](https://technet.microsoft.com/en-us/security/default).
