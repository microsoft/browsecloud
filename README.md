# What is BrowseCloud?
![alt text](https://github.com/microsoft/browsecloud/blob/master/Images/browsecloud-screenshot.png "A screenshot of the BrowseCloud visualization of feedback on the Windows & Devices Group Engineering Systems in 2018.")

It's a laborious task to collect and synthesize the perspectives of customers.
There's an immense amount of customer data from a variety of digital channels: survey data, StackOverflow, Reddit, email, etc.
Even for internal tools teams at Microsoft, there are at least 10,000 user feedback documents generated per quarter.

To help solve this problem, BrowseCloud is an application that summarizes feedback data via smart word clouds, called counting grids.
On a word cloud, the size of the text simply scales with the frequency of the word.
Text is scattered randomly on word clouds. In BrowseCloud, we have a word cloud where the position of the word matters.
As the user scans along the visualization, themes smoothly transition between each other.

[Try out BrowseCloud on a demo data of definitions from the English dictionary here.](https://aka.ms/browsecloud-demo)

[If you're a Microsoft full-time employee, try out our full site, which supports creating your own visualizations with your own data set.](https://aka.ms/browsecloud)

## Features
- Visualize the text data by inspecting the largest words in clusters around the screen.
- Drop a pin by clicking on the visualization to view a ranked list of verbatims (shown on the far right-hand side of the screen) related to the micro-topic you pinned!
- Search for a word to narrow down the visualization and ranked list futher.
- Correlate topics with positive or negative sentiment on the screen by looking at the color of the the words in a region, after applying the sentiment analysis job. &ast;
- Correlate your own custom metadata with topic. We support numeric data, nominal data with two categories, and ordinal data. &ast;
- Download the relevant verbatims into Excel!

&ast; <sub><sup>These features are not supported in the demo application. They are in the full version.</sup></sub>

## Getting Started
Our documentation is available on this repository's [wiki](https://github.com/microsoft/browsecloud/wiki).

# Build and Test
We have Azure Pipelines set up on the pull request workflow for pre-checkin validation. The piepline will also deploy the demo site on merge with master.

TODO: add local build steps here.

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

# Reporting Security Issues
Security issues and bugs should be reported privately, via email, to the Microsoft Security
Response Center (MSRC) at [secure@microsoft.com](mailto:secure@microsoft.com). You should
receive a response within 24 hours. If for some reason you do not, please follow up via
email to ensure we received your original message. Further information, including the
[MSRC PGP](https://technet.microsoft.com/en-us/security/dn606155) key, can be found in
the [Security TechCenter](https://technet.microsoft.com/en-us/security/default).
